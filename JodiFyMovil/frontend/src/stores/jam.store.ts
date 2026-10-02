import { create } from 'zustand';
import { mmkv, STORAGE_KEYS } from '../lib/mmkv';
import type { JamPermissions, JamUser, RecommendationRequest } from '../lib/types';
import { useSettingsStore } from './settings.store';
import { usePlayerStore } from './player.store';

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
  restore: () => void;
}

function getJamClientId(): string {
  let id = mmkv.getString(STORAGE_KEYS.jamClientId);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    mmkv.setString(STORAGE_KEYS.jamClientId, id);
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
    mmkv.setObject(STORAGE_KEYS.jamState, { code, isHost, sessionId, active: true });
    set({ active: true, code, isHost, sessionId });

    const username = useSettingsStore.getState().user?.username ?? 'Invitado';
    import('../services/jam.service').then(({ jamService }) => {
      jamService.connect(code, username, isHost, sessionId);
    });
  },

  stop: () => {
    const { sessionId, isHost } = get();
    mmkv.delete(STORAGE_KEYS.jamState);
    set({ active: false, code: '', isHost: false, sessionId: null, users: [], pendingRecommendations: [] });

    import('../services/jam.service').then(({ jamService }) => {
      jamService.disconnect();
      if (sessionId && isHost) {
        void jamService.closeSession(sessionId);
      }
    });
  },

  setUsers: (users) => set({ users }),
  setPermissions: (permissions) => set({ permissions }),

  addRecommendation: (rec) =>
    set((s) => ({ pendingRecommendations: [rec, ...s.pendingRecommendations].slice(0, 20) })),
  removeRecommendation: (index) =>
    set((s) => ({ pendingRecommendations: s.pendingRecommendations.filter((_, i) => i !== index) })),

  setSyncInProgress: (syncInProgress) => set({ syncInProgress }),
  setLastError: (lastError) => set({ lastError }),

  broadcastQueueAdd: (songId) => {
    if (!get().active || !get().isHost) return;
    import('../services/jam.service').then(({ emitBroadcast }) =>
      emitBroadcast(get().code, 'jam-queue-add', { songId, senderId: get().clientId })
    );
  },

  broadcastQueueRemove: (songId) => {
    if (!get().active || !get().isHost) return;
    import('../services/jam.service').then(({ emitBroadcast }) =>
      emitBroadcast(get().code, 'jam-queue-remove', { songId, senderId: get().clientId })
    );
  },

  broadcastPlaybackChange: (event, time) => {
    const { active, isHost, clientId, syncInProgress } = get();
    if (!active || !isHost || syncInProgress) return;

    import('../services/jam.service').then(({ emitBroadcast, jamService }) => {
      const playerState = usePlayerStore.getState();
      const currentSong = playerState.currentSong;
      if (!currentSong) return;

      const curTime = time ?? playerState.position ?? 0;
      const payload: Record<string, unknown> = {
        senderId: clientId,
        songId: currentSong.id,
        time: curTime,
      };

      if (event === 'play') {
        payload.isPlaying = true;
        emitBroadcast(get().code, 'jam-play', payload);
        if (get().sessionId) {
          void jamService.persistPlaybackState(get().sessionId!, currentSong.id, curTime, true);
        }
      } else if (event === 'pause') {
        payload.isPlaying = false;
        emitBroadcast(get().code, 'jam-pause', payload);
        if (get().sessionId) {
          void jamService.persistPlaybackState(get().sessionId!, currentSong.id, curTime, false);
        }
      } else if (event === 'seek') {
        payload.isPlaying = playerState.isPlaying;
        emitBroadcast(get().code, 'jam-seek', payload);
        if (get().sessionId) {
          void jamService.persistPlaybackState(get().sessionId!, currentSong.id, curTime, playerState.isPlaying);
        }
      }
    });
  },

  broadcastConfig: () => {
    const { active, isHost, clientId, permissions } = get();
    if (!active || !isHost) return;
    import('../services/jam.service').then(({ emitBroadcast }) =>
      emitBroadcast(get().code, 'jam-config', { ...permissions, senderId: clientId })
    );
  },

  maybeRecommendInstead: () => {
    const { active, isHost } = get();
    if (!active || isHost) return;
    import('./ui.store').then(({ useUiStore }) =>
      useUiStore.getState().openSongActions({ id: 'jam-recommend' } as any)
    );
  },

  restore: () => {
    try {
      const raw = mmkv.getObject<{ code: string; isHost: boolean; sessionId: number | string; active: boolean }>(
        STORAGE_KEYS.jamState
      );
      if (raw?.active && raw.code && raw.sessionId) {
        set({ active: true, code: raw.code, isHost: raw.isHost, sessionId: raw.sessionId });
        const username = useSettingsStore.getState().user?.username ?? 'Invitado';
        import('../services/jam.service').then(({ jamService }) => {
          jamService.connect(raw.code, username, raw.isHost, raw.sessionId);
        });
      }
    } catch {
      // ignore
    }
  },
}));