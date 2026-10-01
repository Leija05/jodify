const { app, BrowserWindow, ipcMain } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
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
const API_URL = (process.env.JODIFY_API_URL || 'https://jodify-backend.onrender.com').replace(/\/+$/, '');

// Evitar throttling de audio y timers cuando la ventana está minimizada o en segundo plano
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Caché en memoria para enlaces directos de audio (evita invocar yt-dlp repetidamente)
const localStreamCache = new Map(); // ytId -> { url: string, expiry: number }

function extractValidYtId(targetOrId) {
  if (!targetOrId) return null;
  const str = String(targetOrId).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  const ytPrefix = str.match(/^yt-([a-zA-Z0-9_-]{11})$/);
  if (ytPrefix) return ytPrefix[1];
  if (str.includes('spotify.com') || str.includes('soundcloud.com')) return null;
  if (!str.includes('youtube.com') && !str.includes('youtu.be')) return null;
  const match = str.match(/(?:watch\?v=|youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function resolveLocalStreamUrl(targetOrId) {
  if (!targetOrId) return Promise.resolve(null);
  const ytId = extractValidYtId(targetOrId);
  if (!ytId) return Promise.resolve(null);

  const cached = localStreamCache.get(ytId);
  if (cached && cached.expiry > Date.now()) {
    return Promise.resolve(cached.url);
  }

  const target = `https://www.youtube.com/watch?v=${ytId}`;
  return new Promise((resolve) => {
    execFile(
      'python',
      [
        '-m',
        'yt_dlp',
        '--get-url',
        '--extractor-args',
        'youtube:player_client=android,web',
        '-f',
        'bestaudio[ext=m4a]/bestaudio/best',
        '--no-warnings',
        '--quiet',
        target,
      ],
      { timeout: 14000 },
      (error, stdout) => {
        if (error || !stdout) {
          console.warn('[main] Python local no disponible o yt_dlp falló, usando stream de backend:', error?.message || error);
          const fallback = `${API_URL}/api/links/stream?url=${encodeURIComponent(target)}`;
          resolve(fallback);
          return;
        }
        const lines = stdout.trim().split(/\r?\n/).filter((l) => l.startsWith('http'));
        const direct = lines[0] || null;
        if (direct) {
          localStreamCache.set(ytId, { url: direct, expiry: Date.now() + 3600 * 1000 });
          resolve(direct);
        } else {
          resolve(`${API_URL}/api/links/stream?url=${encodeURIComponent(target)}`);
        }
      }
    );
  });
}

let appServer = null;
const FIXED_APP_PORT = 8766;

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
      // 1. Endpoint proxy de audio local same-origin (sin restricciones CORS de WebAudio, 100% sonido)
      if (req.url.startsWith('/api/local-stream')) {
        const u = new URL(req.url, 'http://127.0.0.1');
        const ytId = u.searchParams.get('v');
        if (!ytId) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          return res.end('Missing v parameter');
        }

        resolveLocalStreamUrl(ytId).then((streamUrl) => {
          if (!streamUrl) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('Stream not found');
          }

          function proxyTo(targetStreamUrl, redirectCount = 0) {
            if (redirectCount > 4) {
              if (!res.headersSent) res.writeHead(502);
              return res.end();
            }

            try {
              const parsedStream = new URL(targetStreamUrl);
              const isHttps = parsedStream.protocol === 'https:';
              const clientModule = isHttps ? https : http;
              const options = {
                hostname: parsedStream.hostname,
                port: parsedStream.port || (isHttps ? 443 : 80),
                path: parsedStream.pathname + parsedStream.search,
                method: 'GET',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
              };

              if (req.headers.range) {
                options.headers.range = req.headers.range;
              }

              const proxyReq = clientModule.request(options, (proxyRes) => {
                if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                  const nextUrl = new URL(proxyRes.headers.location, targetStreamUrl).toString();
                  return proxyTo(nextUrl, redirectCount + 1);
                }

                const resHeaders = {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Headers': '*',
                  'Content-Type': proxyRes.headers['content-type'] || 'audio/mp4',
                  'Accept-Ranges': 'bytes',
                  'Cache-Control': 'public, max-age=3600',
                };
                if (proxyRes.headers['content-range']) {
                  resHeaders['Content-Range'] = proxyRes.headers['content-range'];
                }
                if (proxyRes.headers['content-length']) {
                  resHeaders['Content-Length'] = proxyRes.headers['content-length'];
                }

                res.writeHead(proxyRes.statusCode || 200, resHeaders);
                proxyRes.pipe(res);
              });

              proxyReq.on('error', (err) => {
                console.warn('[app-server] Error transmitiendo audio proxy:', err.message);
                if (!res.headersSent) res.writeHead(502);
                res.end();
              });

              proxyReq.end();
            } catch (e) {
              console.warn('[app-server] Error creando request de proxy:', e);
              if (!res.headersSent) res.writeHead(500);
              res.end();
            }
          }

          proxyTo(streamUrl);
        }).catch((err) => {
          console.warn('[app-server] Error resolviendo stream:', err);
          if (!res.headersSent) res.writeHead(500);
          res.end();
        });
        return;
      }

      // 1.5 Registro y sincronización instantánea de canciones externas en MongoDB
      if ((req.url === '/api/songs/register' || req.url?.startsWith('/api/songs/register?')) && req.method === 'POST') {
        let bodyData = '';
        req.on('data', (chunk) => { bodyData += chunk; });
        req.on('end', () => {
          const scriptPath = path.join(__dirname, 'scripts', 'register_song.py');
          const py = execFile('python', [scriptPath], { timeout: 8000 }, (error, stdout, stderr) => {
            if (error || !stdout) {
              console.warn('[app-server] Error en register_song.py:', error || stderr);
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Error registrando canción' }));
              }
              return;
            }
            if (!res.headersSent) {
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
              });
              res.end(stdout.trim());
            }
          });
          if (py.stdin) {
            py.stdin.write(bodyData);
            py.stdin.end();
          }
        });
        return;
      }

      // 2. Proxy transparente hacia el backend real (Render / MongoDB) para datos de usuario, perfil, canciones, etc.
      if (req.url.startsWith('/api/') || req.url === '/api' || req.url.startsWith('/songs/')) {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400',
          });
          return res.end();
        }

        try {
          const targetUrl = new URL(req.url, API_URL);
          const reqHeaders = { ...req.headers };
          reqHeaders.host = targetUrl.host;

          const options = {
            hostname: targetUrl.hostname,
            port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
            path: targetUrl.pathname + targetUrl.search,
            method: req.method,
            headers: reqHeaders,
          };

          const clientModule = targetUrl.protocol === 'https:' ? https : http;
          const proxyReq = clientModule.request(options, (proxyRes) => {
            const resHeaders = {
              ...proxyRes.headers,
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
              'Access-Control-Allow-Headers': '*',
            };
            res.writeHead(proxyRes.statusCode || 200, resHeaders);
            proxyRes.pipe(res);
          });

          proxyReq.on('error', (err) => {
            console.warn('[app-server] Error proxying API request to backend:', err.message);
            if (!res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ detail: 'No se pudo conectar con el servidor backend' }));
            }
          });

          req.pipe(proxyReq);
        } catch (e) {
          console.warn('[app-server] Error creando proxy para backend:', e);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ detail: 'Error en proxy de backend' }));
          }
        }
        return;
      }

      // 3. Servir archivos estáticos del frontend
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
      if (err.code === 'EADDRINUSE') {
        console.warn(`[app-server] Puerto ${FIXED_APP_PORT} en uso, probando puerto dinámico...`);
        server.listen(0, '127.0.0.1', () => {
          const port = server.address().port;
          appServer = server;
          console.log(`[app-server] Servidor local de JodiFy activo en http://127.0.0.1:${port}`);
          resolve(`http://127.0.0.1:${port}`);
        });
        return;
      }
      console.warn('[app-server] Error iniciando servidor local:', err);
      reject(err);
    });

    // Fijar puerto en 8766 para que el origen http://127.0.0.1:8766 sea 100% PERSISTENTE
    // y localStorage / sesión / descargas NUNCA se borren al reiniciar
    server.listen(FIXED_APP_PORT, '127.0.0.1', () => {
      appServer = server;
      console.log(`[app-server] Servidor local de JodiFy activo en http://127.0.0.1:${FIXED_APP_PORT}`);
      resolve(`http://127.0.0.1:${FIXED_APP_PORT}`);
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
      additionalArguments: ['--jodify-api-url=/api'],
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

  ipcMain.handle('player:resolve-stream', async (_event, ytUrlOrId) => {
    if (!ytUrlOrId) return null;
    const videoId = extractValidYtId(ytUrlOrId);
    if (!videoId) return null;
    return `/api/local-stream?v=${encodeURIComponent(videoId)}`;
  });

  // ==================== Sesión Persistente a Disco (Electron) ====================
  const sessionFile = path.join(app.getPath('userData'), 'user_session.json');

  ipcMain.handle('auth:get-session', () => {
    try {
      if (fs.existsSync(sessionFile)) {
        return JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      }
    } catch (e) {
      console.warn('[main] Error leyendo user_session.json:', e);
    }
    return null;
  });

  ipcMain.handle('auth:save-session', (_event, sessionData) => {
    try {
      fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.warn('[main] Error guardando user_session.json:', e);
      return false;
    }
  });

  ipcMain.handle('auth:clear-session', () => {
    try {
      if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
      return true;
    } catch (e) {
      return false;
    }
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