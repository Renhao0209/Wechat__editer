const path = require('node:path')
const { app, BrowserWindow, Menu } = require('electron')

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

app.whenReady().then(() => {
  app.setName(APP_DISPLAY_NAME)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
