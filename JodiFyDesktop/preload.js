const { contextBridge, ipcRenderer } = require('electron');

const apiUrlArg = process.argv.find((a) => a.startsWith('--jodify-api-url='));

contextBridge.exposeInMainWorld('jodifyEnv', {
  apiUrl: apiUrlArg ? apiUrlArg.slice('--jodify-api-url='.length) : '',
});

contextBridge.exposeInMainWorld('jodifyUpdater', {
  isDesktop: true,
  check: () => ipcRenderer.invoke('updater:check'),
  install: () => ipcRenderer.invoke('updater:install'),
  getState: () => ipcRenderer.invoke('updater:get-state'),
  onEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('updater:event', listener);
    return () => ipcRenderer.removeListener('updater:event', listener);
  },
});