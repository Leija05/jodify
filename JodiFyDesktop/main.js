const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { createTaskbarIcons } = require('./taskbar-icons');

// ---- Cargador minimalista de .env (sin dependencias) ----
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    let key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, '.env'));

const DEV_URL = process.env.JODIFY_DEV_URL;
const API_URL = process.env.JODIFY_API_URL || '';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: '#050505',
    title: 'JodiFy — Free Music For Friends',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      additionalArguments: [`--jodify-api-url=${API_URL}`],
    },
  });

  if (DEV_URL) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, 'dist-electron', 'index.html'));
  }

  if (process.env.JODIFY_DEBUG === '1') {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  return win;
}

// ==================== Thumbar buttons (Windows, barra de tarea) ====================
// Al hacer hover sobre el icono de la app en la barra de tarea aparecen los
// controles de reproducción: anterior, reproducir/pausa, siguiente y me gusta.
// El renderer avisa el estado (reproduciendo / hay canción) vía IPC y el main
// actualiza los botones (icono play/pausa y disabled sin canción).
const thumbIcons = process.platform === 'win32' ? createTaskbarIcons() : null;
let playerStatus = { playing: false, hasTrack: false };

function sendPlayerControl(action) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('player:control', { action });
  }
}

function updateThumbar() {
  if (!thumbIcons) return;
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;
  const flags = playerStatus.hasTrack ? [] : ['disabled'];
  const playIcon = playerStatus.playing ? thumbIcons.pause : thumbIcons.play;
  win.setThumbarButtons([
    { tooltip: 'Anterior', icon: thumbIcons.prev, flags, click: () => sendPlayerControl('prev') },
    {
      tooltip: playerStatus.playing ? 'Pausa' : 'Reproducir',
      icon: playIcon,
      flags,
      click: () => sendPlayerControl('toggle'),
    },
    { tooltip: 'Siguiente', icon: thumbIcons.next, flags, click: () => sendPlayerControl('next') },
    { tooltip: 'Me gusta', icon: thumbIcons.heart, flags, click: () => sendPlayerControl('like') },
  ]);
}

function registerPlayerIpc() {
  ipcMain.on('player:state', (_event, state) => {
    playerStatus = { playing: !!state?.playing, hasTrack: !!state?.hasTrack };
    updateThumbar();
  });
}

// ==================== Auto-update (electron-updater) ====================
// Solo funciona en la app empaquetada (NSIS) con releases en GitHub.
// Flujo: al iniciar se busca la versión en segundo plano, se descarga sola
// y el renderer muestra un modal con "Actualizar ahora / Después".
// Si elige "Después", la actualización queda lista y se puede instalar
// desde Ajustes > Actualizaciones o reabriendo el modal.
const updaterState = {
  available: false,
  downloading: false,
  downloaded: false,
  latestVersion: null,
  notes: '',
  percent: 0,
  error: null,
};

let pendingInstall = false;

function extractNotes(info) {
  if (!info) return '';
  if (typeof info.releaseNotes === 'string') return info.releaseNotes;
  if (Array.isArray(info.releaseNotes)) {
    return info.releaseNotes.map((n) => n.note || '').filter(Boolean).join('\n');
  }
  return info.releaseName || '';
}

function sendToRenderer(payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updater:event', payload);
  }
}

function notifyState(extra = {}) {
  sendToRenderer({ type: 'state', state: { ...updaterState, ...extra } });
}

function setupUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  autoUpdater.on('checking-for-update', () => {
    notifyState({ downloading: false });
  });

  autoUpdater.on('update-available', (info) => {
    updaterState.available = true;
    updaterState.downloading = true;
    updaterState.downloaded = false;
    updaterState.latestVersion = info.version;
    updaterState.notes = extractNotes(info);
    updaterState.error = null;
    notifyState();
  });

  autoUpdater.on('update-not-available', () => {
    updaterState.available = false;
    updaterState.downloading = false;
    updaterState.downloaded = false;
    updaterState.error = null;
    notifyState();
  });

  autoUpdater.on('download-progress', (progress) => {
    updaterState.percent = Math.round(progress.percent);
    notifyState();
  });

  autoUpdater.on('update-downloaded', (info) => {
    updaterState.available = true;
    updaterState.downloading = false;
    updaterState.downloaded = true;
    updaterState.latestVersion = info.version;
    updaterState.notes = extractNotes(info);
    updaterState.percent = 100;
    updaterState.error = null;
    notifyState();
    if (pendingInstall) {
      pendingInstall = false;
      autoUpdater.quitAndInstall();
      return;
    }
  });

  autoUpdater.on('error', (err) => {
    updaterState.error = err && err.message ? err.message : String(err);
    notifyState();
  });
}

function installUpdate() {
  if (updaterState.downloaded) {
    autoUpdater.quitAndInstall();
  } else if (updaterState.available && updaterState.downloading) {
    // Aún descargando: instalar apenas termine.
    pendingInstall = true;
  } else {
    autoUpdater.checkForUpdates();
  }
}

function registerUpdaterIpc() {
  ipcMain.handle('updater:check', () => {
    return autoUpdater.checkForUpdates();
  });

  ipcMain.handle('updater:install', () => {
    installUpdate();
  });

  ipcMain.handle('updater:get-state', () => ({
    version: app.getVersion(),
    state: updaterState,
  }));
}

app.whenReady().then(() => {
  createWindow();

  registerUpdaterIpc();
  registerPlayerIpc();
  updateThumbar();
  if (app.isPackaged && !DEV_URL) {
    setupUpdater();
    autoUpdater.checkForUpdates();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      updateThumbar();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});