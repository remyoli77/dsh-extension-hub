/**
 * dsh-watchdog.js — cross-platform process guardian for DSH (non-Windows).
 *
 * Spawned detached by dsh-extension-hub (lib/index.js startWatchdog) and
 * survives a dsh crash: it probes the web port every few seconds and, after
 * consecutive failures, re-launches dsh using the launch info recorded in
 * ~/.dsh/dsh-watchdog-state.json. State + log are written under ~/.dsh/ so
 * the extension UI can surface them exactly like the Windows .ps1 variant.
 *
 * Lifecycle:
 *   - started by:  spawn(node, [this file], { detached:true, stdio:'ignore' })
 *   - stopped by:  SIGTERM/SIGINT (from stopWatchdog → process.kill)
 *   - exit codes:  1 = no launch info; 0 = graceful shutdown
 */
import { spawn } from 'node:child_process'
import { appendFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const STATE_FILE = join(DSH_HOME, 'dsh-watchdog-state.json')
const LOG_FILE = join(DSH_HOME, 'dsh-watchdog.log')
const PORT = Number(process.env.DSH_PORT) || 3080
const INTERVAL = 8_000       // probe every 8s
const FAIL_THRESHOLD = 3     // 3 consecutive failures ⇒ dsh down
const BOOT_GRACE = 15_000    // allow dsh ~15s to come up on first probe

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

function saveState(state) {
  try { writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)) } catch { /* best effort */ }
}

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

/** Re-launch dsh using the recorded launch info. */
function restartDsh(launch) {
  const { nodePath, execArgv, argv, cwd, env } = launch
  const fullArgv = [...(execArgv || []), ...argv]
  log(`restarting dsh: ${nodePath} ${fullArgv.join(' ')} (cwd=${cwd})`)
  const child = spawn(nodePath, fullArgv, {
    cwd,
    env: { ...process.env, ...env },
    detached: true,
    stdio: 'ignore',
  })
  child.on('error', (e) => log(`restart spawn error: ${e.message}`))
  child.unref()
  log(`dsh relaunched, pid=${child.pid}`)
}

let failCount = 0
let firstProbe = true

async function tick(state) {
  const alive = await isAlive()
  // The grace period only applies on the very first probe after watchdog
  // start (dsh may still be booting). Once consumed, a later crash should
  // fail fast without the 15s delay.
  if (firstProbe) {
    firstProbe = false
    if (!alive) {
      log('first probe failed — waiting grace period')
      await new Promise((r) => setTimeout(r, BOOT_GRACE))
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
    log('dsh down — relaunching')
    restartDsh(state.launch)
    failCount = 0
    state.restartCount = (state.restartCount || 0) + 1
    state.lastRestart = ts()
    saveState(state)
    // Give dsh time to boot before next probe.
    await new Promise((r) => setTimeout(r, BOOT_GRACE))
  }
}

async function main() {
  const state = loadState()
  if (!state || !state.launch) {
    log('no launch info in state file — cannot guard, exiting')
    process.exit(1)
  }
  state.watchdogPid = process.pid
  state.watchdogStart = ts()
  if (!state.restartCount) state.restartCount = 0
  saveState(state)
  log(`watchdog started (pid=${process.pid}, port=${PORT}, interval=${INTERVAL}ms)`)

  process.on('SIGTERM', () => { log('SIGTERM — shutting down'); process.exit(0) })
  process.on('SIGINT', () => { log('SIGINT — shutting down'); process.exit(0) })

  // Keep the event loop alive.
  while (true) {
    try {
      await tick(state)
    } catch (e) {
      log(`tick error: ${e.message}`)
    }
    await new Promise((r) => setTimeout(r, INTERVAL))
  }
}

main()
