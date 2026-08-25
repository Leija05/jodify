import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { RepeatMode, Song } from '../lib/types';
import { API_BASE } from '../lib/constants';
import { shuffleArray } from '../lib/utils';
import { activateLockScreenForSong, syncLockScreen } from '../services/lockscreen.service';
import { ensurePlayerWithSource, getPlayer, onPlayerStatus } from './audio';
import { useEqStore } from './eq.store';
import { applyNative } from '../services/equalizer.service';
import { recordHistory } from '../services/history.service';
import { useSettingsStore } from './settings.store';

interface PlayerState {
  queue: Song[];
  queueIndex: number;
  currentSong: Song | null | undefined;
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
  return new Promise((r) => setTimeout(r, ms));
}

let historyRecordedForSong: string | null = null;

function resolveSource(song: Song): string | null {
  if (song.localUri) {
    console.log('[Player] Using localUri:', song.localUri);
    return song.localUri;
  }
  if (!song.url) {
    console.warn('[Player] Song has no url:', song.id, song.name);
    return null;
  }
  if (song.url.startsWith('http')) {
    try {
      new URL(song.url);
      return song.url;
    } catch {
      console.warn('[Player] Invalid absolute URL:', song.url);
      return null;
    }
  }
  const fullUrl = `${API_BASE}${song.url.startsWith('/') ? '' : '/'}${song.url}`;
  console.log('[Player] Resolved relative URL:', song.url, '->', fullUrl);
  return fullUrl;
}

async function recordPlayIfNeeded(song: Song): Promise<void> {
  const songId = String(song.id);
  if (historyRecordedForSong === songId) return;
  const user = useSettingsStore.getState().user;
  if (!user) return;
  try {
    await recordHistory(songId, user.username);
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

export const usePlayerStore = create<PlayerState>()((set, get) => {
  // Suscripción global al estado del reproductor nativo. Se registra a nivel
  // de módulo (fuera de React) porque el creador del store no es un componente.
  onPlayerStatus((status) => {
    const { currentSong, isPlaying } = get();
    syncLockScreen(currentSong, isPlaying, status.playbackState);
  });

  async function playWithEngine(song: Song, retryCount = 0): Promise<void> {
    const source = resolveSource(song);
    if (!source) {
      set({ error: 'No se pudo encontrar la fuente de audio para esta canción.' });
      return;
    }
    try {
      const player = ensurePlayerWithSource(source);
      player.play();

      const { values, enabled } = useEqStore.getState();
      if (enabled && values.length > 0) applyNative(values);

      activateLockScreenForSong(song);
      void recordPlayIfNeeded(song);
      set({ error: null });
    } catch (e) {
      console.error('[Player] playWithEngine error (attempt', retryCount + 1, '):', e);

      if (retryCount < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * (retryCount + 1));
        return playWithEngine(song, retryCount + 1);
      }

      const msg = e instanceof Error ? e.message : 'Error al reproducir canción';
      set({ error: `No se pudo reproducir "${song.name}". ${msg}` });
    }
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
      } else {
        if (player.duration > 0 && player.currentTime >= player.duration - 0.5) {
          player.seekTo(0);
        }
        player.play();
        set({ isPlaying: true }, false);
      }
    },

    play: () => {
      if (!get().currentSong) return;
      const player = getPlayer();
      if (!player) return;
      player.play();
      set({ isPlaying: true }, false);
    },

    pause: () => {
      const player = getPlayer();
      if (!player) return;
      player.pause();
      set({ isPlaying: false }, false);
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
    },

    playNext: (song) => {
      const { queue, queueIndex } = get();
      if (queue.some((s) => String(s.id) === String(song.id))) return;
      const nextQueue = [...queue];
      nextQueue.splice(queueIndex + 1, 0, song);
      set({ queue: nextQueue, order: buildOrder(nextQueue.length, get().shuffle, queueIndex) }, false);
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
        return;
      }
      if (queueIndex > 0 && nextQueue.length < queue.length) nextIndex = queueIndex - 1;
      set({ queue: nextQueue, queueIndex: nextIndex, order: buildOrder(nextQueue.length, get().shuffle, nextIndex) }, false);
    },

    clearQueue: () => {
      getPlayer()?.pause();
      set({ queue: [], queueIndex: -1, currentSong: null, isPlaying: false, order: [] }, false);
    },
  };
});

// Selectors optimizados para evitar re-renders innecesarios
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
  
  // Selectores compuestos con shallow equality
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

// Hooks de conveniencia con shallow equality
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