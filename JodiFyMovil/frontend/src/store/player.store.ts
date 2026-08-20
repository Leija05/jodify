import { create } from 'zustand';
import type { RepeatMode, Song } from '../lib/types';
import { API_BASE } from '../lib/constants';
import { shuffleArray } from '../lib/utils';
import { activateLockScreenForSong } from '../services/lockscreen.service';
import { ensurePlayerWithSource, getPlayer } from './audio';
import { useEqStore } from './eq.store';
import { applyNative } from '../services/equalizer.service';

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

function resolveSource(song: Song): string | null {
  if (song.localUri) return song.localUri;
  if (!song.url) return null;
  if (song.url.startsWith('http')) return song.url;
  return `${API_BASE}${song.url.startsWith('/') ? '' : '/'}${song.url}`;
}

function buildOrder(queueLength: number, shuffle: boolean, currentIndex: number): number[] {
  const order = Array.from({ length: queueLength }, (_, i) => i);
  if (!shuffle) return order;
  const mixed = shuffleArray(order);
  const pos = mixed.indexOf(currentIndex);
  if (pos >= 0) [mixed[0], mixed[pos]] = [mixed[pos], mixed[0]];
  return mixed;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  function playWithEngine(song: Song) {
    const source = resolveSource(song);
    if (!source) {
      set({ error: 'No se pudo encontrar la fuente de audio' });
      return;
    }
    try {
      // Crear el player con la fuente adjunta evita el bug de replace()
      // sin fuente inicial en Android (expo/expo#35670).
      const player = ensurePlayerWithSource(source);
      player.play();
      // Aplica el ecualizador configurado al arrancar cada canción.
      const { values, enabled } = useEqStore.getState();
      if (enabled && values.length > 0) applyNative(values);
      // Activa la notificación / pantalla de bloqueo de inmediato.
      activateLockScreenForSong(song);
      set({ error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al reproducir canción' });
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
      });
      playWithEngine(song);
    },

    playQueue: (queue, startIndex = 0) => {
      const song = queue[startIndex];
      if (!song) return;
      get().playSong(song, queue);
    },

    togglePlay: () => {
      if (!get().currentSong) return;
      const player = getPlayer();
      if (get().isPlaying) {
        player.pause();
        set({ isPlaying: false });
      } else {
        if (player.duration > 0 && player.currentTime >= player.duration - 0.5) {
          player.seekTo(0);
        }
        player.play();
        set({ isPlaying: true });
      }
    },

    play: () => {
      if (!get().currentSong) return;
      getPlayer().play();
      set({ isPlaying: true });
    },

    pause: () => {
      getPlayer().pause();
      set({ isPlaying: false });
    },

    next: () => {
      const { queue, queueIndex, repeat, order, shuffle } = get();
      if (queue.length === 0) return;
      if (repeat === 'one') {
        getPlayer().seekTo(0);
        getPlayer().play();
        set({ isPlaying: true });
        return;
      }
      let nextIndex = queueIndex + 1;
      if (shuffle && order.length > 1) {
        const pos = order.indexOf(queueIndex);
        nextIndex = order[(pos + 1) % order.length];
      }
      if (nextIndex >= queue.length) {
        if (repeat === 'all') nextIndex = 0;
        else {
          getPlayer().pause();
          set({ isPlaying: false, position: 0, duration: 0 });
          return;
        }
      }
      const song = queue[nextIndex];
      set({ queueIndex: nextIndex, currentSong: song, position: 0, duration: 0, error: null });
      playWithEngine(song);
    },

    previous: () => {
      const { queue, queueIndex, order, shuffle, position } = get();
      if (queue.length === 0) return;
      if (position > 3) {
        getPlayer().seekTo(0);
        set({ position: 0 });
        return;
      }
      let prevIndex = queueIndex - 1;
      if (shuffle && order.length > 1) {
        const pos = order.indexOf(queueIndex);
        prevIndex = order[(pos - 1 + order.length) % order.length];
      }
      if (prevIndex < 0) prevIndex = queue.length - 1;
      const song = queue[prevIndex];
      set({ queueIndex: prevIndex, currentSong: song, position: 0, duration: 0, error: null });
      playWithEngine(song);
    },

    seek: (seconds) => {
      const player = getPlayer();
      player.seekTo(seconds);
      set({ position: seconds });
    },

    setProgress: (position, duration) => set({ position, duration }),
    setPlaying: (isPlaying) => set({ isPlaying }),
    setBuffering: (isBuffering) => set({ isBuffering }),
    setError: (error) => set({ error }),

    toggleShuffle: () => {
      const { shuffle, queue, queueIndex } = get();
      const nextShuffle = !shuffle;
      set({ shuffle: nextShuffle, order: buildOrder(queue.length, nextShuffle, queueIndex) });
    },

    cycleRepeat: () => {
      const order: RepeatMode[] = ['off', 'all', 'one'];
      const current = order.indexOf(get().repeat);
      set({ repeat: order[(current + 1) % order.length] });
    },

    addToQueue: (song) => {
      const { queue } = get();
      if (queue.some((s) => String(s.id) === String(song.id))) return;
      const nextQueue = [...queue, song];
      set({ queue: nextQueue, order: buildOrder(nextQueue.length, get().shuffle, get().queueIndex) });
    },

    playNext: (song) => {
      const { queue, queueIndex } = get();
      if (queue.some((s) => String(s.id) === String(song.id))) return;
      const nextQueue = [...queue];
      nextQueue.splice(queueIndex + 1, 0, song);
      set({ queue: nextQueue, order: buildOrder(nextQueue.length, get().shuffle, queueIndex) });
    },

    removeFromQueue: (songId) => {
      const { queue, queueIndex, currentSong } = get();
      const nextQueue = queue.filter((s) => String(s.id) !== String(songId));
      let nextIndex = queueIndex;
      if (String(currentSong?.id) === String(songId)) {
        if (nextQueue.length === 0) {
          getPlayer().pause();
          set({ queue: [], queueIndex: -1, currentSong: null, isPlaying: false, order: [] });
          return;
        }
        nextIndex = Math.min(queueIndex, nextQueue.length - 1);
        const song = nextQueue[nextIndex];
        set({ queue: nextQueue, queueIndex: nextIndex, currentSong: song, position: 0, duration: 0 });
        playWithEngine(song);
        return;
      }
      if (queueIndex > 0 && nextQueue.length < queue.length) nextIndex = queueIndex - 1;
      set({ queue: nextQueue, queueIndex: nextIndex, order: buildOrder(nextQueue.length, get().shuffle, nextIndex) });
    },

    clearQueue: () => {
      getPlayer().pause();
      set({ queue: [], queueIndex: -1, currentSong: null, isPlaying: false, order: [] });
    },
  };
});