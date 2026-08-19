const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

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

// ==================== Auto-update (electron-updater) ====================
// Solo funciona en la app empaquetada (NSIS) con releases en GitHub.
// Flujo: al iniciar se busca la versión en segundo plano, se descarga sola
// y al terminar se pregunta "Actualizar ahora / Después".
// Si elige "Después", la actualización queda lista y se puede instalar
// desde Ajustes > Actualizaciones del renderer.
const updaterState = {
  available: false,
  downloading: false,
  downloaded: false,
  latestVersion: null,
  percent: 0,
  error: null,
};

let pendingInstall = false;

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
    updaterState.percent = 100;
    updaterState.error = null;
    notifyState();
    if (pendingInstall) {
      pendingInstall = false;
      autoUpdater.quitAndInstall();
      return;
    }
    promptInstallNow();
  });

  autoUpdater.on('error', (err) => {
    updaterState.error = err && err.message ? err.message : String(err);
    notifyState();
  });
}

async function promptInstallNow() {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;
  const { response } = await dialog.showMessageBox(win, {
    type: 'info',
    title: 'JodiFy — Actualización disponible',
    message: `Nueva versión ${updaterState.latestVersion} lista`,
    detail: 'La actualización ya se descargó. ¿Querés reiniciar e instalarla ahora?\n\nSi elegís "Después", podés instalarla desde Ajustes > Actualizaciones.',
    buttons: ['Actualizar ahora', 'Después'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });
  if (response === 0) installUpdate();
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
  if (app.isPackaged && !DEV_URL) {
    setupUpdater();
    autoUpdater.checkForUpdates();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});