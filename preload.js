const { contextBridge, ipcRenderer } = require('electron');

/* =========================
   API SEGURA
========================= */

contextBridge.exposeInMainWorld('electronAPI', {

    solicitarActualizacion: () =>
        ipcRenderer.send('force-update'),

    updateThumbar: (isPlaying) =>
        ipcRenderer.send('update-thumbar', isPlaying),

    onControlCommand: (callback) =>
        ipcRenderer.on('control', (_, cmd) => callback(cmd)),

    startUpdateDownload: () =>
        ipcRenderer.send('start-update-download'),

    deferUpdate: () =>
        ipcRenderer.send('defer-update'),

    onUpdateProgress: (callback) =>
        ipcRenderer.on('update-progress', (_, p) => callback(p)),

    onUpdateInfo: (callback) =>
        ipcRenderer.on('update-info', (_, data) => callback(data)),

    onAppClose: (callback) =>
        ipcRenderer.on('app-close', callback)
});

/* =========================
   READY
========================= */

window.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Preload cargado correctamente');
});
