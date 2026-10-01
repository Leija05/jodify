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

  setCurrentSong: (song: Song | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  toggleShuffle: () => void;
  toggleLoop: () => void;
  cycleRepeatMode: () => RepeatMode;
  setRepeatMode: (mode: RepeatMode) => void;
  setIsFading: (fading: boolean) => void;
  setSourceUrl: (url: string | null, blobUrl?: string | null) => void;
  setOfflinePlayback: (v: boolean) => void;
  setLastError: (e: string | null) => void;
  togglePlay: () => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (time: number) => void;
}

function randomIndex(len: number, exclude: number): number {
  if (len <= 1) return 0;
  let idx = Math.floor(Math.random() * len);
  while (idx === exclude) idx = Math.floor(Math.random() * len);
  return idx;
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
  toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),
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
    const { currentSong, repeatMode, isShuffle } = get();
    const queue = useQueueStore.getState().items;
    const jam = useJamStore.getState();
    if (jam.active && !jam.isHost && !jam.permissions.allowPlaybackControl) {
      useToastStore.getState().show('El host bloqueó los controles', 'warning');
      jam.maybeRecommendInstead();
      return;
    }

    // 1. Si está activo el loop de una sola canción, reiniciarla
    if (repeatMode === 'one' && currentSong) {
      await get().seek(0);
      const { ensurePlaying } = await import('../services/player.service');
      ensurePlaying();
      return;
    }

    // 2. Si hay canciones prioritarias agregadas a la cola por el usuario
    if (queue.length > 0) {
      const nextSong = queue[0];
      const { playSong } = await import('../services/player.service');
      await playSong(nextSong);
      useQueueStore.getState().remove(nextSong.id);
      return;
    }

    // 3. Canciones de la colección actual (biblioteca / favoritos / descargas)
    const library = useLibraryStore.getState();
    const pool = library.currentTab === 'downloads'
      ? library.songs.filter((s) => library.downloadedIds.includes(s.id))
      : library.currentTab === 'personal'
        ? library.songs.filter((s) => library.likedIds.includes(s.id))
        : library.songs;
    if (pool.length === 0) return;

    let idx = pool.findIndex((s) => s.id === currentSong?.id);
    if (isShuffle) {
      idx = randomIndex(pool.length, idx);
    } else {
      const isLastSong = idx >= pool.length - 1;
      // Si la repetición está desactivada y llegamos al final de la colección, detener
      if (isLastSong && repeatMode === 'off') {
        const { pausePlayback } = await import('../services/player.service');
        pausePlayback();
        await get().seek(0);
        return;
      }
      idx = (idx + 1) % pool.length;
    }
    const { playSong } = await import('../services/player.service');
    await playSong(pool[idx]);
  },

  previous: async () => {
    const { currentTime } = get();
    const jam = useJamStore.getState();
    if (jam.active && !jam.isHost && !jam.permissions.allowPlaybackControl) {
      useToastStore.getState().show('El host bloqueó los controles', 'warning');
      return;
    }
    if (currentTime > 3) {
      get().seek(0);
      return;
    }
    const library = useLibraryStore.getState();
    const pool = library.songs;
    if (pool.length === 0) return;
    const idx = pool.findIndex((s) => s.id === get().currentSong?.id);
    const prevIdx = (idx - 1 + pool.length) % pool.length;
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
