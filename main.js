const { app, BrowserWindow, ipcMain, session, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');

/* =========================
   VARIABLES
========================= */

let mainWindow = null;
let splash = null;
let updateWindow = null;
let updateDeferred = false;

/* =========================
   AUTO UPDATER CONFIG
========================= */

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

/* =========================
   IPC
========================= */

ipcMain.on('force-update', async () => {
    if (!mainWindow) return;
    try {
        await session.defaultSession.clearCache();
        mainWindow.webContents.send('soft-reload');
    } catch (err) {
        console.error('Error limpiando caché:', err);
    }
});

ipcMain.on('update-thumbar', (_, isPlaying) => {
    updateThumbarButtons(isPlaying);
});

ipcMain.on('start-update-download', () => {
    autoUpdater.downloadUpdate();
});

ipcMain.on('defer-update', () => {
    updateDeferred = true;
    if (updateWindow) updateWindow.close();
});

/* =========================
   THUMBAR
========================= */

function updateThumbarButtons(isPlaying) {
    if (!mainWindow) return;

    const getIcon = (file) =>
        nativeImage
            .createFromPath(path.join(__dirname, 'assets', file))
            .resize({ width: 16, height: 16 });

    mainWindow.setThumbarButtons([
        {
            tooltip: 'Anterior',
            icon: getIcon('prev.png'),
            click: () => mainWindow.webContents.send('control', 'prev')
        },
        {
            tooltip: isPlaying ? 'Pausar' : 'Reproducir',
            icon: isPlaying ? getIcon('pause.png') : getIcon('play.png'),
            click: () => mainWindow.webContents.send('control', 'play')
        },
        {
            tooltip: 'Siguiente',
            icon: getIcon('next.png'),
            click: () => mainWindow.webContents.send('control', 'next')
        }
    ]);
}

/* =========================
   UPDATE WINDOW
========================= */

function createUpdateWindow(info) {
    if (updateWindow) return;

    updateWindow = new BrowserWindow({
        width: 420,
        height: 460,
        frame: false,
        transparent: true,
        resizable: false,
        modal: true,
        parent: mainWindow,
        alwaysOnTop: true,
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true
        }
    });

    updateWindow.loadFile('update.html');

    updateWindow.webContents.on('did-finish-load', () => {
        updateWindow.webContents.send('update-info', {
            current: app.getVersion(),
            next: info.version
        });
    });

    updateWindow.on('closed', () => {
        updateWindow = null;
    });
}

/* =========================
   MAIN WINDOW
========================= */

function createWindow() {
    splash = new BrowserWindow({
        width: 400,
        height: 500,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        icon: path.join(__dirname, 'assets', 'icon.ico')
    });

    splash.loadFile('splash.html');

    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        show: false,
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('close', (e) => {
        e.preventDefault();
        mainWindow.webContents.send('app-close');
        setTimeout(() => mainWindow.destroy(), 300);
    });

    mainWindow.once('ready-to-show', () => {
        setTimeout(() => {
            splash?.close();
            mainWindow.show();
            updateThumbarButtons(false);
            autoUpdater.checkForUpdates();
        }, 2500);
    });
}

/* =========================
   AUTO UPDATER EVENTS
========================= */

autoUpdater.on('update-available', (info) => {
    if (!updateDeferred) createUpdateWindow(info);
});

autoUpdater.on('download-progress', (progress) => {
    updateWindow?.webContents.send(
        'update-progress',
        Math.floor(progress.percent)
    );
});

autoUpdater.on('update-downloaded', () => {
    updateWindow?.webContents.send('update-progress', 100);
    setTimeout(() => autoUpdater.quitAndInstall(), 1200);
});

/* =========================
   APP LIFECYCLE
========================= */

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
