/**
 * dsh-extension-hub — host half.
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
 *      `~/.dsh/dsh-extension-hub.json` and re-applied on boot.
 *
 * The browser half (./client) renders both surfaces in the web settings panel
 * and talks to this half over the loopback-only `/api/dsh-extension-hub`
 * route family. No dsh source changes.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { verifyAndFixDuplicates, verifyPluginPackage } from './verify.js'

/** Stable cordis plugin name. */
export const name = 'extension-hub'

/** Services required before the management surfaces can mount. */
export const inject = ['webServer']

/** Route root. */
export const API_ROOT = '/api/dsh-extension-hub'

/** Skill-name grammar shared with dsh-skill (kebab-case). */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** State file where durable plugin decisions live. */
const STATE_FILE = () => join(resolveDshHome(), 'dsh-extension-hub.json')

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
  'dsh-extension-hub': { en: 'Skill & plugin manager (this plugin)', zh: '技能与插件管理器（本插件）' },
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
  'dsh-extension-hub',
])

const PROTECTED_IDS = new Set(['include:modules', 'include:connection', 'include:api-remotes', 'include:client-runtime', 'include:api-gateway', 'include:webserver', 'include:web-runtime', 'include:web-startup', 'include:ui-settings', 'include:ui-settings-general', 'include:ui-layout', 'include:ui-sidebar', 'include:locale', 'include:ui-theme', 'include:client-hmr', 'include:extension-hub'])

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
    console.warn('[dsh-extension-hub] failed to write state:', errorMessage(error))
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


/** Installed index (skills + non-MCP plugins) used by the market to avoid duplicate installs. */
function installedIndex(ctx) {
  const skills = listSkills().map((s) => s.name)
  const plugins = []
  const state = readState()
  for (const entry of ctx.loader.entries()) {
    if (isContainerEntry(entry)) continue
    const moduleName = entry.options.name
    if (moduleName === '@deepseek-ai/dsh-mcp-client') continue
    plugins.push({
      entryId: entry.id,
      moduleName,
      title: shortName(moduleName),
      enabled: !entry.disabled,
      userInstalled: Array.isArray(state.installedPlugins) && state.installedPlugins.some((p) => p.id === entry.id),
    })
  }
  return { skills, plugins }
}

/** True when the profile already depends on this repo (git URL or bare package name). */
function pluginAlreadyInstalled(profile, owner, repo, gitUrl) {
  try {
    const pkgPath = join(resolveDshHome(), 'profiles', profile, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
    const repoLower = repo.toLocaleLowerCase()
    const ownerLower = owner.toLocaleLowerCase()
    for (const [depName, spec] of Object.entries(deps)) {
      const specStr = String(spec).toLocaleLowerCase()
      if (gitUrl !== '' && specStr.includes(`${ownerLower}/${repoLower}`)) return depName
      const base = depName.toLocaleLowerCase().replace(/^@[^/]+\//, '')
      if (base === repoLower) return depName
    }
  } catch {
    /* profile missing/unreadable: treat as not installed */
  }
  return null
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

  // ── install-time consistency checks: peerDeps resolvability + duplicate
  //    core copies (Symbol/instanceof split guard) ──
  const warnings = []
  try {
    const depCheck = verifyPluginPackage(packageName, ctx)
    if (!depCheck.ok) warnings.push(...depCheck.warnings)
    const dupResults = verifyAndFixDuplicates(ctx)
    const fixed = dupResults.filter((r) => r.action === 'fixed' || r.action === 'fixed-verify-failed')
    if (fixed.length > 0) warnings.push(`已自动统一重复核心包：${fixed.map((f) => f.package).join(', ')}`)
    if (warnings.length > 0) {
      const log = Array.isArray(state.verifyLog) ? state.verifyLog : []
      log.push({ at: new Date().toISOString(), scope: 'install', package: packageName, results: dupResults, warnings })
      state.verifyLog = log.slice(-50)
      writeState(state)
      console.log(`[dsh-extension-hub] install-time verify for "${packageName}":`, warnings.join('；'))
    }
  } catch (error) {
    console.warn(`[dsh-extension-hub] install-time verify failed for "${packageName}":`, errorMessage(error))
  }

  return { ok: true, entryId, name: packageName, warnings }
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
      console.warn(`[dsh-extension-hub] failed to apply override for "${entryId}":`, errorMessage(error))
    }
  }
  for (const installed of (Array.isArray(state.installedPlugins) ? state.installedPlugins : [])) {
    const exists = [...ctx.loader.entries()].some((e) => e.id === installed.id && !e.options.group)
    if (exists) continue
    try {
      await ctx.loader.create({ id: installed.id, name: installed.name })
    } catch (error) {
      console.warn(`[dsh-extension-hub] failed to reinstall "${installed.id}":`, errorMessage(error))
    }
  }

  // ── boot-time dependency consistency sweep: auto-unify duplicate core
  //    copies so Symbol/instanceof identity can never split under hot reload ──
  try {
    const results = verifyAndFixDuplicates(ctx)
    if (results.length > 0) {
      const fixed = results.filter((r) => r.action === 'fixed' || r.action === 'fixed-verify-failed')
      console.log(`[dsh-extension-hub] dependency sweep: ${results.length} issue(s), ${fixed.length} auto-fixed`)
      for (const r of results) {
        console.log(`  [${r.action}] ${r.package ?? '(core)'} ${r.version ?? ''} ${r.message ?? ''}${r.backup ? ` (备份: ${r.backup})` : ''}`.trim())
      }
      const log = Array.isArray(state.verifyLog) ? state.verifyLog : []
      log.push({ at: new Date().toISOString(), scope: 'boot', results })
      state.verifyLog = log.slice(-50)
      writeState(state)
    }
  } catch (error) {
    console.warn('[dsh-extension-hub] dependency sweep failed:', errorMessage(error))
  }
}

// ── remote search & install ──────────────────────────────────────────────────

const UA_HEADERS = { 'user-agent': 'dsh-extension-hub' }

/** fetch with an abort timeout so slow networks fail fast instead of hanging. */
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchJson(url, headers = {}) {
  const response = await fetchWithTimeout(url, { headers })
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`)
  return await response.json()
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

/** Fetch one file's text from a repo via the contents API (works with any default branch). */
async function fetchRepoFileText(source, owner, repo, path) {
  try {
    if (source === 'github') {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
      const response = await fetchWithTimeout(url, { headers: { ...UA_HEADERS, accept: 'application/vnd.github.raw' } })
      if (!response.ok) return undefined
      return await response.text()
    }
    const url = `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${path}`
    const data = await fetchJson(url, UA_HEADERS)
    if (typeof data?.content === 'string') return Buffer.from(data.content, 'base64').toString('utf8')
    return undefined
  } catch {
    return undefined
  }
}

/** List a repo's root entries (name + type) via the contents API. */
async function fetchRepoRootEntries(source, owner, repo) {
  const url = source === 'github'
    ? `https://api.github.com/repos/${owner}/${repo}/contents/`
    : `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/`
  const data = await fetchJson(url, source === 'github' ? { ...UA_HEADERS, accept: 'application/vnd.github+json' } : UA_HEADERS)
  if (!Array.isArray(data)) return []
  return data.map((entry) => ({ name: entry.name, type: entry.type }))
}

/** Fetch a repo's metadata (existence check + default branch). */
async function fetchRepoMeta(source, owner, repo) {
  const url = source === 'github'
    ? `https://api.github.com/repos/${owner}/${repo}`
    : `https://gitee.com/api/v5/repos/${owner}/${repo}`
  const data = await fetchJson(url, source === 'github' ? { ...UA_HEADERS, accept: 'application/vnd.github+json' } : UA_HEADERS)
  return { exists: true, defaultBranch: typeof data.default_branch === 'string' ? data.default_branch : 'main' }
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
  if (typeof fullName !== 'string' || !fullName.includes('/')) return { ok: false, error: '无效仓库地址（应为 owner/repo）' }
  const [owner, repo] = fullName.split('/')
  if (owner === '' || repo === '') return { ok: false, error: '无效仓库地址（应为 owner/repo）' }

  // 1. existence + metadata (also distinguishes "network error" from "not a DSH repo")
  let meta
  try {
    meta = await fetchRepoMeta(source, owner, repo)
  } catch (error) {
    return { ok: false, error: `无法访问仓库 ${fullName}：${errorMessage(error)}。请检查网络后重试` }
  }
  if (meta?.exists !== true) return { ok: false, error: `仓库 ${fullName} 不存在或不可访问` }

  // 2. root entries
  let entries = []
  try {
    entries = await fetchRepoRootEntries(source, owner, repo)
  } catch (error) {
    return { ok: false, error: `无法读取仓库 ${fullName} 的内容：${errorMessage(error)}` }
  }

  // 3. skill detection: root SKILL.md, then a skills/ (or skill/) collection directory
  const skillPaths = []
  if (entries.some((entry) => entry.name === 'SKILL.md')) skillPaths.push('SKILL.md')
  for (const entry of entries) {
    if (entry.type === 'dir' && (entry.name === 'skills' || entry.name === 'skill')) skillPaths.push(`${entry.name}/SKILL.md`)
  }
  let installedSkills = 0
  const alreadySkills = []
  const skillErrors = []
  for (const path of skillPaths) {
    const text = await fetchRepoFileText(source, owner, repo, path)
    if (text === undefined) continue
    const parsed = parseSkillText(text)
    if (parsed === undefined) continue
    // duplicate-install guard: skip skills that already exist locally
    if (listSkills().some((s) => s.name === parsed.name)) {
      alreadySkills.push(parsed.name)
      continue
    }
    const result = installSkill(parsed)
    if (result.ok) {
      installedSkills += 1
      // record the remote source so the market can detect updates later
      try {
        const sourceFile = join(userDshSkillsDir(), parsed.name, '.dsh-source.json')
        writeFileSync(sourceFile, JSON.stringify({ platform: source, owner, repo, path, fullName, installedAt: new Date().toISOString() }, null, 2), 'utf8')
      } catch { /* best effort */ }
    } else skillErrors.push(`${parsed.name}: ${result.error}`)
  }
  if (installedSkills > 0) {
    return { ok: true, type: 'skill', installed: installedSkills, name: repo, already: alreadySkills }
  }
  if (alreadySkills.length > 0 && skillErrors.length === 0) {
    return { ok: true, type: 'skill', alreadyInstalled: true, name: repo, already: alreadySkills, installed: 0 }
  }
  if (skillErrors.length > 0) {
    return { ok: false, type: 'skill', error: `识别到技能但安装失败：${skillErrors.join('；')}` }
  }

  // 4. plugin detection: package.json with a dsh.bundle declaration
  const pkgText = await fetchRepoFileText(source, owner, repo, 'package.json')
  if (pkgText !== undefined) {
    try {
      const pkg = JSON.parse(pkgText)
      if (pkg && pkg.dsh && pkg.dsh.bundle) {
        // Tarball URL instead of `git+https://…`: pnpm's git resolver requires a
        // git CLI on PATH, which is absent on this HarmonyOS box — a plain tarball
        // URL installs without git (both endpoints verified reachable).
        const branch = typeof meta?.defaultBranch === 'string' && meta.defaultBranch !== '' ? meta.defaultBranch : 'main'
        const url = source === 'github'
          ? `https://codeload.github.com/${owner}/${repo}/tar.gz/refs/heads/${branch}`
          : `https://gitee.com/${owner}/${repo}/repository/archive/${branch}.tar.gz`
        const profile = profileName(ctx)
        // duplicate-install guard: skip when the profile already depends on this repo
        const dup = pluginAlreadyInstalled(profile, owner, repo, url)
        if (dup !== null) {
          return { ok: false, alreadyInstalled: true, type: 'plugin', name: repo, error: `插件 ${repo} 已安装（依赖 ${dup}），无需重复安装` }
        }
        // Run the install as a tracked background task via node + pnpm
        // (absolute paths — the dsh web PATH does not contain pnpm/dsh).
        const task = newTask('install', pkg.name || repo)
        task.target = { type: 'install', source, fullName }
        const profileDir = join(resolveDshHome(), 'profiles', profile)
        const child = spawn(process.execPath, [PNPM_ENTRY, '--config.minimumReleaseAge=0', 'add', url], { cwd: profileDir })
        child.stdout.on('data', (d) => { task.output.push(String(d).trim()) })
        child.stderr.on('data', (d) => { task.output.push(String(d).trim()) })
        child.on('error', (err) => finishTask(task, 'failed', null, err.message))
        // Once pnpm has finished, sweep for duplicate core copies introduced by
        // the new dependency tree and auto-unify them (Symbol split guard).
        child.on('close', (code) => {
          finishTask(task, code === 0 ? 'done' : 'failed', code, '')
          if (code !== 0) return
          // Register the freshly installed package with the Cordis loader and
          // persist it in installedPlugins so a DSH restart re-creates the
          // entry (applyBootOverrides) instead of dropping the plugin.
          installPlugin(ctx, { id: shortName(pkg.name), name: pkg.name }).then((res) => {
            if (!res.ok && res.error && !res.error.includes('already exists')) {
              task.error = `插件已装到 node_modules，但注册失败：${res.error}`
              console.warn(`[dsh-extension-hub] loader register failed for "${pkg.name}":`, res.error)
            } else {
              task.output.push(`✓ loader entry "${res.entryId || shortName(pkg.name)}" registered`)
            }
          }).catch((err) => {
            task.error = `插件已装到 node_modules，但注册异常：${errorMessage(err)}`
            console.warn(`[dsh-extension-hub] loader register error for "${pkg.name}":`, errorMessage(err))
          })
          try {
            const results = verifyAndFixDuplicates(ctx)
            const fixed = results.filter((r) => r.action === 'fixed' || r.action === 'fixed-verify-failed')
            if (results.length > 0) {
              const log = readState()
              const sweepLog = Array.isArray(log.verifyLog) ? log.verifyLog : []
              sweepLog.push({ at: new Date().toISOString(), scope: 'install-from-repo', package: pkg.name, results })
              log.verifyLog = sweepLog.slice(-50)
              writeState(log)
            }
            if (fixed.length > 0) {
              console.log(`[dsh-extension-hub] 插件 ${pkg.name} 安装后自动统一重复核心包：${fixed.map((f) => f.package).join(', ')}`)
            }
          } catch (error) {
            console.warn(`[dsh-extension-hub] post-install sweep for "${pkg.name}" failed:`, errorMessage(error))
          }
        })
        return {
          ok: true,
          type: 'plugin',
          status: 'installing',
          taskId: task.id,
          packageName: pkg.name,
          command: `pnpm --dir ${profileDir} add ${url}`,
        }
      }
      if (pkg && typeof pkg.name === 'string') {
        return { ok: false, error: `仓库 ${fullName} 是 npm 包「${pkg.name}」，但未声明 dsh.bundle，无法作为 DSH 插件安装` }
      }
    } catch {
      /* unparseable package.json — fall through */
    }
  }

  // 5. diagnostic summary
  return {
    ok: false,
    error: `无法识别 ${fullName}：仓库根目录未找到 SKILL.md（技能）或 dsh.bundle 声明（插件）。请确认该仓库是 DSH 技能/插件仓库；若技能在子目录中，请确认子目录名为 skills/ 后重试，或手动安装。`,
  }
}

// ── process watchdog（独立守护进程的控制面）──────────────────────────────────

/** 守护脚本路径：默认插件包 tools/ 下，可用 config.watchdogScript 覆盖。 */
function watchdogScriptPath(config) {
  if (typeof config?.watchdogScript === 'string' && config.watchdogScript !== '') return config.watchdogScript
  const ext = process.platform === 'win32' ? '.ps1' : '.js'
  return fileURLToPath(new URL(`../tools/dsh-watchdog${ext}`, import.meta.url))
}

/** 枚举正在运行的守护进程 ID。Windows: powershell -File ...ps1；其它: 读 state.json 的 watchdogPid + liveness probe。 */
function watchdogPids() {
  if (process.platform !== 'win32') {
    const dshHome = resolveDshHome()
    let state = null
    try { state = JSON.parse(readFileSync(join(dshHome, 'dsh-watchdog-state.json'), 'utf8').replace(/^\uFEFF/, '')) } catch { /* absent */ }
    if (!state || typeof state.watchdogPid !== 'number' || state.watchdogPid <= 0) return Promise.resolve([])
    try {
      process.kill(state.watchdogPid, 0) // signal 0 = liveness check, no signal sent
      return Promise.resolve([state.watchdogPid])
    } catch {
      return Promise.resolve([]) // process gone
    }
  }
  return new Promise((resolve) => {
    const psCmd = "Get-CimInstance Win32_Process -Filter \"Name='powershell.exe'\" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('dsh-watchdog.ps1') -and $_.CommandLine.Contains('-File') -and -not $_.CommandLine.Contains('-Command') } | Select-Object -ExpandProperty ProcessId"
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], { windowsHide: true })
    let out = ''
    child.stdout.on('data', (d) => { out += String(d) })
    child.on('error', () => resolve([]))
    child.on('close', () => {
      const pids = []
      for (const line of out.split(/\r?\n/)) {
        const n = Number(line.trim())
        if (Number.isInteger(n) && n > 0) pids.push(n)
      }
      resolve(pids)
    })
  })
}

/**
 * 启动守护进程（父进程崩溃也不影响它：Windows 上 spawn 的子进程本就独立，
 * 父进程退出不会连带终止）。
 * 注意：不能用 detached: true —— 实测 node spawn + detached 时
 * PowerShell 5.1 会立即 exit 0 且不执行脚本（无任何日志），
 * 该组合曾导致「扩展管理」里的启动按钮永远拉不起 watchdog。
 */
function startWatchdog(scriptPath) {
  if (process.platform !== 'win32') {
    // Record how to relaunch dsh so the guardian can restart it after a crash.
    const dshHome = resolveDshHome()
    const stateFile = join(dshHome, 'dsh-watchdog-state.json')
    // Ensure bash is findable on HarmonyOS (not in default PATH).
    const bashDir = '/data/storage/el1/bundle/libs/arm64/bash/bin'
    let envPath = process.env.PATH || ''
    if (existsSync(join(bashDir, 'bash')) && !envPath.split(':').includes(bashDir)) {
      envPath = envPath ? `${bashDir}:${envPath}` : bashDir
    }
    const launch = {
      nodePath: process.execPath,
      execArgv: process.execArgv,
      argv: process.argv.slice(1),
      cwd: process.cwd(),
      env: {
        HOME: process.env.HOME,
        DSH_HOME: process.env.DSH_HOME,
        DSH_PERMISSION_MODE: process.env.DSH_PERMISSION_MODE,
        PATH: envPath,
      },
    }
    let state = {}
    try { state = JSON.parse(readFileSync(stateFile, 'utf8').replace(/^\uFEFF/, '')) } catch { /* absent */ }
    state.launch = launch
    state.watchdogPid = null // clear stale pid; watchdog.js will record its own
    try { writeFileSync(stateFile, JSON.stringify(state, null, 2)) } catch { /* best effort */ }
    const child = spawn(process.execPath, [scriptPath], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
    })
    child.on('error', () => {})
    child.unref()
    return
  }
  const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath], {
    stdio: 'ignore',
    windowsHide: true,
  })
  child.on('error', () => {})
  child.unref()
}

/** 停止所有守护实例，返回停止数量。 */
async function stopWatchdog() {
  const pids = await watchdogPids()
  for (const pid of pids) {
    if (process.platform !== 'win32') {
      try { process.kill(pid, 'SIGTERM') } catch { /* best effort */ }
    } else {
      try {
        const child = spawn('taskkill', ['/F', '/PID', String(pid)], { windowsHide: true, stdio: 'ignore' })
        child.on('error', () => {})
        child.unref()
      } catch { /* best effort */ }
    }
  }
  return pids.length
}

/** 守护控制 API：状态 / 启动 / 停止。 */
function makeWatchdogApi(config) {
  const scriptPath = watchdogScriptPath(config)
  const dshHome = resolveDshHome()
  return {
    scriptPath,
    async status() {
      const running = (await watchdogPids()).length > 0
      let state = null
      try { state = JSON.parse(readFileSync(join(dshHome, 'dsh-watchdog-state.json'), 'utf8').replace(/^\uFEFF/, '')) } catch { /* absent */ }
      let logTail = []
      try {
        const lines = readFileSync(join(dshHome, 'dsh-watchdog.log'), 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '')
        logTail = lines.slice(-8)
      } catch { /* absent */ }
      return { ok: true, running, exists: existsSync(scriptPath), scriptPath, state, logTail }
    },
    async start() {
      const running = (await watchdogPids()).length > 0
      if (!running) {
        startWatchdog(scriptPath)
        // give the detached guardian a moment to register
        await new Promise((r) => setTimeout(r, 600))
      }
      const now = (await watchdogPids()).length > 0
      return { ok: now, running: now }
    },
    async stop() {
      const stopped = await stopWatchdog()
      return { ok: true, stopped }
    },
  }
}

/** Model-facing announcement. */
const SKILL_MANAGER_GUIDANCE = '本机已安装 dsh-extension-hub 插件（扩展中心）：设置面板「扩展管理」把技能与插件合并标注、一键安装/卸载/启用/停用（热插拔）。支持搜索栏本地过滤 + GitHub/Gitee 仓库搜索，检索到技能（SKILL.md）或插件（dsh.bundle）可一键安装。技能存于 ~/.dsh/skills 与 ~/.agents/skills；插件开关通过 Cordis Loader 热插拔并持久化到 ~/.dsh/dsh-extension-hub.json。用户提到「扩展中心 / 技能菜单 / 插件列表 / 插件管理 / GitHub/Gitee 搜索 / 一键安装」时即指本插件。'


// ── updates (detect + apply for plugins and skills) ─────────────────────────

const OFFICIAL_SCOPES = ['@deepseek-ai/', '@dsh-external/']

/** Profile package.json dependencies for the given profile. */
function profileDependencies(profile) {
  try {
    const pkgPath = join(resolveDshHome(), 'profiles', profile, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    return { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
  } catch {
    return {}
  }
}

/** Local installed version of a package (profile node_modules), or null. */
function localPackageVersion(profile, moduleName) {
  try {
    const pkgPath = join(resolveDshHome(), 'profiles', profile, 'node_modules', moduleName, 'package.json')
    return JSON.parse(readFileSync(pkgPath, 'utf8')).version || null
  } catch {
    return null
  }
}

/** Latest published version of an npm package (or null on any failure). */
async function npmLatestVersion(moduleName) {
  try {
    const url = `https://registry.npmjs.org/${moduleName.split('/').map(encodeURIComponent).join('/')}/latest`
    const data = await fetchJson(url, UA_HEADERS)
    return typeof data?.version === 'string' ? data.version : null
  } catch {
    return null
  }
}

/** Read the remote-source marker of a skill, if it was installed from a repo. */
function skillSource(name) {
  try {
    const loc = locateSkill(userDshSkillsDir(), name)
    if (loc === undefined || loc.kind !== 'directory') return null
    const marker = join(loc.dir, '.dsh-source.json')
    if (!existsSync(marker)) return null
    return JSON.parse(readFileSync(marker, 'utf8'))
  } catch {
    return null
  }
}

/**
 * Check every user-installed plugin (profile deps outside official scopes) and
 * every repo-installed skill for updates. Network failures degrade to
 * `updatable: false` with an `error` note instead of failing the whole call.
 */
async function checkUpdates(ctx) {
  const profile = profileName(ctx)
  const deps = profileDependencies(profile)

  const pluginTasks = Object.entries(deps)
    .filter(([name]) => !OFFICIAL_SCOPES.some((s) => name.startsWith(s)))
    .map(async ([name, spec]) => {
      const specStr = String(spec)
      // git+ / git: specs and tarball-URL specs (codeload/gitee archive) are
      // both installed via a direct URL — pnpm needs no git CLI for tarballs,
      // and neither flavor can be updated through the npm registry.
      const gitSpec = specStr.includes('git+') || specStr.startsWith('git:') || specStr.startsWith('http')
      const linkSpec = specStr.startsWith('link:')
      // local-source links (e.g. the extension hub itself) are managed by the
      // developer, not by npm — never offer to "update" them via the registry.
      if (linkSpec) {
        return { moduleName: name, kind: 'link', current: '本地源码', latest: null, updatable: false, error: '' }
      }
      const current = gitSpec ? specStr : localPackageVersion(profile, name)
      let latest = null
      let error = ''
      if (!gitSpec && current !== null) {
        latest = await npmLatestVersion(name)
        if (latest === null) error = '无法连接 npm registry'
      }
      return {
        moduleName: name,
        kind: gitSpec ? 'git' : 'npm',
        current,
        latest,
        updatable: !gitSpec && current !== null && latest !== null && latest !== current,
        error,
      }
    })
  const plugins = (await Promise.all(pluginTasks)).filter((p) => p.current !== null || p.kind === 'git')

  const skillTasks = listSkills().map(async (skill) => {
    const source = skillSource(skill.name)
    if (source === null || typeof source?.platform !== 'string' || typeof source?.owner !== 'string' || typeof source?.repo !== 'string') {
      return { name: skill.name, kind: 'local', updatable: false, error: '' }
    }
    const remoteText = await fetchRepoFileText(source.platform, source.owner, source.repo, source.path || 'SKILL.md')
    if (remoteText === undefined) return { name: skill.name, kind: 'remote', updatable: false, error: '无法访问远端仓库' }
    const localText = (() => {
      try {
        const loc = locateSkill(userDshSkillsDir(), skill.name)
        return loc !== undefined ? readFileSync(loc.kind === 'directory' ? join(loc.dir, 'SKILL.md') : loc.file, 'utf8') : ''
      } catch { return '' }
    })()
    return {
      name: skill.name,
      kind: 'remote',
      updatable: remoteText !== localText,
      error: '',
    }
  })
  const skills = await Promise.all(skillTasks)

  return { plugins, skills, checkedAt: new Date().toISOString() }
}

// ── update task engine (batch + parallel, with progress) ────────────────────

/** Resolve an absolute pnpm entry point (node-run) regardless of PATH. */
function pnpmEntry() {
  const candidates = [
    '/data/storage/el2/base/files/npm_global_modules/lib/node_modules/pnpm/bin/pnpm.mjs',
    '/data/storage/el2/base/files/npm_global_modules/bin/pnpm.cjs',
    join(homedir(), '.local', 'bin', 'pnpm'),
  ]
  for (const p of candidates) if (existsSync(p)) return p
  return 'pnpm' // last resort: rely on PATH
}

const PNPM_ENTRY = pnpmEntry()
const updateTasks = [] // in-memory registry: { id, type, name, status, ... }
const MAX_TASK_OUTPUT = 60

function taskSummary(task) {
  return {
    id: task.id,
    type: task.type,
    name: task.name,
    target: task.target || null,
    status: task.status,
    startedAt: task.startedAt,
    finishedAt: task.finishedAt || null,
    exitCode: task.exitCode ?? null,
    error: task.error || '',
    output: task.output.slice(-MAX_TASK_OUTPUT),
  }
}

function newTask(type, name) {
  const task = {
    id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type,
    name,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    error: '',
    output: [],
  }
  updateTasks.push(task)
  return task
}

function finishTask(task, status, exitCode, error) {
  task.status = status
  task.exitCode = exitCode
  task.error = error || ''
  task.finishedAt = new Date().toISOString()
}

/** Spawn `pnpm add ...` inside the profile dir with node, capturing output. */
function runPnpmAdd(profileDir, args, task) {
  const child = spawn(process.execPath, [PNPM_ENTRY, ...args], { cwd: profileDir })
  child.stdout.on('data', (d) => { task.output.push(String(d).trim()) })
  child.stderr.on('data', (d) => { task.output.push(String(d).trim()) })
  child.on('error', (err) => finishTask(task, 'failed', null, err.message))
  child.on('close', (code) => finishTask(task, code === 0 ? 'done' : 'failed', code, ''))
}

/** Start one update task. Plugin tasks spawn pnpm in the background (parallel). */
function startUpdateTask(ctx, target) {
  const type = target?.type
  if (type === 'plugin') {
    const entryId = typeof target.entryId === 'string' ? target.entryId : ''
    const entry = [...ctx.loader.entries()].find((e) => e.id === entryId)
    if (entry === undefined) return { ok: false, error: `plugin entry "${entryId}" not found` }
    const moduleName = entry.options.name
    const profile = profileName(ctx)
    const deps = profileDependencies(profile)
    const spec = String(deps[moduleName] || '')
    // git+ / git: / tarball-URL specs are reinstalled from the recorded URL
    // (pnpm needs no git CLI for plain tarball URLs).
    const gitSpec = spec.includes('git+') || spec.startsWith('git:') || spec.startsWith('http')
    const task = newTask('plugin', moduleName)
    task.target = { type: 'plugin', entryId, moduleName }
    const profileDir = join(resolveDshHome(), 'profiles', profile)
    // --config.minimumReleaseAge=0: pnpm's supply-chain release-age policy would
    // otherwise silently downgrade "latest" to an older publish.
    runPnpmAdd(profileDir, gitSpec ? ['--config.minimumReleaseAge=0', 'add', spec] : ['--config.minimumReleaseAge=0', 'add', `${moduleName}@latest`], task)
    return { ok: true, task: taskSummary(task) }
  }
  if (type === 'skill') {
    const name = typeof target.name === 'string' ? target.name : ''
    if (name === '') return { ok: false, error: 'skill name is required' }
    const task = newTask('skill', name)
    task.target = { type: 'skill', name }
    updateSkill(ctx, name).then((res) => {
      if (res.ok) finishTask(task, 'done', 0, '')
      else finishTask(task, 'failed', null, res.error || 'update failed')
    }).catch((err) => finishTask(task, 'failed', null, errorMessage(err)))
    return { ok: true, task: taskSummary(task) }
  }
  return { ok: false, error: 'unknown target type (expected plugin|skill)' }
}

/** Update one repo-installed skill by re-fetching its remote SKILL.md. */
async function updateSkill(ctx, name) {
  const source = skillSource(name)
  if (source === null) return { ok: false, error: `技能 ${name} 不是仓库安装的，无法自动更新` }
  const remoteText = await fetchRepoFileText(source.platform, source.owner, source.repo, source.path || 'SKILL.md')
  if (remoteText === undefined) return { ok: false, error: `无法从 ${source.fullName || ''} 获取最新内容` }
  const loc = locateSkill(userDshSkillsDir(), name)
  if (loc === undefined) return { ok: false, error: `技能 ${name} 不存在` }
  try {
    writeFileSync(loc.kind === 'directory' ? join(loc.dir, 'SKILL.md') : loc.file, remoteText, 'utf8')
    return { ok: true, name }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}


/** Fetch recent release notes + commit messages for a repo (GitHub/Gitee). */
async function repoUpdates(source, fullName) {
  if (typeof fullName !== 'string' || !fullName.includes('/')) {
    return { ok: false, error: 'invalid fullName (expected owner/repo)' }
  }
  const [owner, repo] = fullName.split('/')
  const releases = []
  const commits = []
  try {
    if (source === 'github') {
      const rel = await fetchJson(
        `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
        { ...UA_HEADERS, accept: 'application/vnd.github+json' },
      )
      if (rel && rel.tag_name) {
        releases.push({
          tag: rel.tag_name,
          name: rel.name || '',
          body: typeof rel.body === 'string' ? rel.body.slice(0, 600) : '',
          publishedAt: rel.published_at || '',
        })
      }
    } else {
      const rel = await fetchJson(
        `https://gitee.com/api/v5/repos/${owner}/${repo}/releases/latest`,
        UA_HEADERS,
      )
      if (rel && rel.tag_name) {
        releases.push({
          tag: rel.tag_name,
          name: rel.name || '',
          body: typeof rel.body === 'string' ? rel.body.slice(0, 600) : '',
          publishedAt: rel.created_at || '',
        })
      }
    }
  } catch { /* no latest release */ }

  try {
    const data = source === 'github'
      ? await fetchJson(
          `https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`,
          { ...UA_HEADERS, accept: 'application/vnd.github+json' },
        )
      : await fetchJson(
          `https://gitee.com/api/v5/repos/${owner}/${repo}/commits?per_page=5`,
          UA_HEADERS,
        )
    if (Array.isArray(data)) {
      for (const c of data) {
        const msg = (c.commit && c.commit.message) || c.message || ''
        if (!msg) continue
        commits.push({
          sha: typeof c.sha === 'string' ? c.sha.slice(0, 7) : '',
          message: msg.split('\n')[0].slice(0, 160),
          date: (c.commit && c.commit.author && c.commit.author.date) || '',
        })
      }
    }
  } catch { /* no commits */ }

  return { ok: true, fullName, releases, commits }
}


// ── market discovery: featured (high-star) & recent (newly published) ────────

function normalizeRepoItem(source, item) {
  return {
    source,
    fullName: item.full_name ?? item.path_with_namespace ?? '',
    name: item.name ?? '',
    description: item.description ?? '',
    htmlUrl: item.html_url ?? '',
    stars: item.stargazers_count ?? 0,
    language: item.language ?? '',
    createdAt: (item.created_at || item.createdAt || '').slice(0, 10),
    updatedAt: (item.updated_at || item.updatedAt || '').slice(0, 10),
  }
}

/** Repos created in the last N days (GitHub created: filter; Gitee updated sort). */
async function marketRecent(days = 30) {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)
  const tasks = [
    (async () => {
      const gh = await fetchJson(
        `https://api.github.com/search/repositories?q=dsh+created:%3E${since}&sort=updated&order=desc&per_page=15`,
        { ...UA_HEADERS, accept: 'application/vnd.github+json' },
      )
      return (gh.items ?? []).map((item) => normalizeRepoItem('github', item))
    })(),
    (async () => {
      const gitee = await fetchJson(
        `https://gitee.com/api/v5/search/repositories?q=dsh&sort=updated_at&order=desc&per_page=15`,
        UA_HEADERS,
      )
      return (gitee ?? []).map((item) => normalizeRepoItem('gitee', item))
    })(),
  ]
  const settled = await Promise.allSettled(tasks)
  const results = []
  for (const entry of settled) if (entry.status === 'fulfilled') results.push(...entry.value)
  return results.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
}

// ── diagnostics ──────────────────────────────────────────────────────────────

/** Collect plugin/mcp anomalies + verify history + recent crash log lines. */
function collectDiagnostics(ctx) {
  const plugins = []
  for (const entry of ctx.loader.entries()) {
    if (isContainerEntry(entry)) continue
    const moduleName = entry.options.name
    const phase = entry.fiber === undefined ? null : FIBER_PHASE[entry.fiber.state]
    const disabled = entry.disabled === true
    const issue = phase === 'failed'
      ? '挂载失败（mount failed）'
      : (!disabled && phase === null)
        ? '未挂载（phase 未知）'
        : ''
    if (issue !== '') {
      plugins.push({ entryId: entry.id, moduleName, title: shortName(moduleName), phase, disabled, issue })
    }
  }
  const state = readState()
  const verifyLog = Array.isArray(state.verifyLog) ? state.verifyLog : []
  const crashes = []
  try {
    const logPath = join(resolveDshHome(), 'dsh-stdout.log')
    if (existsSync(logPath)) {
      const lines = readFileSync(logPath, 'utf8').split(/\r?\n/).filter((l) => /Error|error|failed|crash/i.test(l))
      for (const line of lines.slice(-6)) crashes.push(line.slice(0, 200))
    }
  } catch { /* no log */ }
  return { plugins, verifyLog: verifyLog.slice(-3), crashes, watchdog: null }
}

/** Run the automatable fixes: duplicate-core sweep + restart failed entries. */
async function runDiagnoseFix(ctx) {
  const results = []
  try {
    const fixed = verifyAndFixDuplicates(ctx)
    results.push({ action: 'verify', detail: `重复核心包扫描：${fixed.length > 0 ? fixed.map((f) => f.package).join(', ') : '无问题'}` })
  } catch (error) {
    results.push({ action: 'verify', detail: `扫描失败：${errorMessage(error)}`, ok: false })
  }
  for (const entry of ctx.loader.entries()) {
    if (isContainerEntry(entry)) continue
    const phase = entry.fiber === undefined ? null : FIBER_PHASE[entry.fiber.state]
    if (phase !== 'failed') continue
    try {
      await ctx.loader.update(entry.id, { disabled: false })
      results.push({ action: 'restart', detail: `${entry.options.name}: 已重新挂载`, ok: true })
    } catch (error) {
      results.push({ action: 'restart', detail: `${entry.options.name}: 重启失败（${errorMessage(error)}）`, ok: false })
    }
  }
  if (results.length === 0) results.push({ action: 'none', detail: '未发现可自动修复的异常' })
  return results
}

/** Ask the local LLM service (if present) for a plain-language diagnosis. */
async function aiDiagnose(ctx, diagnostics) {
  let llm
  try { llm = ctx.get('llm') } catch { llm = undefined }
  if (llm === undefined || typeof llm.stream !== 'function') return null
  let model
  try {
    const providers = llm.listProviders ? llm.listProviders() : []
    if (Array.isArray(providers) && providers.length > 0) model = providers[0]?.id
  } catch { /* no providers */ }
  const options = {
    messages: [
      { role: 'system', content: '你是 DeepSeek Harness 插件诊断助手。基于用户提供的插件诊断 JSON，用中文输出简洁结论：1) 异常项清单 2) 每项最可能的原因 3) 建议操作（如果诊断里没有异常就说明一切正常）。控制在 200 字内。' },
      { role: 'user', content: JSON.stringify(diagnostics) },
    ],
    ...(model ? { model } : {}),
  }
  let text = ''
  try {
    for await (const chunk of llm.stream(options)) {
      const piece = typeof chunk === 'string' ? chunk : (chunk && (chunk.content ?? chunk.text ?? chunk.delta ?? ''))
      if (piece) text += piece
    }
  } catch (error) {
    console.warn('[dsh-extension-hub] aiDiagnose failed:', errorMessage(error))
    return null
  }
  return text.trim() || null
}

// ── routes ───────────────────────────────────────────────────────────────────

function makeRoutes(ctx, { watchdogApi } = {}) {
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

  // MCP servers are cordis entries whose module is @deepseek-ai/dsh-mcp-client.
  const MCP_MODULE = '@deepseek-ai/dsh-mcp-client'
  const listMcps = () => {
    const servers = []
    for (const entry of ctx.loader.entries()) {
      if (isContainerEntry(entry)) continue
      if (entry.options.name !== MCP_MODULE) continue
      const cfg = (entry.options && entry.options.config) || {}
      servers.push({
        entryId: entry.id,
        serverName: cfg.serverName || entry.id.replace(/^mcp-?/, ''),
        transport: cfg.transport || 'stdio',
        command: cfg.command || '',
        args: Array.isArray(cfg.args) ? cfg.args : [],
        envKeys: cfg.env ? Object.keys(cfg.env) : [],
        enabled: !entry.disabled,
        fiberPhase: entry.fiber === undefined ? null : FIBER_PHASE[entry.fiber.state],
        protected: isProtectedEntry(entry),
      })
    }
    return servers
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
    // mcp list
    {
      kind: 'exact',
      path: `${API_ROOT}/mcp`,
      handler: (req, res) => {
        if (!guard(req, res, 'GET')) return
        writeJson(res, 200, { servers: listMcps() })
      },
    },
    // mcp toggle (enable/disable an MCP server entry, hot-plugged)
    {
      kind: 'exact',
      path: `${API_ROOT}/mcp/toggle`,
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
    // installed index (for the market's duplicate-install guard)
    {
      kind: 'exact',
      path: `${API_ROOT}/installed`,
      handler: (req, res) => {
        if (!guard(req, res, 'GET')) return
        writeJson(res, 200, installedIndex(ctx))
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
    // plugins dependency verify (manual sweep: duplicate core copies + auto-fix)
    {
      kind: 'exact',
      path: `${API_ROOT}/plugins/verify`,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        try {
          const results = verifyAndFixDuplicates(ctx)
          const state = readState()
          const log = Array.isArray(state.verifyLog) ? state.verifyLog : []
          log.push({ at: new Date().toISOString(), scope: 'manual', results })
          state.verifyLog = log.slice(-50)
          writeState(state)
          writeJson(res, 200, { results })
        } catch (error) {
          writeJson(res, 500, { error: errorMessage(error) })
        }
      },
    },
    // plugins dependency verify history (latest first)
    {
      kind: 'exact',
      path: `${API_ROOT}/plugins/verify-log`,
      handler: (req, res) => {
        if (!guard(req, res, 'GET')) return
        const log = Array.isArray(readState().verifyLog) ? readState().verifyLog : []
        writeJson(res, 200, { log: [...log].reverse() })
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
    // repo update notes (releases + commits, for the market detail view)
    {
      kind: 'exact',
      path: `${API_ROOT}/repo-updates`,
      handler: async (req, res) => {
        if (!guard(req, res, 'GET')) return
        const url = new URL(req.url, 'http://localhost')
        const source = url.searchParams.get('source') || 'github'
        const fullName = url.searchParams.get('fullName') || ''
        try {
          writeJson(res, 200, await repoUpdates(source, fullName))
        } catch (error) {
          writeJson(res, 400, { error: errorMessage(error) })
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
    // updates check (plugins + skills)
    {
      kind: 'exact',
      path: `${API_ROOT}/updates`,
      handler: async (req, res) => {
        if (!guard(req, res, 'GET')) return
        try {
          writeJson(res, 200, await checkUpdates(ctx))
        } catch (error) {
          writeJson(res, 500, { error: errorMessage(error) })
        }
      },
    },
    // batch update (plugins + skills, run in parallel as tracked tasks)
    {
      kind: 'exact',
      path: `${API_ROOT}/updates/apply`,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        const body = await readJsonBody(req)
        const targets = Array.isArray(body?.targets) ? body.targets : []
        if (targets.length === 0) {
          writeJson(res, 400, { error: 'targets is required (non-empty array)' })
          return
        }
        const started = []
        const errors = []
        for (const target of targets) {
          const result = startUpdateTask(ctx, target)
          if (result.ok) started.push(result.task)
          else errors.push(result.error)
        }
        writeJson(res, 200, { ok: true, started, errors })
      },
    },
    // market: recently published repos (last 30 days)
    {
      kind: 'exact',
      path: `${API_ROOT}/market/recent`,
      handler: async (req, res) => {
        if (!guard(req, res, 'GET')) return
        try {
          writeJson(res, 200, { results: await marketRecent() })
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) })
        }
      },
    },
    // diagnostics: anomaly scan (plugins + verify history + crash log tail)
    {
      kind: 'exact',
      path: `${API_ROOT}/diagnose`,
      handler: async (req, res) => {
        if (!guard(req, res, 'GET')) return
        try {
          const diagnostics = collectDiagnostics(ctx)
          const ai = await aiDiagnose(ctx, diagnostics)
          writeJson(res, 200, { ...diagnostics, ai })
        } catch (error) {
          writeJson(res, 500, { error: errorMessage(error) })
        }
      },
    },
    // diagnostics: run automatable fixes (duplicate sweep + restart failed)
    {
      kind: 'exact',
      path: `${API_ROOT}/diagnose/fix`,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        try {
          writeJson(res, 200, { ok: true, results: await runDiagnoseFix(ctx) })
        } catch (error) {
          writeJson(res, 400, { error: errorMessage(error) })
        }
      },
    },
    // update task progress
    {
      kind: 'exact',
      path: `${API_ROOT}/updates/tasks`,
      handler: (req, res) => {
        if (!guard(req, res, 'GET')) return
        writeJson(res, 200, { tasks: updateTasks.map(taskSummary) })
      },
    },
    // remove a finished update task from the list
    {
      kind: 'exact',
      path: `${API_ROOT}/updates/tasks/remove`,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        const body = await readJsonBody(req)
        const taskId = typeof body?.taskId === 'string' ? body.taskId : ''
        if (taskId === '') {
          writeJson(res, 400, { error: 'taskId is required' })
          return
        }
        const idx = updateTasks.findIndex((t) => t.id === taskId)
        if (idx === -1) {
          writeJson(res, 200, { ok: true, removed: false })
          return
        }
        const [removed] = updateTasks.splice(idx, 1)
        writeJson(res, 200, { ok: true, removed: true, id: removed.id })
      },
    },
    // process watchdog status
    {
      kind: 'exact',
      path: `${API_ROOT}/watchdog/status`,
      handler: async (req, res) => {
        if (!guard(req, res, 'GET')) return
        try {
          writeJson(res, 200, await watchdogApi.status())
        } catch (error) {
          writeJson(res, 500, { error: errorMessage(error) })
        }
      },
    },
    // process watchdog start
    {
      kind: 'exact',
      path: `${API_ROOT}/watchdog/start`,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        try {
          writeJson(res, 200, await watchdogApi.start())
        } catch (error) {
          writeJson(res, 500, { error: errorMessage(error) })
        }
      },
    },
    // process watchdog stop
    {
      kind: 'exact',
      path: `${API_ROOT}/watchdog/stop`,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        try {
          writeJson(res, 200, await watchdogApi.stop())
        } catch (error) {
          writeJson(res, 500, { error: errorMessage(error) })
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
  const watchdogApi = makeWatchdogApi(config)
  const routes = makeRoutes(ctx, { watchdogApi })
  ctx.effect(
    () => {
      const disposers = routes.map((route) => ctx.webServer.register(route))
      return () => {
        for (const dispose of disposers) dispose()
      }
    },
    'dsh-extension-hub: routes',
  )

  // Announcement.
  const systemPrompt = ctx.get('systemPrompt')
  if (systemPrompt !== undefined) {
    ctx.effect(
      () =>
        systemPrompt.section({
          name: 'plugin:dsh-extension-hub',
          order: 150,
          text: SKILL_MANAGER_GUIDANCE,
        }),
      'dsh-extension-hub: announcement',
    )
  }

  // Re-apply durable plugin decisions (disabled + installed) after boot.
  ctx.effect(() => {
    const handle = setTimeout(() => {
      applyBootOverrides(ctx).catch((error) => {
        console.warn('[dsh-extension-hub] boot override apply failed:', errorMessage(error))
      })
    }, 0)
    return () => clearTimeout(handle)
  }, 'dsh-extension-hub: boot overrides')
}
