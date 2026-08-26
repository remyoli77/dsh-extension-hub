window.__ModuleLoader__.load({
  id: 'dsh-extension-hub',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')

    // ── stylesheet ───────────────────────────────────────────────────────────
    const css = [
      '.smSection{display:flex;flex-direction:column;gap:14px;width:100%;max-width:820px;color:var(--dsw-alias-label-primary)}',
      '.smStatus,.smEmpty{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;margin:0}',
      '.smError{display:flex;align-items:center;gap:10px;color:var(--dsw-alias-state-error-primary);font-size:13px}',
      '.smError button,.smBtn{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:var(--dsw-alias-bg-layer-1);border-radius:6px;padding:4px 10px}',
      '.smError button:hover,.smBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.smBtn:disabled{cursor:not-allowed;opacity:.5}',
      '.smBtnDanger{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent);color:var(--dsw-alias-state-error-primary)}',
      '.smBtnPrimary{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}',
      '.smHeading{display:flex;align-items:baseline;gap:7px;padding:0 2px}',
      '.smHeading h3{margin:0;font-size:13px;font-weight:600;line-height:20px}',
      '.smHeading span{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;line-height:18px}',
      '.smList{display:flex;flex-direction:column;gap:10px;margin:0;padding:0;list-style:none}',
      '.smCard{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}',
      '.smCardRow{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}',
      '.smCardMain{display:flex;flex-direction:column;gap:4px;min-width:0}',
      '.smTitle{font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.smName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}',
      '.smModule{color:var(--dsw-alias-label-tertiary);font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}',
      '.smDesc{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.4;margin:0}',
      '.smZh{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.4;margin:0}',
      '.smActions{display:flex;align-items:center;gap:8px;flex:none}',
      '.smBadge{border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:1px 7px;font-size:11px;color:var(--dsw-alias-label-tertiary)}',
      '.smBadgeOn{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 45%, transparent);color:var(--dsw-alias-state-business-primary)}',
      '.smBadgeOff{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary)}',
      '.smBadgeType{border-color:color-mix(in srgb, var(--dsw-alias-state-warning-primary, #d97706) 45%, transparent);color:var(--dsw-alias-state-warning-primary, #d97706)}',
      '.smBadgeSource{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}',
      '.smSearchRow{display:flex;gap:8px;align-items:center}',
      '.smFilterRow{display:flex;gap:8px;align-items:center}',
      '.smSearchRow input{flex:1;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;padding:7px 12px;font-size:13px;outline:none}',
      '.smSearchRow input:focus-visible{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent)}',
      '.smSearchRow select{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;padding:7px 8px;font-size:13px;outline:none}',
      '.smForm{display:flex;flex-direction:column;gap:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:10px;padding:12px 14px}',
      '.smForm summary{cursor:pointer;font-size:13px;font-weight:600}',
      '.smField{display:flex;flex-direction:column;gap:4px}',
      '.smField label{font-size:12px;color:var(--dsw-alias-label-tertiary)}',
      '.smField input,.smField textarea{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;padding:7px 10px;font-size:13px;outline:none}',
      '.smField input:focus-visible,.smField textarea:focus-visible{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent)}',
      '.smField textarea{min-height:96px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}',
      '.smFormRow{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap}',
      '.smFormRow .smField{flex:1;min-width:180px}',
      '.smHint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5;margin:0}',
      '.smVerifyList{display:flex;flex-direction:column;gap:6px;margin:6px 0 0;padding:0;list-style:none}',
      '.smVerifyItem{display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);min-width:0}',
      '.smVerifyItem .smBadge{flex:none;white-space:nowrap}',
      '.smTabs{display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--dsw-alias-border-l2);padding-bottom:10px}',
      '.smTab{border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:13px;font-weight:600;cursor:pointer;border-radius:8px;padding:6px 14px}',
      '.smTab:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.smTabActive{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent);color:var(--dsw-alias-state-business-primary);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 8%, transparent)}',
      '.smTabPane{display:flex;flex-direction:column;gap:12px}',
      '.smCount{color:var(--dsw-alias-label-tertiary);font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.smUpdateBanner{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid color-mix(in srgb, var(--dsw-alias-state-warning-primary, #d97706) 45%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-warning-primary, #d97706) 10%, transparent);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--dsw-alias-state-warning-primary, #d97706)}',
      '.smUpdateBanner .smBtn{border-color:color-mix(in srgb, var(--dsw-alias-state-warning-primary, #d97706) 50%, transparent);color:var(--dsw-alias-state-warning-primary, #d97706)}',
      '.smProgressTrack{height:6px;border-radius:3px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;flex:1;min-width:80px;margin-top:2px}',
      '.smProgressFill{height:100%;border-radius:3px;background:var(--dsw-alias-state-business-primary);transition:width .5s ease}',
      '.smInstallProgress{position:relative;width:120px;height:26px;border-radius:13px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 35%, transparent)}',
      '.smInstallProgressFill{position:absolute;inset:0;width:40%;background:linear-gradient(90deg,transparent,color-mix(in srgb, var(--dsw-alias-state-business-primary) 55%, transparent),transparent);background-size:200% 100%;animation:smInstallSlide 1.2s linear infinite;border-radius:13px}',
      '@keyframes smInstallSlide{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}',
      '.smProgressDone{background:var(--dsw-alias-state-business-primary)}',
      '.smProgressFail{background:var(--dsw-alias-state-error-primary)}',
    ].join('\n')
    const tagId = 'dsh-extension-hub/extension-hub.css'
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + tagId + '"]') === null) {
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-extension-hub'
      tag.dataset.pluginCss = tagId
      tag.textContent = css
      document.head.appendChild(tag)
    }

    const e = React.createElement

    // ── API client ───────────────────────────────────────────────────────────
    const API_ROOT = '/api/dsh-extension-hub'
    async function apiFetch(path, options) {
      const response = await fetch(API_ROOT + path, options)
      let body = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      if (!response.ok) {
        const message = body && typeof body.error === 'string' ? body.error : 'HTTP ' + response.status
        throw new Error(message)
      }
      return body
    }
    function post(path, payload) {
      return apiFetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    const api = {
      listSkills: () => apiFetch('/skills'),
      toggleSkill: (name, enabled) => post('/skills/toggle', { name, enabled }),
      uninstallSkill: (name, source) => post('/skills/uninstall', { name, source }),
      listPlugins: () => apiFetch('/plugins'),
      togglePlugin: (entryId, enabled) => post('/plugins/toggle', { entryId, enabled }),
      uninstallPlugin: (entryId) => post('/plugins/uninstall', { entryId }),
      listMcps: () => apiFetch('/mcp'),
      toggleMcp: (entryId, enabled) => post('/mcp/toggle', { entryId, enabled }),
      search: (q, source) => apiFetch('/search?q=' + encodeURIComponent(q) + '&source=' + encodeURIComponent(source)),
      installRepo: (payload) => post('/install-repo', payload),
      watchdogStatus: () => apiFetch('/watchdog/status'),
      watchdogStart: () => post('/watchdog/start', {}),
      watchdogStop: () => post('/watchdog/stop', {}),
      verifyPlugins: () => post('/plugins/verify', {}),
      verifyLog: () => apiFetch('/plugins/verify-log'),
      updates: () => apiFetch('/updates'),
      applyUpdates: (targets) => post('/updates/apply', { targets }),
      updateTasks: () => apiFetch('/updates/tasks'),
      repoUpdates: (source, fullName) => apiFetch('/repo-updates?source=' + encodeURIComponent(source) + '&fullName=' + encodeURIComponent(fullName)),
      removeTask: (taskId) => post('/updates/tasks/remove', { taskId }),
      marketRecent: () => apiFetch('/market/recent'),
      diagnose: () => apiFetch('/diagnose'),
      diagnoseFix: () => post('/diagnose/fix', {}),
    }

    function useBusy() {
      const [busy, setBusy] = React.useState({})
      const isBusy = (key) => busy[key] === true
      const run = (key, fn) => {
        setBusy((b) => ({ ...b, [key]: true }))
        return Promise.resolve()
          .then(fn)
          .finally(() => setBusy((b) => ({ ...b, [key]: false })))
      }
      return { isBusy, run }
    }

    function ErrorNotice({ message, onRetry, t }) {
      return e('div', { className: 'smError', role: 'alert' },
        e('p', { style: { margin: 0 } }, message),
        onRetry ? e('button', { type: 'button', onClick: onRetry }, t('retry')) : null,
      )
    }

    function StatusBadge({ enabled, t }) {
      return e('span', { className: enabled ? 'smBadge smBadgeOn' : 'smBadge smBadgeOff' }, enabled ? t('enabled') : t('disabled'))
    }

    function TypeBadge({ type, t }) {
      return e('span', { className: 'smBadge smBadgeType' }, type === 'skill' ? t('typeSkill') : t('typePlugin'))
    }

    // ── built-in featured registry (learned from dsh-market's directory idea;
    //    we keep a small curated list and reuse the existing install-repo channel) ──
    const FEATURED = [
      { source: 'github', fullName: 'zhu1090093659/dsh-web-ui', name: 'dsh-web-ui', stars: 3266, language: 'TypeScript', description: 'Plugin & skin collection: task board, git graph, right-side panel, pet, live token stats, skin center.' },
      { source: 'github', fullName: 'ccch1mneyyy/dsh-TUI', name: 'dsh-TUI', stars: 1484, language: 'TypeScript', description: 'Claude Code style TUI: whale bar, live status, streaming thoughts, double-Esc rollback, context progress + TPS.' },
      { source: 'github', fullName: 'liustack/modlens', name: 'modlens', stars: 2272, language: 'TypeScript', description: 'Vision bridge for text-only agents: paste an image, get structured JSON evidence (OCR, layout, semantics).' },
      { source: 'github', fullName: 'Anionex/dsh-vision-toolkit', name: 'dsh-vision-toolkit', stars: 500, language: 'TypeScript', description: 'Vision toolkit: intent-aware image Q&A, long-screenshot OCR, UI restoration.' },
      { source: 'github', fullName: 'omdsh-dev/dsh-genui', name: 'dsh-genui', stars: 132, language: 'TypeScript', description: 'Interactive UI components rendered inline in assistant replies (charts, forms, mermaid, 3D).' },
      { source: 'github', fullName: 'WYH66666666/DSH-Transparent-UI-Plugin', name: 'DSH-Transparent-UI', stars: 131, language: 'TypeScript', description: 'Glass-morphism theme for the DSH web UI, fully adjustable, no core changes.' },
      { source: 'github', fullName: 'lhh010/dsh-minigames', name: 'dsh-minigames', stars: 19, language: 'TypeScript', description: '18 offline mini-games in the right panel (Tetris, Minesweeper, 2048, …).' },
      { source: 'github', fullName: 'lhh010/dsh-bash-encoding', name: 'dsh-bash-encoding', stars: 7, language: 'TypeScript', description: 'Auto-detect bash output encoding (UTF-16LE/UTF-8/GBK) to fix Chinese mojibake on Windows/WSL.' },
      { source: 'github', fullName: 'Scorp1o117/dsh-soul-md', name: 'dsh-soul-md', stars: 2, language: 'TypeScript', description: 'Soul.md persona cards + long-term memory managed from the settings page.' },
    ]

    // ── unified extensions section ───────────────────────────────────────────
    function ExtensionsSection(props) {
      const { api, t } = props
      const [state, setState] = React.useState({ status: 'loading' })
      const [tab, setTab] = React.useState('plugins')
      // per-tab local filters
      const [qPlugins, setQPlugins] = React.useState('')
      const [qSkills, setQSkills] = React.useState('')
      const [qMarket, setQMarket] = React.useState('')
      const [qMcps, setQMcps] = React.useState('')
      // market remote-search state
      const [source, setSource] = React.useState('both')
      const [searchStatus, setSearchStatus] = React.useState('idle')
      const [remote, setRemote] = React.useState([])
      const [repoNotes, setRepoNotes] = React.useState({})
      const [searchDone, setSearchDone] = React.useState(false)
      const { isBusy, run } = useBusy()
      const [error, setError] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [wd, setWd] = React.useState(null)
      const [wdUpdated, setWdUpdated] = React.useState(null)
      const [verifyData, setVerifyData] = React.useState(null)
      const [verifyLog, setVerifyLog] = React.useState([])
      // Two-step uninstall guard: item key -> timestamp of the first click.
      const [confirmUninstall, setConfirmUninstall] = React.useState({})
      // Installed-list view filter: 'all' | 'paused' (paused plugins float to top)
      const [viewFilter, setViewFilter] = React.useState('all')

      const loadVerifyLog = React.useCallback(() =>
        api.verifyLog().then(
          (data) => {
            setVerifyLog(Array.isArray(data.log) ? data.log : [])
            setVerifyData((prev) => prev || (Array.isArray(data.log) && data.log.length > 0 ? data.log[0] : prev))
          },
          () => {},
        ).catch(() => {}), [api])

      React.useEffect(() => {
        loadVerifyLog()
      }, [loadVerifyLog])

      const loadWd = React.useCallback(() => run('wdRefresh', () =>
        api.watchdogStatus().then(
          (data) => {
            setWd(data)
            setWdUpdated(new Date())
          },
          () => setWd(null),
        ),
      ).catch(() => {}), [api])

      React.useEffect(() => {
        loadWd()
      }, [loadWd])

      const doWd = (action) => run('wd:' + action, () =>
        (action === 'start' ? api.watchdogStart() : api.watchdogStop()).then((data) => {
          setNotice(data.ok ? (action === 'start' ? t('wdStarted') : t('wdStoppedMsg')) : (data.error || t('wdFailed')))
          return loadWd()
        }),
      ).catch((err) => setError(err.message))

      const doVerify = () => run('verify', () =>
        api.verifyPlugins().then((data) => {
          const results = Array.isArray(data.results) ? data.results : []
          setVerifyData({ at: new Date().toISOString(), scope: 'manual', results })
          setNotice(results.length === 0 ? t('verifyOk') : t('verifyDone').replace('{n}', String(results.length)))
          return loadVerifyLog()
        }),
      ).catch((err) => setError(err.message))

      const refresh = React.useCallback(() => {
        setState({ status: 'loading' })
        Promise.all([api.listSkills(), api.listPlugins(), api.listMcps()]).then(
          ([skillsData, pluginsData, mcpData]) => {
            setState({ status: 'ready', skills: skillsData.skills, plugins: pluginsData.plugins, mcps: mcpData.servers })
          },
          (err) => {
            setError(err.message)
            setState({ status: 'error' })
          },
        )
      }, [api])

      React.useEffect(() => {
        refresh()
      }, [refresh])

      // ── update detection (auto on mount + manual button) ─────────────────
      const [updates, setUpdates] = React.useState(null)
      const doCheckUpdates = React.useCallback(() => run('updates', () =>
        api.updates().then((data) => {
          setUpdates(data)
          // No toast here: the per-tab update banner already shows the count.
        }),
      ).catch((err) => setError(err.message)), [api])

      React.useEffect(() => {
        doCheckUpdates()
      }, [doCheckUpdates])

      // ── update tasks (batch + parallel, progress polling) ─────────────────
      const [tasks, setTasks] = React.useState([])
        const [marketTab, setMarketTab] = React.useState('search')
        const [featured, setFeatured] = React.useState(null)
        const [recent, setRecent] = React.useState(null)
        const [diag, setDiag] = React.useState(null)
        const [fixResult, setFixResult] = React.useState(null)
      const loadTasks = React.useCallback(() =>
        api.updateTasks().then((data) => {
          const list = Array.isArray(data.tasks) ? data.tasks : []
          setTasks(list)
          const hadRunning = tasks.some((t) => t.status === 'running')
          if (hadRunning && !list.some((t) => t.status === 'running')) {
            // all tasks finished: refresh lists and re-check updates
            refresh()
            doCheckUpdates()
          }
        }).catch(() => {}), [api]) // eslint-disable-line react-hooks/exhaustive-deps

      React.useEffect(() => { loadTasks() }, [loadTasks])

      const runningCount = tasks.filter((t) => t.status === 'running').length
      React.useEffect(() => {
        if (runningCount === 0) return undefined
        const interval = setInterval(loadTasks, 2000)
        return () => clearInterval(interval)
      }, [runningCount, loadTasks])

      const doUpdate = (item) => run('update:' + item.key, () =>
        api.applyUpdates([{ type: item.type, entryId: item.entryId, name: item.name }]).then((res) => {
          setNotice(res.ok && res.started.length > 0 ? t('updateStarted') : ((res.errors && res.errors[0]) || t('updateFailed')))
          return loadTasks()
        }),
      ).catch((err) => setError(err.message))

      const loadRepoNotes = (result) => {
        const key = result.source + ':' + result.fullName
        const cur = repoNotes[key]
        if (cur && (cur.status === 'loading' || cur.status === 'done')) return
        setRepoNotes((m) => ({ ...m, [key]: { status: 'loading', data: null } }))
        api.repoUpdates(result.source, result.fullName).then((data) => {
          setRepoNotes((m) => ({ ...m, [key]: { status: 'done', data } }))
        }).catch((err) => {
          setRepoNotes((m) => ({ ...m, [key]: { status: 'error', data: null, message: err.message } }))
        })
      }

      // Market remote search (GitHub/Gitee/featured) — kept from the old single-pane UI.
      const resetMarketSearch = () => {
        setQMarket('')
        setRemote([])
        setSearchDone(false)
        setSearchStatus('idle')
      }
      const doSearch = () => run('search', () => {
        setSearchStatus('loading')
        setSearchDone(false)
        setError(null)
        if (source === 'featured') {
          setRemote(FEATURED)
          setSearchStatus('done')
          setSearchDone(true)
          return Promise.resolve()
        }
        return api.search(qMarket.trim(), source).then(
          (data) => {
            setRemote(data.results)
            setSearchStatus('done')
            setSearchDone(true)
          },
          (err) => {
            setError(err.message)
            setSearchStatus('done')
            setSearchDone(true)
          },
        )
      }).catch(() => {})

      // ── items, split by category ──────────────────────────────────────────
      const MCP_MODULE = '@deepseek-ai/dsh-mcp-client'
      const pluginItems = React.useMemo(() => {
        if (state.status !== 'ready') return []
        return state.plugins
          .filter((plugin) => plugin.moduleName !== MCP_MODULE)
          .map((plugin) => ({
            type: 'plugin',
            key: 'plugin:' + plugin.entryId,
            name: plugin.title,
            module: plugin.moduleName,
            description: plugin.description || '',
            zh: plugin.zh || '',
            enabled: plugin.enabled,
            fiberPhase: plugin.fiberPhase,
            protected: plugin.protected,
            userInstalled: plugin.userInstalled === true,
            entryId: plugin.entryId,
            toggle: () => api.togglePlugin(plugin.entryId, !plugin.enabled),
            uninstall: () => api.uninstallPlugin(plugin.entryId),
          }))
      }, [state, api])

      const skillItems = React.useMemo(() => {
        if (state.status !== 'ready') return []
        return state.skills.map((skill) => ({
          type: 'skill',
          key: 'skill:' + skill.source + ':' + skill.name,
          name: skill.name,
          module: skill.source,
          description: skill.description || '',
          zh: '',
          enabled: skill.enabled,
          toggle: () => api.toggleSkill(skill.name, !skill.enabled),
          uninstall: () => api.uninstallSkill(skill.name, skill.source),
        }))
      }, [state, api])

      const mcpItems = React.useMemo(() => {
        if (state.status !== 'ready') return []
        return state.mcps.map((mcp) => ({
          type: 'mcp',
          key: 'mcp:' + mcp.entryId,
          name: mcp.serverName,
          module: (mcp.transport || 'stdio') + (mcp.command ? ' · ' + mcp.command : ''),
          description: mcp.entryId,
          zh: '',
          enabled: mcp.enabled,
          fiberPhase: mcp.fiberPhase,
          protected: mcp.protected,
          toggle: () => api.toggleMcp(mcp.entryId, !mcp.enabled),
        }))
      }, [state, api])

      const allUpdateTargets = React.useMemo(() => {
        if (updates === null) return []
        const targets = []
        for (const p of updates.plugins) {
          if (!p.updatable) continue
          const item = pluginItems.find((i) => i.module === p.moduleName)
          if (item) targets.push({ type: 'plugin', entryId: item.entryId })
        }
        for (const s of updates.skills) if (s.updatable) targets.push({ type: 'skill', name: s.name })
        return targets
      }, [updates, pluginItems])

      const doUpdateAll = () => run('updateAll', () =>
        api.applyUpdates(allUpdateTargets).then((res) => {
          setNotice(res.ok && res.started.length > 0 ? t('updateStarted') : ((res.errors && res.errors[0]) || t('updateFailed')))
          return loadTasks()
        }),
      ).catch((err) => setError(err.message))

      // retry a failed update task (plugin/skill only; install tasks just get cleared)
      const doRetryTask = (task) => {
        if (!task.target || task.target.type === 'install') return
        const target = { type: task.target.type, entryId: task.target.entryId, name: task.target.name }
        run('retry:' + task.id, () =>
          api.applyUpdates([target]).then((res) => {
            setNotice(res.ok && res.started.length > 0 ? t('updateStarted') : ((res.errors && res.errors[0]) || t('updateFailed')))
            return loadTasks()
          }),
        ).catch((err) => setError(err.message))
      }

      const doRemoveTask = (task) => run('remove:' + task.id, () =>
        api.removeTask(task.id).then(() => loadTasks()),
      ).catch((err) => setError(err.message))

      const matchItem = (item, q) => {
        const nq = q.trim().toLocaleLowerCase()
        if (nq.length === 0) return true
        return [item.name, item.module, item.description, item.zh].some((v) => String(v).toLocaleLowerCase().includes(nq))
      }
      // ── update awareness: banner counts + updatable-first ordering ────────
      const updatableKeys = React.useMemo(() => {
        const s = new Set()
        if (updates) {
          for (const p of updates.plugins) if (p.updatable) s.add('module:' + p.moduleName)
          for (const sk of updates.skills) if (sk.updatable) s.add('name:' + sk.name)
        }
        return s
      }, [updates])
      const updCounts = updates === null ? { plugins: 0, skills: 0 }
        : {
            plugins: updates.plugins.filter((p) => p.updatable).length,
            skills: updates.skills.filter((s) => s.updatable).length,
          }
      const updatableFirst = (list) => [...list].sort((a, b) => {
        const ka = a.type === 'plugin' ? 'module:' + a.module : 'name:' + a.name
        const kb = b.type === 'plugin' ? 'module:' + b.module : 'name:' + b.name
        return (updatableKeys.has(kb) ? 1 : 0) - (updatableKeys.has(ka) ? 1 : 0)
      })

      // merged view: skills + plugins shown together under one tab
      const mergedItems = React.useMemo(() => [...skillItems, ...pluginItems], [skillItems, pluginItems])
      // Paused plugins float to the top (stable sort keeps updatable-first order
      // within each group); the "paused" view tab shows only disabled entries.
      const pausedFirst = (list) => [...list].sort((a, b) => (a.enabled === b.enabled ? 0 : a.enabled ? 1 : -1))
      const applyView = (list) => (viewFilter === 'paused' ? list.filter((item) => !item.enabled) : list)
      const filteredMerged = applyView(pausedFirst(updatableFirst(mergedItems.filter((item) => matchItem(item, qPlugins)))))
      const myMergedItems = filteredMerged.filter((item) => item.type === 'skill' || item.userInstalled === true)
      const coreMergedItems = filteredMerged.filter((item) => item.type === 'plugin' && item.userInstalled !== true)
      const updTotal = updCounts.plugins + updCounts.skills
      // ── local filtering (installed, categorized search) ──────────────────
      const filteredPlugins = updatableFirst(pluginItems.filter((item) => matchItem(item, qPlugins)))
      const filteredSkills = updatableFirst(skillItems.filter((item) => matchItem(item, qSkills)))
      const filteredMcps = mcpItems.filter((item) => matchItem(item, qMcps))

      const doToggle = (item) => run('toggle:' + item.key, () => item.toggle().then(() => refresh())).catch((err) => setError(err.message))
      // Two-step uninstall: first click arms, second click within 3s executes.
      const doUninstall = (item) => {
        const pending = confirmUninstall[item.key] && Date.now() - confirmUninstall[item.key] < 3000
        if (!pending) {
          setConfirmUninstall((c) => ({ ...c, [item.key]: Date.now() }))
          return
        }
        setConfirmUninstall((c) => ({ ...c, [item.key]: undefined }))
        run('uninstall:' + item.key, () => item.uninstall().then(() => refresh())).catch((err) => setError(err.message))
      }
      // Uninstall is only offered for user-installed plugins and skills; system/core
      // plugins get enable/disable only, so a mistaken click can never remove them.
      const uninstallButton = (item) => {
        if (item.type === 'plugin' && item.userInstalled !== true) return null
        if (item.type === 'mcp') return null
        const armed = confirmUninstall[item.key] && Date.now() - confirmUninstall[item.key] < 3000
        return e('button', {
          type: 'button',
          className: 'smBtn smBtnDanger',
          disabled: isBusy('uninstall:' + item.key),
          onClick: () => doUninstall(item),
        }, armed ? t('confirmUninstall') : t('uninstall'))
      }

      const doInstallRepo = (result) => run('repo:' + result.source + ':' + result.fullName, () => {
        setNotice(t('installing'))
        const request = api.installRepo({ source: result.source, fullName: result.fullName })
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(t('requestTimeout'))), 30000))
        return Promise.race([request, timeout]).then((res) => {
          setNotice(res.ok
            ? (res.type === 'skill' ? t('repoSkillInstalled') : t('repoPluginInstalling'))
            : res.error)
          if (res.ok && res.type === 'skill') refresh()
          if (res.ok && res.type === 'plugin') loadTasks()
        })
      }).catch((err) => setError(err.message))

      const phaseLabel = (phase) => {
        if (phase === null || phase === undefined) return ''
        return t('phase_' + phase) || phase
      }

      const verifyActionLabel = (action) => t('vAction_' + action) || action
      const verifyBadgeClass = (action) => {
        if (action === 'fixed' || action === 'fixed-verify-failed') return 'smBadge smBadgeOn'
        if (action === 'warn-version-mismatch' || action === 'warn') return 'smBadge smBadgeType'
        return 'smBadge smBadgeOff'
      }

      // ── card renderer (installed items) ───────────────────────────────────
      const card = (item) => {
        const upd = updates === null ? null
          : item.type === 'plugin'
            ? updates.plugins.find((u) => u.moduleName === item.module) || null
            : item.type === 'skill'
              ? updates.skills.find((u) => u.name === item.name) || null
              : null
        return e('li', { className: 'smCard', key: item.key },
          e('div', { className: 'smCardRow' },
            e('div', { className: 'smCardMain' },
              e('div', { className: 'smTitle' },
                e('span', { className: 'smName' }, item.name),
                item.type === 'skill' ? TypeBadge({ type: item.type, t })
                  : item.type === 'mcp' ? e('span', { className: 'smBadge smBadgeType' }, t('typeMcp'))
                  : TypeBadge({ type: item.type, t }),
                item.userInstalled === true ? e('span', { className: 'smBadge smBadgeOn' }, t('mineBadge')) : null,
                StatusBadge({ enabled: item.enabled, t }),
                item.protected ? e('span', { className: 'smBadge smBadgeSource' }, t('core')) : null,
                item.fiberPhase ? e('span', { className: 'smBadge' }, phaseLabel(item.fiberPhase)) : null,
                upd && upd.updatable ? e('span', { className: 'smBadge smBadgeOn' },
                  item.type === 'plugin' && upd.latest ? t('updateTo') + ' v' + upd.latest : t('updateAvailable')) : null,
              ),
              item.module ? e('p', { className: 'smModule' }, item.module) : null,
              item.zh ? e('p', { className: 'smZh' }, item.zh) : null,
              item.description ? e('p', { className: 'smDesc' }, item.description) : null,
            ),
            e('div', { className: 'smActions' },
              item.protected ? null : e('button', {
                type: 'button',
                className: 'smBtn',
                disabled: isBusy('toggle:' + item.key),
                onClick: () => doToggle(item),
              }, item.enabled ? t('stop') : t('start')),
              upd && upd.updatable ? e('button', {
                type: 'button',
                className: 'smBtn smBtnPrimary',
                disabled: isBusy('update:' + item.key),
                onClick: () => doUpdate(item),
              }, isBusy('update:' + item.key) ? t('updating') : t('update')) : null,
              item.protected ? null : uninstallButton(item),
            ),
          ),
        )
      }

        // ── market sub-tabs: 搜索 / 推荐 / 新上线 / 诊断 ────────────────────

        const repoCard = (result) => e('li', { className: 'smCard', key: result.source + ':' + result.fullName },
          e('div', { className: 'smCardRow' },
            e('div', { className: 'smCardMain' },
              e('div', { className: 'smTitle' },
                e('span', { className: 'smName' }, result.name),
                e('span', { className: 'smBadge smBadgeSource' }, result.source === 'github' ? 'GitHub' : 'Gitee'),
                result.language ? e('span', { className: 'smBadge' }, result.language) : null,
                e('span', { className: 'smBadge' }, '★ ' + result.stars),
                result.createdAt ? e('span', { className: 'smBadge' }, '🆕 ' + result.createdAt) : null,
              ),
              result.description ? e('p', { className: 'smDesc' }, result.description) : null,
              e('p', { className: 'smModule' }, result.fullName),
            ),
            e('div', { className: 'smActions' },
              (() => {
                // find a tracked install task for this repo (target.fullName matches)
                const task = tasks.find((t) => t.target && t.target.type === 'install' && t.target.fullName === result.fullName)
                const busy = isBusy('repo:' + result.source + ':' + result.fullName)
                if (task && task.status === 'running') {
                  // ── running: the button becomes a progress bar ────────────
                  return e('div', { className: 'smInstallProgress', role: 'progressbar', 'aria-label': t('installing') },
                    e('div', { className: 'smInstallProgressFill' }),
                  )
                }
                if (task && task.status === 'failed') {
                  // ── failed: error note + retry button ─────────────────────
                  return e('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' } },
                    e('button', {
                      type: 'button',
                      className: 'smBtn smBtnPrimary',
                      disabled: busy,
                      onClick: () => doInstallRepo(result),
                    }, busy ? t('installing') : t('installRetry')),
                    task.error ? e('p', { className: 'smDesc', style: { color: 'var(--ds-err, #e5534b)', margin: 0, textAlign: 'right', maxWidth: 220 } }, task.error.split('\n')[0]) : null,
                  )
                }
                if (task && task.status === 'done') {
                  // ── done: installed badge ─────────────────────────────────
                  return e('span', { className: 'smBadge smBadgeOn' }, t('installDone'))
                }
                // ── idle: install button ────────────────────────────────────
                return e('button', {
                  type: 'button',
                  className: 'smBtn smBtnPrimary',
                  disabled: busy,
                  onClick: () => doInstallRepo(result),
                }, busy ? t('installing') : t('installOneClick'))
              })(),
            ),
          ),
          e('details', {
            className: 'smForm',
            style: { margin: 0, padding: '8px 12px' },
            onToggle: (ev) => { if (ev.currentTarget.open) loadRepoNotes(result) },
          },
            e('summary', null, t('marketUpdates')),
            (() => {
              const note = repoNotes[result.source + ':' + result.fullName]
              if (!note || note.status === 'loading') return e('p', { className: 'smStatus' }, t('loading'))
              if (note.status === 'error' || !note.data) return e('p', { className: 'smDesc' }, t('noRepoNotes'))
              const d = note.data
              const hasContent = (d.releases && d.releases.length > 0) || (d.commits && d.commits.length > 0)
              if (!hasContent) return e('p', { className: 'smDesc' }, t('noRepoNotes'))
              return e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                d.releases && d.releases.length > 0
                  ? e('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                      e('p', { className: 'smZh' }, t('latestRelease')),
                      d.releases.map((r) => e('div', { key: r.tag, style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                        e('div', { className: 'smTitle' },
                          e('span', { className: 'smName' }, (r.name || r.tag)),
                          r.publishedAt ? e('span', { className: 'smBadge' }, r.publishedAt.slice(0, 10)) : null,
                        ),
                        r.body ? e('p', { className: 'smDesc', style: { whiteSpace: 'pre-wrap' } }, r.body) : null,
                      )),
                    )
                  : null,
                d.commits && d.commits.length > 0
                  ? e('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                      e('p', { className: 'smZh' }, t('recentCommits')),
                      e('ul', { className: 'smVerifyList' },
                        d.commits.map((c) => e('li', { className: 'smVerifyItem', key: c.sha + c.message },
                          e('span', { className: 'smBadge' }, c.sha),
                          e('span', null, c.message),
                        )),
                      ),
                    )
                  : null,
              )
            })(),
          ),
        )

        const loadFeatured = () => run('featured', () => {
          // show the built-in curated list instantly; merge live high-star repos later
          setFeatured(FEATURED)
          return api.search('dsh', 'both').then((remote) => {
            const seen = new Set()
            const merged = []
            for (const r of [...FEATURED, ...(Array.isArray(remote) ? remote : [])]) {
              const key = r.source + ':' + r.fullName
              if (seen.has(key)) continue
              seen.add(key)
              merged.push(r)
            }
            merged.sort((a, b) => (b.stars || 0) - (a.stars || 0))
            setFeatured(merged)
          }).catch(() => {})
        })

        const loadRecent = () => run('recent', () =>
          api.marketRecent().then((d) => setRecent(Array.isArray(d.results) ? d.results : [])),
        ).catch(() => setRecent([]))

        const loadDiag = () => run('diag', () =>
          api.diagnose().then((d) => setDiag(d)),
        ).catch((err) => setDiag({ error: err.message }))

        const doDiagnoseFix = () => run('diagFix', () =>
          api.diagnoseFix().then((d) => {
            setFixResult(Array.isArray(d.results) ? d.results : [])
            setNotice(t('diagFixDone'))
          }),
        ).catch((err) => setError(err.message))

      const tabs = [
        { id: 'plugins', label: t('tabPlugins') },
        { id: 'market', label: t('tabMarket') },
        { id: 'mcps', label: t('tabMcps') },
      ]

      // ── watchdog card (shown in the plugins tab) ──────────────────────────
      const watchdogCard = e('div', { className: 'smForm' },
        e('div', { className: 'smCardRow' },
          e('div', { className: 'smCardMain' },
            e('div', { className: 'smTitle' },
              e('span', { className: 'smName' }, t('wdTitle')),
              wd && wd.running
                ? e('span', { className: 'smBadge smBadgeOn' }, t('wdRunning'))
                : e('span', { className: 'smBadge smBadgeOff' }, t('wdStopped')),
            ),
            wd && wd.state
              ? e('p', { className: 'smZh' }, t('wdStats')
                  .replace('{count}', String(wd.state.restartCount || 0))
                  .replace('{reason}', wd.state.lastRestartReason || t('wdNone'))
                  .replace('{checks}', String(wd.state.totalChecks || 0)))
              : e('p', { className: 'smDesc' }, t('wdNoStats')),
            wdUpdated
              ? e('p', { className: 'smHint' }, t('wdUpdated') + ' ' + wdUpdated.toLocaleTimeString())
              : null,
            wd && wd.logTail && wd.logTail.length > 0
              ? e('pre', { className: 'smModule', style: { whiteSpace: 'pre-wrap', maxHeight: 110, overflow: 'auto', margin: 0 } }, wd.logTail.join('\n'))
              : null,
          ),
          e('div', { className: 'smActions' },
            wd && wd.running
              ? e('button', { type: 'button', className: 'smBtn smBtnDanger', disabled: isBusy('wd:stop') || isBusy('wdRefresh'), onClick: () => doWd('stop') }, t('wdStop'))
              : e('button', { type: 'button', className: 'smBtn smBtnPrimary', disabled: isBusy('wd:start') || isBusy('wdRefresh'), onClick: () => doWd('start') }, t('wdStart')),
            e('button', { type: 'button', className: 'smBtn', disabled: isBusy('wdRefresh'), onClick: loadWd }, isBusy('wdRefresh') ? t('wdRefreshing') : t('wdRefresh')),
          ),
        ),
      )

      // ── dependency health check card (shown in the plugins tab) ───────────
      const verifyCard = e('div', { className: 'smForm' },
        e('div', { className: 'smCardRow' },
          e('div', { className: 'smCardMain' },
            e('div', { className: 'smTitle' },
              e('span', { className: 'smName' }, t('verifyTitle')),
              verifyData && verifyData.results && verifyData.results.length > 0
                ? e('span', { className: 'smBadge smBadgeType' }, t('verifyIssues').replace('{n}', String(verifyData.results.length)))
                : e('span', { className: 'smBadge smBadgeOn' }, t('verifyHealthy')),
            ),
            verifyData
              ? e('p', { className: 'smHint' }, t('verifyAt') + ' ' + new Date(verifyData.at).toLocaleString())
              : e('p', { className: 'smDesc' }, t('verifyNoData')),
            e('p', { className: 'smDesc' }, t('verifyHint')),
            verifyData && verifyData.results && verifyData.results.length > 0
              ? e('ul', { className: 'smVerifyList' },
                  verifyData.results.map((r, i) => e('li', { className: 'smVerifyItem', key: i },
                    e('span', { className: verifyBadgeClass(r.action) }, verifyActionLabel(r.action)),
                    e('span', null,
                      (r.package || r.message || ''),
                      r.version ? ' @' + r.version : '',
                      r.message && r.message !== r.package ? (r.package ? ' — ' + r.message : r.message) : '',
                    ),
                  )),
                )
              : null,
          ),
          e('div', { className: 'smActions' },
            e('button', {
              type: 'button',
              className: 'smBtn smBtnPrimary',
              disabled: isBusy('verify'),
              onClick: doVerify,
            }, isBusy('verify') ? t('verifyRunning') : t('verifyRun')),
          ),
        ),
      )

      // ── installed list with a heading ─────────────────────────────────────
      const groupList = (items, heading, hint) => e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        e('div', { className: 'smHeading' },
          e('h3', null, heading),
          e('span', null, String(items.length)),
        ),
        hint ? e('p', { className: 'smHint' }, hint) : null,
        items.length > 0 ? e('ul', { className: 'smList' }, items.map(card)) : e('p', { className: 'smEmpty' }, t('noMatch')),
      )

      return e('div', { className: 'smSection', 'aria-busy': state.status === 'loading' },
        // tab bar
        e('div', { className: 'smTabs', role: 'tablist' },
          tabs.map((tb) => e('button', {
            type: 'button',
            key: tb.id,
            role: 'tab',
            'aria-selected': tab === tb.id,
            className: tab === tb.id ? 'smTab smTabActive' : 'smTab',
            onClick: () => setTab(tb.id),
          }, tb.label)),
        ),

        error ? ErrorNotice({ message: error, onRetry: () => { setError(null); refresh() }, t }) : null,
        notice ? e('p', { className: 'smZh', role: 'status' }, notice) : null,

        // ── 插件（插件 + 技能合并展示）────────────────────────────────────
        tab === 'plugins' ? e('div', { className: 'smTabPane' },
          e('div', { className: 'smSearchRow' },
            e('input', {
              value: qPlugins,
              placeholder: t('searchPluginsPlaceholder'),
              'aria-label': t('searchLabel'),
              onChange: (ev) => setQPlugins(ev.currentTarget.value),
            }),
            qPlugins.trim() !== '' ? e('button', { type: 'button', className: 'smBtn', onClick: () => setQPlugins('') }, t('reset')) : null,
            e('button', { type: 'button', className: 'smBtn', disabled: isBusy('updates'), onClick: doCheckUpdates },
              isBusy('updates') ? t('updating') : t('checkUpdates')),
            e('span', { className: 'smCount' }, t('countSummary').replace('{plugins}', String(pluginItems.length)).replace('{skills}', String(skillItems.length))),
          ),
          updTotal > 0 ? e('div', { className: 'smUpdateBanner', role: 'status' },
            e('span', null, t('updateBannerAll')
              .replace('{n}', String(updTotal))
              .replace('{p}', String(updCounts.plugins))
              .replace('{s}', String(updCounts.skills))),
            e('button', { type: 'button', className: 'smBtn', disabled: isBusy('updateAll') || allUpdateTargets.length === 0, onClick: doUpdateAll },
              isBusy('updateAll') ? t('updating') : t('updateAll')),
            e('button', { type: 'button', className: 'smBtn', disabled: isBusy('updates'), onClick: doCheckUpdates }, t('checkUpdates')),
          ) : null,
          state.status === 'loading' ? e('p', { className: 'smStatus' }, t('loading')) : null,
          state.status === 'ready' && mergedItems.length === 0 ? e('p', { className: 'smEmpty' }, t('noExtensions')) : null,
          state.status === 'ready' && mergedItems.length > 0
            ? e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                e('div', { className: 'smFilterRow' },
                  e('button', { type: 'button', className: viewFilter === 'all' ? 'smBtn smBtnPrimary' : 'smBtn', onClick: () => setViewFilter('all') }, t('viewAll')),
                  e('button', { type: 'button', className: viewFilter === 'paused' ? 'smBtn smBtnPrimary' : 'smBtn', onClick: () => setViewFilter('paused') }, t('viewPaused')),
                ),
                groupList(myMergedItems, t('myInstalledHeading'), null),
                groupList(coreMergedItems, t('corePluginsHeading'), t('corePluginsHint')),
              )
            : null,
          watchdogCard,
          verifyCard,
        ) : null,

        // ── 插件技能市场 ────────────────────────────────────────────────────
        tab === 'market' ? e('div', { className: 'smTabPane' },
          e('div', { className: 'smTabs', role: 'tablist' },
            [
              { id: 'search', label: t('marketSearch'), load: null },
              { id: 'featured', label: t('marketFeatured'), load: loadFeatured },
              { id: 'recent', label: t('marketRecent'), load: loadRecent },
              { id: 'diagnose', label: t('marketDiagnose'), load: loadDiag },
            ].map((mt) => e('button', {
              type: 'button',
              key: mt.id,
              role: 'tab',
              'aria-selected': marketTab === mt.id,
              className: marketTab === mt.id ? 'smTab smTabActive' : 'smTab',
              onClick: () => { setMarketTab(mt.id); if (mt.load) mt.load() },
            }, mt.label)),
          ),
          marketTab !== 'search' ? null : e('div', { className: 'smTabPane' },
          e('div', { className: 'smSearchRow' },
            e('input', {
              value: qMarket,
              placeholder: t('searchPlaceholder'),
              'aria-label': t('searchLabel'),
              onChange: (ev) => {
                const v = ev.currentTarget.value
                setQMarket(v)
                // live search: clearing the box clears the results immediately
                if (v.trim() === '') {
                  setRemote([])
                  setSearchDone(false)
                  setSearchStatus('idle')
                }
              },
              onKeyDown: (ev) => {
                if (ev.key === 'Enter') {
                  ev.preventDefault()
                  doSearch()
                }
              },
            }),
            e('select', {
              value: source,
              onChange: (ev) => {
                setSource(ev.currentTarget.value)
                setRemote([])
                setSearchDone(false)
                setSearchStatus('idle')
              },
              'aria-label': t('sourceLabel'),
            },
              e('option', { value: 'featured' }, t('sourceFeatured')),
              e('option', { value: 'both' }, t('sourceBoth')),
              e('option', { value: 'github' }, t('sourceGithub')),
              e('option', { value: 'gitee' }, t('sourceGitee')),
            ),
            e('button', { type: 'button', className: 'smBtn smBtnPrimary', disabled: isBusy('search') || (source !== 'featured' && qMarket.trim() === ''), onClick: doSearch }, t('search')),
            (qMarket.trim() !== '' || searchDone) ? e('button', { type: 'button', className: 'smBtn', disabled: isBusy('search'), onClick: resetMarketSearch }, t('reset')) : null,
          ),
          e('p', { className: 'smHint' }, t('searchHint')),
          searchStatus === 'loading' ? e('p', { className: 'smStatus' }, t('searching')) : null,
          searchDone && remote.length > 0 ? e('div', { className: 'smHeading' },
            e('h3', null, source === 'featured' ? t('featuredResults') : t('remoteResults')),
            e('span', null, String(remote.length)),
          ) : null,
          searchDone && remote.length > 0 ? e('ul', { className: 'smList' }, remote.map(repoCard)) : null,
          searchDone && remote.length === 0 ? e('p', { className: 'smEmpty' }, t('noRemoteResults')) : null,
          ),
          // update task progress (shown only here, in the market tab)
        tasks.length > 0 ? e('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          e('div', { className: 'smHeading' },
            e('h3', null, t('updateTasks')),
            e('span', null, String(tasks.filter((t) => t.status === 'done' || t.status === 'failed').length) + '/' + String(tasks.length)),
          ),
          e('ul', { className: 'smList' },
            tasks.map((task) => e('li', { className: 'smCard', key: task.id },
              e('div', { className: 'smCardRow' },
                e('div', { className: 'smCardMain' },
                  e('div', { className: 'smTitle' },
                    e('span', { className: 'smName' }, task.name),
                    task.status === 'running'
                      ? e('span', { className: 'smBadge smBadgeType' }, t('taskRunning'))
                      : task.status === 'done'
                        ? e('span', { className: 'smBadge smBadgeOn' }, t('taskDone'))
                        : e('span', { className: 'smBadge smBadgeOff' }, t('taskFailed')),
                  ),
                  e('div', { className: 'smProgressTrack' },
                    e('div', {
                      className: 'smProgressFill' + (task.status === 'failed' ? ' smProgressFail' : task.status === 'done' ? ' smProgressDone' : ''),
                      style: { width: task.status === 'done' || task.status === 'failed' ? '100%' : '45%' },
                    }),
                  ),
                  task.error ? e('p', { className: 'smDesc' }, task.error) : null,
                ),
                e('div', { className: 'smActions' },
                  task.status === 'failed' && task.target && task.target.type !== 'install'
                    ? e('button', { type: 'button', className: 'smBtn', disabled: isBusy('retry:' + task.id), onClick: () => doRetryTask(task) },
                        isBusy('retry:' + task.id) ? t('updating') : t('retry'))
                    : null,
                  task.status !== 'running'
                    ? e('button', { type: 'button', className: 'smBtn', disabled: isBusy('remove:' + task.id), onClick: () => doRemoveTask(task) }, t('clear'))
                    : null,
                ),
              ),
            )),
          ),
          ) : null,
          marketTab === 'featured' ? e('div', { className: 'smTabPane' },
            featured === null ? e('p', { className: 'smStatus' }, t('loading')) : null,
            featured !== null && featured.length === 0 ? e('p', { className: 'smEmpty' }, t('noRemoteResults')) : null,
            featured !== null && featured.length > 0
              ? e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                  e('div', { className: 'smHeading' }, e('h3', null, t('featuredResults')), e('span', null, String(featured.length))),
                  e('ul', { className: 'smList' }, featured.map(repoCard)),
                )
              : null,
          ) : null,
          marketTab === 'recent' ? e('div', { className: 'smTabPane' },
            recent === null ? e('p', { className: 'smStatus' }, t('loading')) : null,
            recent !== null && recent.length === 0 ? e('p', { className: 'smEmpty' }, t('noRemoteResults')) : null,
            recent !== null && recent.length > 0
              ? e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                  e('div', { className: 'smHeading' }, e('h3', null, t('recentResults')), e('span', null, String(recent.length))),
                  e('ul', { className: 'smList' }, recent.map(repoCard)),
                )
              : null,
          ) : null,
          marketTab === 'diagnose' ? e('div', { className: 'smTabPane' },
            diag === null ? e('p', { className: 'smStatus' }, t('loading')) : null,
            diag !== null && diag.error ? e('p', { className: 'smDesc' }, diag.error) : null,
            diag !== null && !diag.error ? e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              diag.ai ? e('div', { className: 'smForm' },
                e('div', { className: 'smTitle' }, e('span', { className: 'smName' }, t('diagAi'))),
                e('p', { className: 'smDesc', style: { whiteSpace: 'pre-wrap' } }, diag.ai),
              ) : null,
              e('div', { className: 'smHeading' }, e('h3', null, t('diagPlugins')), e('span', null, String((diag.plugins || []).length))),
              diag.plugins && diag.plugins.length > 0
                ? e('ul', { className: 'smList' },
                    diag.plugins.map((p) => e('li', { className: 'smCard', key: p.entryId },
                      e('div', { className: 'smCardRow' },
                        e('div', { className: 'smCardMain' },
                          e('div', { className: 'smTitle' }, e('span', { className: 'smName' }, p.title), e('span', { className: 'smBadge smBadgeOff' }, p.issue)),
                          e('p', { className: 'smModule' }, p.moduleName),
                        ),
                      ),
                    )),
                  )
                : e('p', { className: 'smEmpty' }, t('diagAllGood')),
              diag.crashes && diag.crashes.length > 0
                ? e('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                    e('p', { className: 'smZh' }, t('diagCrashes')),
                    e('ul', { className: 'smVerifyList' }, diag.crashes.map((c, i) => e('li', { className: 'smVerifyItem', key: i }, e('span', null, c)))),
                  )
                : null,
              e('div', { className: 'smActions' },
                e('button', { type: 'button', className: 'smBtn smBtnPrimary', disabled: isBusy('diagFix'), onClick: doDiagnoseFix },
                  isBusy('diagFix') ? t('diagFixing') : t('diagFix')),
              ),
              fixResult !== null && fixResult.length > 0
                ? e('ul', { className: 'smVerifyList' },
                    fixResult.map((r, i) => e('li', { className: 'smVerifyItem', key: i },
                      e('span', { className: r.ok === false ? 'smBadge smBadgeOff' : 'smBadge smBadgeOn' }, r.action),
                      e('span', null, r.detail),
                    )),
                  )
                : null,
            ) : null,
        ) : null,
        ) : null,

        // ── MCP服务 ─────────────────────────────────────────────────────────
        tab === 'mcps' ? e('div', { className: 'smTabPane' },
          e('div', { className: 'smSearchRow' },
            e('input', {
              value: qMcps,
              placeholder: t('searchMcpsPlaceholder'),
              'aria-label': t('searchLabel'),
              onChange: (ev) => setQMcps(ev.currentTarget.value),
            }),
            e('span', { className: 'smCount' }, String(mcpItems.length)),
          ),
          e('p', { className: 'smHint' }, t('mcpsHint')),
          state.status === 'loading' ? e('p', { className: 'smStatus' }, t('loading')) : null,
          state.status === 'ready' && mcpItems.length === 0 ? e('p', { className: 'smEmpty' }, t('noMcps')) : null,
          state.status === 'ready' && mcpItems.length > 0 ? groupList(filteredMcps, t('mcpsHeading'), null) : null,
        ) : null,
      )
    }

    // ── locales ──────────────────────────────────────────────────────────────
    const zh = {
      retry: '重试',
      loading: '正在加载…',
      enabled: '已启用',
      disabled: '已停用',
      start: '启动',
      stop: '停止',
      install: '安装',
      uninstall: '卸载',
      installOneClick: '一键安装',
      installRetry: '重试安装',
      installDone: '已安装',
      installing: '安装中…',
      requestTimeout: '请求超时（30 秒），请检查网络后重试。',
      core: '核心',
      typeSkill: '技能',
      typePlugin: '插件',
      extensionsNav: '扩展管理',
      tabPlugins: '插件管理',
      tabSkills: '技能',
      tabMarket: '插件市场',
      tabMcps: 'MCP服务',
      checkUpdates: '检查更新',
      updating: '更新中…',
      update: '更新',
      updateAvailable: '可更新',
      updateTo: '更新至',
      updateStarted: '更新已在后台启动（npm/仓库拉取），完成后请再次检查更新。',
      updateFailed: '更新失败',
      retry: '重试',
      clear: '清除',
      updatesFound: '检测到 {n} 个可用更新。',
      noUpdates: '所有插件与技能均为最新版本。',
      updateBannerAll: '检测到 {n} 项可更新（插件 {p} · 技能 {s}，已置顶显示，点「更新」即可升级）',
      marketUpdates: '更新内容',
      marketSearch: '搜索',
      marketFeatured: '推荐',
      marketRecent: '新上线',
      marketDiagnose: '诊断',
      recentResults: '最近新上线的 DSH 项目（30 天内创建）',
      diagAi: 'AI 诊断',
      diagPlugins: '异常插件',
      diagCrashes: '近期崩溃日志',
      diagAllGood: '未发现插件异常。',
      diagFix: 'AI 自动修复',
      diagFixing: '修复中…',
      diagFixDone: '自动修复完成，结果如下。',

      latestRelease: '最新版本发布',
      recentCommits: '最近提交',
      noRepoNotes: '该仓库暂无更新记录（无 Release 或提交信息）。',

      updateBannerPlugins: '检测到 {n} 个插件可更新（已置顶显示，点「更新」即可升级）',
      updateAll: '全部更新',
      updateTasks: '更新任务',
      taskRunning: '更新中',
      taskDone: '已完成',
      taskFailed: '失败',
      updateBannerSkills: '检测到 {n} 个技能可更新（已置顶显示，点「更新」即可升级）',
      searchPluginsPlaceholder: '检索已安装的插件与技能…',
      searchSkillsPlaceholder: '检索已安装的技能…',
      searchMcpsPlaceholder: '检索 MCP 服务…',
      typeMcp: 'MCP',
      skillsHeading: '已安装技能',
      mcpsHeading: 'MCP 服务',
      noSkills: '暂无技能。',
      noMcps: '暂无 MCP 服务。',
      mcpsHint: 'MCP 服务器通过 cordis 条目管理（@deepseek-ai/dsh-mcp-client），可在此检索、启动/停止；配置位于 profile 的 cordis.patch.yml。',
      searchLabel: '搜索',
      searchPlaceholder: '搜索本地扩展；回车或点按钮搜索 GitHub/Gitee',
      search: '搜索',
      reset: '重置',
      viewAll: '全部',
      viewPaused: '已暂停',
      sourceLabel: '搜索源',
      sourceFeatured: '精选推荐',
      sourceBoth: 'GitHub + Gitee',
      sourceGithub: 'GitHub',
      sourceGitee: 'Gitee',
      sourceLocal: '本地已安装',
      searchRemote: '搜索 GitHub/Gitee',
      searchLocal: '搜索本地',
      searchFeatured: '查看精选',
      searchPlaceholderLocal: '搜索已安装的技能与插件…',
      searchHint: '选择「本地已安装」可在已装技能与插件中搜索；选择 GitHub/Gitee 可远程检索 DSH 技能（SKILL.md）与插件（dsh.bundle），一键安装。',
      searching: '正在搜索…',
      remoteResults: '远程搜索结果',
      localResults: '本地搜索结果',
      featuredResults: '精选推荐插件（内置目录，离线可用）',
      noRemoteResults: '没有远程结果。',
      noLocalResults: '没有匹配的已安装扩展。',
      installedHeading: '已安装扩展',
      myInstalledHeading: '我安装的扩展',
      corePluginsHeading: '系统自带插件',
      corePluginsHint: '这些是 DSH 或已安装 bundle 自带的插件：只支持启停，不提供卸载，避免误删。只有「我安装的扩展」可以卸载。',
      mineBadge: '我安装的',
      confirmUninstall: '确认卸载？',
      countSummary: '技能 {skills} · 插件 {plugins}',
      noExtensions: '暂无技能或插件。',
      noMatch: '没有匹配的扩展。',
      installSkillTitle: '安装新技能',
      skillInstalled: '技能已安装。',
      skillName: '技能名称（kebab-case）',
      skillNamePlaceholder: 'my-skill',
      skillDescription: '功能简介',
      skillDescriptionPlaceholder: '一句话说明该技能的作用',
      skillWhenToUse: '使用时机（可选）',
      skillWhenToUsePlaceholder: '何时应使用此技能',
      skillContent: '技能内容（Markdown）',
      skillContentPlaceholder: '技能的完整指令正文…',
      installPluginTitle: '安装新插件',
      pluginInstalled: '插件已注册。',
      pluginId: '条目 ID（可选）',
      pluginIdPlaceholder: 'my-plugin',
      pluginPackage: 'npm 包名',
      pluginPackagePlaceholder: '@scope/plugin-name',
      installPluginHint: '请先用 `dsh plugin --profile web add <package>` 把 npm 包安装进 profile，再在此注册条目。启用/停用/卸载为热插拔，即时生效并持久化。',
      repoSkillInstalled: '技能已从仓库安装。',
      repoPluginInstalling: '插件安装任务已启动，进度见下方任务列表；完成后请刷新页面。',
      wdTitle: '进程守护（dsh-watchdog）',
      wdRunning: '守护运行中',
      wdStopped: '守护未运行',
      wdStart: '启动守护',
      wdStop: '停止守护',
      wdRefresh: '刷新',
      wdRefreshing: '刷新中…',
      wdUpdated: '已更新',
      wdStats: '累计重启 {count} 次 · 最近原因: {reason} · 总检查 {checks} 次',
      wdNone: '无',
      wdNoStats: '守护尚无统计数据（守护脚本未运行或状态文件未生成）。',
      wdStarted: '守护已启动。',
      wdStoppedMsg: '守护已停止。',
      wdFailed: '操作失败。',
      verifyTitle: '依赖体检',
      verifyHealthy: '健康',
      verifyIssues: '发现 {n} 个问题',
      verifyRun: '立即体检',
      verifyRunning: '体检中…',
      verifyOk: '依赖体检完成，全部健康。',
      verifyDone: '依赖体检完成，处理了 {n} 项。',
      verifyNoData: '尚未体检。',
      verifyHint: '扫描 profile 层是否混入 @deepseek-ai 核心包的真实副本（非 symlink）：同版本会自动统一为 symlink，规避 Symbol/instanceof 分裂导致的启动崩溃。',
      verifyAt: '最近体检',
      vAction_fixed: '已修复',
      'vAction_fixed-verify-failed': '已修复·待复查',
      'vAction_warn-version-mismatch': '版本不一致',
      vAction_warn: '告警',
      vAction_error: '错误',
      phase_pending: '等待依赖',
      phase_loading: '加载中',
      phase_active: '已挂载',
      phase_failed: '挂载失败',
      phase_unloading: '卸载中',
    }
    const en = {
      retry: 'Retry',
      loading: 'Loading…',
      enabled: 'Enabled',
      disabled: 'Disabled',
      start: 'Start',
      stop: 'Stop',
      install: 'Install',
      uninstall: 'Uninstall',
      installOneClick: 'Install',
      installRetry: 'Retry',
      installDone: 'Installed',
      installing: 'Installing…',
      requestTimeout: 'Request timed out (30s) — check your network and retry.',
      core: 'Core',
      typeSkill: 'Skill',
      typePlugin: 'Plugin',
      extensionsNav: 'Extensions',
      tabPlugins: 'Plugins',
      tabSkills: 'Skills',
      tabMarket: 'Market',
      tabMcps: 'MCP Servers',
      checkUpdates: 'Check updates',
      updating: 'Updating…',
      update: 'Update',
      updateAvailable: 'Update available',
      updateTo: 'Update to',
      updateStarted: 'Update started in the background (npm/repo pull); re-check when it finishes.',
      updateFailed: 'Update failed',
      retry: 'Retry',
      clear: 'Clear',
      updatesFound: '{n} update(s) available.',
      noUpdates: 'All plugins and skills are up to date.',
      updateBannerAll: '{n} update(s) available ({p} plugins · {s} skills — shown on top)',
      marketUpdates: 'What changed',
      marketSearch: 'Search',
      marketFeatured: 'Featured',
      marketRecent: 'New',
      marketDiagnose: 'Diagnose',
      recentResults: 'DSH projects created in the last 30 days',
      diagAi: 'AI diagnosis',
      diagPlugins: 'Anomalies',
      diagCrashes: 'Recent crash log',
      diagAllGood: 'No plugin anomalies found.',
      diagFix: 'Auto-fix',
      diagFixing: 'Fixing…',
      diagFixDone: 'Auto-fix finished — results below.',

      latestRelease: 'Latest release',
      recentCommits: 'Recent commits',
      noRepoNotes: 'No release or commit info available for this repo.',

      updateBannerPlugins: '{n} plugin update(s) available (shown on top — click Update)',
      updateAll: 'Update all',
      updateTasks: 'Update tasks',
      taskRunning: 'Updating',
      taskDone: 'Done',
      taskFailed: 'Failed',
      updateBannerSkills: '{n} skill update(s) available (shown on top — click Update)',
      searchPluginsPlaceholder: 'Filter installed plugins & skills…',
      searchSkillsPlaceholder: 'Filter installed skills…',
      searchMcpsPlaceholder: 'Filter MCP servers…',
      typeMcp: 'MCP',
      skillsHeading: 'Installed skills',
      mcpsHeading: 'MCP servers',
      noSkills: 'No skills yet.',
      noMcps: 'No MCP servers.',
      mcpsHint: 'MCP servers are managed as cordis entries (@deepseek-ai/dsh-mcp-client): search, start/stop; configuration lives in the profile cordis.patch.yml.',
      searchLabel: 'Search',
      searchPlaceholder: 'Filter local extensions; press Enter to search GitHub/Gitee',
      search: 'Search',
      reset: 'Reset',
      viewAll: 'All',
      viewPaused: 'Paused',
      sourceLabel: 'Source',
      sourceFeatured: 'Featured',
      sourceBoth: 'GitHub + Gitee',
      sourceGithub: 'GitHub',
      sourceGitee: 'Gitee',
      sourceLocal: 'Local installed',
      searchRemote: 'Search GitHub/Gitee',
      searchLocal: 'Search local',
      searchFeatured: 'Show featured',
      searchPlaceholderLocal: 'Search installed skills and plugins…',
      searchHint: 'Choose "Local installed" to search installed skills and plugins; choose GitHub/Gitee to look for DSH skills (SKILL.md) and plugins (dsh.bundle) remotely, then one-click install.',
      searching: 'Searching…',
      remoteResults: 'Remote results',
      localResults: 'Local results',
      featuredResults: 'Featured plugins (built-in directory, offline)',
      noRemoteResults: 'No remote results.',
      noLocalResults: 'No matching installed extensions.',
      installedHeading: 'Installed extensions',
      myInstalledHeading: 'My installed extensions',
      corePluginsHeading: 'System plugins',
      corePluginsHint: 'These plugins ship with DSH or its installed bundles: enable/disable only, no uninstall, to avoid accidental removal. Only "My installed extensions" can be uninstalled.',
      mineBadge: 'Mine',
      confirmUninstall: 'Confirm?',
      countSummary: 'Skills {skills} · Plugins {plugins}',
      noExtensions: 'No skills or plugins.',
      noMatch: 'No matching extensions.',
      installSkillTitle: 'Install a skill',
      skillInstalled: 'Skill installed.',
      skillName: 'Skill name (kebab-case)',
      skillNamePlaceholder: 'my-skill',
      skillDescription: 'Description',
      skillDescriptionPlaceholder: 'One-line purpose of this skill',
      skillWhenToUse: 'When to use (optional)',
      skillWhenToUsePlaceholder: 'When this skill applies',
      skillContent: 'Skill content (Markdown)',
      skillContentPlaceholder: 'Full instruction body…',
      installPluginTitle: 'Install a plugin',
      pluginInstalled: 'Plugin registered.',
      pluginId: 'Entry ID (optional)',
      pluginIdPlaceholder: 'my-plugin',
      pluginPackage: 'npm package',
      pluginPackagePlaceholder: '@scope/plugin-name',
      installPluginHint: 'Install the npm package into the profile first with `dsh plugin --profile web add <package>`, then register the entry here. Enable/disable/uninstall are hot-plugged and persisted.',
      repoSkillInstalled: 'Skill installed from repository.',
      repoPluginInstalling: 'Plugin install task started — progress below; refresh when it finishes.',
      wdTitle: 'Process watchdog (dsh-watchdog)',
      wdRunning: 'Watchdog running',
      wdStopped: 'Watchdog stopped',
      wdStart: 'Start watchdog',
      wdStop: 'Stop watchdog',
      wdRefresh: 'Refresh',
      wdRefreshing: 'Refreshing…',
      wdUpdated: 'Updated',
      wdStats: 'Restarts: {count} · Last reason: {reason} · Checks: {checks}',
      wdNone: 'none',
      wdNoStats: 'No watchdog stats yet (script not running or state file missing).',
      wdStarted: 'Watchdog started.',
      wdStoppedMsg: 'Watchdog stopped.',
      wdFailed: 'Operation failed.',
      verifyTitle: 'Dependency health check',
      verifyHealthy: 'Healthy',
      verifyIssues: '{n} issue(s) found',
      verifyRun: 'Run check',
      verifyRunning: 'Checking…',
      verifyOk: 'Dependency check done — all healthy.',
      verifyDone: 'Dependency check done — {n} item(s) handled.',
      verifyNoData: 'Not checked yet.',
      verifyHint: 'Scans the profile layer for real (non-symlink) copies of @deepseek-ai core packages; same-version copies are auto-unified into symlinks to prevent Symbol/instanceof split crashes.',
      verifyAt: 'Last check',
      vAction_fixed: 'Fixed',
      'vAction_fixed-verify-failed': 'Fixed · review',
      'vAction_warn-version-mismatch': 'Version mismatch',
      vAction_warn: 'Warning',
      vAction_error: 'Error',
      phase_pending: 'Waiting',
      phase_loading: 'Loading',
      phase_active: 'Mounted',
      phase_failed: 'Failed',
      phase_unloading: 'Unloading',
    }

    // ── apply ────────────────────────────────────────────────────────────────
    const NS = 'dsh-extension-hub'
    const inject = ['slots', 'locale']

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-extension-hub: dictionaries')
      const t = ctx.locale.bind(NS)

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'extensions',
        order: 100,
        label: () => t('extensionsNav'),
        locale: NS,
        inject: () => ({ api }),
      }, ExtensionsSection))
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
