const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    updateThumbar: (isPlaying) =>
        ipcRenderer.send('update-thumbar', isPlaying),

    startUpdateDownload: () =>
        ipcRenderer.send('start-update-download'),

    deferUpdate: () =>
        ipcRenderer.send('defer-update'),

    onUpdateProgress: (callback) =>
        ipcRenderer.on('update-progress', (_, p) => callback(p)),

    onUpdateInfo: (callback) =>
        ipcRenderer.on('update-info', (_, data) => callback(data)),

    onAppClose: (callback) =>
        ipcRenderer.on('app-close', callback),
    onControlCommand: (callback) => ipcRenderer.on('control', (_, command) => callback(command)),
    startImportBackend: (options) => ipcRenderer.invoke('start-import-backend', options)
});

window.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Preload cargado');
});
