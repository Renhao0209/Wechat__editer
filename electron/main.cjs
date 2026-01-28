const path = require('node:path')
const fs = require('node:fs/promises')
const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const { dialog } = require('electron')
const { autoUpdater } = require('electron-updater')

const APP_DISPLAY_NAME = '微信排版助手'

function getAppIconPath() {
  // In dev, the icon is in the workspace. In production, it's packaged inside app.asar.
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar', 'build', 'icon.ico')
  }
  return path.join(__dirname, '..', 'build', 'icon.ico')
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#f6f7f9',
    title: APP_DISPLAY_NAME,
    icon: getAppIconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Hide the default Windows menu bar (File/Edit/View/...). We'll render an in-app menubar.
  try {
    Menu.setApplicationMenu(null)
    win.setMenuBarVisibility(false)
    win.removeMenu()
  } catch {
    // ignore
  }

  const devServerUrl = process.env.VITE_DEV_SERVER_URL

  if (devServerUrl) {
    win.loadURL(devServerUrl)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    // Packaged app: load built Vite files
    const indexHtmlPath = path.join(__dirname, '..', 'dist', 'index.html')
    win.loadFile(indexHtmlPath)
  }
}

function sendUpdateStatus(payload) {
  for (const w of BrowserWindow.getAllWindows()) {
    try {
      w.webContents.send('updater:status', payload)
    } catch {
      // ignore
    }
  }
}

function initAutoUpdater() {
  // Auto-update works only for packaged builds.
  autoUpdater.autoDownload = false

  autoUpdater.on('checking-for-update', () => sendUpdateStatus({ type: 'checking' }))
  autoUpdater.on('update-available', (info) => sendUpdateStatus({ type: 'available', info }))
  autoUpdater.on('update-not-available', (info) => sendUpdateStatus({ type: 'none', info }))
  autoUpdater.on('download-progress', (progress) => sendUpdateStatus({ type: 'progress', progress }))
  autoUpdater.on('update-downloaded', (info) => sendUpdateStatus({ type: 'downloaded', info }))
  autoUpdater.on('error', (err) => sendUpdateStatus({ type: 'error', message: String(err?.message ?? err) }))

  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) return { ok: false, reason: 'dev' }
    try {
      await autoUpdater.checkForUpdates()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })

  ipcMain.handle('updater:download', async () => {
    if (!app.isPackaged) return { ok: false, reason: 'dev' }
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })

  ipcMain.handle('updater:install', async () => {
    if (!app.isPackaged) return { ok: false, reason: 'dev' }
    // quitAndInstall will restart the app after update.
    autoUpdater.quitAndInstall(false, true)
    return { ok: true }
  })
}

// --- File system bridge (safe, root-scoped) ---
const allowedRoots = new Set()

function normalizeRoot(p) {
  if (!p || typeof p !== 'string') return ''
  try {
    return path.resolve(p)
  } catch {
    return ''
  }
}

function isSubPath(root, targetAbs) {
  try {
    const rel = path.relative(root, targetAbs)
    if (!rel) return true
    return !rel.startsWith('..') && !path.isAbsolute(rel)
  } catch {
    return false
  }
}

function resolveInRoot(root, rel) {
  const safeRel = typeof rel === 'string' ? rel : ''
  const abs = path.resolve(root, safeRel)
  if (!isSubPath(root, abs)) throw new Error('Path is outside of root')
  return abs
}

function allowRoot(root) {
  const r = normalizeRoot(root)
  if (r) allowedRoots.add(r)
  return r
}

function assertAllowedRoot(root) {
  const r = normalizeRoot(root)
  if (!r || !allowedRoots.has(r)) throw new Error('Root is not allowed')
  return r
}

function detectTextExt(relPath) {
  const ext = path.extname(relPath || '').toLowerCase()
  if (ext === '.md' || ext === '.markdown') return 'md'
  if (ext === '.html' || ext === '.htm') return 'html'
  if (ext === '.txt') return 'txt'
  return 'other'
}

function ensureTextFileAllowed(relPath) {
  const kind = detectTextExt(relPath)
  if (kind === 'other') throw new Error('File type not allowed')
}

function initFsBridge() {
  ipcMain.handle('fs:pickFolder', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      const res = await dialog.showOpenDialog(win, {
        title: '选择文章文件夹',
        properties: ['openDirectory', 'createDirectory'],
      })
      if (res.canceled || !res.filePaths || res.filePaths.length === 0) return { ok: false, canceled: true }
      const root = allowRoot(res.filePaths[0])
      if (!root) return { ok: false, error: 'invalid_root' }
      return { ok: true, root }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })

  ipcMain.handle('fs:listDir', async (_evt, params) => {
    try {
      const root = assertAllowedRoot(params?.root)
      const rel = typeof params?.rel === 'string' ? params.rel : ''
      const abs = resolveInRoot(root, rel)

      const dirents = await fs.readdir(abs, { withFileTypes: true })
      const entries = []
      for (const d of dirents) {
        const name = d.name
        if (!name) continue
        if (name === '.git' || name === 'node_modules' || name === 'dist') continue
        const childRel = rel ? path.join(rel, name) : name
        const isDir = d.isDirectory()
        const extKind = isDir ? 'dir' : detectTextExt(childRel)
        entries.push({
          name,
          relPath: childRel.split(path.sep).join('/'),
          isDir,
          kind: extKind,
        })
      }

      entries.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      return { ok: true, entries }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })

  ipcMain.handle('fs:readTextFile', async (_evt, params) => {
    try {
      const root = assertAllowedRoot(params?.root)
      const rel = typeof params?.rel === 'string' ? params.rel : ''
      ensureTextFileAllowed(rel)
      const abs = resolveInRoot(root, rel)
      const stat = await fs.stat(abs)
      const maxBytes = 5 * 1024 * 1024
      if (stat.size > maxBytes) throw new Error('File too large')
      const content = await fs.readFile(abs, 'utf8')
      return { ok: true, content }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })

  ipcMain.handle('fs:writeTextFile', async (_evt, params) => {
    try {
      const root = assertAllowedRoot(params?.root)
      const rel = typeof params?.rel === 'string' ? params.rel : ''
      ensureTextFileAllowed(rel)
      const abs = resolveInRoot(root, rel)
      const dir = path.dirname(abs)
      await fs.mkdir(dir, { recursive: true })
      const content = typeof params?.content === 'string' ? params.content : ''
      await fs.writeFile(abs, content, 'utf8')
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })

  ipcMain.handle('fs:saveAs', async (_evt, params) => {
    try {
      const root = assertAllowedRoot(params?.root)
      const suggestedName = typeof params?.suggestedName === 'string' ? params.suggestedName : 'article.html'
      const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      const res = await dialog.showSaveDialog(win, {
        title: '另存为',
        defaultPath: path.join(root, suggestedName),
        filters: [
          { name: 'Markdown', extensions: ['md'] },
          { name: 'HTML', extensions: ['html', 'htm'] },
          { name: 'Text', extensions: ['txt'] },
        ],
      })
      if (res.canceled || !res.filePath) return { ok: false, canceled: true }
      const abs = path.resolve(res.filePath)
      if (!isSubPath(root, abs)) throw new Error('Save path is outside of root')
      const rel = path.relative(root, abs).split(path.sep).join('/')
      ensureTextFileAllowed(rel)
      const content = typeof params?.content === 'string' ? params.content : ''
      await fs.writeFile(abs, content, 'utf8')
      return { ok: true, rel }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })

  ipcMain.handle('fs:rename', async (_evt, params) => {
    try {
      const root = assertAllowedRoot(params?.root)
      const fromRel = typeof params?.fromRel === 'string' ? params.fromRel : ''
      const toRel = typeof params?.toRel === 'string' ? params.toRel : ''
      const fromAbs = resolveInRoot(root, fromRel)
      const toAbs = resolveInRoot(root, toRel)

      const st = await fs.stat(fromAbs)
      if (!st.isDirectory()) {
        // file: keep extension whitelist
        ensureTextFileAllowed(fromRel)
        ensureTextFileAllowed(toRel)
      }

      const dir = path.dirname(toAbs)
      await fs.mkdir(dir, { recursive: true })
      await fs.rename(fromAbs, toAbs)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })

  ipcMain.handle('fs:deleteFile', async (_evt, params) => {
    try {
      const root = assertAllowedRoot(params?.root)
      const rel = typeof params?.rel === 'string' ? params.rel : ''
      ensureTextFileAllowed(rel)
      const abs = resolveInRoot(root, rel)
      await fs.unlink(abs)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })

  ipcMain.handle('fs:mkdir', async (_evt, params) => {
    try {
      const root = assertAllowedRoot(params?.root)
      const rel = typeof params?.rel === 'string' ? params.rel : ''
      // Allow only directories inside root.
      const abs = resolveInRoot(root, rel)
      await fs.mkdir(abs, { recursive: true })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })

  ipcMain.handle('fs:movePath', async (_evt, params) => {
    try {
      const root = assertAllowedRoot(params?.root)
      const fromRel = typeof params?.fromRel === 'string' ? params.fromRel : ''
      const toRel = typeof params?.toRel === 'string' ? params.toRel : ''
      const fromAbs = resolveInRoot(root, fromRel)
      const toAbs = resolveInRoot(root, toRel)

      const st = await fs.stat(fromAbs)
      if (!st.isDirectory()) {
        ensureTextFileAllowed(fromRel)
        ensureTextFileAllowed(toRel)
      }

      // Prevent moving a folder into itself/descendant.
      // We can only reliably check by string prefix relationship.
      if (st.isDirectory() && isSubPath(fromAbs, toAbs)) {
        throw new Error('Cannot move a folder into itself')
      }

      const dir = path.dirname(toAbs)
      await fs.mkdir(dir, { recursive: true })
      await fs.rename(fromAbs, toAbs)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })

  ipcMain.handle('fs:deletePath', async (_evt, params) => {
    try {
      const root = assertAllowedRoot(params?.root)
      const rel = typeof params?.rel === 'string' ? params.rel : ''
      const abs = resolveInRoot(root, rel)

      const st = await fs.stat(abs)
      if (st.isDirectory()) {
        await fs.rm(abs, { recursive: true, force: true })
        return { ok: true, deletedType: 'dir' }
      }

      // file: keep extension whitelist
      ensureTextFileAllowed(rel)
      await fs.unlink(abs)
      return { ok: true, deletedType: 'file' }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })
}

app.whenReady().then(() => {
  app.setName(APP_DISPLAY_NAME)
  initAutoUpdater()
  initFsBridge()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
