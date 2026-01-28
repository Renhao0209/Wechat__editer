// Keep this minimal and safe.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  electronVersion: () => process.versions.electron,
  appVersion: () => ipcRenderer.invoke('app:getVersion'),
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    onStatus: (callback) => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('updater:status', listener)
      return () => ipcRenderer.removeListener('updater:status', listener)
    },
  },
  fs: {
    pickFolder: () => ipcRenderer.invoke('fs:pickFolder'),
    listDir: (params) => ipcRenderer.invoke('fs:listDir', params),
    readTextFile: (params) => ipcRenderer.invoke('fs:readTextFile', params),
    writeTextFile: (params) => ipcRenderer.invoke('fs:writeTextFile', params),
    saveAs: (params) => ipcRenderer.invoke('fs:saveAs', params),
    rename: (params) => ipcRenderer.invoke('fs:rename', params),
    deleteFile: (params) => ipcRenderer.invoke('fs:deleteFile', params),
    mkdir: (params) => ipcRenderer.invoke('fs:mkdir', params),
    movePath: (params) => ipcRenderer.invoke('fs:movePath', params),
    deletePath: (params) => ipcRenderer.invoke('fs:deletePath', params),
  },
})
