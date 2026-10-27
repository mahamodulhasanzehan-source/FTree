const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  openFtreeDialog: () => ipcRenderer.invoke('dialog:open-ftree'),
  saveFtreeDialog: (options) => ipcRenderer.invoke('dialog:save-ftree', options),
});
