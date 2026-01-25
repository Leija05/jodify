const { contextBridge, ipcRenderer } = require('electron');

/* =========================
   API SEGURA PARA RENDERER
========================= */

contextBridge.exposeInMainWorld('electronAPI', {

    solicitarActualizacion: () => {
        ipcRenderer.send('force-update');
    },

    updateThumbar: (isPlaying) => {
        ipcRenderer.send('update-thumbar', isPlaying);
    },

    onControlCommand: (callback) => {
        ipcRenderer.on('control', (_, command) => callback(command));
    },

    startUpdateDownload: () => {
        ipcRenderer.send('start-update-download');
    },

    deferUpdate: () => {
        ipcRenderer.send('defer-update');
    },

    onUpdateProgress: (callback) => {
        ipcRenderer.on('update-progress', (_, percent) => callback(percent));
    },

    onAppClose: (callback) => {
        ipcRenderer.on('app-close', callback);
    }
});

/* =========================
   READY
========================= */

window.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Preload cargado correctamente');
});
