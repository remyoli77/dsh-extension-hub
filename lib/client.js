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
      installSkill: (payload) => post('/skills/install', payload),
      uninstallSkill: (name, source) => post('/skills/uninstall', { name, source }),
      listPlugins: () => apiFetch('/plugins'),
      togglePlugin: (entryId, enabled) => post('/plugins/toggle', { entryId, enabled }),
      installPlugin: (payload) => post('/plugins/install', payload),
      uninstallPlugin: (entryId) => post('/plugins/uninstall', { entryId }),
      search: (q, source) => apiFetch('/search?q=' + encodeURIComponent(q) + '&source=' + encodeURIComponent(source)),
      installRepo: (payload) => post('/install-repo', payload),
      watchdogStatus: () => apiFetch('/watchdog/status'),
      watchdogStart: () => post('/watchdog/start', {}),
      watchdogStop: () => post('/watchdog/stop', {}),
      verifyPlugins: () => post('/plugins/verify', {}),
      verifyLog: () => apiFetch('/plugins/verify-log'),
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
      const [query, setQuery] = React.useState('')
      const [source, setSource] = React.useState('both')
      const [searchStatus, setSearchStatus] = React.useState('idle')
      const [remote, setRemote] = React.useState([])
      const [searchDone, setSearchDone] = React.useState(false)
      const { isBusy, run } = useBusy()
      const [error, setError] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [skillForm, setSkillForm] = React.useState({ name: '', description: '', whenToUse: '', content: '' })
      const [pluginForm, setPluginForm] = React.useState({ id: '', name: '' })
      const [wd, setWd] = React.useState(null)
      const [wdUpdated, setWdUpdated] = React.useState(null)
      // Dependency health check: latest manual/boot result + history.
      const [verifyData, setVerifyData] = React.useState(null)
      const [verifyLog, setVerifyLog] = React.useState([])
      // Two-step uninstall guard: item key -> timestamp of the first click.
      const [confirmUninstall, setConfirmUninstall] = React.useState({})

      const loadVerifyLog = React.useCallback(() =>
        api.verifyLog().then(
          (data) => {
            setVerifyLog(Array.isArray(data.log) ? data.log : [])
            // Surface the most recent record (boot/manual) so the panel is
            // informative even before the user clicks "run check".
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

      // Manual dependency health check: scan duplicate core copies, auto-fix
      // same-version ones, then refresh the history.
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
        Promise.all([api.listSkills(), api.listPlugins()]).then(
          ([skillsData, pluginsData]) => {
            setState({ status: 'ready', skills: skillsData.skills, plugins: pluginsData.plugins })
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

      const doSearch = () => run('search', () => {
        setSearchStatus('loading')
        setSearchDone(false)
        setError(null)
        if (source === 'featured') {
          // built-in curated registry (offline, no query needed)
          setRemote(FEATURED)
          setSearchStatus('done')
          setSearchDone(true)
          return Promise.resolve()
        }
        if (source === 'local') {
          // local search: filter the installed skills/plugins by the query
          const q = query.trim().toLocaleLowerCase()
          const matches = q.length === 0 ? [] : items.filter((item) =>
            [item.name, item.module, item.description, item.zh].some((v) => String(v).toLocaleLowerCase().includes(q)),
          )
          setRemote(matches)
          setSearchStatus('done')
          setSearchDone(true)
          return Promise.resolve()
        }
        return api.search(query.trim(), source).then(
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

      const items = React.useMemo(() => {
        if (state.status !== 'ready') return []
        const skills = state.skills.map((skill) => ({
          type: 'skill',
          key: 'skill:' + skill.source + ':' + skill.name,
          name: skill.name,
          module: skill.source,
          description: skill.description || '',
          zh: '',
          enabled: skill.enabled,
          protected: false,
          toggle: () => api.toggleSkill(skill.name, !skill.enabled),
          uninstall: () => api.uninstallSkill(skill.name, skill.source),
        }))
        const plugins = state.plugins.map((plugin) => ({
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
          toggle: () => api.togglePlugin(plugin.entryId, !plugin.enabled),
          uninstall: () => api.uninstallPlugin(plugin.entryId),
        }))
        return [...skills, ...plugins]
      }, [state, api])

      const normalizedQuery = query.trim().toLocaleLowerCase()
      const filtered = React.useMemo(() => {
        if (normalizedQuery.length === 0) return items
        return items.filter((item) =>
          [item.name, item.module, item.description, item.zh].some((v) => String(v).toLocaleLowerCase().includes(normalizedQuery)),
        )
      }, [items, normalizedQuery])

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
      // Uninstall is only offered for user-installed extensions; system/core
      // plugins (DSH itself or shipped bundles) get enable/disable only, so a
      // mistaken click can never remove them.
      const uninstallButton = (item) => {
        if (item.type === 'plugin' && item.userInstalled !== true) return null
        const armed = confirmUninstall[item.key] && Date.now() - confirmUninstall[item.key] < 3000
        return e('button', {
          type: 'button',
          className: 'smBtn smBtnDanger',
          disabled: isBusy('uninstall:' + item.key),
          onClick: () => doUninstall(item),
        }, armed ? t('confirmUninstall') : t('uninstall'))
      }

      const doInstallSkill = () => run('installSkill', () =>
        api.installSkill({
          name: skillForm.name.trim(),
          description: skillForm.description.trim(),
          whenToUse: skillForm.whenToUse.trim() || undefined,
          content: skillForm.content,
        }).then((res) => {
          setSkillForm({ name: '', description: '', whenToUse: '', content: '' })
          setNotice(res.ok ? t('skillInstalled') : res.error)
          return refresh()
        }),
      ).catch((err) => setError(err.message))

      const doInstallPlugin = () => run('installPlugin', () =>
        api.installPlugin({ id: pluginForm.id.trim() || undefined, name: pluginForm.name.trim() }).then((res) => {
          setPluginForm({ id: '', name: '' })
          setNotice(res.ok ? t('pluginInstalled') : res.error)
          return refresh()
        }),
      ).catch((err) => setError(err.message))

      const doInstallRepo = (result) => run('repo:' + result.source + ':' + result.fullName, () =>
        api.installRepo({ source: result.source, fullName: result.fullName }).then((res) => {
          setNotice(res.ok
            ? (res.type === 'skill' ? t('repoSkillInstalled') : t('repoPluginInstalling'))
            : res.error)
          if (res.ok && res.type === 'skill') refresh()
        }),
      ).catch((err) => setError(err.message))

      const phaseLabel = (phase) => {
        if (phase === null || phase === undefined) return ''
        return t('phase_' + phase) || phase
      }

      // Dependency-check action labels (zh/en via locale).
      const verifyActionLabel = (action) => t('vAction_' + action) || action
      const verifyBadgeClass = (action) => {
        if (action === 'fixed' || action === 'fixed-verify-failed') return 'smBadge smBadgeOn'
        if (action === 'warn-version-mismatch' || action === 'warn') return 'smBadge smBadgeType'
        return 'smBadge smBadgeOff'
      }

      const skillsCount = state.status === 'ready' ? state.skills.length : 0
      const pluginsCount = state.status === 'ready' ? state.plugins.length : 0

      return e('div', { className: 'smSection', 'aria-busy': state.status === 'loading' },
        // search
        e('div', { className: 'smSearchRow' },
          e('input', {
            value: query,
            placeholder: source === 'local' ? t('searchPlaceholderLocal') : t('searchPlaceholder'),
            'aria-label': t('searchLabel'),
            onChange: (ev) => setQuery(ev.currentTarget.value),
            onKeyDown: (ev) => {
              if (ev.key === 'Enter') {
                ev.preventDefault()
                doSearch()
              }
            },
          }),
          e('select', { value: source, onChange: (ev) => setSource(ev.currentTarget.value), 'aria-label': t('sourceLabel') },
            e('option', { value: 'featured' }, t('sourceFeatured')),
            e('option', { value: 'both' }, t('sourceBoth')),
            e('option', { value: 'github' }, t('sourceGithub')),
            e('option', { value: 'gitee' }, t('sourceGitee')),
            e('option', { value: 'local' }, t('sourceLocal')),
          ),
          e('button', { type: 'button', className: 'smBtn smBtnPrimary', disabled: isBusy('search') || (source !== 'featured' && query.trim() === ''), onClick: doSearch },
            source === 'featured' ? t('searchFeatured') : (source === 'local' ? t('searchLocal') : t('searchRemote'))),
        ),
        e('p', { className: 'smHint' }, t('searchHint')),

        // process watchdog card
        e('div', { className: 'smForm' },
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
        ),

        // dependency health check card
        e('div', { className: 'smForm' },
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
        ),

        error ? ErrorNotice({ message: error, onRetry: () => { setError(null); refresh() }, t }) : null,
        notice ? e('p', { className: 'smZh', role: 'status' }, notice) : null,

        // search results (local mode: installed items; remote mode: repos)
        searchStatus === 'loading' ? e('p', { className: 'smStatus' }, t('searching')) : null,
        searchDone && remote.length > 0 ? e('div', { className: 'smHeading' },
          e('h3', null, source === 'local' ? t('localResults') : (source === 'featured' ? t('featuredResults') : t('remoteResults'))),
          e('span', null, String(remote.length)),
        ) : null,
        searchDone && remote.length > 0 ? e('ul', { className: 'smList' },
          remote.map((result) => source === 'local'
            // local installed item card
            ? e('li', { className: 'smCard', key: result.key },
                e('div', { className: 'smCardRow' },
                  e('div', { className: 'smCardMain' },
                    e('div', { className: 'smTitle' },
                      e('span', { className: 'smName' }, result.name),
                      TypeBadge({ type: result.type, t }),
                      StatusBadge({ enabled: result.enabled, t }),
                      result.protected ? e('span', { className: 'smBadge smBadgeSource' }, t('core')) : null,
                      result.fiberPhase ? e('span', { className: 'smBadge' }, phaseLabel(result.fiberPhase)) : null,
                    ),
                    result.module ? e('p', { className: 'smModule' }, result.module) : null,
                    result.zh ? e('p', { className: 'smZh' }, result.zh) : null,
                    result.description ? e('p', { className: 'smDesc' }, result.description) : null,
                  ),
                  e('div', { className: 'smActions' },
                    result.protected ? null : e('button', {
                      type: 'button',
                      className: 'smBtn',
                      disabled: isBusy('toggle:' + result.key),
                      onClick: () => doToggle(result),
                    }, result.enabled ? t('stop') : t('start')),
                    result.protected ? null : uninstallButton(result),
                  ),
                ),
              )
            // remote repo card
            : e('li', { className: 'smCard', key: result.source + ':' + result.fullName },
                e('div', { className: 'smCardRow' },
                  e('div', { className: 'smCardMain' },
                    e('div', { className: 'smTitle' },
                      e('span', { className: 'smName' }, result.name),
                      e('span', { className: 'smBadge smBadgeSource' }, result.source === 'github' ? 'GitHub' : 'Gitee'),
                      result.language ? e('span', { className: 'smBadge' }, result.language) : null,
                      e('span', { className: 'smBadge' }, '★ ' + result.stars),
                    ),
                    result.description ? e('p', { className: 'smDesc' }, result.description) : null,
                    e('p', { className: 'smModule' }, result.fullName),
                  ),
                  e('div', { className: 'smActions' },
                    e('button', {
                      type: 'button',
                      className: 'smBtn smBtnPrimary',
                      disabled: isBusy('repo:' + result.source + ':' + result.fullName),
                      onClick: () => doInstallRepo(result),
                    }, t('installOneClick')),
                  ),
                ),
              ),
          ),
        ) : null,
        searchDone && remote.length === 0 ? e('p', { className: 'smEmpty' }, source === 'local' ? t('noLocalResults') : t('noRemoteResults')) : null,

        // install forms
        e('details', { className: 'smForm' },
          e('summary', null, t('installSkillTitle')),
          e('form', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }, onSubmit: (ev) => { ev.preventDefault(); doInstallSkill() } },
            e('div', { className: 'smFormRow' },
              e('div', { className: 'smField' },
                e('label', null, t('skillName')),
                e('input', { value: skillForm.name, onChange: (ev) => setSkillForm((f) => ({ ...f, name: ev.currentTarget.value })), placeholder: t('skillNamePlaceholder'), required: true }),
              ),
              e('div', { className: 'smField' },
                e('label', null, t('skillDescription')),
                e('input', { value: skillForm.description, onChange: (ev) => setSkillForm((f) => ({ ...f, description: ev.currentTarget.value })), placeholder: t('skillDescriptionPlaceholder'), required: true }),
              ),
              e('div', { className: 'smField' },
                e('label', null, t('skillWhenToUse')),
                e('input', { value: skillForm.whenToUse, onChange: (ev) => setSkillForm((f) => ({ ...f, whenToUse: ev.currentTarget.value })), placeholder: t('skillWhenToUsePlaceholder') }),
              ),
            ),
            e('div', { className: 'smField' },
              e('label', null, t('skillContent')),
              e('textarea', { value: skillForm.content, onChange: (ev) => setSkillForm((f) => ({ ...f, content: ev.currentTarget.value })), placeholder: t('skillContentPlaceholder') }),
            ),
            e('div', null,
              e('button', { type: 'submit', className: 'smBtn smBtnPrimary', disabled: isBusy('installSkill') }, t('install')),
            ),
          ),
        ),

        e('details', { className: 'smForm' },
          e('summary', null, t('installPluginTitle')),
          e('form', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }, onSubmit: (ev) => { ev.preventDefault(); doInstallPlugin() } },
            e('div', { className: 'smFormRow' },
              e('div', { className: 'smField' },
                e('label', null, t('pluginId')),
                e('input', { value: pluginForm.id, onChange: (ev) => setPluginForm((f) => ({ ...f, id: ev.currentTarget.value })), placeholder: t('pluginIdPlaceholder') }),
              ),
              e('div', { className: 'smField' },
                e('label', null, t('pluginPackage')),
                e('input', { value: pluginForm.name, onChange: (ev) => setPluginForm((f) => ({ ...f, name: ev.currentTarget.value })), placeholder: t('pluginPackagePlaceholder'), required: true }),
              ),
              e('div', { className: 'smField', style: { flex: '0 0 auto' } },
                e('button', { type: 'submit', className: 'smBtn smBtnPrimary', disabled: isBusy('installPlugin') }, t('install')),
              ),
            ),
            e('p', { className: 'smHint' }, t('installPluginHint')),
          ),
        ),

        // merged installed list, grouped: user-installed first, system plugins second
        state.status === 'loading' ? e('p', { className: 'smStatus' }, t('loading')) : null,
        state.status === 'ready' && items.length === 0 ? e('p', { className: 'smEmpty' }, t('noExtensions')) : null,
        (() => {
          if (state.status !== 'ready' || items.length === 0) return null
          const myItems = filtered.filter((item) => item.type === 'skill' || item.userInstalled === true)
          const coreItems = filtered.filter((item) => item.type === 'plugin' && item.userInstalled !== true)
          const card = (item) => e('li', { className: 'smCard', key: item.key },
            e('div', { className: 'smCardRow' },
              e('div', { className: 'smCardMain' },
                e('div', { className: 'smTitle' },
                  e('span', { className: 'smName' }, item.name),
                  TypeBadge({ type: item.type, t }),
                  item.userInstalled === true ? e('span', { className: 'smBadge smBadgeOn' }, t('mineBadge')) : null,
                  StatusBadge({ enabled: item.enabled, t }),
                  item.protected ? e('span', { className: 'smBadge smBadgeSource' }, t('core')) : null,
                  item.fiberPhase ? e('span', { className: 'smBadge' }, phaseLabel(item.fiberPhase)) : null,
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
                item.protected ? null : uninstallButton(item),
              ),
            ),
          )
          return e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            e('div', { className: 'smHeading' },
              e('h3', null, t('myInstalledHeading')),
              e('span', null, String(myItems.length)),
            ),
            myItems.length > 0 ? e('ul', { className: 'smList' }, myItems.map(card)) : e('p', { className: 'smEmpty' }, t('noMatch')),
            e('div', { className: 'smHeading' },
              e('h3', null, t('corePluginsHeading')),
              e('span', null, String(coreItems.length)),
            ),
            e('p', { className: 'smHint' }, t('corePluginsHint')),
            coreItems.length > 0 ? e('ul', { className: 'smList' }, coreItems.map(card)) : e('p', { className: 'smEmpty' }, t('noMatch')),
          )
        })(),
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
      core: '核心',
      typeSkill: '技能',
      typePlugin: '插件',
      extensionsNav: '扩展管理',
      searchLabel: '搜索',
      searchPlaceholder: '搜索本地扩展；回车或点按钮搜索 GitHub/Gitee',
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
      repoPluginInstalling: '插件正在后台安装（git + pnpm），完成后请刷新页面查看。',
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
      core: 'Core',
      typeSkill: 'Skill',
      typePlugin: 'Plugin',
      extensionsNav: 'Extensions',
      searchLabel: 'Search',
      searchPlaceholder: 'Filter local extensions; press Enter to search GitHub/Gitee',
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
      repoPluginInstalling: 'Plugin is installing in the background (git + pnpm); refresh after it finishes.',
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
