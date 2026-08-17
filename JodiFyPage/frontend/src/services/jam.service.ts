import { API_BASE, api } from '../lib/api';
import { JAM_MEMBERS_POLL_MS, JAM_SESSION_POLL_MS } from '../lib/constants';
import type { JamHistoryEntry, JamMember, JamPermissions, JamSession, JamUser, RecommendationRequest, Song } from '../lib/types';
import { useJamStore } from '../store/jam.store';
import { useQueueStore } from '../store/queue.store';
import { usePlayerStore } from '../store/player.store';
import { useToastStore } from '../store/toast.store';
import { useUiStore } from '../store/ui.store';
import { useLibraryStore } from '../store/library.store';
import { playSong } from './player.service';

let eventSource: EventSource | null = null;
let sessionPollTimer: ReturnType<typeof setInterval> | null = null;
let membersPollTimer: ReturnType<typeof setInterval> | null = null;
let lastJamSongId: number | string | null | undefined = undefined;
let knownHostUsername: string | null = null;

export function generateJamCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export const jamService = {
  async createSession(username: string): Promise<{ code: string; sessionId: number | string }> {
    const result = await api.post<{ code: string; sessionId: string }>('/jam/sessions', { username });
    return { code: result.code, sessionId: result.sessionId };
  },

  async fetchActiveSession(code: string): Promise<JamSession | null> {
    return api.get<JamSession | null>(`/jam/sessions/active?code=${code}`);
  },

  async closeSession(sessionId: number | string): Promise<void> {
    await api.post(`/jam/sessions/${sessionId}/close`).catch(() => undefined);
  },

  async upsertMember(username: string, sessionId: number | string, isHost: boolean): Promise<void> {
    await api.post(`/jam/sessions/${sessionId}/members/upsert`, { username, is_host: isHost }).catch(() => undefined);
  },

  async markMemberInactive(username: string, sessionId: number | string): Promise<void> {
    await api.post(`/jam/sessions/${sessionId}/members/inactive?username=${encodeURIComponent(username)}`).catch(() => undefined);
  },

  async fetchMembers(sessionId: number | string): Promise<JamMember[]> {
    return api.get<JamMember[]>(`/jam/sessions/${sessionId}/members`);
  },

  async fetchSessionState(sessionId: number | string): Promise<JamSession | null> {
    try {
      return await api.get<JamSession>(`/jam/sessions/${sessionId}`);
    } catch {
      return null;
    }
  },

  async fetchHistory(limit = 30): Promise<JamHistoryEntry[]> {
    return api.get<JamHistoryEntry[]>(`/jam/sessions/history?limit=${limit}`);
  },

  async persistPlaybackState(sessionId: number | string, songId: number | string | null, time: number, isPlaying: boolean): Promise<void> {
    await api
      .post(`/jam/sessions/${sessionId}/playback`, { song_id: songId, time: Math.round(time), is_playing: isPlaying })
      .catch(() => undefined);
  },

  connect(_code: string, username: string, isHost: boolean, sessionId: number | string): void {
    this.disconnect();

    knownHostUsername = isHost ? username : knownHostUsername;

    const es = new EventSource(`${API_BASE}/jam/sessions/${sessionId}/events/stream`);
    eventSource = es;

    es.onopen = () => {
      void jamService.upsertMember(username, sessionId, isHost);
      if (!isHost) {
        void syncFromSession(username, sessionId);
      }
    };

    es.onmessage = (ev) => {
      try {
        const message = JSON.parse(ev.data) as { event: string; payload: Record<string, unknown> };
        dispatchJamEvent(message.event, message.payload);
      } catch {
        /* evento inválido, ignorar */
      }
    };

    startMembersPolling(username, sessionId);
    if (!isHost) {
      startSessionPolling(username, sessionId);
    }
  },

  disconnect(): void {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
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
  void api.post(`/jam/sessions/${sessionId}/events`, { event, payload }).catch(() => undefined);
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
      if (!isOwnPayload(payload)) applyJamQueueAdd(payload.songId as number | string);
      break;
    case 'jam-queue-remove':
      if (!isOwnPayload(payload)) applyJamQueueRemove(payload.songId as number | string);
      break;
    default:
      break;
  }
}

function isOwnPayload(payload: Record<string, unknown>): boolean {
  return payload.senderId === useJamStore.getState().clientId;
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
      /* polling es best-effort */
    }
  }, JAM_MEMBERS_POLL_MS);
}

function startSessionPolling(username: string, sessionId: number | string): void {
  if (sessionPollTimer) clearInterval(sessionPollTimer);
  sessionPollTimer = setInterval(() => {
    void syncFromSession(username, sessionId);
  }, JAM_SESSION_POLL_MS);
}

async function syncFromSession(username: string, sessionId: number | string): Promise<void> {
  void username;
  try {
    const session = await jamService.fetchSessionState(sessionId);
    if (!session || !session.is_active) return;
    if (session.current_song_id && session.current_song_id !== lastJamSongId) {
      lastJamSongId = session.current_song_id;
      const library = useLibraryStore.getState();
      const song = library.songs.find((s) => s.id === session.current_song_id);
      if (song) {
        useJamStore.getState().setSyncInProgress(true);
        await playSong(song, { fades: false });
        const audio = document.querySelector('audio#jodify-audio') as HTMLAudioElement | null;
        if (audio) {
          audio.currentTime = session.current_time ?? 0;
          if (session.is_playing) {
            await audio.play().catch(() => undefined);
            usePlayerStore.getState().setIsPlaying(true);
          } else {
            audio.pause();
            usePlayerStore.getState().setIsPlaying(false);
          }
        }
        setTimeout(() => useJamStore.getState().setSyncInProgress(false), 500);
      }
    }
  } catch {
    /* best-effort */
  }
}

function findSong(songId: number | string): Song | undefined {
  return useLibraryStore.getState().songs.find((s) => s.id === songId);
}

async function applyJamSync(payload: Record<string, unknown>): Promise<void> {
  const songId = payload.songId as number | string | null;
  if (songId == null) return;
  const song = findSong(songId);
  if (!song) return;

  const player = usePlayerStore.getState();
  if (String(player.currentSong?.id) === String(songId)) {
    applyJamSeek(payload);
    if (payload.isPlaying) {
      document.querySelector<HTMLAudioElement>('audio#jodify-audio')?.play().catch(() => undefined);
      player.setIsPlaying(true);
    }
    return;
  }

  useJamStore.getState().setSyncInProgress(true);
  await playSong(song, { fades: false });
  const audio = document.querySelector<HTMLAudioElement>('audio#jodify-audio');
  if (audio && typeof payload.time === 'number') audio.currentTime = payload.time;
  if (payload.isPlaying) {
    audio?.play().catch(() => undefined);
    usePlayerStore.getState().setIsPlaying(true);
  }
  setTimeout(() => useJamStore.getState().setSyncInProgress(false), 400);
}

function applyJamPause(payload: Record<string, unknown>): void {
  const songId = payload.songId as number | string | null;
  const player = usePlayerStore.getState();
  if (songId != null && String(player.currentSong?.id) !== String(songId)) return;
  document.querySelector<HTMLAudioElement>('audio#jodify-audio')?.pause();
  player.setIsPlaying(false);
}

function applyJamSeek(payload: Record<string, unknown>): void {
  const songId = payload.songId as number | string | null;
  const player = usePlayerStore.getState();
  if (songId != null && String(player.currentSong?.id) !== String(songId)) return;
  const audio = document.querySelector<HTMLAudioElement>('audio#jodify-audio');
  if (audio && typeof payload.time === 'number') {
    audio.currentTime = payload.time;
    player.setCurrentTime(payload.time);
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

function applyJamQueueAdd(songId: number | string): void {
  const song = findSong(songId);
  if (!song) return;
  useQueueStore.getState().add(song);
}

function applyJamQueueRemove(songId: number | string): void {
  useQueueStore.getState().remove(songId);
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
  useUiStore.getState().open('jamHostRecommendations');
  useToastStore.getState().show(`${rec.username} recomienda «${rec.songName}»`);
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
  useToastStore.getState().show(`«${song.name}» enviada al host`, 'success');
}

export async function resolveHostRecommendation(index: number, action: 'queue' | 'play' | 'reject'): Promise<void> {
  const store = useJamStore.getState();
  const rec = store.pendingRecommendations[index];
  if (!rec) return;
  store.removeRecommendation(index);

  if (action === 'reject') {
    useToastStore.getState().show('Recomendación descartada', 'info');
    return;
  }
  const song = findSong(rec.songId);
  if (!song) {
    useToastStore.getState().show('Canción no encontrada en la biblioteca', 'error');
    return;
  }
  if (action === 'queue') {
    useQueueStore.getState().add(song);
    useToastStore.getState().show(`«${song.name}» agregada a la cola`, 'success');
  } else {
    await playSong(song);
    usePlayerStore.getState().setIsPlaying(true);
    store.broadcastPlaybackChange('play');
  }
}
