import { API_BASE } from '../lib/constants';
import type { JamHistoryEntry, JamMember, JamPermissions, JamSession, JamUser, RecommendationRequest, Song } from '../lib/types';
import { useJamStore } from '../stores/jam.store';
import { usePlayerStore } from '../stores/player.store';
import { useLibraryStore } from '../stores/library.store';
import { useToastStore } from '../stores/toast.store';
import { fetchSong } from './songs.service';
import { apiFetch } from './api';

const JAM_MEMBERS_POLL_MS = 5000;
const JAM_SESSION_POLL_MS = 3000;

let streamXhr: XMLHttpRequest | null = null;
let sessionPollTimer: ReturnType<typeof setInterval> | null = null;
let membersPollTimer: ReturnType<typeof setInterval> | null = null;
let lastJamSongId: number | string | null | undefined = undefined;
let knownHostUsername: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isConnected = false;

export function generateJamCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export const jamService = {
  async createSession(username: string): Promise<{ code: string; sessionId: string }> {
    const result = await apiFetch<{ code: string; sessionId: string }>('/api/jam/sessions', {
      method: 'POST',
      body: { username },
    });
    return { code: result.code, sessionId: String(result.sessionId) };
  },

  async fetchActiveSession(code: string): Promise<JamSession | null> {
    try {
      const res = await apiFetch<JamSession | null>(`/api/jam/sessions/active?code=${encodeURIComponent(code)}`);
      return res;
    } catch {
      return null;
    }
  },

  async closeSession(sessionId: number | string): Promise<void> {
    await apiFetch(`/api/jam/sessions/${sessionId}/close`, { method: 'POST' }).catch(() => undefined);
  },

  async upsertMember(username: string, sessionId: number | string, isHost: boolean): Promise<void> {
    await apiFetch(`/api/jam/sessions/${sessionId}/members/upsert`, {
      method: 'POST',
      body: { username, is_host: isHost },
    }).catch(() => undefined);
  },

  async markMemberInactive(username: string, sessionId: number | string): Promise<void> {
    await apiFetch(`/api/jam/sessions/${sessionId}/members/inactive?username=${encodeURIComponent(username)}`, {
      method: 'POST',
    }).catch(() => undefined);
  },

  async fetchMembers(sessionId: number | string): Promise<JamMember[]> {
    return apiFetch<JamMember[]>(`/api/jam/sessions/${sessionId}/members`).catch(() => []);
  },

  async fetchSessionState(sessionId: number | string): Promise<JamSession | null> {
    try {
      return await apiFetch<JamSession>(`/api/jam/sessions/${sessionId}`);
    } catch {
      return null;
    }
  },

  async fetchHistory(limit = 30): Promise<JamHistoryEntry[]> {
    return apiFetch<JamHistoryEntry[]>(`/api/jam/sessions/history?limit=${limit}`).catch(() => []);
  },

  async persistPlaybackState(
    sessionId: number | string,
    songId: number | string | null,
    time: number,
    isPlaying: boolean
  ): Promise<void> {
    await apiFetch(`/api/jam/sessions/${sessionId}/playback`, {
      method: 'POST',
      body: { song_id: songId, time: Math.round(time), is_playing: isPlaying },
    }).catch(() => undefined);
  },

  connect(code: string, username: string, isHost: boolean, sessionId: number | string): void {
    this.disconnect();

    isConnected = true;
    knownHostUsername = isHost ? username : knownHostUsername;

    startEventStream(code, username, isHost, sessionId);
    void this.upsertMember(username, sessionId, isHost);
    startMembersPolling(username, sessionId);

    if (!isHost) {
      void syncFromSession(username, sessionId);
      startSessionPolling(username, sessionId);
    }
  },

  disconnect(): void {
    isConnected = false;
    if (streamXhr) {
      try {
        streamXhr.abort();
      } catch {}
      streamXhr = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (sessionPollTimer) clearInterval(sessionPollTimer);
    if (membersPollTimer) clearInterval(membersPollTimer);
    sessionPollTimer = null;
    membersPollTimer = null;
    lastJamSongId = undefined;
    knownHostUsername = null;
  },
};

export function emitBroadcast(_code: string, event: string, payload: Record<string, unknown>): void {
  const sessionId = useJamStore.getState().sessionId;
  if (!sessionId) return;
  void apiFetch<void>(`/api/jam/sessions/${sessionId}/events`, {
    method: 'POST',
    body: { event, payload },
  }).catch(() => undefined);
}

function startEventStream(code: string, username: string, isHost: boolean, sessionId: number | string): void {
  if (!isConnected) return;

  const base = (API_BASE || 'https://jodify-backend.onrender.com').replace(/\/+$/, '');
  const url = `${base}/api/jam/sessions/${sessionId}/events/stream`;

  const xhr = new XMLHttpRequest();
  streamXhr = xhr;
  let seenLength = 0;

  xhr.open('GET', url, true);
  xhr.setRequestHeader('Accept', 'text/event-stream');

  xhr.onprogress = () => {
    try {
      const newText = xhr.responseText.slice(seenLength);
      seenLength = xhr.responseText.length;

      const lines = newText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(5).trim();
          if (jsonStr) {
            try {
              const msg = JSON.parse(jsonStr) as { event: string; payload: Record<string, unknown> };
              dispatchJamEvent(msg.event, msg.payload);
            } catch {
              // ignore invalid frame
            }
          }
        }
      }
    } catch {
      // best-effort
    }
  };

  xhr.onload = () => {
    if (isConnected) {
      reconnectTimer = setTimeout(() => startEventStream(code, username, isHost, sessionId), 2000);
    }
  };

  xhr.onerror = () => {
    if (isConnected) {
      reconnectTimer = setTimeout(() => startEventStream(code, username, isHost, sessionId), 3000);
    }
  };

  xhr.send();
}

async function resolveSong(songId: number | string): Promise<Song | null> {
  const lib = useLibraryStore.getState();
  const existing = lib.songs.find((s) => String(s.id) === String(songId));
  if (existing) return existing;
  try {
    const fetched = await fetchSong(songId);
    if (fetched) {
      useLibraryStore.setState((s) => ({
        songs: [fetched, ...s.songs.filter((x) => String(x.id) !== String(fetched.id))],
      }));
      return fetched;
    }
  } catch {
    // ignore
  }
  return null;
}

function isOwnPayload(payload: Record<string, unknown>): boolean {
  return payload.senderId === useJamStore.getState().clientId;
}

function dispatchJamEvent(event: string, payload: Record<string, unknown>): void {
  switch (event) {
    case 'jam-play':
      if (!isOwnPayload(payload)) void applyJamSync(payload);
      break;
    case 'jam-pause':
      if (!isOwnPayload(payload)) applyJamPause(payload);
      break;
    case 'jam-seek':
      if (!isOwnPayload(payload)) applyJamSeek(payload);
      break;
    case 'jam-config':
      applyJamConfig(payload);
      break;
    case 'jam-recommend-request':
      applyRecommendationRequest(payload);
      break;
    case 'jam-queue-add':
      if (!isOwnPayload(payload)) void applyJamQueueAdd(payload.songId as number | string);
      break;
    case 'jam-queue-remove':
      if (!isOwnPayload(payload)) applyJamQueueRemove(payload.songId as number | string);
      break;
    default:
      break;
  }
}

async function applyJamSync(payload: Record<string, unknown>): Promise<void> {
  const songId = payload.songId as number | string | null;
  if (songId == null) return;
  const song = await resolveSong(songId);
  if (!song) return;

  const player = usePlayerStore.getState();
  if (String(player.currentSong?.id) === String(songId)) {
    if (typeof payload.time === 'number') {
      player.seek(payload.time);
    }
    if (payload.isPlaying) {
      player.play();
    }
    return;
  }

  useJamStore.getState().setSyncInProgress(true);
  player.playSong(song);
  if (typeof payload.time === 'number' && payload.time > 0) {
    setTimeout(() => {
      usePlayerStore.getState().seek(Number(payload.time));
      if (!payload.isPlaying) {
        usePlayerStore.getState().pause();
      }
    }, 200);
  }
  setTimeout(() => useJamStore.getState().setSyncInProgress(false), 500);
}

function applyJamPause(payload: Record<string, unknown>): void {
  const songId = payload.songId as number | string | null;
  const player = usePlayerStore.getState();
  if (songId != null && String(player.currentSong?.id) !== String(songId)) return;
  player.pause();
}

function applyJamSeek(payload: Record<string, unknown>): void {
  const songId = payload.songId as number | string | null;
  const player = usePlayerStore.getState();
  if (songId != null && String(player.currentSong?.id) !== String(songId)) return;
  if (typeof payload.time === 'number') {
    player.seek(payload.time);
  }
}

function applyJamConfig(payload: Record<string, unknown>): void {
  const permissions: JamPermissions = {
    allowQueueAdd: payload.allowQueueAdd !== false,
    allowQueueRemove: payload.allowQueueRemove !== false,
    allowPlaybackControl: payload.allowPlaybackControl !== false,
  };
  useJamStore.getState().setPermissions(permissions);
}

function applyRecommendationRequest(payload: Record<string, unknown>): void {
  const store = useJamStore.getState();
  if (!store.active || !store.isHost) return;
  const rec: RecommendationRequest = {
    songId: payload.songId as number | string,
    songName: String(payload.songName ?? ''),
    username: String(payload.username ?? 'Invitado'),
    timestamp: Date.now(),
  };
  store.addRecommendation(rec);
  useToastStore.getState().show(`${rec.username} recomienda «${rec.songName}»`);
}

async function applyJamQueueAdd(songId: number | string): Promise<void> {
  const song = await resolveSong(songId);
  if (!song) return;
  usePlayerStore.getState().addToQueue(song);
}

function applyJamQueueRemove(songId: number | string): void {
  usePlayerStore.getState().removeFromQueue(songId);
}

function startMembersPolling(username: string, sessionId: number | string): void {
  if (membersPollTimer) clearInterval(membersPollTimer);
  membersPollTimer = setInterval(async () => {
    try {
      const members = await jamService.fetchMembers(sessionId);
      const map = new Map<string, JamUser>();
      if (knownHostUsername) map.set(knownHostUsername.toLowerCase(), { username: knownHostUsername, isHost: true });
      for (const m of members) {
        map.set(m.username.toLowerCase(), { username: m.username, isHost: m.is_host || m.username === knownHostUsername });
      }
      const own = useJamStore.getState();
      map.set(username.toLowerCase(), { username, isHost: own.isHost });
      const sorted = [...map.values()].sort((a, b) => {
        if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
        return a.username.localeCompare(b.username, 'es');
      });
      own.setUsers(sorted);
      void jamService.upsertMember(username, sessionId, own.isHost);
    } catch {
      // polling es best-effort
    }
  }, JAM_MEMBERS_POLL_MS);
}

function startSessionPolling(username: string, sessionId: number | string): void {
  if (sessionPollTimer) clearInterval(sessionPollTimer);
  sessionPollTimer = setInterval(() => {
    void syncFromSession(username, sessionId);
  }, JAM_SESSION_POLL_MS);
}

async function syncFromSession(_username: string, sessionId: number | string): Promise<void> {
  try {
    const session = await jamService.fetchSessionState(sessionId);
    if (!session || !session.is_active) return;
    if (session.current_song_id && session.current_song_id !== lastJamSongId) {
      lastJamSongId = session.current_song_id;
      const song = await resolveSong(session.current_song_id);
      if (song) {
        useJamStore.getState().setSyncInProgress(true);
        const player = usePlayerStore.getState();
        player.playSong(song);
        if (session.current_time && session.current_time > 0) {
          setTimeout(() => {
            usePlayerStore.getState().seek(Number(session.current_time) || 0);
            if (!session.is_playing) {
              usePlayerStore.getState().pause();
            }
          }, 300);
        } else if (!session.is_playing) {
          setTimeout(() => usePlayerStore.getState().pause(), 300);
        }
        setTimeout(() => useJamStore.getState().setSyncInProgress(false), 600);
      }
    }
  } catch {
    // best-effort
  }
}

export async function sendRecommendation(song: Song, username: string): Promise<void> {
  const store = useJamStore.getState();
  if (!store.active) return;
  emitBroadcast(store.code, 'jam-recommend-request', {
    songId: song.id,
    songName: song.name,
    username,
    senderId: store.clientId,
  });
  useToastStore.getState().show(`«${song.name}» enviada al host`);
}

export async function resolveHostRecommendation(index: number, action: 'queue' | 'play' | 'reject'): Promise<void> {
  const store = useJamStore.getState();
  const rec = store.pendingRecommendations[index];
  if (!rec) return;
  store.removeRecommendation(index);

  if (action === 'reject') {
    useToastStore.getState().show('Recomendación descartada');
    return;
  }
  const song = await resolveSong(rec.songId);
  if (!song) {
    useToastStore.getState().show('Canción no encontrada');
    return;
  }
  if (action === 'queue') {
    usePlayerStore.getState().addToQueue(song);
    store.broadcastQueueAdd(song.id);
    useToastStore.getState().show(`«${song.name}» agregada a la cola`);
  } else {
    usePlayerStore.getState().playSong(song);
    store.broadcastPlaybackChange('play');
  }
}