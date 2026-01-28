const path = require('node:path')
const { app, BrowserWindow, Menu, ipcMain } = require('electron')
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

app.whenReady().then(() => {
  app.setName(APP_DISPLAY_NAME)
  initAutoUpdater()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
