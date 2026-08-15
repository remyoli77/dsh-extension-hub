/**
 * dsh-skill-manager — host half.
 *
 * Owns two management surfaces for the DeepSeek Harness web profile:
 *
 *   1. Skills — list / enable / disable / install / uninstall the user's
 *      skills under `~/.dsh/skills` and `~/.agents/skills`. Enable/disable
 *      toggles the `disable-model-invocation` frontmatter flag; install writes
 *      a new `<name>/SKILL.md` bundle; uninstall removes the bundle. The
 *      `dsh-skill-filesystem` watcher (mounted by the agent preset) picks every
 *      change up live, so these operations are hot-plugged with no restart.
 *
 *   2. Plugins — list the Cordis loader entries enriched with a short purpose
 *      and a Chinese translation, and enable / disable / install / uninstall
 *      them at runtime through `ctx.loader`. Runtime changes are hot-plugged
 *      immediately; the durable decisions are recorded in
 *      `~/.dsh/dsh-skill-manager.json` and re-applied on boot.
 *
 * The browser half (./client) renders both surfaces in the web settings panel
 * and talks to this half over the loopback-only `/api/dsh-skill-manager`
 * route family. No dsh source changes.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

/** Stable cordis plugin name. */
export const name = 'skill-manager'

/** Services required before the management surfaces can mount. */
export const inject = ['webServer']

/** Route root. */
export const API_ROOT = '/api/dsh-skill-manager'

/** Skill-name grammar shared with dsh-skill (kebab-case). */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** State file where durable plugin decisions live. */
const STATE_FILE = () => join(resolveDshHome(), 'dsh-skill-manager.json')

/** Cap on JSON request bodies (skill bodies are the only large field). */
const MAX_JSON_BODY_BYTES = 4 * 1024 * 1024

// ── plugin description dictionary ────────────────────────────────────────────
// moduleName -> { en, zh }. Unknown plugins fall back to a generic label.
const PLUGIN_DESCRIPTIONS = {
  // ── client UI ──────────────────────────────────────────────────────────────
  '@deepseek-ai/dsh-client-ui-sidebar': { en: 'App sidebar shell', zh: '应用侧边栏外壳' },
  '@deepseek-ai/dsh-client-ui-layout': { en: 'App layout framework', zh: '应用布局框架' },
  '@deepseek-ai/dsh-client-ui-theme': { en: 'Theme engine (light/dark)', zh: '主题引擎（亮/暗色）' },
  '@deepseek-ai/dsh-client-ui-settings': { en: 'Settings panel base service', zh: '设置面板基础服务' },
  '@deepseek-ai/dsh-client-ui-settings-general': { en: 'General settings section', zh: '通用设置分区' },
  '@deepseek-ai/dsh-client-ui-settings-models': { en: 'Model settings section', zh: '模型设置分区' },
  '@deepseek-ai/dsh-client-ui-settings-plugins': { en: 'Plugin configuration section', zh: '插件配置分区' },
  '@deepseek-ai/dsh-client-ui-settings-plugin-inventory': { en: 'Read-only plugin inventory list', zh: '只读插件清单列表' },
  '@deepseek-ai/dsh-client-ui-conversation': { en: 'Conversation / chat view', zh: '会话 / 聊天视图' },
  '@deepseek-ai/dsh-client-ui-commands': { en: 'Slash-command surface', zh: '斜杠命令界面' },
  '@deepseek-ai/dsh-client-ui-skill': { en: 'Skill reference source (@)', zh: '技能引用数据源（@）' },
  '@deepseek-ai/dsh-client-ui-subagent': { en: 'Subagent reference source (@)', zh: '子代理引用数据源（@）' },
  '@deepseek-ai/dsh-client-ui-jobs': { en: 'Background jobs list', zh: '后台任务列表' },
  '@deepseek-ai/dsh-client-ui-goal': { en: 'Goal progress bar', zh: '目标进度条' },
  '@deepseek-ai/dsh-client-ui-model-selection': { en: 'Model picker (/model)', zh: '模型选择器（/model）' },
  '@deepseek-ai/dsh-client-ui-cordis': { en: 'Cordis run panel', zh: 'Cordis 运行面板' },
  '@deepseek-ai/dsh-client-ui-workspace': { en: 'Workspace surface', zh: '工作区界面' },
  '@deepseek-ai/dsh-client-ui-deliverables': { en: 'Produced-files list per turn', zh: '每轮产出文件列表' },
  '@deepseek-ai/dsh-client-ui-plan': { en: 'Plan mode control', zh: '计划模式控制' },
  '@deepseek-ai/dsh-client-ui-user-questions': { en: 'User questions surface', zh: '用户提问界面' },
  '@deepseek-ai/dsh-client-ui-trajectory': { en: 'Trajectory view', zh: '轨迹视图' },
  '@deepseek-ai/dsh-client-ui-workflow-run': { en: 'Workflow run node', zh: '工作流运行节点' },
  '@deepseek-ai/dsh-client-ui-message-feedback': { en: 'Message like/dislike feedback', zh: '消息点赞/点踩反馈' },
  '@deepseek-ai/dsh-client-ui-agent-preset': { en: 'Agent preset selection', zh: 'Agent 预设选择' },
  '@deepseek-ai/dsh-client-ui-permission-presets': { en: 'Permission preset selection', zh: '权限预设选择' },
  '@deepseek-ai/dsh-client-ui-input-trigger': { en: 'Input trigger pipeline (/ and @)', zh: '输入触发器（/ 与 @）' },
  '@deepseek-ai/dsh-client-ui-tool': { en: 'Tool call card tree', zh: '工具调用卡片树' },
  '@deepseek-ai/dsh-skill-badge': { en: 'Skill badge', zh: '技能徽标' },
  // ── transport / client runtime ─────────────────────────────────────────────
  '@deepseek-ai/dsh-client-connection': { en: 'Web transport client', zh: 'Web 传输客户端' },
  '@deepseek-ai/dsh-api-remotes': { en: 'Host RPC remotes', zh: '宿主 RPC 远程接口' },
  '@deepseek-ai/dsh-client-runtime': { en: 'Client runtime', zh: '客户端运行时' },
  '@deepseek-ai/dsh-client-modules': { en: 'Client module system', zh: '客户端模块系统' },
  '@deepseek-ai/dsh-client-locale': { en: 'Locale engine (i18n)', zh: '多语言引擎（i18n）' },
  '@deepseek-ai/dsh-client-hmr': { en: 'Client hot-reload', zh: '客户端热重载' },
  '@deepseek-ai/dsh-api-gateway': { en: 'API gateway', zh: 'API 网关' },
  '@deepseek-ai/dsh-host-apiproxy': { en: 'Host API proxy', zh: '宿主 API 代理' },
  '@deepseek-ai/dsh-host-webserver': { en: 'HTTP / WebSocket server', zh: 'HTTP / WebSocket 服务器' },
  '@deepseek-ai/dsh-web': { en: 'Web app entry', zh: 'Web 应用入口' },
  '@deepseek-ai/dsh-web-app': { en: 'Web app bootstrap & config', zh: 'Web 应用启动与配置' },
  '@deepseek-ai/dsh-web-app/startup': { en: 'Web startup flag parsing', zh: 'Web 启动参数解析' },
  '@deepseek-ai/dsh-host-plugin-inventory': { en: 'Loader inventory projection', zh: 'Loader 清单投影' },
  '@deepseek-ai/dsh-host-directory-picker-auto': { en: 'Directory picker (auto)', zh: '目录选择器（自动）' },
  '@deepseek-ai/dsh-cordis-client-runner': { en: 'Cordis client runner', zh: 'Cordis 客户端运行器' },
  '@deepseek-ai/dsh-cordis-host-runner': { en: 'Dynamic Cordis plugin runner', zh: '动态 Cordis 插件运行器' },
  '@deepseek-ai/dsh-typert-loader': { en: 'Typert loader', zh: 'Typert 加载器' },
  '@deepseek-ai/dsh-typert-registry': { en: 'Typert registry', zh: 'Typert 注册表' },
  // ── agent / tools ──────────────────────────────────────────────────────────
  '@deepseek-ai/dsh-agent': { en: 'Agent definition', zh: 'Agent 定义' },
  '@deepseek-ai/dsh-agent-loop': { en: 'Agent turn loop', zh: 'Agent 回合循环' },
  '@deepseek-ai/dsh-agent-default-model': { en: 'Default model resolution', zh: '默认模型解析' },
  '@deepseek-ai/dsh-agent-instructions': { en: 'Agent instruction injection', zh: 'Agent 指令注入' },
  '@deepseek-ai/dsh-agent-presets': { en: 'Agent preset management', zh: 'Agent 预设管理' },
  '@deepseek-ai/dsh-tools': { en: 'Tool registry', zh: '工具注册表' },
  '@deepseek-ai/dsh-tool-bash': { en: 'Bash execution tool', zh: 'Bash 执行工具' },
  '@deepseek-ai/dsh-tool-pwsh': { en: 'PowerShell execution tool', zh: 'PowerShell 执行工具' },
  '@deepseek-ai/dsh-tool-fs': { en: 'File read/write tool', zh: '文件读写工具' },
  '@deepseek-ai/dsh-tool-fs-search': { en: 'File search tool', zh: '文件搜索工具' },
  '@deepseek-ai/dsh-tool-skill': { en: 'Skill loader tool', zh: '技能加载工具' },
  '@deepseek-ai/dsh-tool-todo': { en: 'Todo list tool', zh: '任务清单工具' },
  '@deepseek-ai/dsh-tool-web': { en: 'Web search tool', zh: '网络搜索工具' },
  '@deepseek-ai/dsh-tool-goal': { en: 'Goal tool', zh: '目标工具' },
  '@deepseek-ai/dsh-tool-jobs': { en: 'Background job controls', zh: '后台任务控制工具' },
  '@deepseek-ai/dsh-tool-workflow': { en: 'Workflow orchestration tool', zh: '工作流编排工具' },
  '@deepseek-ai/dsh-tool-ralph': { en: 'Ralph iteration tool', zh: 'Ralph 迭代工具' },
  '@deepseek-ai/dsh-tool-subagent': { en: 'Subagent delegation tool', zh: '子代理委托工具' },
  '@deepseek-ai/dsh-tool-subagent-control': { en: 'Subagent control tool', zh: '子代理控制工具' },
  '@deepseek-ai/dsh-tool-subagent-control/list-agents': { en: 'Subagent listing', zh: '子代理列表' },
  '@deepseek-ai/dsh-tool-subagent-report': { en: 'Subagent report', zh: '子代理报告' },
  '@deepseek-ai/dsh-tool-str-replace-editor': { en: 'String replace editor', zh: '字符串替换编辑器' },
  '@deepseek-ai/dsh-tool-call-timeout-policy': { en: 'Tool call timeout policy', zh: '工具调用超时策略' },
  '@deepseek-ai/dsh-repeat-tool-reminder': { en: 'Repeat tool reminder', zh: '重复工具提醒' },
  // ── LLM ────────────────────────────────────────────────────────────────────
  '@deepseek-ai/dsh-llm': { en: 'LLM routing', zh: 'LLM 路由' },
  '@deepseek-ai/dsh-llm-deepseek': { en: 'DeepSeek model provider', zh: 'DeepSeek 模型提供者' },
  '@deepseek-ai/dsh-llm-pi-ai': { en: 'Pi AI model provider', zh: 'Pi AI 模型提供者' },
  '@deepseek-ai/dsh-llm-retry': { en: 'LLM retry', zh: 'LLM 重试' },
  '@deepseek-ai/dsh-web-search-deepseek': { en: 'DeepSeek web search', zh: 'DeepSeek 网络搜索' },
  // ── session ────────────────────────────────────────────────────────────────
  '@deepseek-ai/dsh-session': { en: 'Session core', zh: '会话核心' },
  '@deepseek-ai/dsh-session-persistence-jsonl': { en: 'JSONL session persistence', zh: 'JSONL 会话持久化' },
  '@deepseek-ai/dsh-session-projection': { en: 'Session projection', zh: '会话投影' },
  '@deepseek-ai/dsh-session-projection-cache': { en: 'Session projection cache', zh: '会话投影缓存' },
  '@deepseek-ai/dsh-session-query-sqlite': { en: 'SQLite session query', zh: 'SQLite 会话查询' },
  '@deepseek-ai/dsh-session-stats': { en: 'Session stats', zh: '会话统计' },
  '@deepseek-ai/dsh-session-title': { en: 'Session title', zh: '会话标题' },
  '@deepseek-ai/dsh-session-title-first-prompt-llm': { en: 'First-prompt session titling', zh: '首条提示生成标题' },
  '@deepseek-ai/dsh-session-log-export': { en: 'Session log export', zh: '会话日志导出' },
  '@deepseek-ai/dsh-session-checkpoint-policy': { en: 'Session checkpoint policy', zh: '会话检查点策略' },
  '@deepseek-ai/dsh-session-telemetry-otel': { en: 'OpenTelemetry telemetry', zh: 'OpenTelemetry 遥测' },
  // ── skills ─────────────────────────────────────────────────────────────────
  '@deepseek-ai/dsh-skill': { en: 'Skill provider registry', zh: '技能提供者注册表' },
  '@deepseek-ai/dsh-skill-filesystem': { en: 'Filesystem skill provider', zh: '文件系统技能提供者' },
  // ── sandbox / fs / security ────────────────────────────────────────────────
  '@deepseek-ai/dsh-fs-observation-policy': { en: 'File observation policy', zh: '文件观察策略' },
  '@deepseek-ai/dsh-fs-sandbox': { en: 'File sandbox', zh: '文件沙箱' },
  '@deepseek-ai/dsh-sandbox-local': { en: 'Local sandbox', zh: '本地沙箱' },
  '@deepseek-ai/dsh-sandbox-policy': { en: 'Sandbox policy', zh: '沙箱策略' },
  '@deepseek-ai/dsh-bash-sandbox': { en: 'Bash sandbox', zh: 'Bash 沙箱' },
  '@deepseek-ai/dsh-pwsh-sandbox': { en: 'PowerShell sandbox', zh: 'PowerShell 沙箱' },
  '@deepseek-ai/dsh-credentials-local': { en: 'Local credentials store', zh: '本地凭据存储' },
  '@deepseek-ai/dsh-user-approval': { en: 'User approval flow', zh: '用户审批流程' },
  '@deepseek-ai/dsh-permission-presets': { en: 'Permission presets', zh: '权限预设' },
  '@deepseek-ai/dsh-subprocess-local': { en: 'Local subprocess', zh: '本地子进程' },
  '@deepseek-ai/dsh-code-runtime-worker-thread': { en: 'Code runtime worker thread', zh: '代码运行工作线程' },
  '@deepseek-ai/dsh-workflow-worker-thread': { en: 'Workflow worker thread', zh: '工作流工作线程' },
  // ── goal / plan / compaction ───────────────────────────────────────────────
  '@deepseek-ai/dsh-goal': { en: 'Goal service', zh: '目标服务' },
  '@deepseek-ai/dsh-goal-round-driver': { en: 'Goal round driver', zh: '目标回合驱动器' },
  '@deepseek-ai/dsh-plan-mode': { en: 'Plan mode', zh: '计划模式' },
  '@deepseek-ai/dsh-command-goal': { en: 'Goal command', zh: '目标命令' },
  '@deepseek-ai/dsh-compaction-basic': { en: 'Context compaction', zh: '上下文压缩' },
  '@deepseek-ai/dsh-compaction-tool-result-pruner': { en: 'Tool result pruner', zh: '工具结果裁剪器' },
  '@deepseek-ai/dsh-command-compact': { en: 'Compact command', zh: '压缩命令' },
  '@deepseek-ai/dsh-command-feedback': { en: 'Feedback command', zh: '反馈命令' },
  '@deepseek-ai/dsh-commands': { en: 'Command registry', zh: '命令注册表' },
  // ── storage / settings / misc ──────────────────────────────────────────────
  '@deepseek-ai/dsh-storage': { en: 'Storage service', zh: '存储服务' },
  '@deepseek-ai/dsh-storage-domain': { en: 'Storage domain', zh: '存储域' },
  '@deepseek-ai/dsh-storage-json': { en: 'JSON storage backend', zh: 'JSON 存储后端' },
  '@deepseek-ai/dsh-settings-file': { en: 'Settings file storage', zh: '设置文件存储' },
  '@deepseek-ai/dsh-shell-env': { en: 'Shell environment variables', zh: 'Shell 环境变量' },
  '@deepseek-ai/dsh-workspace': { en: 'Workspace service', zh: '工作区服务' },
  '@deepseek-ai/dsh-system-prompt': { en: 'System prompt', zh: '系统提示词' },
  '@deepseek-ai/dsh-token-meter': { en: 'Token meter', zh: 'Token 计量器' },
  '@deepseek-ai/dsh-spill-local': { en: 'Local spill storage', zh: '本地溢出存储' },
  '@deepseek-ai/dsh-spill-policy': { en: 'Spill policy', zh: '溢出策略' },
  '@deepseek-ai/dsh-jobs-local': { en: 'Local background jobs', zh: '本地后台任务' },
  '@deepseek-ai/dsh-subagent': { en: 'Subagent registry', zh: '子代理注册表' },
  '@deepseek-ai/dsh-subagent-fork-in-process': { en: 'In-process fork subagent', zh: '进程内 fork 子代理' },
  '@deepseek-ai/dsh-subagent-spawn-in-process': { en: 'In-process spawn subagent', zh: '进程内 spawn 子代理' },
  '@deepseek-ai/dsh-message-feedback': { en: 'Message feedback', zh: '消息反馈' },
  '@deepseek-ai/dsh-user-questions': { en: 'User questions service', zh: '用户提问服务' },
  '@deepseek-ai/dsh-attachment-local': { en: 'Local attachment', zh: '本地附件' },
  '@deepseek-ai/dsh-persona': { en: 'Agent persona / system prompt', zh: 'Agent 人设 / 系统提示词' },
  '@deepseek-ai/dsh-tool-ask-user': { en: 'Ask-user question tool', zh: '向用户提问工具' },
  '@deepseek-ai/dsh-host-directory-picker-native': { en: 'Native directory picker (host)', zh: '系统目录选择器（宿主）' },
  '@deepseek-ai/dsh-client-ui-directory-picker-native': { en: 'Native directory picker (UI)', zh: '系统目录选择器（界面）' },
  // ── cordis runtime plugins ─────────────────────────────────────────────────
  '@deepseek-ai/cordis-plugin-hmr': { en: 'Hot module reload', zh: '热模块重载' },
  '@deepseek-ai/cordis-plugin-timer': { en: 'Timer service', zh: '定时器服务' },
  // ── third-party ────────────────────────────────────────────────────────────
  '@linxin666/dsh-ssh': { en: 'Remote SSH operations (config, exec, terminal, transfer, tunnels)', zh: '远程 SSH 运维（配置/执行/终端/传输/隧道）' },
  '@linxin666/dsh-web-ui-all': { en: 'Web UI family aggregate installer', zh: 'Web UI 全家桶聚合安装器' },
  '@linxin666/dsh-client-ui-web-ui-settings': { en: 'Web UI plugin group card', zh: 'Web UI 插件分组卡片' },
  '@linxin666/dsh-client-ui-task-board': { en: 'Task board with cron scheduling', zh: '任务看板（支持 cron 定时）' },
  '@linxin666/dsh-client-ui-aionui-panel': { en: 'Right panel: Explorer / Preview / SCM', zh: '右侧面板：文件树 / 预览 / 变更' },
  '@linxin666/dsh-client-ui-git-graph': { en: 'Git commit graph', zh: 'Git 提交图' },
  '@linxin666/dsh-pet': { en: 'Desktop pet', zh: '桌面宠物' },
  '@linxin666/dsh-live-stats': { en: 'Live usage stats', zh: '实时用量统计' },
  '@linxin666/dsh-remote-web-ui': { en: 'Remote web UI', zh: '远程 Web UI' },
  '@linxin666/dsh-client-ui-skin-center': { en: 'Skin center', zh: '皮肤中心' },
  'dsh-skill-manager': { en: 'Skill & plugin manager (this plugin)', zh: '技能与插件管理器（本插件）' },
  '@dsh-external/dsh-client-ui-skin-maid-atelier': { en: 'Maid Atelier skin', zh: '女仆工坊皮肤' },
  '@anionex/dsh-vision-toolkit': { en: 'Vision toolkit', zh: '视觉工具包' },
}

/** Entries that keep the web GUI alive — never disable these from the panel. */
const PROTECTED_MODULES = new Set([
  '@deepseek-ai/dsh-client-modules',
  '@deepseek-ai/dsh-client-connection',
  '@deepseek-ai/dsh-api-remotes',
  '@deepseek-ai/dsh-client-runtime',
  '@deepseek-ai/dsh-host-apiproxy',
  '@deepseek-ai/dsh-host-webserver',
  '@deepseek-ai/dsh-web-app',
  '@deepseek-ai/dsh-web-app/startup',
  '@deepseek-ai/dsh-client-ui-settings',
  '@deepseek-ai/dsh-client-ui-settings-general',
  '@deepseek-ai/dsh-client-ui-layout',
  '@deepseek-ai/dsh-client-ui-sidebar',
  '@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-client-ui-theme',
  'dsh-skill-manager',
])

const PROTECTED_IDS = new Set(['include:modules', 'include:connection', 'include:api-remotes', 'include:client-runtime', 'include:api-gateway', 'include:webserver', 'include:web-runtime', 'include:web-startup', 'include:ui-settings', 'include:ui-settings-general', 'include:ui-layout', 'include:ui-sidebar', 'include:locale', 'include:ui-theme', 'include:client-hmr', 'include:skill-manager'])

// ── small helpers ────────────────────────────────────────────────────────────

/** Write one JSON response. */
function writeJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'referrer-policy': 'no-referrer', 'cache-control': 'no-cache' })
  res.end(payload)
}

/** Read a JSON request body (undefined when too large or unparseable). */
async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk
    size += buffer.length
    if (size > MAX_JSON_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return typeof parsed === 'object' && parsed !== null ? parsed : undefined
  } catch {
    return undefined
  }
}

/** Loopback + same-origin fence (mirrors the dsh-ssh trust fence). */
function isLoopbackRequest(request) {
  const address = request.socket.remoteAddress
  if (address !== '127.0.0.1' && address !== '::1' && address !== '::ffff:127.0.0.1') return false
  const host = request.headers.host
  if (typeof host !== 'string') return false
  let hostUrl
  try {
    hostUrl = new URL(`http://${host}`)
  } catch {
    return false
  }
  if (hostUrl.hostname !== '127.0.0.1' && hostUrl.hostname !== 'localhost' && hostUrl.hostname !== '[::1]') return false
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

// ── durable state ────────────────────────────────────────────────────────────

function readState() {
  try {
    const raw = readFileSync(STATE_FILE(), 'utf8')
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) return parsed
  } catch {
    /* absent or corrupt → empty */
  }
  return { version: 1, pluginOverrides: {}, installedPlugins: [] }
}

function writeState(state) {
  try {
    mkdirSync(dirname(STATE_FILE()), { recursive: true })
    writeFileSync(STATE_FILE(), JSON.stringify(state, null, 2) + '\n')
    return true
  } catch (error) {
    console.warn('[dsh-skill-manager] failed to write state:', errorMessage(error))
    return false
  }
}

// ── skills ───────────────────────────────────────────────────────────────────

function userAgentsSkillsDir() {
  return join(process.env.DSH_AGENTS_HOME ?? join(homedir(), '.agents'), 'skills')
}

function userDshSkillsDir() {
  return join(resolveDshHome(), 'skills')
}

/** Split a SKILL.md into its frontmatter text and body text. */
function splitFrontmatter(raw) {
  const normalized = raw.startsWith('\uFEFF') ? raw.slice(1) : raw
  if (!normalized.startsWith('---')) return { frontmatter: undefined, body: normalized }
  const firstNl = normalized.indexOf('\n')
  if (firstNl < 0) return { frontmatter: undefined, body: normalized }
  if (normalized.slice(0, firstNl).replace(/\r$/, '') !== '---') return { frontmatter: undefined, body: normalized }
  let pos = firstNl + 1
  while (pos <= normalized.length) {
    const nl = normalized.indexOf('\n', pos)
    const lineEnd = nl < 0 ? normalized.length : nl
    const line = normalized.slice(pos, lineEnd).replace(/\r$/, '')
    if (line === '---') {
      const bodyStart = nl < 0 ? normalized.length : nl + 1
      return {
        frontmatter: normalized.slice(firstNl + 1, pos),
        body: normalized.slice(bodyStart),
      }
    }
    if (nl < 0) break
    pos = nl + 1
  }
  return { frontmatter: undefined, body: normalized }
}

/** Parse a skill's frontmatter into a plain object (undefined when absent/invalid). */
function parseSkillFrontmatter(raw) {
  const { frontmatter } = splitFrontmatter(raw)
  if (frontmatter === undefined) return undefined
  try {
    const data = parseYaml(frontmatter)
    return typeof data === 'object' && data !== null && !Array.isArray(data) ? data : undefined
  } catch {
    return undefined
  }
}

/** Locate a skill bundle for a name inside one root. Returns { dir, file } or undefined. */
function locateSkill(rootPath, name) {
  const dirPath = join(rootPath, name)
  const dirSkill = join(dirPath, 'SKILL.md')
  if (existsSync(dirSkill)) return { kind: 'directory', dir: dirPath, file: dirSkill }
  const flatPath = join(rootPath, `${name}.md`)
  if (existsSync(flatPath)) return { kind: 'file', dir: rootPath, file: flatPath }
  return undefined
}

/** Scan one skill root into summary rows. */
function scanSkillRoot(rootPath, source) {
  const out = []
  let entries
  try {
    entries = readdirSync(rootPath, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.name === '.system') continue
    let file
    let kind
    if (entry.isDirectory()) {
      const candidate = join(rootPath, entry.name, 'SKILL.md')
      if (!existsSync(candidate)) continue
      file = candidate
      kind = 'directory'
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      file = join(rootPath, entry.name)
      kind = 'file'
    } else {
      continue
    }
    let raw
    try {
      raw = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const frontmatter = parseSkillFrontmatter(raw)
    if (frontmatter === undefined) continue
    const skillName = typeof frontmatter.name === 'string' ? frontmatter.name : (kind === 'directory' ? entry.name : entry.name.replace(/\.md$/, ''))
    if (!SKILL_NAME.test(skillName)) continue
    const description = typeof frontmatter.description === 'string' ? frontmatter.description : ''
    out.push({
      name: skillName,
      description,
      whenToUse: typeof frontmatter.whenToUse === 'string' ? frontmatter.whenToUse : undefined,
      source,
      editable: true,
      enabled: frontmatter['disable-model-invocation'] !== true,
      userInvocable: frontmatter['user-invocable'] !== false,
      kind,
      dir: kind === 'directory' ? join(rootPath, entry.name) : rootPath,
      file,
      installed: true,
    })
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

/** List every user-editable skill. */
function listSkills() {
  return [
    ...scanSkillRoot(userDshSkillsDir(), 'user-dsh'),
    ...scanSkillRoot(userAgentsSkillsDir(), 'user-agents'),
  ]
}

/**
 * Rebuild a SKILL.md after toggling `disable-model-invocation`.
 * Returns the new raw text, or undefined when the file has no frontmatter.
 */
function withModelInvocation(raw, enabled) {
  const { frontmatter, body } = splitFrontmatter(raw)
  if (frontmatter === undefined) return undefined
  let data
  try {
    data = parseYaml(frontmatter)
  } catch {
    return undefined
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) data = {}
  if (enabled) {
    delete data['disable-model-invocation']
  } else {
    data['disable-model-invocation'] = true
  }
  const nextFrontmatter = stringifyYaml(data)
  return `---\n${nextFrontmatter}---\n${body}`
}

/** Enable or disable a skill (toggle `disable-model-invocation`). */
function toggleSkill(name, enabled) {
  if (!SKILL_NAME.test(name)) return { ok: false, error: `invalid skill name "${name}"` }
  for (const root of [userDshSkillsDir(), userAgentsSkillsDir()]) {
    const loc = locateSkill(root, name)
    if (loc === undefined) continue
    const raw = readFileSync(loc.file, 'utf8')
    const next = withModelInvocation(raw, enabled)
    if (next === undefined) return { ok: false, error: `skill "${name}" has no editable YAML frontmatter` }
    writeFileSync(loc.file, next, 'utf8')
    return { ok: true, name, enabled, file: loc.file }
  }
  return { ok: false, error: `skill "${name}" not found in the user skill roots` }
}

/** Install a new skill as `~/.dsh/skills/<name>/SKILL.md`. */
function installSkill({ name, description, whenToUse, content }) {
  if (!SKILL_NAME.test(name)) return { ok: false, error: `invalid skill name "${name}" (expected kebab-case)` }
  if (typeof description !== 'string' || description.trim() === '') return { ok: false, error: 'description is required' }
  const body = typeof content === 'string' ? content : ''
  const root = userDshSkillsDir()
  const dir = join(root, name)
  if (existsSync(dir)) return { ok: false, error: `skill "${name}" already exists` }
  const frontmatter = {
    name,
    description: description.trim(),
    ...(whenToUse !== undefined && whenToUse !== '' ? { whenToUse } : {}),
  }
  const text = `---\n${stringifyYaml(frontmatter)}---\n${body.endsWith('\n') || body === '' ? body : body + '\n'}`
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'SKILL.md'), text, 'utf8')
  return { ok: true, name, dir }
}

/** Uninstall a skill (remove its bundle from the user roots). */
function uninstallSkill(name, source) {
  if (!SKILL_NAME.test(name)) return { ok: false, error: `invalid skill name "${name}"` }
  const roots = source === 'user-agents' ? [userAgentsSkillsDir()] : source === 'user-dsh' ? [userDshSkillsDir()] : [userDshSkillsDir(), userAgentsSkillsDir()]
  for (const root of roots) {
    const loc = locateSkill(root, name)
    if (loc === undefined) continue
    if (loc.kind === 'directory') {
      rmSync(loc.dir, { recursive: true, force: true })
    } else {
      rmSync(loc.file, { force: true })
    }
    return { ok: true, name }
  }
  return { ok: false, error: `skill "${name}" not found in the user skill roots` }
}

// ── plugins ──────────────────────────────────────────────────────────────────

const FIBER_STATE = { PENDING: 0, LOADING: 1, ACTIVE: 2, FAILED: 3, DISPOSED: 4, UNLOADING: 5 }
const FIBER_PHASE = {
  [FIBER_STATE.PENDING]: 'pending',
  [FIBER_STATE.LOADING]: 'loading',
  [FIBER_STATE.ACTIVE]: 'active',
  [FIBER_STATE.FAILED]: 'failed',
  [FIBER_STATE.DISPOSED]: null,
  [FIBER_STATE.UNLOADING]: 'unloading',
}

function describePlugin(moduleName) {
  return PLUGIN_DESCRIPTIONS[moduleName] ?? { en: '', zh: '' }
}

function shortName(moduleName) {
  return (moduleName.startsWith('@') ? moduleName.slice(moduleName.indexOf('/') + 1) : moduleName).replace(/^cordis:/, '').replace(/^cordis-plugin-/, '').replace(/^dsh-(?:host-|client-)?/, '')
}

/** Whether an entry is a container (group / root include) that must never be managed. */
function isContainerEntry(entry) {
  return entry.options.group === true
    || entry.id === 'include'
    || entry.options.name === 'cordis:include'
    || entry.options.name === 'cordis:group'
}

/** Whether an entry is protected from enable/disable/uninstall. */
function isProtectedEntry(entry) {
  return isContainerEntry(entry) || PROTECTED_MODULES.has(entry.options.name) || PROTECTED_IDS.has(entry.id)
}

/** Read the current non-group loader entries, enriched. */
function listPlugins(ctx) {
  const state = readState()
  const entries = []
  for (const entry of ctx.loader.entries()) {
    if (isContainerEntry(entry)) continue
    const moduleName = entry.options.name
    const disabled = entry.disabled
    const phase = entry.fiber === undefined ? null : FIBER_PHASE[entry.fiber.state]
    const desc = describePlugin(moduleName)
    entries.push({
      entryId: entry.id,
      moduleName,
      title: shortName(moduleName),
      enabled: !disabled,
      fiberPhase: phase,
      description: desc.en,
      zh: desc.zh,
      protected: isProtectedEntry(entry),
      userInstalled: Array.isArray(state.installedPlugins) && state.installedPlugins.some((p) => p.id === entry.id),
    })
  }
  return entries
}

/** Enable or disable one loader entry (runtime + durable state). */
async function togglePlugin(ctx, entryId, enabled) {
  const state = readState()
  const entry = [...ctx.loader.entries()].find((e) => e.id === entryId)
  if (entry === undefined) return { ok: false, error: `plugin entry "${entryId}" not found` }
  if (isProtectedEntry(entry)) {
    return { ok: false, error: `plugin "${entryId}" is a protected/core entry and cannot be disabled` }
  }
  await ctx.loader.update(entryId, { disabled: !enabled })
  const overrides = state.pluginOverrides && typeof state.pluginOverrides === 'object' ? state.pluginOverrides : {}
  if (!enabled) {
    overrides[entryId] = { disabled: true }
  } else {
    delete overrides[entryId]
  }
  state.pluginOverrides = overrides
  writeState(state)
  return { ok: true, entryId, enabled }
}

/** Register a package that is already resolvable in the profile node_modules. */
async function installPlugin(ctx, { id, name: packageName }) {
  if (typeof packageName !== 'string' || packageName.trim() === '') return { ok: false, error: 'package name is required' }
  const entryId = typeof id === 'string' && id.trim() !== '' ? id.trim() : shortName(packageName)
  const existing = [...ctx.loader.entries()].find((e) => e.id === entryId && !e.options.group)
  if (existing !== undefined) return { ok: false, error: `plugin entry "${entryId}" already exists` }
  await ctx.loader.create({ id: entryId, name: packageName })
  const state = readState()
  const installed = Array.isArray(state.installedPlugins) ? state.installedPlugins : []
  if (!installed.some((p) => p.id === entryId)) installed.push({ id: entryId, name: packageName })
  state.installedPlugins = installed
  writeState(state)
  return { ok: true, entryId, name: packageName }
}

/** Remove a user-installed entry, or disable an in-box entry. */
async function uninstallPlugin(ctx, entryId) {
  const state = readState()
  const entry = [...ctx.loader.entries()].find((e) => e.id === entryId)
  if (entry === undefined) return { ok: false, error: `plugin entry "${entryId}" not found` }
  if (isProtectedEntry(entry)) {
    return { ok: false, error: `plugin "${entryId}" is a protected/core entry and cannot be uninstalled` }
  }
  const installed = Array.isArray(state.installedPlugins) ? state.installedPlugins : []
  const wasUserInstalled = installed.some((p) => p.id === entryId)
  if (wasUserInstalled) {
    await ctx.loader.remove(entryId)
    state.installedPlugins = installed.filter((p) => p.id !== entryId)
  } else {
    await ctx.loader.update(entryId, { disabled: true })
    const overrides = state.pluginOverrides && typeof state.pluginOverrides === 'object' ? state.pluginOverrides : {}
    overrides[entryId] = { disabled: true }
    state.pluginOverrides = overrides
  }
  writeState(state)
  return { ok: true, entryId, removed: wasUserInstalled }
}

/** Re-apply durable plugin decisions after boot. */
async function applyBootOverrides(ctx) {
  const state = readState()
  const overrides = state.pluginOverrides && typeof state.pluginOverrides === 'object' ? state.pluginOverrides : {}
  for (const [entryId, override] of Object.entries(overrides)) {
    const entry = [...ctx.loader.entries()].find((e) => e.id === entryId)
    if (entry === undefined) continue
    // Never disable containers (root include / groups) or protected entries at boot.
    if (isProtectedEntry(entry)) continue
    try {
      await ctx.loader.update(entryId, { disabled: override.disabled !== false })
    } catch (error) {
      console.warn(`[dsh-skill-manager] failed to apply override for "${entryId}":`, errorMessage(error))
    }
  }
  for (const installed of (Array.isArray(state.installedPlugins) ? state.installedPlugins : [])) {
    const exists = [...ctx.loader.entries()].some((e) => e.id === installed.id && !e.options.group)
    if (exists) continue
    try {
      await ctx.loader.create({ id: installed.id, name: installed.name })
    } catch (error) {
      console.warn(`[dsh-skill-manager] failed to reinstall "${installed.id}":`, errorMessage(error))
    }
  }
}

// ── remote search & install ──────────────────────────────────────────────────

const UA_HEADERS = { 'user-agent': 'dsh-skill-manager' }

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`)
  return await response.json()
}

async function fetchText(url) {
  const response = await fetch(url, { headers: UA_HEADERS })
  if (!response.ok) return undefined
  return await response.text()
}

/** Search GitHub repositories (public API, no auth). */
async function searchGitHub(query) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=15`
  const data = await fetchJson(url, { ...UA_HEADERS, accept: 'application/vnd.github+json' })
  return (data.items ?? []).map((item) => ({
    source: 'github',
    fullName: item.full_name ?? '',
    name: item.name ?? '',
    description: item.description ?? '',
    htmlUrl: item.html_url ?? '',
    stars: item.stargazers_count ?? 0,
    language: item.language ?? '',
  }))
}

/** Search Gitee repositories (public API, no auth). */
async function searchGitee(query) {
  const url = `https://gitee.com/api/v5/search/repositories?q=${encodeURIComponent(query)}&sort=stars_count&order=desc&per_page=15`
  const data = await fetchJson(url, UA_HEADERS)
  return (data ?? []).map((item) => ({
    source: 'gitee',
    fullName: item.full_name ?? item.path_with_namespace ?? '',
    name: item.name ?? '',
    description: item.description ?? '',
    htmlUrl: item.html_url ?? '',
    stars: item.stargazers_count ?? 0,
    language: item.language ?? '',
  }))
}

/** Run a GitHub + Gitee repository search and merge by star count. */
async function searchRepos(query, source) {
  const q = `${query} dsh`
  const tasks = []
  if (source === 'github' || source === 'both') tasks.push(searchGitHub(q))
  if (source === 'gitee' || source === 'both') tasks.push(searchGitee(q))
  const settled = await Promise.allSettled(tasks)
  const results = []
  for (const entry of settled) if (entry.status === 'fulfilled') results.push(...entry.value)
  return results.sort((a, b) => b.stars - a.stars)
}

/** Parse a remote SKILL.md into an installable definition. */
function parseSkillText(raw) {
  const { frontmatter, body } = splitFrontmatter(raw)
  if (frontmatter === undefined) return undefined
  let data
  try {
    data = parseYaml(frontmatter)
  } catch {
    return undefined
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) data = {}
  if (typeof data.name !== 'string' || !SKILL_NAME.test(data.name)) return undefined
  return {
    name: data.name,
    description: typeof data.description === 'string' ? data.description : '',
    whenToUse: typeof data.whenToUse === 'string' ? data.whenToUse : undefined,
    content: body.trim(),
  }
}

/** Try to fetch the repository's SKILL.md from GitHub/Gitee raw endpoints. */
async function tryFetchSkill(source, owner, repo) {
  for (const branch of ['main', 'master']) {
    const url = source === 'github'
      ? `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/SKILL.md`
      : `https://gitee.com/${owner}/${repo}/raw/${branch}/SKILL.md`
    const text = await fetchText(url)
    if (text === undefined) continue
    const parsed = parseSkillText(text)
    if (parsed !== undefined) return parsed
  }
  return undefined
}

/** Try to fetch the repository's package.json and detect a dsh bundle. */
async function tryFetchPluginPackage(source, owner, repo) {
  for (const branch of ['main', 'master']) {
    const url = source === 'github'
      ? `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/package.json`
      : `https://gitee.com/${owner}/${repo}/raw/${branch}/package.json`
    const text = await fetchText(url)
    if (text === undefined) continue
    try {
      const pkg = JSON.parse(text)
      if (pkg && pkg.dsh && pkg.dsh.bundle) return pkg
    } catch {
      /* not JSON */
    }
  }
  return undefined
}

/** Resolve the profile name this plugin is mounted under (defaults to web). */
function profileName(ctx) {
  try {
    const base = ctx.baseUrl
    if (typeof base === 'string' && base !== '') return basename(fileURLToPath(base)) || 'web'
  } catch {
    /* fall through */
  }
  return 'web'
}

/** Detect and install a GitHub/Gitee repository as a skill or a plugin. */
async function installFromRepo(ctx, { source, fullName }) {
  if (typeof fullName !== 'string' || !fullName.includes('/')) return { ok: false, error: 'invalid repository (expected owner/repo)' }
  const [owner, repo] = fullName.split('/')
  if (owner === '' || repo === '') return { ok: false, error: 'invalid repository (expected owner/repo)' }

  const skill = await tryFetchSkill(source, owner, repo)
  if (skill !== undefined) {
    const result = installSkill(skill)
    return result.ok
      ? { ok: true, type: 'skill', ...result }
      : { ok: false, type: 'skill', ...result }
  }

  const pkg = await tryFetchPluginPackage(source, owner, repo)
  if (pkg !== undefined) {
    const url = source === 'github'
      ? `git+https://github.com/${owner}/${repo}.git`
      : `git+https://gitee.com/${owner}/${repo}.git`
    const profile = profileName(ctx)
    const child = spawn('dsh', ['plugin', '--profile', profile, 'add', url], {
      shell: process.platform === 'win32',
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
    return {
      ok: true,
      type: 'plugin',
      status: 'installing',
      packageName: pkg.name,
      command: `dsh plugin --profile ${profile} add ${url}`,
    }
  }

  return { ok: false, error: '无法识别该仓库是 DSH 技能（SKILL.md）还是插件（dsh.bundle 声明），请确认仓库类型后重试' }
}

/** Model-facing announcement. */
const SKILL_MANAGER_GUIDANCE = '本机已安装 dsh-skill-manager 插件（扩展中心）：设置面板「扩展管理」把技能与插件合并标注、一键安装/卸载/启用/停用（热插拔）。支持搜索栏本地过滤 + GitHub/Gitee 仓库搜索，检索到技能（SKILL.md）或插件（dsh.bundle）可一键安装。技能存于 ~/.dsh/skills 与 ~/.agents/skills；插件开关通过 Cordis Loader 热插拔并持久化到 ~/.dsh/dsh-skill-manager.json。用户提到「扩展中心 / 技能菜单 / 插件列表 / 插件管理 / GitHub/Gitee 搜索 / 一键安装」时即指本插件。'

// ── routes ───────────────────────────────────────────────────────────────────

function makeRoutes(ctx) {
  const guard = (req, res, method) => {
    if (!isLoopbackRequest(req)) {
      writeJson(res, 403, { error: 'forbidden: loopback-only' })
      return false
    }
    if (req.method !== method) {
      writeJson(res, 405, { error: `method not allowed: ${req.method}` })
      return false
    }
    return true
  }

  const routes = [
    // skills list
    {
      kind: 'exact',
      path: `${API_ROOT}/skills`,
      handler: (req, res) => {
        if (!guard(req, res, 'GET')) return
        writeJson(res, 200, { skills: listSkills() })
      },
    },
    // skills toggle
    {
      kind: 'exact',
      path: `${API_ROOT}/skills/toggle`,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        const body = await readJsonBody(req)
        const name = typeof body?.name === 'string' ? body.name : ''
        const enabled = body?.enabled === true
        if (name === '') {
          writeJson(res, 400, { error: 'name is required' })
          return
        }
        try {
          writeJson(res, 200, toggleSkill(name, enabled))
        } catch (error) {
          writeJson(res, 500, { error: errorMessage(error) })
        }
      },
    },
    // skills install
    {
      kind: 'exact',
      path: `${API_ROOT}/skills/install`,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        const body = await readJsonBody(req)
        if (body === undefined) {
          writeJson(res, 400, { error: 'invalid JSON body' })
          return
        }
        try {
          writeJson(res, 200, installSkill(body))
        } catch (error) {
          writeJson(res, 400, { error: errorMessage(error) })
        }
      },
    },
    // skills uninstall
    {
      kind: 'exact',
      path: `${API_ROOT}/skills/uninstall`,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        const body = await readJsonBody(req)
        const name = typeof body?.name === 'string' ? body.name : ''
        const source = typeof body?.source === 'string' ? body.source : undefined
        if (name === '') {
          writeJson(res, 400, { error: 'name is required' })
          return
        }
        try {
          writeJson(res, 200, uninstallSkill(name, source))
        } catch (error) {
          writeJson(res, 500, { error: errorMessage(error) })
        }
      },
    },
    // plugins list
    {
      kind: 'exact',
      path: `${API_ROOT}/plugins`,
      handler: (req, res) => {
        if (!guard(req, res, 'GET')) return
        writeJson(res, 200, { plugins: listPlugins(ctx) })
      },
    },
    // plugins toggle
    {
      kind: 'exact',
      path: `${API_ROOT}/plugins/toggle`,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        const body = await readJsonBody(req)
        const entryId = typeof body?.entryId === 'string' ? body.entryId : ''
        const enabled = body?.enabled === true
        if (entryId === '') {
          writeJson(res, 400, { error: 'entryId is required' })
          return
        }
        try {
          writeJson(res, 200, await togglePlugin(ctx, entryId, enabled))
        } catch (error) {
          writeJson(res, 400, { error: errorMessage(error) })
        }
      },
    },
    // plugins install
    {
      kind: 'exact',
      path: `${API_ROOT}/plugins/install`,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        const body = await readJsonBody(req)
        if (body === undefined) {
          writeJson(res, 400, { error: 'invalid JSON body' })
          return
        }
        try {
          writeJson(res, 200, await installPlugin(ctx, body))
        } catch (error) {
          writeJson(res, 400, { error: errorMessage(error) })
        }
      },
    },
    // plugins uninstall
    {
      kind: 'exact',
      path: `${API_ROOT}/plugins/uninstall`,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        const body = await readJsonBody(req)
        const entryId = typeof body?.entryId === 'string' ? body.entryId : ''
        if (entryId === '') {
          writeJson(res, 400, { error: 'entryId is required' })
          return
        }
        try {
          writeJson(res, 200, await uninstallPlugin(ctx, entryId))
        } catch (error) {
          writeJson(res, 400, { error: errorMessage(error) })
        }
      },
    },
    // remote search (GitHub + Gitee)
    {
      kind: 'exact',
      path: `${API_ROOT}/search`,
      handler: async (req, res) => {
        if (!guard(req, res, 'GET')) return
        const url = new URL(req.url ?? '/', 'http://localhost')
        const query = url.searchParams.get('q') ?? ''
        const source = url.searchParams.get('source') ?? 'both'
        if (query.trim() === '') {
          writeJson(res, 400, { error: 'q is required' })
          return
        }
        try {
          writeJson(res, 200, { results: await searchRepos(query.trim(), source) })
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) })
        }
      },
    },
    // install from a GitHub/Gitee repository
    {
      kind: 'exact',
      path: `${API_ROOT}/install-repo`,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        const body = await readJsonBody(req)
        if (body === undefined) {
          writeJson(res, 400, { error: 'invalid JSON body' })
          return
        }
        try {
          writeJson(res, 200, await installFromRepo(ctx, body))
        } catch (error) {
          writeJson(res, 400, { error: errorMessage(error) })
        }
      },
    },
  ]
  return routes
}

// ── apply ────────────────────────────────────────────────────────────────────

/**
 * Mount the route family, the announcement, and the boot-time overrides.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host plugin context.
 * @param {object} config - resolved plugin config.
 */
export function apply(ctx, config = {}) {
  const enabled = config.enabled ?? true
  if (!enabled) return

  // Routes (loopback-only).
  const routes = makeRoutes(ctx)
  ctx.effect(
    () => {
      const disposers = routes.map((route) => ctx.webServer.register(route))
      return () => {
        for (const dispose of disposers) dispose()
      }
    },
    'dsh-skill-manager: routes',
  )

  // Announcement.
  const systemPrompt = ctx.get('systemPrompt')
  if (systemPrompt !== undefined) {
    ctx.effect(
      () =>
        systemPrompt.section({
          name: 'plugin:dsh-skill-manager',
          order: 150,
          text: SKILL_MANAGER_GUIDANCE,
        }),
      'dsh-skill-manager: announcement',
    )
  }

  // Re-apply durable plugin decisions (disabled + installed) after boot.
  ctx.effect(() => {
    const handle = setTimeout(() => {
      applyBootOverrides(ctx).catch((error) => {
        console.warn('[dsh-skill-manager] boot override apply failed:', errorMessage(error))
      })
    }, 0)
    return () => clearTimeout(handle)
  }, 'dsh-skill-manager: boot overrides')
}
