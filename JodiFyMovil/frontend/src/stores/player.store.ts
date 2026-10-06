import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { RepeatMode, Song } from '../lib/types';
import { API_BASE } from '../lib/constants';
import { getActiveApiBase, getCandidateBases, setActiveApiBase } from '../services/api';
import { shuffleArray } from '../lib/utils';
import { activateLockScreenForSong, syncLockScreen } from '../services/lockscreen.service';
import { ensurePlayerWithSource, getPlayer, onPlayerStatus, releasePlayer } from './audio';
import { useEqStore } from './eq.store';
import { applyNative, enableEqualizer, applyBassBoost, applyVirtualizer } from '../services/equalizer.service';
import { recordHistory } from '../services/history.service';
import { useSettingsStore } from './settings.store';

interface PlayerState {
  queue: Song[];
  queueIndex: number;
  currentSong: Song | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  isBuffering: boolean;
  error: string | null;
  shuffle: boolean;
  repeat: RepeatMode;
  order: number[];

  playSong: (song: Song, queue?: Song[]) => void;
  playQueue: (queue: Song[], startIndex?: number) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setProgress: (position: number, duration: number) => void;
  setPlaying: (playing: boolean) => void;
  setBuffering: (buffering: boolean) => void;
  setError: (error: string | null) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (song: Song) => void;
  playNext: (song: Song) => void;
  removeFromQueue: (songId: number | string) => void;
  clearQueue: () => void;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let historyRecordedForSong: string | null = null;

export function extractYoutubeId(song: Song | null | undefined): string | null {
  if (!song) return null;
  if (song.youtube_id && /^[a-zA-Z0-9_-]{11}$/.test(song.youtube_id)) {
    return song.youtube_id;
  }
  const idMatch = String(song.id || '').match(/^yt-([a-zA-Z0-9_-]{11})$/);
  if (idMatch && idMatch[1]) return idMatch[1];

  const fullText = decodeURIComponent(`${song.url || ''} ${String(song.id || '')}`);
  if (fullText.includes('spotify.com') || fullText.includes('soundcloud.com')) {
    return null;
  }
  if (!fullText.includes('youtube.com') && !fullText.includes('youtu.be')) {
    return null;
  }
  const match = fullText.match(/(?:watch\?v=|youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
  return match && match[1] ? match[1] : null;
}

function sanitizeStreamUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.includes(' ')) {
    return encodeURI(url);
  }
  return url;
}

async function matchTrackToYoutubeId(artist: string, title: string, excludeId?: string | null): Promise<string | null> {
  const bases = getCandidateBases();
  for (const base of bases) {
    try {
      const excludeParam = excludeId ? `&exclude_id=${encodeURIComponent(excludeId)}` : '';
      const url = `${base}/api/links/match-track?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}${excludeParam}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as { youtube_id?: string };
        if (data?.youtube_id && data.youtube_id !== excludeId) return data.youtube_id;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function resolveSource(song: Song, baseOverride?: string, ignoreLocal = false): string | null {
  if (!ignoreLocal && song.localUri) return song.localUri;
  const rawUrl = (song.url || song.stream_url || '').trim();
  const base = (baseOverride || getActiveApiBase() || API_BASE || 'https://jodify-backend.onrender.com').replace(/\/+$/, '');

  // 1. If song explicitly points to backend audio (/songs/... or /api/songs/...)
  if (
    rawUrl.startsWith('/songs/') ||
    rawUrl.startsWith('songs/') ||
    rawUrl.startsWith('/api/songs/') ||
    rawUrl.startsWith('api/songs/') ||
    (rawUrl.includes('/api/songs/') && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')))
  ) {
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      if (baseOverride) {
        return sanitizeStreamUrl(rawUrl.replace(/^https?:\/\/[^\/]+/, baseOverride));
      }
      return sanitizeStreamUrl(rawUrl);
    }
    const clean = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    const pathWithApi = clean.startsWith('/api/') ? clean : `/api${clean}`;
    return sanitizeStreamUrl(`${base}${pathWithApi}`);
  }

  // 2. If song has youtube_id, prefer direct YouTube stream via backend link stream
  if (song.youtube_id && /^[a-zA-Z0-9_-]{11}$/.test(song.youtube_id)) {
    return sanitizeStreamUrl(`${base}/api/links/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${song.youtube_id}`)}`);
  }

  const ytId = extractYoutubeId(song);
  if (ytId) {
    return sanitizeStreamUrl(`${base}/api/links/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ytId}`)}`);
  }

  // 3. If it's already a full http(s) URL
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    if (rawUrl.includes('/api/links/stream') || rawUrl.includes('/api/songs/')) {
      if (baseOverride) {
        return sanitizeStreamUrl(rawUrl.replace(/^https?:\/\/[^\/]+/, baseOverride));
      }
      return sanitizeStreamUrl(rawUrl);
    }
    // If it's an external YouTube or Spotify or search URL, route through backend link stream
    if (
      rawUrl.includes('youtube.com') ||
      rawUrl.includes('youtu.be') ||
      rawUrl.includes('spotify.com') ||
      rawUrl.includes('search_query') ||
      song.source === 'spotify'
    ) {
      return sanitizeStreamUrl(`${base}/api/links/stream?url=${encodeURIComponent(rawUrl)}`);
    }
    return sanitizeStreamUrl(rawUrl);
  }

  // 4. If it's a relative URL from backend
  if (rawUrl.length > 0) {
    if (rawUrl.startsWith('/api/')) {
      return sanitizeStreamUrl(`${base}${rawUrl}`);
    }
    if (rawUrl.startsWith('api/')) {
      return sanitizeStreamUrl(`${base}/${rawUrl}`);
    }
    if (rawUrl.startsWith('/songs/') || rawUrl.startsWith('songs/')) {
      const clean = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
      return sanitizeStreamUrl(`${base}/api${clean}`);
    }
    if (rawUrl.startsWith('/links/') || rawUrl.startsWith('links/')) {
      const clean = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
      return sanitizeStreamUrl(`${base}/api${clean}`);
    }
    const cleanUrl = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    return sanitizeStreamUrl(`${base}${cleanUrl}`);
  }

  // 5. Default to backend audio endpoint
  if (song.id != null) {
    return sanitizeStreamUrl(`${base}/api/songs/${song.id}/audio`);
  }

  return null;
}

async function recordPlayIfNeeded(song: Song): Promise<void> {
  const songId = String(song.id);
  if (historyRecordedForSong === songId) return;
  const user = useSettingsStore.getState().user;
  if (!user) return;
  try {
    await recordHistory(songId, user.username, song.name);
    historyRecordedForSong = songId;
  } catch {
    // best-effort
  }
}

function buildOrder(queueLength: number, shuffle: boolean, currentIndex: number): number[] {
  const order = Array.from({ length: queueLength }, (_, i) => i);
  if (!shuffle) return order;
  const mixed = shuffleArray(order);
  const pos = mixed.indexOf(currentIndex);
  if (pos > 0) {
    const first = mixed[0] as number;
    mixed[0] = mixed[pos] as number;
    mixed[pos] = first;
  }
  return mixed;
}

import { DeviceEventEmitter } from 'react-native';

export const usePlayerStore = create<PlayerState>()((set, get) => {
  onPlayerStatus(() => {
    const state = get();
    if (!state) return;
    const { currentSong, isPlaying, position, duration } = state;
    syncLockScreen(currentSong, isPlaying, position, duration);
  });

  DeviceEventEmitter.addListener('onMediaAction', (event: { action: string; position?: number }) => {
    const { play, pause, next, previous, seek } = get();
    if (event.action === 'play') {
      play();
    } else if (event.action === 'pause') {
      pause();
    } else if (event.action === 'next') {
      next();
    } else if (event.action === 'previous') {
      previous();
    } else if (event.action === 'seek' && event.position !== undefined) {
      seek(event.position);
    }
  });

  async function playWithEngine(song: Song, retryCount = 0): Promise<void> {
    // Pre-resolve youtube_id if it's a search URL or missing on youtube/spotify songs
    const raw = (song.url || song.stream_url || '');
    if (!song.youtube_id && !song.localUri) {
      if (raw.includes('search_query=') || raw.includes('spotify') || song.source === 'spotify') {
        const match = raw.match(/search_query=([^&]+)/);
        const q = (match && match[1]) ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : `${song.artist || ''} ${song.name}`.trim();
        const artist = song.artist || '';
        const title = song.name || q;
        try {
          const matchedId = await matchTrackToYoutubeId(artist, title);
          if (matchedId) {
            song.youtube_id = matchedId;
          }
        } catch {
          // ignore
        }
      }
    }

    // 1. Try local offline audio if available
    if (song.localUri) {
      try {
        const player = ensurePlayerWithSource(song.localUri);
        await player.play();

        const { values, enabled, bassBoost, virtualizer } = useEqStore.getState();
        if (enabled) {
          void enableEqualizer(true);
          if (values.length > 0) void applyNative(values);
          if (bassBoost > 0) void applyBassBoost(bassBoost);
          if (virtualizer > 0) void applyVirtualizer(virtualizer);
        }

        activateLockScreenForSong(song);
        void recordPlayIfNeeded(song);
        set({ error: null });
        return;
      } catch (localErr) {
        console.warn(`[Player] Local audio playback failed for "${song.name}", falling back to network:`, localErr);
        try {
          const { deleteDownloadedSong } = await import('../services/downloads.service');
          await deleteDownloadedSong(song.id);
        } catch {}
        delete (song as any).localUri;
      }
    }

    const candidateBases = getCandidateBases();
    let lastError: any = null;

    for (const base of candidateBases) {
      const source = resolveSource(song, base, true);
      if (!source) continue;

      try {
        const player = ensurePlayerWithSource(source);
        await player.play();

        const { values, enabled, bassBoost, virtualizer } = useEqStore.getState();
        if (enabled) {
          void enableEqualizer(true);
          if (values.length > 0) void applyNative(values);
          if (bassBoost > 0) void applyBassBoost(bassBoost);
          if (virtualizer > 0) void applyVirtualizer(virtualizer);
        }

        activateLockScreenForSong(song);
        void recordPlayIfNeeded(song);
        setActiveApiBase(base);
        set({ error: null });
        return;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Player] playWithEngine failed on base ${base}:`, err);
        releasePlayer(source);
      }
    }

    // Secondary YouTube match fallback if initial endpoints failed
    if (retryCount === 0) {
      const artist = song.artist || '';
      const query = artist ? `${artist} - ${song.name}` : song.name;
      const currentId = song.youtube_id || extractYoutubeId(song);
      try {
        const matchedId = await matchTrackToYoutubeId(artist, song.name || query, currentId);
        if (matchedId && matchedId !== currentId) {
          song.youtube_id = matchedId;
          return playWithEngine(song, 1);
        }
      } catch {
        // ignore
      }
    }

    if (retryCount < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * (retryCount + 1));
      return playWithEngine(song, retryCount + 1);
    }

    const msg = lastError instanceof Error ? lastError.message : 'Error al reproducir canción';
    set({ error: `No se pudo reproducir "${song.name}". ${msg}` });
  }

  return {
    queue: [],
    queueIndex: -1,
    currentSong: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    isBuffering: false,
    error: null,
    shuffle: false,
    repeat: 'off',
    order: [],

    playSong: (song, queue) => {
      const q = queue ?? get().queue;
      const index = q.findIndex((s) => String(s.id) === String(song.id));
      const resolvedIndex = index >= 0 ? index : 0;
      const order = buildOrder(q.length, get().shuffle, resolvedIndex);
      set({
        queue: q,
        queueIndex: resolvedIndex,
        currentSong: song,
        position: 0,
        duration: 0,
        error: null,
        order,
      }, false);
      void playWithEngine(song);
      import('./jam.store').then(({ useJamStore }) => {
        const jam = useJamStore.getState();
        if (jam.active && jam.isHost && !jam.syncInProgress) {
          jam.broadcastPlaybackChange('play', 0);
        }
      });
    },

    playQueue: (queue, startIndex = 0) => {
      const song = queue[startIndex];
      if (!song) return;
      get().playSong(song, queue);
    },

    togglePlay: () => {
      if (!get().currentSong) return;
      const player = getPlayer();
      if (!player) return;
      if (get().isPlaying) {
        player.pause();
        set({ isPlaying: false }, false);
        syncLockScreen(get().currentSong, false, get().position, get().duration);
        import('./jam.store').then(({ useJamStore }) => {
          const jam = useJamStore.getState();
          if (jam.active && jam.isHost && !jam.syncInProgress) jam.broadcastPlaybackChange('pause');
        });
      } else {
        if (player.duration > 0 && player.currentTime >= player.duration - 0.5) {
          player.seekTo(0);
        }
        player.play();
        set({ isPlaying: true }, false);
        syncLockScreen(get().currentSong, true, get().position, get().duration);
        import('./jam.store').then(({ useJamStore }) => {
          const jam = useJamStore.getState();
          if (jam.active && jam.isHost && !jam.syncInProgress) jam.broadcastPlaybackChange('play');
        });
      }
    },

    play: () => {
      if (!get().currentSong) return;
      const player = getPlayer();
      if (!player) return;
      player.play();
      set({ isPlaying: true }, false);
      syncLockScreen(get().currentSong, true, get().position, get().duration);
      import('./jam.store').then(({ useJamStore }) => {
        const jam = useJamStore.getState();
        if (jam.active && jam.isHost && !jam.syncInProgress) jam.broadcastPlaybackChange('play');
      });
    },

    pause: () => {
      const player = getPlayer();
      if (!player) return;
      player.pause();
      set({ isPlaying: false }, false);
      syncLockScreen(get().currentSong, false, get().position, get().duration);
      import('./jam.store').then(({ useJamStore }) => {
        const jam = useJamStore.getState();
        if (jam.active && jam.isHost && !jam.syncInProgress) jam.broadcastPlaybackChange('pause');
      });
    },

    next: () => {
      const { queue, queueIndex, repeat, order, shuffle } = get();
      if (queue.length === 0) return;
      if (repeat === 'one') {
        const player = getPlayer();
        if (player) {
          player.seekTo(0);
          player.play();
        }
        set({ isPlaying: true }, false);
        return;
      }
      let nextIndex = queueIndex + 1;
      if (shuffle && order.length > 1) {
        const pos = order.indexOf(queueIndex);
        nextIndex = order[(pos + 1) % order.length] ?? nextIndex;
      }
      if (nextIndex >= queue.length) {
        if (repeat === 'all') nextIndex = 0;
        else {
          getPlayer()?.pause();
          set({ isPlaying: false, position: 0, duration: 0 }, false);
          return;
        }
      }
      const song = queue[nextIndex];
      if (!song) return;
      set({ queueIndex: nextIndex, currentSong: song, position: 0, duration: 0, error: null }, false);
      void playWithEngine(song);
    },

    previous: () => {
      const { queue, queueIndex, order, shuffle, position } = get();
      if (queue.length === 0) return;
      if (position > 3) {
        getPlayer()?.seekTo(0);
        set({ position: 0 }, false);
        return;
      }
      let prevIndex = queueIndex - 1;
      if (shuffle && order.length > 1) {
        const pos = order.indexOf(queueIndex);
        prevIndex = order[(pos - 1 + order.length) % order.length] ?? prevIndex;
      }
      if (prevIndex < 0) prevIndex = queue.length - 1;
      const song = queue[prevIndex];
      if (!song) return;
      set({ queueIndex: prevIndex, currentSong: song, position: 0, duration: 0, error: null }, false);
      void playWithEngine(song);
    },

    seek: (seconds) => {
      const player = getPlayer();
      if (player) player.seekTo(seconds);
      set({ position: seconds }, false);
      import('./jam.store').then(({ useJamStore }) => {
        const jam = useJamStore.getState();
        if (jam.active && jam.isHost && !jam.syncInProgress) {
          jam.broadcastPlaybackChange('seek', seconds);
        }
      });
    },

    setProgress: (position, duration) => set({ position, duration }, false),
    setPlaying: (isPlaying) => set({ isPlaying }, false),
    setBuffering: (isBuffering) => set({ isBuffering }, false),
    setError: (error) => set({ error }, false),

    toggleShuffle: () => {
      const { shuffle, queue, queueIndex } = get();
      const nextShuffle = !shuffle;
      set({ shuffle: nextShuffle, order: buildOrder(queue.length, nextShuffle, queueIndex) }, false);
    },

    cycleRepeat: () => {
      const modes: readonly RepeatMode[] = ['off', 'all', 'one'];
      const current = modes.indexOf(get().repeat);
      set({ repeat: modes[(current + 1) % modes.length] ?? 'off' }, false);
    },

    addToQueue: (song) => {
      const { queue } = get();
      if (queue.some((s) => String(s.id) === String(song.id))) return;
      const nextQueue = [...queue, song];
      set({ queue: nextQueue, order: buildOrder(nextQueue.length, get().shuffle, get().queueIndex) }, false);
      import('./jam.store').then(({ useJamStore }) => {
        const jam = useJamStore.getState();
        if (jam.active && jam.isHost && !jam.syncInProgress) {
          jam.broadcastQueueAdd(song.id);
        }
      });
    },

    playNext: (song) => {
      const { queue, queueIndex } = get();
      if (queue.some((s) => String(s.id) === String(song.id))) return;
      const nextQueue = [...queue];
      nextQueue.splice(queueIndex + 1, 0, song);
      set({ queue: nextQueue, order: buildOrder(nextQueue.length, get().shuffle, queueIndex) }, false);
      import('./jam.store').then(({ useJamStore }) => {
        const jam = useJamStore.getState();
        if (jam.active && jam.isHost && !jam.syncInProgress) {
          jam.broadcastQueueAdd(song.id);
        }
      });
    },

    removeFromQueue: (songId) => {
      const { queue, queueIndex, currentSong } = get();
      const nextQueue = queue.filter((s) => String(s.id) !== String(songId));
      let nextIndex = queueIndex;
      if (String(currentSong?.id) === String(songId)) {
        if (nextQueue.length === 0) {
          getPlayer()?.pause();
          set({ queue: [], queueIndex: -1, currentSong: null, isPlaying: false, order: [] }, false);
          return;
        }
        nextIndex = Math.min(queueIndex, nextQueue.length - 1);
        const song = nextQueue[nextIndex];
        if (!song) return;
        set({ queue: nextQueue, queueIndex: nextIndex, currentSong: song, position: 0, duration: 0 }, false);
        void playWithEngine(song);
        import('./jam.store').then(({ useJamStore }) => {
          const jam = useJamStore.getState();
          if (jam.active && jam.isHost && !jam.syncInProgress) {
            jam.broadcastQueueRemove(songId);
          }
        });
        return;
      }
      if (queueIndex > 0 && nextQueue.length < queue.length) nextIndex = queueIndex - 1;
      set({ queue: nextQueue, queueIndex: nextIndex, order: buildOrder(nextQueue.length, get().shuffle, nextIndex) }, false);
      import('./jam.store').then(({ useJamStore }) => {
        const jam = useJamStore.getState();
        if (jam.active && jam.isHost && !jam.syncInProgress) {
          jam.broadcastQueueRemove(songId);
        }
      });
    },

    clearQueue: () => {
      getPlayer()?.pause();
      set({ queue: [], queueIndex: -1, currentSong: null, isPlaying: false, order: [] }, false);
    },
  };
});

export const playerSelectors = {
  currentSong: (state: PlayerState) => state.currentSong,
  isPlaying: (state: PlayerState) => state.isPlaying,
  position: (state: PlayerState) => state.position,
  duration: (state: PlayerState) => state.duration,
  progress: (state: PlayerState) => state.duration > 0 ? state.position / state.duration : 0,
  queue: (state: PlayerState) => state.queue,
  queueIndex: (state: PlayerState) => state.queueIndex,
  shuffle: (state: PlayerState) => state.shuffle,
  repeat: (state: PlayerState) => state.repeat,
  error: (state: PlayerState) => state.error,
  isBuffering: (state: PlayerState) => state.isBuffering,

  nowPlaying: (state: PlayerState) => ({
    currentSong: state.currentSong,
    isPlaying: state.isPlaying,
    position: state.position,
    duration: state.duration,
  }),
  queueInfo: (state: PlayerState) => ({
    queue: state.queue,
    queueIndex: state.queueIndex,
    shuffle: state.shuffle,
    repeat: state.repeat,
  }),
  playbackControls: (state: PlayerState) => ({
    isPlaying: state.isPlaying,
    position: state.position,
    duration: state.duration,
    shuffle: state.shuffle,
    repeat: state.repeat,
  }),
} as const;

export const useCurrentSong = () => usePlayerStore(playerSelectors.currentSong);
export const useIsPlaying = () => usePlayerStore(playerSelectors.isPlaying);
export const usePosition = () => usePlayerStore(playerSelectors.position);
export const useDuration = () => usePlayerStore(playerSelectors.duration);
export const useProgress = () => usePlayerStore(playerSelectors.progress);
export const useQueue = () => usePlayerStore(playerSelectors.queue);
export const useQueueIndex = () => usePlayerStore(playerSelectors.queueIndex);
export const useShuffle = () => usePlayerStore(playerSelectors.shuffle);
export const useRepeat = () => usePlayerStore(playerSelectors.repeat);
export const useError = () => usePlayerStore(playerSelectors.error);
export const useIsBuffering = () => usePlayerStore(playerSelectors.isBuffering);
export const useNowPlaying = () => usePlayerStore(useShallow(playerSelectors.nowPlaying));
export const useQueueInfo = () => usePlayerStore(useShallow(playerSelectors.queueInfo));
export const usePlaybackControls = () => usePlayerStore(useShallow(playerSelectors.playbackControls));