const { app, BrowserWindow, ipcMain, session, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');

/* =========================
   CONFIGURACIÓN INICIAL
========================= */

let mainWindow = null;
let splash = null;
let updateWindow = null;
let importBackendProcess = null;
let importBackendStarting = null;
let discordRpcEnabled = false;
let discordSocket = null;
let discordNonce = 0;
let discordConnected = false;

const DISCORD_RPC_CLIENT_ID = '1366172403489996911';

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
            backgroundThrottling: false,
            webSecurity: false // Nota: Ten cuidado con esto en apps que cargan contenido externo
        }
    });

    mainWindow.loadFile('index.html');

    let closingInProgress = false;
    mainWindow.on('close', (e) => {
        if (!mainWindow || closingInProgress) return;
        e.preventDefault();
        closingInProgress = true;

        const finishClose = () => {
            if (!mainWindow) return;
            mainWindow = null;
            app.quit();
        };

        const timeoutId = setTimeout(finishClose, 1800);
        ipcMain.once('app-close-done', () => {
            clearTimeout(timeoutId);
            finishClose();
        });

        mainWindow.webContents.send('app-close');
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

async function ensureDiscordRpcClient() {
    if (discordSocket && discordConnected) {
        return { ok: true };
    }

    const pipePaths = process.platform === 'win32'
        ? Array.from({ length: 10 }, (_, i) => `\\\\?\\pipe\\discord-ipc-${i}`)
        : Array.from({ length: 10 }, (_, i) => `${process.env.XDG_RUNTIME_DIR || '/tmp'}/discord-ipc-${i}`);

    const writeDiscordFrame = (socket, op, payload) => {
        const body = Buffer.from(JSON.stringify(payload), 'utf8');
        const header = Buffer.alloc(8);
        header.writeInt32LE(op, 0);
        header.writeInt32LE(body.length, 4);
        socket.write(Buffer.concat([header, body]));
    };

    const tryPipe = (index, resolve) => {
        if (index >= pipePaths.length) {
            resolve({ ok: false, error: 'No se pudo conectar con Discord RPC. Abre Discord e inténtalo de nuevo.' });
            return;
        }

        const socket = net.createConnection(pipePaths[index]);
        let completed = false;

        socket.once('connect', () => {
            writeDiscordFrame(socket, 0, { v: 1, client_id: DISCORD_RPC_CLIENT_ID });
        });

        socket.on('data', (chunk) => {
            if (completed || chunk.length < 8) return;

            const payloadLength = chunk.readInt32LE(4);
            const payloadRaw = chunk.subarray(8, 8 + payloadLength).toString('utf8');
            let payload;
            try {
                payload = JSON.parse(payloadRaw);
            } catch (error) {
                payload = null;
            }

            if (payload?.evt === 'READY' || payload?.cmd === 'DISPATCH') {
                completed = true;
                discordSocket = socket;
                discordConnected = true;
                socket.on('error', () => {
                    discordConnected = false;
                    discordSocket = null;
                });
                socket.on('close', () => {
                    discordConnected = false;
                    discordSocket = null;
                });
                resolve({ ok: true });
            }
        });

        socket.once('error', () => {
            if (!completed) {
                socket.destroy();
                tryPipe(index + 1, resolve);
            }
        });

        socket.once('close', () => {
            if (!completed) {
                tryPipe(index + 1, resolve);
            }
        });
    };

    return new Promise((resolve) => {
        tryPipe(0, resolve);
    });
}

async function setDiscordPresence(payload) {
    if (!discordRpcEnabled) {
        return { ok: false, error: 'discord_presence_disabled' };
    }

    const ready = await ensureDiscordRpcClient();
    if (!ready.ok) {
        return ready;
    }

    if (!discordSocket || !discordConnected) {
        return { ok: false, error: 'discord_rpc_not_ready' };
    }

    const hasCover = typeof payload.largeImageKey === 'string' && payload.largeImageKey.length > 0;

    const activity = {
        details: payload.details || 'Escuchando en JodiFy',
        state: payload.state || 'Sincronizado con Discord',
        assets: {
            large_text: payload.largeImageText || 'JodiFy',
            small_image: payload.smallImageKey || undefined,
            small_text: payload.smallImageText || 'JodiFy'
        },
        instance: false
    };

    if (hasCover) {
        activity.assets.large_image = payload.largeImageKey;
    }

    if (payload.startTimestamp) {
        activity.timestamps = activity.timestamps || {};
        activity.timestamps.start = Math.floor(new Date(payload.startTimestamp).getTime() / 1000);
    }

    if (payload.endTimestamp) {
        activity.timestamps = activity.timestamps || {};
        activity.timestamps.end = Math.floor(new Date(payload.endTimestamp).getTime() / 1000);
    }

    const body = {
        cmd: 'SET_ACTIVITY',
        args: { pid: process.pid, activity },
        nonce: String(++discordNonce)
    };

    const encoded = Buffer.from(JSON.stringify(body), 'utf8');
    const header = Buffer.alloc(8);
    header.writeInt32LE(1, 0);
    header.writeInt32LE(encoded.length, 4);
    discordSocket.write(Buffer.concat([header, encoded]));

    return { ok: true };
}

function clearDiscordPresence() {
    if (!discordSocket || !discordConnected) {
        return;
    }

    const body = {
        cmd: 'SET_ACTIVITY',
        args: { pid: process.pid, activity: null },
        nonce: String(++discordNonce)
    };
    const encoded = Buffer.from(JSON.stringify(body), 'utf8');
    const header = Buffer.alloc(8);
    header.writeInt32LE(1, 0);
    header.writeInt32LE(encoded.length, 4);
    discordSocket.write(Buffer.concat([header, encoded]));
}

ipcMain.handle('discord-presence-enable', async () => {
    discordRpcEnabled = true;
    const ready = await ensureDiscordRpcClient();
    if (!ready.ok) {
        discordRpcEnabled = false;
        return ready;
    }
    return { ok: true };
});

ipcMain.handle('discord-presence-disable', async () => {
    discordRpcEnabled = false;
    clearDiscordPresence();
    return { ok: true };
});

ipcMain.handle('discord-presence-update', async (_, payload = {}) => {
    try {
        return await setDiscordPresence(payload);
    } catch (error) {
        return { ok: false, error: error.message || 'No fue posible actualizar Discord Rich Presence.' };
    }
});

ipcMain.handle('discord-presence-clear', async () => {
    try {
        clearDiscordPresence();
        return { ok: true };
    } catch (error) {
        return { ok: false, error: error.message || 'No fue posible limpiar la actividad de Discord.' };
    }
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

app.on('before-quit', async () => {
    try {
        if (discordSocket && discordConnected) {
            discordSocket.destroy();
            discordConnected = false;
            discordSocket = null;
        }
    } catch (error) {
        log.warn('No fue posible cerrar Discord RPC limpiamente:', error);
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
