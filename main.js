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

    try {
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
    } catch (e) {
        console.error('Error thumbar:', e);
    }
}

/* =========================
   UPDATE WINDOW
========================= */

function createUpdateWindow() {
    if (updateWindow) return;

    updateWindow = new BrowserWindow({
        width: 420,
        height: 460,
        resizable: false,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        parent: mainWindow,
        modal: true,
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true
        }
    });

    updateWindow.loadFile('update.html');

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
        transparent: true,
        frame: false,
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
        if (mainWindow) {
            e.preventDefault();
            mainWindow.webContents.send('app-close');
            setTimeout(() => mainWindow.destroy(), 300);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.once('ready-to-show', () => {
        setTimeout(() => {
            if (splash && !splash.isDestroyed()) splash.close();
            mainWindow.show();
            updateThumbarButtons(false);
            autoUpdater.checkForUpdates();
        }, 2500);
    });
}

/* =========================
   AUTO UPDATER EVENTS
========================= */

autoUpdater.on('update-available', () => {
    if (!updateDeferred) {
        createUpdateWindow();
    }
});

autoUpdater.on('download-progress', (progress) => {
    if (updateWindow) {
        updateWindow.webContents.send(
            'update-progress',
            Math.floor(progress.percent)
        );
    }
});

autoUpdater.on('update-downloaded', () => {
    if (updateWindow) {
        updateWindow.webContents.send('update-progress', 100);
    }

    setTimeout(() => {
        autoUpdater.quitAndInstall();
    }, 1200);
});

/* =========================
   APP LIFECYCLE
========================= */

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
