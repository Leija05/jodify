import { usePlayerStore } from '../store/player.store';
import { useSettingsStore } from '../store/settings.store';
import { resolveMediaUrl, throttle } from '../lib/utils';

interface ObsState {
  title: string | null;
  addedBy: string | null;
  cover: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  updatedAt: number;
}

const KEY = 'jodify_obs_overlay_state';
const DEFAULT_BASE = 'http://127.0.0.1:8000/obs-overlay.html';

function currentState(): ObsState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ObsState) : null;
  } catch {
    return null;
  }
}

const persist = throttle(() => {
  const player = usePlayerStore.getState();
  const state: ObsState = {
    title: player.currentSong?.name ?? null,
    addedBy: player.currentSong?.added_by ?? null,
    cover: resolveMediaUrl(player.currentSong?.cover_url ?? player.currentSong?.coverUrl ?? null),
    currentTime: player.currentTime,
    duration: player.duration,
    isPlaying: player.isPlaying,
    updatedAt: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify(state));
}, 1000);

export const obsService = {
  persist,
  currentState,

  baseUrl(): string {
    return useSettingsStore.getState().obsOverlayBaseUrl || DEFAULT_BASE;
  },

  fullUrl(): string {
    return `${this.baseUrl()}?t=${encodeURIComponent(currentState()?.title ?? '')}`;
  },
};
