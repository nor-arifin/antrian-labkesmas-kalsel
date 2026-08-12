const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printTicket: (html) => ipcRenderer.send('print-ticket', html),
  onPrintResult: (callback) => {
    ipcRenderer.on('print-result', (event, result) => callback(result));
  },
  quitApp: () => ipcRenderer.send('quit-app'),
  isElectron: true
});
