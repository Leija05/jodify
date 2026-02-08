const { app, BrowserWindow, ipcMain, session, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const { spawn } = require('child_process');

/* =========================
   CONFIGURACIÓN INICIAL
========================= */

let mainWindow = null;
let splash = null;
let updateWindow = null;
let importBackendProcess = null;
let importBackendStarting = null;

// Configuración de Logs
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// IMPORTANTE: Evita que descargue automáticamente para que 
// tu ventana update.html controle el inicio de la descarga.
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

/* =========================
   VENTANA DE ACTUALIZACIÓN
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
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    updateWindow.loadFile('update.html');

    // Enviamos la info de versiones cuando el HTML esté listo
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
   VENTANA PRINCIPAL Y SPLASH
========================= */

function createWindow() {
    // Splash Screen
    splash = new BrowserWindow({
        width: 400,
        height: 500,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        icon: path.join(__dirname, 'assets', 'icon.ico')
    });
    splash.loadFile('splash.html');

    // Ventana Principal
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        show: false,
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false // Nota: Ten cuidado con esto en apps que cargan contenido externo
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('close', (e) => {
        // Si queremos una salida limpia con animación
        if (mainWindow) {
            e.preventDefault();
            mainWindow.webContents.send('app-close');
            setTimeout(() => {
                mainWindow = null;
                app.quit();
            }, 300);
        }
    });

    mainWindow.once('ready-to-show', () => {
        setTimeout(() => {
            splash?.close();
            mainWindow.show();
            updateThumbarButtons(false);
            
            // BUSCAR ACTUALIZACIONES AL INICIAR
            // Solo en producción o si tienes configurado el dev-publisher
            if (app.isPackaged) {
                autoUpdater.checkForUpdates();
            } else {
                console.log("Modo desarrollo: Buscando actualizaciones (Modo Desarrollador)");
                // Descomenta la siguiente línea para probar tu update.html sin subir a GitHub:
                // createUpdateWindow({ version: '1.1.0-demo' });
            }
        }, 2500);
    });
}

/* =========================
   EVENTOS AUTO-UPDATER
========================= */

autoUpdater.on('update-available', (info) => {
    log.info('Actualización disponible encontrada.');
    createUpdateWindow(info);
});

autoUpdater.on('update-not-available', () => {
    log.info('La aplicación está al día.');
});

autoUpdater.on('error', (err) => {
    log.error('Error en el auto-updater: ' + err);
});

autoUpdater.on('download-progress', (progress) => {
    if (updateWindow) {
        updateWindow.webContents.send('update-progress', Math.floor(progress.percent));
    }
});

autoUpdater.on('update-downloaded', () => {
    log.info('Descarga completada.');
    if (updateWindow) {
        updateWindow.webContents.send('update-progress', 100);
    }
    // Pequeña espera para que el usuario vea el 100% y luego instala
    setTimeout(() => {
        autoUpdater.quitAndInstall();
    }, 1500);
});

/* =========================
   COMUNICACIÓN IPC
========================= */

ipcMain.on('start-update-download', () => {
    log.info('El usuario inició la descarga.');
    autoUpdater.downloadUpdate();
});

ipcMain.on('defer-update', () => {
    if (updateWindow) updateWindow.close();
});

ipcMain.on('force-update', async () => {
    if (!mainWindow) return;
    try {
        await session.defaultSession.clearCache();
        mainWindow.webContents.send('soft-reload');
    } catch (err) {
        log.error('Error limpiando caché:', err);
    }
});

ipcMain.on('update-thumbar', (_, isPlaying) => {
    updateThumbarButtons(isPlaying);
});

ipcMain.handle('start-import-backend', async (_, options = {}) => {
    const port = options.port || 8000;
    if (importBackendProcess && !importBackendProcess.killed) {
        return { status: 'running', port };
    }
    if (importBackendStarting) {
        return importBackendStarting;
    }

    importBackendStarting = new Promise((resolve) => {
        const serverPath = path.join(__dirname, 'backend', 'server.py');
        const env = {
            ...process.env,
            JODIFY_STATIC_ROOT: __dirname
        };

        const trySpawn = (cmd, fallbackCmd) => {
            const child = spawn(cmd, [serverPath], {
                env,
                stdio: 'ignore'
            });

            child.once('error', (err) => {
                if (fallbackCmd) {
                    return trySpawn(fallbackCmd, null);
                }
                resolve({ status: 'error', error: err.message });
            });

            child.once('spawn', () => {
                importBackendProcess = child;
                resolve({ status: 'started', port });
            });

            child.once('exit', () => {
                if (importBackendProcess === child) {
                    importBackendProcess = null;
                }
            });
        };

        trySpawn(process.env.JODIFY_PYTHON || 'python3', 'python');
    }).finally(() => {
        importBackendStarting = null;
    });

    return importBackendStarting;
});

/* =========================
   CONTROLES DE BARRA (THUMBAR)
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
   CICLO DE VIDA
========================= */

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
