import { usePlayerStore } from '../store/player.store';
import { useSettingsStore } from '../store/settings.store';
import { resolveMediaUrl, songArtistMeta, throttle } from '../lib/utils';

export interface ObsState {
  title: string | null;
  artist: string | null;
  album: string | null;
  addedBy: string | null;
  cover: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  updatedAt: number;
}

const KEY = 'jodify_obs_overlay_state';

let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('jodify_obs_channel');
  }
} catch {
  channel = null;
}

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
  const song = player.currentSong;
  const state: ObsState = {
    title: song?.name ?? null,
    artist: songArtistMeta(song),
    album: song?.album ?? null,
    addedBy: song?.added_by ?? null,
    cover: resolveMediaUrl(song?.cover_url ?? null),
    currentTime: player.currentTime,
    duration: player.duration,
    isPlaying: player.isPlaying,
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    channel?.postMessage(state);
  } catch {
    /* non-blocking */
  }
}, 500);

export const obsService = {
  persist,
  currentState,

  baseUrl(): string {
    const custom = useSettingsStore.getState().obsOverlayBaseUrl;
    if (custom) return custom;
    if (typeof window !== 'undefined' && window.jodifyUpdater?.isDesktop) {
      return 'http://127.0.0.1:8765/obs-overlay.html';
    }
    if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')) {
      return `${window.location.origin}/obs-overlay.html`;
    }
    return 'http://127.0.0.1:8765/obs-overlay.html';
  },

  fullUrl(theme?: string): string {
    const base = this.baseUrl();
    const query = new URLSearchParams();
    if (theme && theme !== 'default') query.set('theme', theme);
    const queryString = query.toString();
    return queryString ? `${base}?${queryString}` : base;
  },
};
