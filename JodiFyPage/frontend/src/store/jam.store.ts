import { create } from 'zustand';
import type { JamPermissions, JamUser, RecommendationRequest } from '../lib/types';

interface JamState {
  active: boolean;
  code: string;
  isHost: boolean;
  sessionId: number | string | null;
  clientId: string;
  users: JamUser[];
  permissions: JamPermissions;
  pendingRecommendations: RecommendationRequest[];
  syncInProgress: boolean;
  lastError: string | null;

  start: (code: string, isHost: boolean, sessionId: number | string) => void;
  stop: () => void;
  setUsers: (users: JamUser[]) => void;
  setPermissions: (permissions: JamPermissions) => void;
  addRecommendation: (rec: RecommendationRequest) => void;
  removeRecommendation: (index: number) => void;
  setSyncInProgress: (v: boolean) => void;
  setLastError: (e: string | null) => void;

  broadcastQueueAdd: (songId: number | string) => void;
  broadcastQueueRemove: (songId: number | string) => void;
  broadcastPlaybackChange: (event: 'play' | 'pause' | 'seek', time?: number) => void;
  broadcastConfig: () => void;
  maybeRecommendInstead: () => void;
}

const LS_KEY = 'jodify_jam_state';

export function getJamClientId(): string {
  let id = localStorage.getItem('jamClientId');
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem('jamClientId', id);
  }
  return id;
}

export const useJamStore = create<JamState>((set, get) => ({
  active: false,
  code: '',
  isHost: false,
  sessionId: null,
  clientId: getJamClientId(),
  users: [],
  permissions: { allowQueueAdd: true, allowQueueRemove: true, allowPlaybackControl: true },
  pendingRecommendations: [],
  syncInProgress: false,
  lastError: null,

  start: (code, isHost, sessionId) => {
    localStorage.setItem(LS_KEY, JSON.stringify({ code, isHost, sessionId, active: true }));
    set({ active: true, code, isHost, sessionId });
  },

  stop: () => {
    localStorage.removeItem(LS_KEY);
    set({ active: false, code: '', isHost: false, sessionId: null, users: [], pendingRecommendations: [] });
  },

  setUsers: (users) => set({ users }),
  setPermissions: (permissions) => set({ permissions }),

  addRecommendation: (rec) => set((s) => ({ pendingRecommendations: [rec, ...s.pendingRecommendations].slice(0, 20) })),
  removeRecommendation: (index) =>
    set((s) => ({ pendingRecommendations: s.pendingRecommendations.filter((_, i) => i !== index) })),

  setSyncInProgress: (syncInProgress) => set({ syncInProgress }),
  setLastError: (lastError) => set({ lastError }),

  broadcastQueueAdd: (songId) => {
    if (!get().active || !get().isHost) return;
    import('../services/jam.service').then(({ emitBroadcast }) =>
      emitBroadcast(get().code, 'jam-queue-add', { songId, senderId: get().clientId }),
    );
  },

  broadcastQueueRemove: (songId) => {
    if (!get().active || !get().isHost) return;
    import('../services/jam.service').then(({ emitBroadcast }) =>
      emitBroadcast(get().code, 'jam-queue-remove', { songId, senderId: get().clientId }),
    );
  },

  broadcastPlaybackChange: (event, time) => {
    const { active, isHost, clientId, syncInProgress } = get();
    if (!active || !isHost || syncInProgress) return;
    import('../services/jam.service').then(({ emitBroadcast }) => {
      const payload: Record<string, unknown> = { senderId: clientId };
      const audio = document.querySelector('audio#jodify-audio') as HTMLAudioElement | null;
      void getPlayerSongId().then((songId) => {
        payload.songId = songId;
        if (event === 'play') {
          payload.time = audio?.currentTime ?? 0;
          emitBroadcast(get().code, 'jam-play', payload);
        } else if (event === 'pause') {
          payload.time = audio?.currentTime ?? 0;
          emitBroadcast(get().code, 'jam-pause', payload);
        } else if (event === 'seek') {
          payload.time = time ?? audio?.currentTime ?? 0;
          emitBroadcast(get().code, 'jam-seek', payload);
        }
      });
    });
  },

  broadcastConfig: () => {
    const { active, isHost, clientId, permissions } = get();
    if (!active || !isHost) return;
    import('../services/jam.service').then(({ emitBroadcast }) =>
      emitBroadcast(get().code, 'jam-config', { ...permissions, senderId: clientId }),
    );
  },

  maybeRecommendInstead: () => {
    const { active, isHost } = get();
    if (!active || isHost) return;
    import('../store/ui.store').then(({ useUiStore }) => useUiStore.getState().open('jamRecommend'));
  },
}));

async function getPlayerSongId(): Promise<number | string | null> {
  const { usePlayerStore } = await import('./player.store');
  return usePlayerStore.getState().currentSong?.id ?? null;
}

export function restoreJamState(): { code: string; isHost: boolean; sessionId: number | string | null } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { code: string; isHost: boolean; sessionId: number | string | null; active: boolean };
    if (!parsed.active || !parsed.code) return null;
    return { code: parsed.code, isHost: parsed.isHost, sessionId: parsed.sessionId };
  } catch {
    return null;
  }
}
