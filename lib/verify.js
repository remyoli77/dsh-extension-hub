/**
 * dsh-extension-hub — dependency consistency verifier.
 *
 * Guards the runtime against a class of "phantom" failures caused by the
 * pnpm dependency-hoisting layout used by DSH profiles:
 *
 *   1. Duplicate core packages. When a user plugin depends on a
 *      `@deepseek-ai/*` core package, pnpm may copy a second real copy of that
 *      package into the profile `node_modules` tree while the main chain
 *      (`dsh-install`) keeps its own. Every copy then defines its own
 *      `Symbol` keys / `instanceof` identities, so cross-copy lookups (e.g.
 *      `ctx.tools[TOOL_RUNTIME_SCHEDULER]`) silently return `undefined` and
 *      the agent loop crashes with `Cannot read properties of undefined
 *      (reading 'prepare')`. If the two copies share the same version they can
 *      be safely unified into a single module by replacing the profile copy
 *      with a symlink to the authoritative copy.
 *
 *   2. Unresolvable peer dependencies. A locally-linked plugin
 *      (pnpm `link:` dev mode) that has no `node_modules` of its own may fail
 *      to resolve its peerDependencies, which aborts startup with
 *      `ERR_MODULE_NOT_FOUND` (`Cannot find package '@deepseek-ai/dsh-home-paths'`).
 *
 * The authoritative copy is located at runtime by resolving a core package
 * through this module's own resolution chain (its `node_modules` is linked to
 * the main installation), so no hard-coded installation path is needed.
 */

import { createRequire } from 'node:module'
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  symlinkSync,
} from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

/** Probe package resolved against THIS module to locate the authoritative tree. */
const CORE_PROBE = '@deepseek-ai/cordis/package.json'
const require = createRequire(import.meta.url)

/** Timestamp for backup directory names. */
function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
}

/**
 * Absolute path of the authoritative `node_modules` tree — the one the main
 * dsh chain (dsh-install) loads its core packages from.
 */
export function authoritativeNodeModules() {
  try {
    const pkgJson = require.resolve(CORE_PROBE)
    // .../node_modules/@deepseek-ai/cordis/package.json → up 3 = node_modules
    return dirname(dirname(dirname(pkgJson)))
  } catch {
    // Fallback: this package's own node_modules is symlinked to the main tree.
    const here = dirname(fileURLToPath(import.meta.url))
    try {
      return realpathSync(join(here, '..', 'node_modules'))
    } catch {
      return join(here, '..', 'node_modules')
    }
  }
}

/** Absolute path of the active profile's `node_modules` tree. */
export function profileNodeModules(ctx) {
  let profile = 'web'
  try {
    const base = ctx?.baseUrl
    if (typeof base === 'string' && base !== '') profile = basename(fileURLToPath(base)) || 'web'
  } catch {
    /* keep default */
  }
  return join(resolveDshHome(), 'profiles', profile, 'node_modules')
}

function readVersion(pkgDir) {
  try {
    const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
    return typeof pkg.version === 'string' ? pkg.version : undefined
  } catch {
    return undefined
  }
}

/** Split a package name like `@scope/name` or `name` into a nested path under node_modules. */
function packageDir(modulesRoot, packageName) {
  return join(modulesRoot, ...packageName.split('/'))
}

/**
 * Scan the profile tree for real (non-symlink) copies of `@deepseek-ai/*`
 * packages that also exist in the authoritative tree, and unify each
 * version-identical pair into a single module (backup + symlink).
 *
 * @returns {Array<{package: string, action: string, version?: string, backup?: string, message?: string}>}
 */
export function verifyAndFixDuplicates(ctx) {
  const results = []
  const auth = authoritativeNodeModules()
  const authScoped = join(auth, '@deepseek-ai')
  const profScoped = join(profileNodeModules(ctx), '@deepseek-ai')

  if (!existsSync(authScoped)) {
    results.push({ action: 'error', message: `权威依赖层不存在：${authScoped}` })
    return results
  }
  if (!existsSync(profScoped)) {
    return results // profile has no core packages at all — nothing to compare
  }

  const authNames = new Set(readdirSync(authScoped))
  let entries
  try {
    entries = readdirSync(profScoped, { withFileTypes: true })
  } catch (error) {
    results.push({ action: 'error', message: `读取 profile 依赖层失败：${error.message}` })
    return results
  }

  for (const entry of entries) {
    const name = entry.name
    if (name.startsWith('.')) continue
    if (entry.isSymbolicLink()) continue // already unified — skip
    if (!entry.isDirectory()) continue
    if (!authNames.has(name)) continue // plugin-private package — leave alone

    const profPath = join(profScoped, name)
    const authPath = join(authScoped, name)
    const profVersion = readVersion(profPath)
    const authVersion = readVersion(authPath)

    if (!profVersion || !authVersion) {
      results.push({ package: name, action: 'warn', message: '缺少 version 字段，跳过自动统一' })
      continue
    }
    if (profVersion !== authVersion) {
      results.push({
        package: name,
        action: 'warn-version-mismatch',
        version: profVersion,
        message: `profile 副本 ${profVersion} ≠ 权威层 ${authVersion}，不自动统一`,
      })
      continue
    }

    // Version-identical real duplicate → safe to unify.
    const backup = `${profPath}.dupe-bak-${stamp()}`
    try {
      renameSync(profPath, backup)
      symlinkSync(authPath, profPath, 'dir')
      // Verify both paths now resolve to the same module files.
      const sameInode = statSync(join(profPath, 'package.json')).ino === statSync(join(authPath, 'package.json')).ino
      results.push({
        package: name,
        action: sameInode ? 'fixed' : 'fixed-verify-failed',
        version: authVersion,
        backup,
        message: sameInode ? '已备份并统一为 symlink' : 'symlink 已建但 inode 校验异常，请人工复查',
      })
    } catch (error) {
      // Roll back so we never leave a broken module in place.
      try {
        if (!existsSync(profPath) && existsSync(backup)) renameSync(backup, profPath)
      } catch {
        /* rollback failure — report below */
      }
      results.push({ package: name, action: 'error', message: error.message })
    }
  }
  return results
}

/**
 * Verify that a just-installed plugin can actually resolve its own
 * peerDependencies from its location, and that it does not carry a real
 * duplicate copy of a core package.
 *
 * @returns {{ok: boolean, warnings: string[]}}
 */
export function verifyPluginPackage(packageName, ctx) {
  const warnings = []
  if (typeof packageName !== 'string' || packageName.trim() === '') {
    return { ok: true, warnings }
  }
  const modulesRoot = profileNodeModules(ctx)
  const pkgDir = packageDir(modulesRoot, packageName)
  const pkgJsonPath = join(pkgDir, 'package.json')

  if (!existsSync(pkgJsonPath)) {
    return { ok: false, warnings: [`${packageName} 未在 profile 层找到（${pkgDir}）`] }
  }

  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
  } catch (error) {
    return { ok: false, warnings: [`${packageName} 的 package.json 解析失败：${error.message}`] }
  }

  // 1) peerDependencies must resolve from the plugin's own location.
  const req = createRequire(join(pkgDir, '__verify__.js'))
  const peers = pkg.peerDependencies ?? {}
  const missing = []
  for (const dep of Object.keys(peers)) {
    try {
      req.resolve(dep)
    } catch {
      missing.push(dep)
    }
  }
  if (missing.length > 0) {
    warnings.push(`peerDependencies 解析失败（可导致启动 ERR_MODULE_NOT_FOUND）：${missing.join(', ')}`)
  }

  // 2) A real (non-symlink) copy of a core package triggers Symbol/instanceof
  //    identity splits. Only check the `@deepseek-ai` scope here.
  const name = packageName.split('/').at(-1)
  const authScoped = join(authoritativeNodeModules(), '@deepseek-ai')
  const profScoped = join(modulesRoot, '@deepseek-ai')
  if (existsSync(join(profScoped, name)) && existsSync(join(authScoped, name))) {
    try {
      if (!lstatSync(join(profScoped, name)).isSymbolicLink()) {
        warnings.push(`核心包 ${name} 在 profile 层存在真实副本（非 symlink），可能引发 Symbol/instanceof 分裂`)
      }
    } catch {
      /* stat race — ignore */
    }
  }

  return { ok: warnings.length === 0, warnings }
}
