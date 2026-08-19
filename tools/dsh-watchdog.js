/**
 * dsh-watchdog.js — cross-platform process guardian for DSH (non-Windows).
 *
 * Spawned detached by dsh-extension-hub (lib/index.js startWatchdog) and
 * survives a dsh crash: it probes the web port every few seconds and, after
 * consecutive failures, performs a SAFE restart of dsh using the launch info
 * recorded in ~/.dsh/dsh-watchdog-state.json.
 *
 * Safe restart (fixes the old EADDRINUSE crash loop):
 *   1. find live dsh processes via /proc scan (tracked pid + cmdline match)
 *   2. SIGTERM them, wait up to 10s; SIGKILL leftovers
 *   3. wait for the web port to actually be released
 *   4. spawn new dsh (stdout/stderr appended to ~/.dsh/dsh-stdout.log)
 *   5. wait for it to answer HTTP before resuming monitoring
 *
 * Also serves the legacy HTTP control API on port 3090 (CORS open) so the
 * desktop "DSH 管理器.html" keeps working:
 *   GET /status  -> { running, restarting, childPid, lastRestart, pluginReloads, restartCount }
 *   GET /restart -> safe smooth restart
 *   GET /reload  -> same as restart (post-plugin-install reload)
 *   GET /logs    -> last 40 watchdog log lines
 *
 * Quasi-hot-reload: polls the profile dir (package.json / cordis.patch.yml /
 * pnpm-lock.yaml / node_modules top level); on change, debounces 8s then
 * smooth-restarts so freshly installed plugins load automatically.
 *
 * Lifecycle:
 *   - started by:  spawn(node, [this file], { detached:true })
 *   - stopped by:  SIGTERM/SIGINT (from stopWatchdog → process.kill)
 *   - exit codes:  1 = no launch info; 0 = graceful shutdown
 */
import { spawn } from 'node:child_process'
import { appendFileSync, readFileSync, writeFileSync, readdirSync, openSync, closeSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const STATE_FILE = join(DSH_HOME, 'dsh-watchdog-state.json')
const LOG_FILE = join(DSH_HOME, 'dsh-watchdog.log')
const DSH_STDOUT = join(DSH_HOME, 'dsh-stdout.log')
const PROFILE_DIR = join(DSH_HOME, 'profiles', 'web')
const PORT = Number(process.env.DSH_PORT) || 3080
const CTRL_PORT = Number(process.env.DSH_CTRL_PORT) || 3090
const INTERVAL = 8_000         // probe every 8s
const FAIL_THRESHOLD = 3       // 3 consecutive failures ⇒ dsh down
const BOOT_GRACE = 15_000      // allow dsh ~15s to come up on first probe
const START_TIMEOUT = 90_000   // max wait for a fresh dsh to answer HTTP
const KILL_WAIT = 10_000       // max wait after SIGTERM before SIGKILL
const WATCH_POLL = 5_000       // profile poll interval
const RELOAD_DEBOUNCE = 8_000  // plugin-change debounce

const state = {
  launch: null,
  watchdogPid: null,
  watchdogStart: null,
  restartCount: 0,
  lastRestart: null,
  dshPid: null,
  pluginReloads: 0,
  lastProfileSnapshot: null,
}

let restarting = false
let reloadTimer = null

function ts() {
  return new Date().toISOString()
}

function log(msg) {
  const line = `[${ts()}] ${msg}\n`
  try { appendFileSync(LOG_FILE, line) } catch { /* best effort */ }
}

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8').replace(/^\uFEFF/, ''))
  } catch {
    return null
  }
}

function saveState() {
  const persist = {
    launch: state.launch,
    watchdogPid: state.watchdogPid,
    watchdogStart: state.watchdogStart,
    restartCount: state.restartCount,
    lastRestart: state.lastRestart,
    dshPid: state.dshPid,
    pluginReloads: state.pluginReloads,
  }
  try { writeFileSync(STATE_FILE, JSON.stringify(persist, null, 2)) } catch { /* best effort */ }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Probe the dsh web server — any HTTP response < 500 counts as alive. */
async function isAlive() {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/`, {
      signal: AbortSignal.timeout(3000),
    })
    return res.status < 500
  } catch {
    return false
  }
}

/**
 * Find live dsh processes via /proc cmdline scan.
 * Matches the real dsh entry (`@deepseek-ai/dsh/lib/bin.js ... web`) but skips
 * shell wrappers (bash -c …) so we never kill the command that asked for it.
 */
function findDshPids() {
  const pids = []
  try {
    for (const pid of readdirSync('/proc')) {
      if (!/^\d+$/.test(pid) || Number(pid) === process.pid) continue
      try {
        const cmdline = readFileSync(`/proc/${pid}/cmdline`, 'utf8')
        const parts = cmdline.split('\0').filter(Boolean)
        if (!parts.length) continue
        if (parts[0].includes('bash') || parts[0].endsWith('sh')) continue
        if (cmdline.includes('@deepseek-ai/dsh/lib/bin.js') && cmdline.includes('web')) {
          pids.push(Number(pid))
        }
      } catch { /* process gone or unreadable */ }
    }
  } catch { /* /proc unavailable */ }
  return pids
}

async function waitReady(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await sleep(2000)
    if (await isAlive()) return true
  }
  return false
}

/** Kill every running dsh (tracked pid + /proc scan), then free the port. */
async function stopDsh() {
  let pids = findDshPids()
  if (state.dshPid && !pids.includes(state.dshPid)) {
    try { process.kill(state.dshPid, 0); pids.push(state.dshPid) } catch { /* dead */ }
  }
  for (const pid of pids) {
    try { process.kill(pid, 'SIGTERM'); log(`SIGTERM → dsh (PID ${pid})`) } catch { /* dead */ }
  }
  let deadline = Date.now() + KILL_WAIT
  while (Date.now() < deadline && findDshPids().length) await sleep(500)
  for (const pid of findDshPids()) {
    try { process.kill(pid, 'SIGKILL'); log(`SIGKILL → 残留 dsh (PID ${pid})`) } catch { /* dead */ }
  }
  // Wait for the port to actually be released (avoids EADDRINUSE on relaunch).
  deadline = Date.now() + KILL_WAIT
  while (Date.now() < deadline) {
    if (!(await isAlive())) break
    await sleep(500)
  }
  state.dshPid = null
}

/** Spawn a fresh dsh using the recorded launch info. */
function spawnDsh() {
  const { nodePath, execArgv, argv, cwd, env } = state.launch
  const fullArgv = [...(execArgv || []), ...argv]
  log(`restarting dsh: ${nodePath} ${fullArgv.join(' ')} (cwd=${cwd})`)
  // File redirection instead of 'ignore' — dsh needs writable stdio.
  let outFd
  try { outFd = openSync(DSH_STDOUT, 'a') } catch { outFd = 'ignore' }
  const child = spawn(nodePath, fullArgv, {
    cwd,
    env: { ...process.env, ...env },
    detached: true,
    stdio: ['ignore', outFd, outFd],
  })
  if (outFd !== 'ignore') { try { closeSync(outFd) } catch {} }
  child.on('error', (e) => log(`restart spawn error: ${e.message}`))
  child.unref()
  state.dshPid = child.pid
  state.lastRestart = ts()
  log(`dsh relaunched, pid=${child.pid}`)
}

/**
 * Safe restart: kill old (graceful→force) → wait port free → spawn → wait ready.
 * A hung dsh holding the port can no longer wedge the restart (old bug: blind
 * respawn hit EADDRINUSE and died, leaving the system dead).
 */
async function safeRestart(reason) {
  if (restarting) return { ok: false, error: '已有一次重启正在进行中' }
  restarting = true
  log(`>>> 平滑重启（原因: ${reason}）`)
  try {
    await stopDsh()
    spawnDsh()
    state.restartCount += 1
    saveState()
    const up = await waitReady(START_TIMEOUT)
    if (up) {
      log('✓ 平滑重启成功')
      return { ok: true }
    }
    log('✗ 重启后未就绪，监控循环会继续重试')
    return { ok: false, error: '重启后未就绪，watchdog 将继续重试' }
  } finally {
    restarting = false
  }
}

// ============ profile watcher (quasi hot-reload) ============

function snapshotProfile() {
  const snap = {}
  // cordis.yml is rewritten periodically by the dsh loader at runtime —
  // watching it would cause restart loops, so it is deliberately excluded.
  const keyFiles = [
    join(PROFILE_DIR, 'package.json'),
    join(PROFILE_DIR, 'cordis.patch.yml'),
    join(PROFILE_DIR, 'pnpm-lock.yaml'),
  ]
  for (const f of keyFiles) {
    try { snap[f] = statSync(f).mtimeMs } catch { snap[f] = 0 }
  }
  try {
    const nm = join(PROFILE_DIR, 'node_modules')
    const entries = readdirSync(nm).sort()
    snap['#nm-count'] = entries.length
    for (const e of entries) {
      try { snap['nm:' + e] = statSync(join(nm, e)).mtimeMs } catch {}
    }
  } catch { snap['#nm-count'] = -1 }
  return JSON.stringify(snap)
}

function watchProfileLoop() {
  state.lastProfileSnapshot = snapshotProfile()
  setInterval(async () => {
    try {
      const now = snapshotProfile()
      if (now === state.lastProfileSnapshot) return
      state.lastProfileSnapshot = now
      if (reloadTimer) return
      log('检测到 profile 目录变化（插件安装/卸载/配置修改）')
      reloadTimer = setTimeout(async () => {
        reloadTimer = null
        state.lastProfileSnapshot = snapshotProfile()
        state.pluginReloads += 1
        await safeRestart('插件变化自动重载')
      }, RELOAD_DEBOUNCE)
    } catch { /* ignore */ }
  }, WATCH_POLL)
}

// ============ HTTP control server (port 3090) ============

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

function startControlServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    try {
      if (url.pathname === '/status') {
        sendJson(res, 200, {
          running: await isAlive(),
          restarting,
          childPid: state.dshPid,
          lastRestart: state.lastRestart,
          pluginReloads: state.pluginReloads,
          restartCount: state.restartCount,
          dshUrl: `http://127.0.0.1:${PORT}`,
        })
      } else if (url.pathname === '/restart' || url.pathname === '/reload') {
        const reason = url.pathname === '/reload' ? '手动热重载' : '手动重启'
        const r = await safeRestart(reason)
        if (r.ok && url.pathname === '/reload') state.pluginReloads += 1
        sendJson(res, r.ok ? 200 : 503, r.ok ? { ok: true, message: '重启完成' } : r)
      } else if (url.pathname === '/logs') {
        let lines = []
        try {
          lines = readFileSync(LOG_FILE, 'utf8').trim().split('\n').slice(-40)
        } catch { /* no log yet */ }
        sendJson(res, 200, { logs: lines })
      } else {
        sendJson(res, 404, { error: 'not found', endpoints: ['/status', '/restart', '/reload', '/logs'] })
      }
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
  })
  server.on('error', (e) => {
    // Guarding matters more than the control API — never exit because of 3090.
    log(`控制端口 ${CTRL_PORT} 异常: ${e.message}（继续守护，控制 API 不可用）`)
  })
  server.listen(CTRL_PORT, '127.0.0.1', () => {
    log(`控制服务已启动: http://127.0.0.1:${CTRL_PORT} (/status /restart /reload /logs)`)
  })
}

// ============ main loop ============

let failCount = 0
let firstProbe = true

async function tick() {
  if (restarting) return
  const alive = await isAlive()
  // The grace period only applies on the very first probe after watchdog
  // start (dsh may still be booting). Once consumed, a later crash should
  // fail fast without the 15s delay.
  if (firstProbe) {
    firstProbe = false
    if (!alive) {
      log('first probe failed — waiting grace period')
      await sleep(BOOT_GRACE)
      if (await isAlive()) {
        log('dsh came up during grace')
        failCount = 0
        return
      }
    }
  }
  if (alive) {
    if (failCount > 0) log('dsh recovered')
    failCount = 0
    return
  }
  failCount++
  log(`probe failed (${failCount}/${FAIL_THRESHOLD})`)
  if (failCount >= FAIL_THRESHOLD) {
    failCount = 0
    log('dsh down — safe relaunching')
    await safeRestart('崩溃自动重启')
  }
}

async function main() {
  const loaded = loadState()
  if (!loaded || !loaded.launch) {
    log('no launch info in state file — cannot guard, exiting')
    process.exit(1)
  }
  Object.assign(state, {
    launch: loaded.launch,
    restartCount: loaded.restartCount || 0,
    lastRestart: loaded.lastRestart || null,
    dshPid: loaded.dshPid || null,
    pluginReloads: loaded.pluginReloads || 0,
  })
  state.watchdogPid = process.pid
  state.watchdogStart = ts()
  saveState()
  log(`watchdog started (pid=${process.pid}, port=${PORT}, ctrl=${CTRL_PORT}, interval=${INTERVAL}ms)`)

  process.on('SIGTERM', () => { log('SIGTERM — shutting down'); process.exit(0) })
  process.on('SIGINT', () => { log('SIGINT — shutting down'); process.exit(0) })

  startControlServer()
  watchProfileLoop()

  // Keep the event loop alive.
  while (true) {
    try {
      await tick()
    } catch (e) {
      log(`tick error: ${e.message}`)
    }
    await sleep(INTERVAL)
  }
}

main()
