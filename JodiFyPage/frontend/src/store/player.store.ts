import { create } from 'zustand';
import type { Song } from '../lib/types';
import { useToastStore } from './toast.store';
import { useQueueStore } from './queue.store';
import { useJamStore } from './jam.store';
import { useLibraryStore } from './library.store';
import { getSongOffline } from '../lib/idb';
import { clamp } from '../lib/utils';
import { ytPlayerService } from '../services/yt-player.service';

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlaybackContext {
  id?: string;
  type: 'library' | 'playlist' | 'favorites' | 'downloads' | 'user' | 'album' | 'search' | 'custom';
  title: string;
  songs: Song[];
}

export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  isShuffle: boolean;
  isLoop: boolean;
  repeatMode: RepeatMode;
  isFading: boolean;
  sourceUrl: string | null;
  blobUrl: string | null;
  isOfflinePlayback: boolean;
  lastError: string | null;
  playbackContext: PlaybackContext | null;
  shuffledQueue: Song[];
  history: Song[];

  setCurrentSong: (song: Song | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  toggleShuffle: () => void;
  setShuffle: (enabled: boolean) => void;
  toggleLoop: () => void;
  cycleRepeatMode: () => RepeatMode;
  setRepeatMode: (mode: RepeatMode) => void;
  setIsFading: (fading: boolean) => void;
  setSourceUrl: (url: string | null, blobUrl?: string | null) => void;
  setOfflinePlayback: (v: boolean) => void;
  setLastError: (e: string | null) => void;
  setPlaybackContext: (context: PlaybackContext | null) => void;
  getEffectivePool: () => Song[];
  playWithContext: (
    song: Song,
    contextSongs: Song[],
    contextTitle?: string,
    contextType?: PlaybackContext['type'],
    options?: { fades?: boolean }
  ) => Promise<boolean>;
  togglePlay: () => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (time: number) => void;
  getNextSong: () => Song | null;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: (() => {
    const raw = Number(localStorage.getItem('userVolume') ?? 1);
    return Number.isFinite(raw) && raw >= 0 ? raw : 1;
  })(),
  muted: false,
  isShuffle: false,
  isLoop: false,
  repeatMode: 'off',
  isFading: false,
  sourceUrl: null,
  blobUrl: null,
  isOfflinePlayback: false,
  lastError: null,
  playbackContext: null,
  shuffledQueue: [],
  history: [],

  setCurrentSong: (currentSong) => set({ currentSong }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => {
    localStorage.setItem('userVolume', String(volume));
    set({ volume, muted: volume === 0 });
    const audio = document.querySelector('audio#jodify-audio') as HTMLAudioElement | null;
    if (audio) audio.volume = volume;
    ytPlayerService.setVolume(volume * 100);
  },
  setMuted: (muted) => set({ muted }),

  setShuffle: (enabled: boolean) => {
    const current = get().isShuffle;
    if (current === enabled) return;
    if (enabled) {
      const { currentSong } = get();
      const pool = get().getEffectivePool();
      const remaining = pool.filter((s) => String(s.id) !== String(currentSong?.id));
      set({ isShuffle: true, shuffledQueue: shuffleArray(remaining) });
    } else {
      set({ isShuffle: false, shuffledQueue: [] });
    }
  },

  toggleShuffle: () => {
    const nextShuffle = !get().isShuffle;
    get().setShuffle(nextShuffle);
    useToastStore.getState().show(
      nextShuffle ? 'Modo aleatorio activado 🔀' : 'Modo aleatorio desactivado',
      'info',
      1200
    );
  },

  toggleLoop: () => {
    const current = get().repeatMode;
    const nextMode: RepeatMode = current === 'off' ? 'all' : current === 'all' ? 'one' : 'off';
    set({ repeatMode: nextMode, isLoop: nextMode === 'one' });
  },

  cycleRepeatMode: () => {
    const current = get().repeatMode;
    const nextMode: RepeatMode = current === 'off' ? 'all' : current === 'all' ? 'one' : 'off';
    set({ repeatMode: nextMode, isLoop: nextMode === 'one' });
    return nextMode;
  },

  setRepeatMode: (repeatMode: RepeatMode) => {
    set({ repeatMode, isLoop: repeatMode === 'one' });
  },

  setIsFading: (isFading) => set({ isFading }),
  setSourceUrl: (sourceUrl, blobUrl = null) => set({ sourceUrl, blobUrl }),
  setOfflinePlayback: (isOfflinePlayback) => set({ isOfflinePlayback }),
  setLastError: (lastError) => set({ lastError }),
  setPlaybackContext: (playbackContext) => set({ playbackContext }),

  getEffectivePool: (): Song[] => {
    const { playbackContext } = get();
    const library = useLibraryStore.getState();
    const isDeviceOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    // 1. Si el dispositivo está sin conexión a internet real, limitar a descargas
    if (isDeviceOffline) {
      const offlinePool = library.songs.filter((s) => library.downloadedIds.some((id) => String(id) === String(s.id)));
      if (offlinePool.length > 0) return offlinePool;
    }

    // 2. Si hay un contexto explícito (playlist, canciones de usuario, álbum, favoritas)
    if (playbackContext && playbackContext.songs.length > 0) {
      return playbackContext.songs;
    }

    // 3. Si la pestaña activa en biblioteca es descargas
    if (library.currentTab === 'downloads') {
      const dl = library.songs.filter((s) => library.downloadedIds.some((id) => String(id) === String(s.id)));
      if (dl.length > 0) return dl;
    }

    // 4. Si la pestaña activa en biblioteca es favoritos
    if (library.currentTab === 'personal') {
      const liked = library.songs.filter((s) => library.likedIds.some((id) => String(id) === String(s.id)));
      if (liked.length > 0) return liked;
    }

    return library.songs;
  },

  playWithContext: async (song, contextSongs, contextTitle, contextType = 'custom', options) => {
    const { isShuffle, currentSong, history } = get();

    // Guardar en el historial de navegación hacia atrás
    if (currentSong && String(currentSong.id) !== String(song.id)) {
      set({
        history: [currentSong, ...history.filter((h) => String(h.id) !== String(currentSong.id))].slice(0, 50),
      });
    }

    const title = contextTitle || (contextType === 'playlist' ? 'Playlist' : 'Colección');
    const validSongs = contextSongs && contextSongs.length > 0 ? contextSongs : [song];

    let newShuffledQueue: Song[] = [];
    if (isShuffle) {
      const remaining = validSongs.filter((s) => String(s.id) !== String(song.id));
      newShuffledQueue = shuffleArray(remaining);
    }

    set({
      playbackContext: {
        type: contextType,
        title,
        songs: validSongs,
      },
      shuffledQueue: newShuffledQueue,
    });

    const { playSong } = await import('../services/player.service');
    const success = await playSong(song, options);
    if (success) {
      set({ isPlaying: true });
    }
    return success;
  },

  togglePlay: () => {
    const { isPlaying, currentSong } = get();
    const jam = useJamStore.getState();
    if (!currentSong) return;
    if (jam.active && !jam.isHost && !jam.permissions.allowPlaybackControl) {
      useToastStore.getState().show('El host bloqueó los controles de reproducción', 'warning');
      jam.maybeRecommendInstead();
      return;
    }
    if (isPlaying) {
      import('../services/player.service').then(({ pausePlayback }) => pausePlayback());
    } else {
      import('../services/player.service').then(({ ensurePlaying }) => ensurePlaying());
    }
  },

  next: async () => {
    const { currentSong, repeatMode, isShuffle, shuffledQueue, history } = get();
    const queue = useQueueStore.getState().items;
    const jam = useJamStore.getState();
    if (jam.active && !jam.isHost && !jam.permissions.allowPlaybackControl) {
      useToastStore.getState().show('El host bloqueó los controles', 'warning');
      jam.maybeRecommendInstead();
      return;
    }

    // 1. Si está activo el bucle de una sola pista
    if (repeatMode === 'one' && currentSong) {
      await get().seek(0);
      const { ensurePlaying } = await import('../services/player.service');
      ensurePlaying();
      return;
    }

    // 2. Prioridad a canciones agregadas manualmente a la cola
    if (queue.length > 0) {
      const nextSong = queue[0];
      if (currentSong && String(currentSong.id) !== String(nextSong.id)) {
        set({
          history: [currentSong, ...history.filter((h) => String(h.id) !== String(currentSong.id))].slice(0, 50),
        });
      }
      const { playSong } = await import('../services/player.service');
      await playSong(nextSong);
      useQueueStore.getState().remove(nextSong.id);
      return;
    }

    // 3. Canciones del contexto activo
    const pool = get().getEffectivePool();
    if (pool.length === 0) return;

    let targetSong: Song | null = null;

    if (isShuffle) {
      if (shuffledQueue.length > 0) {
        targetSong = shuffledQueue[0];
        set({ shuffledQueue: shuffledQueue.slice(1) });
      } else {
        // Se acabaron las canciones en la cola aleatoria
        if (repeatMode === 'all') {
          const remaining = pool.filter((s) => String(s.id) !== String(currentSong?.id));
          const fresh = shuffleArray(remaining.length > 0 ? remaining : pool);
          if (fresh.length > 0) {
            targetSong = fresh[0];
            set({ shuffledQueue: fresh.slice(1) });
          }
        } else {
          // Final de la lista sin repetición
          const { pausePlayback } = await import('../services/player.service');
          pausePlayback();
          await get().seek(0);
          return;
        }
      }
    } else {
      const currentIdx = pool.findIndex((s) => String(s.id) === String(currentSong?.id));
      if (currentIdx === -1) {
        targetSong = pool[0];
      } else if (currentIdx >= pool.length - 1) {
        if (repeatMode === 'off') {
          const { pausePlayback } = await import('../services/player.service');
          pausePlayback();
          await get().seek(0);
          return;
        }
        targetSong = pool[0];
      } else {
        targetSong = pool[currentIdx + 1];
      }
    }

    if (!targetSong) return;

    if (currentSong && String(currentSong.id) !== String(targetSong.id)) {
      set({
        history: [currentSong, ...history.filter((h) => String(h.id) !== String(currentSong.id))].slice(0, 50),
      });
    }

    const { playSong } = await import('../services/player.service');
    await playSong(targetSong);
  },

  previous: async () => {
    const { currentTime, history, currentSong } = get();
    const jam = useJamStore.getState();
    if (jam.active && !jam.isHost && !jam.permissions.allowPlaybackControl) {
      useToastStore.getState().show('El host bloqueó los controles', 'warning');
      return;
    }

    // Si pasaron más de 3 segundos, reiniciar la canción actual
    if (currentTime > 3) {
      get().seek(0);
      return;
    }

    // Si hay canciones en el historial previo (especialmente útil en aleatorio)
    if (history.length > 0) {
      const prevSong = history[0];
      set({ history: history.slice(1) });
      const { playSong } = await import('../services/player.service');
      await playSong(prevSong);
      return;
    }

    // Fallback secuencial
    const pool = get().getEffectivePool();
    if (pool.length === 0) return;

    const currentIdx = pool.findIndex((s) => String(s.id) === String(currentSong?.id));
    const prevIdx = (currentIdx - 1 + pool.length) % pool.length;
    const { playSong } = await import('../services/player.service');
    await playSong(pool[prevIdx]);
  },

  seek: (time) => {
    const { duration } = get();
    const audio = document.querySelector('audio#jodify-audio') as HTMLAudioElement | null;

    if (ytPlayerService.isPlayingVideo()) {
      ytPlayerService.seekTo(time);
      set({ currentTime: time });
      useJamStore.getState().broadcastPlaybackChange('seek', time);
      return;
    }

    if (audio && audio.src && audio.src !== window.location.href && !audio.src.endsWith('/index.html')) {
      const maxDur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (duration || time);
      const safeTime = clamp(time, 0, maxDur);
      try {
        audio.currentTime = safeTime;
      } catch {}
      set({ currentTime: safeTime });
      useJamStore.getState().broadcastPlaybackChange('seek', safeTime);
      return;
    }

    ytPlayerService.seekTo(time);
    set({ currentTime: time });
  },

  getNextSong: () => {
    const { currentSong, isShuffle, shuffledQueue } = get();
    const queue = useQueueStore.getState().items;
    if (queue.length > 0) return queue[0];

    if (isShuffle) {
      return shuffledQueue.length > 0 ? shuffledQueue[0] : null;
    }

    const pool = get().getEffectivePool();
    if (pool.length === 0) return null;

    const idx = pool.findIndex((s) => String(s.id) === String(currentSong?.id));
    if (idx < 0) return pool[0] || null;
    return pool[(idx + 1) % pool.length] || null;
  },
}));

export async function loadOfflineSource(song: Song): Promise<string | null> {
  const offline = await getSongOffline(song.id);
  if (!offline) return null;
  const url = URL.createObjectURL(offline.blob);
  const player = usePlayerStore.getState();
  player.setSourceUrl(url, url);
  player.setOfflinePlayback(true);
  return url;
}
