import { contextBridge, ipcRenderer, webFrame, webUtils } from 'electron'

// Which translucency the OS can back. Asked synchronously because the renderer
// needs it before its first paint, and answered by main because deciding it
// needs `os.release()` — a sandboxed preload may only require electron, events,
// timers and url, so importing node:os here throws before contextBridge runs
// and takes the ENTIRE bridge down with it (window.ulakDesktop undefined =>
// "Desktop IPC bridge is unavailable"). No reply means no glass, which degrades
// to an ordinary opaque window rather than a page thinned over nothing.
const translucencySupport = ipcRenderer.sendSync('ulak:translucency:support')
const hudWindowing = ipcRenderer.sendSync('ulak:hud:windowing')
const hudNativeDrag = hudWindowing?.nativeDrag === true
const launchFlags = ipcRenderer.sendSync('ulak:launch-flags')

contextBridge.exposeInMainWorld('ulakDesktop', {
  glassSupported: translucencySupport?.glass === true,
  translucencySupported: translucencySupport?.translucency === true,
  // Launch-flag fact: the app was started with --local, so the renderer may
  // show the local-models surfaces. Static for the window's lifetime.
  localModelsEnabled: launchFlags?.localModels === true,
  getConnection: (profile, opts) => ipcRenderer.invoke('ulak:connection', profile, opts),
  // Registry-scoped backend resolution: { connectionId, profile } → descriptor.
  getConnectionFor: payload => ipcRenderer.invoke('ulak:connection:for', payload),
  getProfileRoutes: profiles => ipcRenderer.invoke('ulak:plugin-profile-routes', profiles),
  revalidateConnection: () => ipcRenderer.invoke('ulak:connection:revalidate'),
  touchBackend: profile => ipcRenderer.invoke('ulak:backend:touch', profile),
  getPoolLimits: () => ipcRenderer.invoke('ulak:pool-limits:get'),
  setPoolLimits: limits => ipcRenderer.invoke('ulak:pool-limits:set', limits),
  getGatewayWsUrl: profile => ipcRenderer.invoke('ulak:gateway:ws-url', profile),
  // Registry-scoped fresh WS URL: { connectionId, profile } → result shape of
  // getGatewayWsUrl, minted against that connection's backend.
  getGatewayWsUrlFor: payload => ipcRenderer.invoke('ulak:gateway:ws-url-for', payload),
  // Union agent roster across every registered connection.
  getAgentRoster: () => ipcRenderer.invoke('ulak:agents:roster'),
  openSessionWindow: (sessionId, opts) => ipcRenderer.invoke('ulak:window:openSession', sessionId, opts),
  openSessionInTerminal: (sessionId, opts) => ipcRenderer.invoke('ulak:window:openInTerminal', sessionId, opts),
  openWindow: () => ipcRenderer.invoke('ulak:window:openInstance'),
  openBrowserWindow: tabId => ipcRenderer.invoke('ulak:window:openBrowser', tabId),
  onBrowserPopoutClosed: callback => {
    const listener = (_event, tabId) => callback(tabId)
    ipcRenderer.on('ulak:browser-popout:closed', listener)

    return () => ipcRenderer.removeListener('ulak:browser-popout:closed', listener)
  },
  claimAmbientCue: key => ipcRenderer.invoke('ulak:ambient:claim', key),
  wakeIndicator: {
    getState: () => ipcRenderer.invoke('ulak:wake-indicator:get'),
    setState: state => ipcRenderer.send('ulak:wake-indicator:set', state),
    onState: callback => {
      const listener = (_event, state) => callback(state)
      ipcRenderer.on('ulak:wake-indicator:state', listener)

      return () => ipcRenderer.removeListener('ulak:wake-indicator:state', listener)
    }
  },
  petOverlay: {
    // Main renderer → main process: window lifecycle + drag. `request` is
    // `{ bounds, screen }`; resolves with the screen bounds it actually used.
    open: request => ipcRenderer.invoke('ulak:pet-overlay:open', request),
    close: () => ipcRenderer.invoke('ulak:pet-overlay:close'),
    setBounds: bounds => ipcRenderer.send('ulak:pet-overlay:set-bounds', bounds),
    setIgnoreMouse: ignore => ipcRenderer.send('ulak:pet-overlay:ignore-mouse', ignore),
    // Flip the overlay focusable (and focus it) while the composer needs keys.
    setFocusable: focusable => ipcRenderer.send('ulak:pet-overlay:set-focusable', focusable),
    // Main renderer → overlay (forwarded by main): push the latest pet state.
    pushState: payload => ipcRenderer.send('ulak:pet-overlay:state', payload),
    // Overlay → main renderer (forwarded by main): pop back in / composer submit.
    control: payload => ipcRenderer.send('ulak:pet-overlay:control', payload),
    // Overlay subscribes to state pushes.
    onState: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('ulak:pet-overlay:state', listener)

      return () => ipcRenderer.removeListener('ulak:pet-overlay:state', listener)
    },
    // Main renderer subscribes to overlay control messages.
    onControl: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('ulak:pet-overlay:control', listener)

      return () => ipcRenderer.removeListener('ulak:pet-overlay:control', listener)
    }
  },
  // HUD mode: the chrome-free floating chat. A full app renderer (own gateway)
  // sized as a floating bar, so it mounts the real composer. Main owns the
  // window; `onChanged` keeps every window's toggle truthful.
  hud: {
    nativeDrag: hudNativeDrag,
    windowing: {
      clientPlacement: hudWindowing?.clientPlacement !== false,
      controlDrag: hudWindowing?.controlDrag === true,
      nativeDrag: hudNativeDrag,
      solid: hudWindowing?.solid === true,
      workspaceTransfer: hudWindowing?.workspaceTransfer === true
    },
    open: request => ipcRenderer.invoke('ulak:hud:open', request),
    close: () => ipcRenderer.invoke('ulak:hud:close'),
    setIgnoreMouse: ignore => ipcRenderer.send('ulak:hud:ignore-mouse', ignore),
    beginMove: () => ipcRenderer.send('ulak:hud:begin-move'),
    endMove: () => ipcRenderer.send('ulak:hud:end-move'),
    moveBy: delta => ipcRenderer.send('ulak:hud:move-by', delta),
    setWorkspaceTransfer: transferring => ipcRenderer.send('ulak:hud:workspace-transfer', transferring),
    setBounds: bounds => ipcRenderer.send('ulak:hud:set-bounds', bounds),
    resetLayout: () => ipcRenderer.invoke('ulak:hud:reset-layout'),
    // Whether the band covers the window below the bar. Main pairs it with the
    // user's translucency setting to decide the native frost (macOS vibrancy /
    // Windows 11 DWM backdrop) — see hudFrostFor.
    setFrost: showing => ipcRenderer.invoke('ulak:hud:frost', showing),
    // The HUD tells main which session it is on; main hands that back to the
    // app window when the HUD closes, so the app can re-home onto it.
    setSession: sessionId => ipcRenderer.send('ulak:hud:session', sessionId),
    onGoto: callback => {
      const listener = (_event, sessionId) => callback(sessionId)
      ipcRenderer.on('ulak:hud:goto', listener)

      return () => ipcRenderer.removeListener('ulak:hud:goto', listener)
    },
    onChanged: callback => {
      const listener = (_event, state) => callback(state)
      ipcRenderer.on('ulak:hud:changed', listener)

      return () => ipcRenderer.removeListener('ulak:hud:changed', listener)
    },
    // Linux only, and silent elsewhere: where the cursor is, in page
    // coordinates, or null when it has left the window. Stands in for the
    // mousemove that `setIgnoreMouseEvents(true, { forward: true })` delivers on
    // macOS and Windows but not here.
    onCursor: callback => {
      const listener = (_event, point) => callback(point)
      ipcRenderer.on('ulak:hud:cursor', listener)

      return () => ipcRenderer.removeListener('ulak:hud:cursor', listener)
    },
    // Main's game-overlay watch: whether a fullscreen app (a game) is under
    // the HUD, so the renderer can step back to the low-opacity overlay
    // treatment while one owns the screen.
    onGameOverlay: callback => {
      const listener = (_event, state) => callback(state)
      ipcRenderer.on('ulak:hud:game-overlay', listener)

      return () => ipcRenderer.removeListener('ulak:hud:game-overlay', listener)
    }
  },
  // Quick Entry: the global-hotkey mini composer window. Main owns the OS
  // shortcut + the persisted preference; the quick window only captures text
  // and hands it back, and the primary renderer submits it through the normal
  // prompt path.
  quickEntry: {
    getSettings: () => ipcRenderer.invoke('ulak:quick-entry:settings:get'),
    setSettings: patch => ipcRenderer.invoke('ulak:quick-entry:settings:set', patch),
    submit: payload => ipcRenderer.send('ulak:quick-entry:submit', payload),
    dismiss: () => ipcRenderer.send('ulak:quick-entry:dismiss'),
    // Primary renderer → main → quick window: gateway connection state + the
    // recent-session options the target picker offers. Main caches the latest
    // payload so a freshly spawned quick window starts from truth.
    pushState: payload => ipcRenderer.send('ulak:quick-entry:state', payload),
    // Quick window subscribes to those pushes.
    onState: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('ulak:quick-entry:state', listener)

      return () => ipcRenderer.removeListener('ulak:quick-entry:state', listener)
    },
    // Main → primary renderer: a submit captured by the quick window.
    onSubmit: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('ulak:quick-entry:submit', listener)

      return () => ipcRenderer.removeListener('ulak:quick-entry:submit', listener)
    },
    // Main → quick window: you were just summoned (reset draft + refocus).
    onShown: callback => {
      const listener = () => callback()
      ipcRenderer.on('ulak:quick-entry:shown', listener)

      return () => ipcRenderer.removeListener('ulak:quick-entry:shown', listener)
    }
  },
  getBootProgress: () => ipcRenderer.invoke('ulak:boot-progress:get'),
  getConnectionConfig: profile => ipcRenderer.invoke('ulak:connection-config:get', profile),
  saveConnectionConfig: payload => ipcRenderer.invoke('ulak:connection-config:save', payload),
  applyConnectionConfig: payload => ipcRenderer.invoke('ulak:connection-config:apply', payload),
  testConnectionConfig: payload => ipcRenderer.invoke('ulak:connection-config:test', payload),
  // Opt-in OS-keychain encryption for stored gateway secrets (default off —
  // see secret-storage-policy.ts). get never touches the OS keychain.
  getSecretStorageEncryption: () => ipcRenderer.invoke('ulak:secret-storage:get'),
  setSecretStorageEncryption: (on: boolean) => ipcRenderer.invoke('ulak:secret-storage:set', on),
  // v2 multi-connection registry: named agent sources (local / remote / cloud / ssh).
  connections: {
    list: () => ipcRenderer.invoke('ulak:connections:list'),
    save: payload => ipcRenderer.invoke('ulak:connections:save', payload),
    remove: id => ipcRenderer.invoke('ulak:connections:remove', id),
    setPrimary: id => ipcRenderer.invoke('ulak:connections:set-primary', id),
    setLaunchMode: mode => ipcRenderer.invoke('ulak:connections:set-launch-mode', mode),
    setLastUsed: id => ipcRenderer.invoke('ulak:connections:set-last-used', id),
    test: id => ipcRenderer.invoke('ulak:connections:test', id),
    updateManaged: id => ipcRenderer.invoke('ulak:connections:update-managed', id),
    // Fan out `ulak update` to every eligible registered connection.
    // Optional excludeIds skips rows the caller updates through another path.
    updateAll: options => ipcRenderer.invoke('ulak:connections:update-all', options),
    // Registry lifecycle push (main → renderer): a connection was removed or
    // materially edited, so secondaries scoped to it must be disposed (and,
    // for edits, re-dialed at the new target).
    onChanged: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('ulak:connections:changed', listener)

      return () => ipcRenderer.removeListener('ulak:connections:changed', listener)
    }
  },
  sshConfigHosts: () => ipcRenderer.invoke('ulak:ssh-config:hosts'),
  sshResolveHost: host => ipcRenderer.invoke('ulak:ssh-config:resolve', host),
  probeConnectionConfig: remoteUrl => ipcRenderer.invoke('ulak:connection-config:probe', remoteUrl),
  oauthLoginConnectionConfig: remoteUrl => ipcRenderer.invoke('ulak:connection-config:oauth-login', remoteUrl),
  oauthLogoutConnectionConfig: remoteUrl => ipcRenderer.invoke('ulak:connection-config:oauth-logout', remoteUrl),
  // Ulak Cloud: one portal login powers discovery + silent per-agent sign-in
  // (cloud-auto-discovery Phase 3).
  cloud: {
    status: () => ipcRenderer.invoke('ulak:cloud:status'),
    login: () => ipcRenderer.invoke('ulak:cloud:login'),
    logout: () => ipcRenderer.invoke('ulak:cloud:logout'),
    discover: org => ipcRenderer.invoke('ulak:cloud:discover', org),
    agentSignIn: dashboardUrl => ipcRenderer.invoke('ulak:cloud:agent-sign-in', dashboardUrl)
  },
  profile: {
    get: () => ipcRenderer.invoke('ulak:profile:get'),
    remember: name => ipcRenderer.invoke('ulak:profile:remember', name),
    set: name => ipcRenderer.invoke('ulak:profile:set', name)
  },
  api: request => ipcRenderer.invoke('ulak:api', request),
  notify: payload => ipcRenderer.invoke('ulak:notify', payload),
  requestMicrophoneAccess: () => ipcRenderer.invoke('ulak:requestMicrophoneAccess'),
  readWindowBelow: () => ipcRenderer.invoke('ulak:window:readBelow'),
  readFileDataUrl: filePath => ipcRenderer.invoke('ulak:readFileDataUrl', filePath),
  readFileDataUrlForAttach: filePath => ipcRenderer.invoke('ulak:readFileDataUrlForAttach', filePath),
  dataUrlReadMax: {
    get: () => ipcRenderer.invoke('ulak:data-url-read-max:get'),
    set: maxMb => ipcRenderer.invoke('ulak:data-url-read-max:set', maxMb)
  },
  readFileText: filePath => ipcRenderer.invoke('ulak:readFileText', filePath),
  readPluginSource: (filePath: string) => ipcRenderer.invoke('ulak:readPluginSource', filePath),
  selectPaths: options => ipcRenderer.invoke('ulak:selectPaths', options),
  selectSavePath: options => ipcRenderer.invoke('ulak:selectSavePath', options),
  writeClipboard: text => ipcRenderer.invoke('ulak:writeClipboard', text),
  readClipboard: () => ipcRenderer.invoke('ulak:readClipboard'),
  saveGatewayFile: payload => ipcRenderer.invoke('ulak:saveGatewayFile', payload),
  saveImageFromUrl: url => ipcRenderer.invoke('ulak:saveImageFromUrl', url),
  contextMenuEdit: command => ipcRenderer.invoke('ulak:context-menu:edit', command),
  contextMenuCopyImage: () => ipcRenderer.invoke('ulak:context-menu:copy-image'),
  contextMenuSpellcheck: action => ipcRenderer.invoke('ulak:context-menu:spellcheck', action),
  contextMenuGuestAddWord: payload => ipcRenderer.invoke('ulak:context-menu:guest-add-word', payload),
  onContextMenuSpellcheck: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('ulak:context-menu-spellcheck', listener)

    return () => ipcRenderer.removeListener('ulak:context-menu-spellcheck', listener)
  },
  saveImageBuffer: (data, ext, name) => ipcRenderer.invoke('ulak:saveImageBuffer', { data, ext, name }),
  capturePreview: payload => ipcRenderer.invoke('ulak:capturePreview', payload),
  saveClipboardImage: () => ipcRenderer.invoke('ulak:saveClipboardImage'),
  getPathForFile: file => {
    try {
      return webUtils.getPathForFile(file) || ''
    } catch {
      return ''
    }
  },
  normalizePreviewTarget: (target, baseDir) => ipcRenderer.invoke('ulak:normalizePreviewTarget', target, baseDir),
  watchPreviewFile: url => ipcRenderer.invoke('ulak:watchPreviewFile', url),
  watchDirectory: dir => ipcRenderer.invoke('ulak:watchDirectory', dir),
  stopPreviewFileWatch: id => ipcRenderer.invoke('ulak:stopPreviewFileWatch', id),
  setActiveWork: payload => ipcRenderer.send('ulak:active-work', payload),
  setTitleBarTheme: payload => ipcRenderer.send('ulak:titlebar-theme', payload),
  setNativeTheme: mode => ipcRenderer.send('ulak:native-theme', mode),
  setTranslucency: payload => ipcRenderer.send('ulak:translucency', payload),
  setKeepAwake: on => ipcRenderer.send('ulak:keep-awake', on),
  setDisableF12: blocked => ipcRenderer.send('ulak:devtools:disable-f12', blocked),
  setPreviewShortcutActive: active => ipcRenderer.send('ulak:previewShortcutActive', Boolean(active)),
  openExternal: url => ipcRenderer.invoke('ulak:openExternal', url),
  mcpOauth: {
    // One-shot loopback listener for MCP OAuth against remote backends: bind
    // on this machine, hand redirectUri to mcp.servers.oauth.start, then wait
    // for the provider redirect and relay code/state via oauth.callback.
    listen: () => ipcRenderer.invoke('ulak:mcp-oauth:listen'),
    wait: (id, timeoutMs) => ipcRenderer.invoke('ulak:mcp-oauth:wait', id, timeoutMs),
    cancel: id => ipcRenderer.invoke('ulak:mcp-oauth:cancel', id)
  },
  openPreviewInBrowser: url => ipcRenderer.invoke('ulak:openPreviewInBrowser', url),
  reachPreviewUrl: url => ipcRenderer.invoke('ulak:preview:reach', url),
  setActiveConnectionRoute: route => ipcRenderer.send('ulak:connection:active-route', route),
  fetchLinkTitle: url => ipcRenderer.invoke('ulak:fetchLinkTitle', url),
  resolveFavicon: url => ipcRenderer.invoke('ulak:resolveFavicon', url),
  sanitizeWorkspaceCwd: cwd => ipcRenderer.invoke('ulak:workspace:sanitize', cwd),
  settings: {
    getDefaultProjectDir: () => ipcRenderer.invoke('ulak:setting:defaultProjectDir:get'),
    setDefaultProjectDir: dir => ipcRenderer.invoke('ulak:setting:defaultProjectDir:set', dir),
    pickDefaultProjectDir: () => ipcRenderer.invoke('ulak:setting:defaultProjectDir:pick')
  },
  zoom: {
    // Current zoom of this window, as { level, percent }.
    get: () => ipcRenderer.invoke('ulak:zoom:get'),
    // Synchronous zoom factor (1 = 100%). Coordinate math needs it in the
    // same tick as the event it converts, so no IPC round-trip here.
    factor: () => webFrame.getZoomFactor(),
    setPercent: percent => ipcRenderer.send('ulak:zoom:set-percent', percent),
    // Fires on every zoom change, including the Ctrl/Cmd +/-/0 shortcuts,
    // so the settings UI can stay in sync with the keyboard.
    onChanged: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('ulak:zoom:changed', listener)

      return () => ipcRenderer.removeListener('ulak:zoom:changed', listener)
    }
  },
  revealLogs: () => ipcRenderer.invoke('ulak:logs:reveal'),
  getRecentLogs: () => ipcRenderer.invoke('ulak:logs:recent'),
  // Fire-and-forget: persists a renderer error-boundary catch (with component
  // stack) to desktop.log so crashes survive the window (#79428).
  reportRendererError: report => ipcRenderer.send('ulak:logs:renderer-error', report),
  readDir: dirPath => ipcRenderer.invoke('ulak:fs:readDir', dirPath),
  gitRoot: startPath => ipcRenderer.invoke('ulak:fs:gitRoot', startPath),
  revealPath: targetPath => ipcRenderer.invoke('ulak:fs:reveal', targetPath),
  openDir: dirPath => ipcRenderer.invoke('ulak:fs:openDir', dirPath),
  desktopPluginsRoot: () => ipcRenderer.invoke('ulak:fs:desktopPluginsRoot'),
  logsRoot: () => ipcRenderer.invoke('ulak:fs:logsRoot'),
  agentPluginsRoot: () => ipcRenderer.invoke('ulak:fs:agentPluginsRoot'),
  renamePath: (targetPath, newName) => ipcRenderer.invoke('ulak:fs:rename', targetPath, newName),
  writeTextFile: (filePath, content) => ipcRenderer.invoke('ulak:fs:writeText', filePath, content),
  trashPath: targetPath => ipcRenderer.invoke('ulak:fs:trash', targetPath),
  git: {
    worktreeList: repoPath => ipcRenderer.invoke('ulak:git:worktreeList', repoPath),
    worktreeAdd: (repoPath, options) => ipcRenderer.invoke('ulak:git:worktreeAdd', repoPath, options),
    worktreeRemove: (repoPath, worktreePath, options) =>
      ipcRenderer.invoke('ulak:git:worktreeRemove', repoPath, worktreePath, options),
    branchSwitch: (repoPath, branch) => ipcRenderer.invoke('ulak:git:branchSwitch', repoPath, branch),
    branchList: repoPath => ipcRenderer.invoke('ulak:git:branchList', repoPath),
    baseBranchList: repoPath => ipcRenderer.invoke('ulak:git:baseBranchList', repoPath),
    repoStatus: repoPath => ipcRenderer.invoke('ulak:git:repoStatus', repoPath),
    fileDiff: (repoPath, filePath) => ipcRenderer.invoke('ulak:git:fileDiff', repoPath, filePath),
    scanRepos: (roots, options) => ipcRenderer.invoke('ulak:git:scanRepos', roots, options),
    review: {
      list: (repoPath, scope, baseRef) => ipcRenderer.invoke('ulak:git:review:list', repoPath, scope, baseRef),
      diff: (repoPath, filePath, scope, baseRef, staged) =>
        ipcRenderer.invoke('ulak:git:review:diff', repoPath, filePath, scope, baseRef, staged),
      stage: (repoPath, filePath) => ipcRenderer.invoke('ulak:git:review:stage', repoPath, filePath),
      unstage: (repoPath, filePath) => ipcRenderer.invoke('ulak:git:review:unstage', repoPath, filePath),
      revert: (repoPath, filePath) => ipcRenderer.invoke('ulak:git:review:revert', repoPath, filePath),
      revParse: (repoPath, ref) => ipcRenderer.invoke('ulak:git:review:revParse', repoPath, ref),
      commit: (repoPath, message, push) => ipcRenderer.invoke('ulak:git:review:commit', repoPath, message, push),
      commitContext: repoPath => ipcRenderer.invoke('ulak:git:review:commitContext', repoPath),
      push: repoPath => ipcRenderer.invoke('ulak:git:review:push', repoPath),
      shipInfo: repoPath => ipcRenderer.invoke('ulak:git:review:shipInfo', repoPath),
      prList: (repoPath, branches, numbers) =>
        ipcRenderer.invoke('ulak:git:review:prList', repoPath, branches, numbers),
      fetchPrComment: (repoPath, url) => ipcRenderer.invoke('ulak:git:review:fetchPrComment', repoPath, url),
      createPr: repoPath => ipcRenderer.invoke('ulak:git:review:createPr', repoPath)
    }
  },
  terminal: {
    attach: id => ipcRenderer.invoke('ulak:terminal:attach', id),
    cwd: id => ipcRenderer.invoke('ulak:terminal:cwd', id),
    dispose: id => ipcRenderer.invoke('ulak:terminal:dispose', id),
    resize: (id, size) => ipcRenderer.invoke('ulak:terminal:resize', id, size),
    start: options => ipcRenderer.invoke('ulak:terminal:start', options),
    write: (id, data) => ipcRenderer.invoke('ulak:terminal:write', id, data),
    onData: (id, callback) => {
      const channel = `ulak:terminal:${id}:data`
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on(channel, listener)

      return () => ipcRenderer.removeListener(channel, listener)
    },
    onExit: (id, callback) => {
      const channel = `ulak:terminal:${id}:exit`
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on(channel, listener)

      return () => ipcRenderer.removeListener(channel, listener)
    }
  },
  onClosePreviewRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('ulak:close-preview-requested', listener)

    return () => ipcRenderer.removeListener('ulak:close-preview-requested', listener)
  },
  onPreviewNav: callback => {
    const listener = (_event, command) => callback(command)
    ipcRenderer.on('ulak:preview-nav', listener)

    return () => ipcRenderer.removeListener('ulak:preview-nav', listener)
  },
  onOpenFolderRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('ulak:open-folder-requested', listener)

    return () => ipcRenderer.removeListener('ulak:open-folder-requested', listener)
  },
  onOpenUpdatesRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('ulak:open-updates', listener)

    return () => ipcRenderer.removeListener('ulak:open-updates', listener)
  },
  onDeepLink: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('ulak:deep-link', listener)

    return () => ipcRenderer.removeListener('ulak:deep-link', listener)
  },
  signalDeepLinkReady: () => ipcRenderer.invoke('ulak:deep-link-ready'),
  probePluginRepo: payload => ipcRenderer.invoke('ulak:plugin:probe', payload),
  installDesktopPlugin: payload => ipcRenderer.invoke('ulak:plugin:installDesktop', payload),
  onWindowStateChanged: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('ulak:window-state-changed', listener)

    return () => ipcRenderer.removeListener('ulak:window-state-changed', listener)
  },
  onFocusSession: callback => {
    const listener = (_event, sessionId) => callback(sessionId)
    ipcRenderer.on('ulak:focus-session', listener)

    return () => ipcRenderer.removeListener('ulak:focus-session', listener)
  },
  onNotificationAction: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('ulak:notification-action', listener)

    return () => ipcRenderer.removeListener('ulak:notification-action', listener)
  },
  onNotificationActivate: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('ulak:notification-activate', listener)

    return () => ipcRenderer.removeListener('ulak:notification-activate', listener)
  },
  onPreviewFileChanged: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('ulak:preview-file-changed', listener)

    return () => ipcRenderer.removeListener('ulak:preview-file-changed', listener)
  },
  onBackendExit: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('ulak:backend-exit', listener)

    return () => ipcRenderer.removeListener('ulak:backend-exit', listener)
  },
  // Soft gateway-mode apply finished tearing down the primary backend. Renderer
  // should wipe session lists + re-dial without a window reload.
  onConnectionApplied: callback => {
    const listener = () => callback()
    ipcRenderer.on('ulak:connection:applied', listener)

    return () => ipcRenderer.removeListener('ulak:connection:applied', listener)
  },
  onPowerResume: callback => {
    const listener = () => callback()
    ipcRenderer.on('ulak:power-resume', listener)

    return () => ipcRenderer.removeListener('ulak:power-resume', listener)
  },
  // AC ↔ battery transitions; renderers slow their backstop polls on battery.
  getOnBattery: () => ipcRenderer.invoke('ulak:power-battery:get'),
  onBatteryChanged: callback => {
    const listener = (_event, onBattery) => callback(Boolean(onBattery))
    ipcRenderer.on('ulak:power-battery', listener)

    return () => ipcRenderer.removeListener('ulak:power-battery', listener)
  },
  onBootProgress: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('ulak:boot-progress', listener)

    return () => ipcRenderer.removeListener('ulak:boot-progress', listener)
  },
  // First-launch bootstrap progress -- emitted by the install.ps1 stage
  // runner in main.ts (apps/desktop/electron/bootstrap-runner.ts).
  // Renderer's install overlay subscribes to live events and queries the
  // current snapshot via getBootstrapState() to recover after a devtools
  // reload mid-bootstrap.
  getBootstrapState: () => ipcRenderer.invoke('ulak:bootstrap:get'),
  continueBootstrapLocal: () => ipcRenderer.invoke('ulak:bootstrap:continue-local'),
  recycleBackend: profile => ipcRenderer.invoke('ulak:backend:recycle', profile),
  resetBootstrap: () => ipcRenderer.invoke('ulak:bootstrap:reset'),
  repairBootstrap: () => ipcRenderer.invoke('ulak:bootstrap:repair'),
  cancelBootstrap: () => ipcRenderer.invoke('ulak:bootstrap:cancel'),
  onBootstrapEvent: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('ulak:bootstrap:event', listener)

    return () => ipcRenderer.removeListener('ulak:bootstrap:event', listener)
  },
  getVersion: () => ipcRenderer.invoke('ulak:version'),
  relaunchApp: () => ipcRenderer.invoke('ulak:app:relaunch'),
  getRemoteDisplayReason: () => ipcRenderer.invoke('ulak:get-remote-display-reason'),
  uninstall: {
    summary: () => ipcRenderer.invoke('ulak:uninstall:summary'),
    run: mode => ipcRenderer.invoke('ulak:uninstall:run', { mode })
  },
  updates: {
    check: () => ipcRenderer.invoke('ulak:updates:check'),
    apply: opts => ipcRenderer.invoke('ulak:updates:apply', opts),
    getBranch: () => ipcRenderer.invoke('ulak:updates:branch:get'),
    setBranch: name => ipcRenderer.invoke('ulak:updates:branch:set', name),
    onProgress: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('ulak:updates:progress', listener)

      return () => ipcRenderer.removeListener('ulak:updates:progress', listener)
    }
  },
  themes: {
    fetchMarketplace: id => ipcRenderer.invoke('ulak:vscode-theme:fetch', id),
    searchMarketplace: query => ipcRenderer.invoke('ulak:vscode-theme:search', query)
  },
  // Find-in-page (Ctrl/Cmd+F): delegates to Electron's
  // webContents.findInPage on the IPC sender's window so a Cmd+F pressed
  // in a secondary session window searches THAT window, not the primary.
  // `onFoundInPage` returns the unsubscribe fn; the renderer wires it via
  // `initFindInPageListener` in store/find-in-page.ts and tears it down
  // when the FindBar unmounts.
  findInPage: (query, options) => ipcRenderer.invoke('ulak:find-in-page', query, options),
  stopFindInPage: () => ipcRenderer.invoke('ulak:stop-find-in-page'),
  onFoundInPage: callback => {
    const listener = (_event, result) => callback(result)
    ipcRenderer.on('ulak:found-in-page', listener)

    return () => ipcRenderer.removeListener('ulak:found-in-page', listener)
  },
  // Main-process `before-input-event` forwards Ctrl/Cmd+F here so renderer
  // can open the FindBar even when the GTK compositor has already grabbed
  // the chord at the windowing layer (#81727).
  onOpenFindBarRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('ulak:open-find-bar', listener)

    return () => ipcRenderer.removeListener('ulak:open-find-bar', listener)
  }
})
