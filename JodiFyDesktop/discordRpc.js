/**
 * JodiFy Native Discord Rich Presence Client for Electron
 * Direct Discord IPC implementation via local named pipes / domain sockets.
 * Zero external dependencies, ultra-lightweight, 100% resilient.
 */

const net = require('net');
const path = require('path');
const os = require('os');
const fs = require('fs');

const CLIENT_ID = '1342678901234567890'; // JodiFy Discord Application ID

class DiscordRpcClient {
  constructor(clientId = CLIENT_ID) {
    this.clientId = clientId;
    this.socket = null;
    this.connected = false;
    this.currentActivity = null;
    this.reconnectTimer = null;
    this.connecting = false;
  }

  getSocketPath(index = 0) {
    if (process.platform === 'win32') {
      return `\\\\?\\pipe\\discord-ipc-${index}`;
    }
    const env = process.env;
    const prefix = env.XDG_RUNTIME_DIR || env.TMPDIR || env.TMP || env.TEMP || '/tmp';
    return path.join(prefix, `discord-ipc-${index}`);
  }

  connect() {
    if (this.connected || this.connecting) return;
    this.connecting = true;

    const trySocketIndex = (idx) => {
      if (idx > 3) {
        this.connecting = false;
        this.scheduleReconnect();
        return;
      }

      const socketPath = this.getSocketPath(idx);
      const sock = net.createConnection(socketPath);

      sock.once('connect', () => {
        this.socket = sock;
        this.connected = true;
        this.connecting = false;
        console.log(`[discord-rpc] Conectado a Discord local en ${socketPath}`);
        this.sendHandshake();
        if (this.currentActivity) {
          this.setActivity(this.currentActivity);
        }
      });

      sock.once('error', () => {
        sock.destroy();
        trySocketIndex(idx + 1);
      });

      sock.once('close', () => {
        this.connected = false;
        this.socket = null;
        this.connecting = false;
        this.scheduleReconnect();
      });
    };

    trySocketIndex(0);
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 15000);
  }

  sendPacket(op, data) {
    if (!this.socket || !this.connected) return;
    try {
      const payload = Buffer.from(JSON.stringify(data), 'utf8');
      const header = Buffer.alloc(8);
      header.writeInt32LE(op, 0);
      header.writeInt32LE(payload.length, 4);
      this.socket.write(Buffer.concat([header, payload]));
    } catch (e) {
      console.warn('[discord-rpc] Error enviando paquete:', e.message);
    }
  }

  sendHandshake() {
    this.sendPacket(0, {
      v: 1,
      client_id: this.clientId,
    });
  }

  /**
   * Updates current user status on Discord.
   */
  setPlaybackActivity(state) {
    if (!state || !state.hasTrack || !state.title) {
      this.clearActivity();
      return;
    }

    const isPlaying = !!state.playing;
    const title = String(state.title || 'Música').slice(0, 128);
    const artist = String(state.artist || 'JodiFy').slice(0, 128);
    const duration = Number(state.duration) || 0;
    const currentTime = Number(state.currentTime) || 0;

    const timestamps = {};
    if (isPlaying && duration > 0) {
      const now = Date.now();
      timestamps.start = Math.floor(now - currentTime * 1000);
      timestamps.end = Math.floor(now + (duration - currentTime) * 1000);
    }

    const activity = {
      details: title,
      state: `de ${artist}`,
      assets: {
        large_image: state.cover && state.cover.startsWith('http') ? state.cover : 'jodify_icon',
        large_text: state.album ? `${state.album} • JodiFy` : 'JodiFy — Free Music For Friends',
        small_image: isPlaying ? 'play_icon' : 'pause_icon',
        small_text: isPlaying ? 'Reproduciendo' : 'En pausa',
      },
      buttons: [
        { label: 'Escuchar en JodiFy', url: 'https://jodify.app' }
      ]
    };

    if (timestamps.start && timestamps.end) {
      activity.timestamps = timestamps;
    }

    // Si hay código de sala Jam activa, añadir botón de unirse a la sesión
    if (state.jamCode) {
      activity.buttons.unshift({
        label: `Unirse al Jam (${state.jamCode})`,
        url: `https://jodify.app/?jam=${encodeURIComponent(state.jamCode)}`,
      });
    }

    this.setActivity(activity);
  }

  setActivity(activity) {
    this.currentActivity = activity;
    if (!this.connected) {
      this.connect();
      return;
    }

    const payload = {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity,
      },
      nonce: Math.random().toString(36).slice(2),
    };

    this.sendPacket(1, payload);
  }

  clearActivity() {
    this.currentActivity = null;
    if (!this.connected) return;

    this.sendPacket(1, {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity: null,
      },
      nonce: Math.random().toString(36).slice(2),
    });
  }

  destroy() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      try {
        this.clearActivity();
        this.socket.destroy();
      } catch {}
      this.socket = null;
    }
    this.connected = false;
  }
}

const discordRpc = new DiscordRpcClient();

module.exports = {
  discordRpc,
  DiscordRpcClient,
};
