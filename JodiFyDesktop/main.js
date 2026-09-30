const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
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

// Evitar throttling de audio y timers cuando la ventana está minimizada o en segundo plano
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let appServer = null;

function startAppServer() {
  if (appServer && appServer.listening) {
    return Promise.resolve(`http://127.0.0.1:${appServer.address().port}`);
  }

  const distDir = path.join(__dirname, 'dist-electron');
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.webmanifest': 'application/manifest+json',
  };

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURI((req.url || '/').split('?')[0]);
      if (reqPath === '/' || !reqPath) reqPath = '/index.html';
      let filePath = path.join(distDir, reqPath);

      if (!filePath.startsWith(distDir)) {
        res.writeHead(403);
        return res.end();
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (!fs.existsSync(filePath)) {
        filePath = path.join(distDir, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(filePath).pipe(res);
    });

    server.on('error', (err) => {
      console.warn('[app-server] Error iniciando servidor local:', err);
      reject(err);
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      appServer = server;
      console.log(`[app-server] Servidor local de JodiFy activo en http://127.0.0.1:${port}`);
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}

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
      sandbox: false,
      spellcheck: false,
      backgroundThrottling: false, // CRÍTICO: Mantiene la reproducción fluida en segundo plano y minimizada
      additionalArguments: [`--jodify-api-url=${API_URL}`],
    },
  });

  if (DEV_URL) {
    win.loadURL(DEV_URL);
  } else {
    startAppServer().then((localUrl) => {
      win.loadURL(`${localUrl}/index.html`);
    }).catch(() => {
      win.loadFile(path.join(__dirname, 'dist-electron', 'index.html'));
    });
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
let playerStatus = { playing: false, hasTrack: false, liked: false };

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
  const heartIcon = playerStatus.liked ? thumbIcons.heart : (thumbIcons.heartOutline || thumbIcons.heart);
  const heartTooltip = playerStatus.liked ? 'Quitar de Me gusta' : 'Añadir a Me gusta';
  win.setThumbarButtons([
    { tooltip: 'Anterior', icon: thumbIcons.prev, flags, click: () => sendPlayerControl('prev') },
    {
      tooltip: playerStatus.playing ? 'Pausa' : 'Reproducir',
      icon: playIcon,
      flags,
      click: () => sendPlayerControl('toggle'),
    },
    { tooltip: 'Siguiente', icon: thumbIcons.next, flags, click: () => sendPlayerControl('next') },
    { tooltip: heartTooltip, icon: heartIcon, flags, click: () => sendPlayerControl('like') },
  ]);
}

let currentObsState = {
  title: null,
  artist: null,
  album: null,
  addedBy: null,
  cover: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
};

function startObsServer() {
  const port = 8765;
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://127.0.0.1:${port}`);
    const pathname = parsedUrl.pathname;

    if (pathname === '/api/current') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(currentObsState));
      return;
    }

    if (pathname === '/' || pathname === '/obs-overlay.html') {
      const htmlPath = path.join(__dirname, 'dist-electron', 'obs-overlay.html');
      if (fs.existsSync(htmlPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(htmlPath).pipe(res);
        return;
      }
    }

    const filePath = path.join(__dirname, 'dist-electron', pathname.replace(/^\/+/, ''));
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.ico': 'image/x-icon',
        '.svg': 'image/svg+xml',
        '.css': 'text/css',
        '.js': 'text/javascript',
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  server.on('error', (err) => {
    console.warn('[obs-server] No se pudo iniciar en puerto', port, err.message);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`[obs-server] Servidor de overlay activo en http://127.0.0.1:${port}/obs-overlay.html`);
  });
}

function registerPlayerIpc() {
  ipcMain.on('player:state', (_event, state) => {
    playerStatus = {
      playing: !!state?.playing,
      hasTrack: !!state?.hasTrack,
      liked: !!state?.liked,
    };
    if (state) {
      currentObsState = {
        title: state.title ?? null,
        artist: state.artist ?? null,
        album: state.album ?? null,
        addedBy: state.addedBy ?? null,
        cover: state.cover ?? null,
        currentTime: state.currentTime ?? 0,
        duration: state.duration ?? 0,
        isPlaying: !!state.playing,
      };
    }
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

  startObsServer();
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

app.on('will-quit', () => {
  if (appServer) {
    try { appServer.close(); } catch {}
  }
});