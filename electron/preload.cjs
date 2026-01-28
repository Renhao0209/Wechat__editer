// Keep this minimal for now.
// If you later need native integrations (file system dialogs, etc), expose safe APIs here.
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  version: () => process.versions.electron,
})
