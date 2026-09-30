import type { Song } from '../lib/types';
import { usePlayerStore } from '../store/player.store';
import { useLibraryStore } from '../store/library.store';
import { useSettingsStore } from '../store/settings.store';
import { useJamStore } from '../store/jam.store';
import { useToastStore } from '../store/toast.store';
import { getSongOffline, getAllOfflineIds } from '../lib/idb';
import { resolveMediaUrl } from '../lib/utils';

import { ytPlayerService } from './yt-player.service';

export function extractYoutubeId(song: Song | null | undefined): string | null {
  if (!song) return null;
  if (song.youtube_id && /^[a-zA-Z0-9_-]{11}$/.test(song.youtube_id)) {
    return song.youtube_id;
  }
  const idMatch = String(song.id || '').match(/^yt-([a-zA-Z0-9_-]{11})$/);
  if (idMatch) return idMatch[1];

  const fullText = decodeURIComponent(`${song.url || ''} ${String(song.id || '')}`);
  const match = fullText.match(/(?:watch\?v=|youtu\.be\/|embed\/|shorts\/|yt-|v=)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function isYouTubeSong(song: Song | null | undefined): boolean {
  return Boolean(extractYoutubeId(song));
}

let fadeRaf: number | null = null;

export function rampVolume(audio: HTMLAudioElement, target: number, durationMs: number): void {
  const player = usePlayerStore.getState();
  const start = audio.volume;
  const startTime = performance.now();
  if (fadeRaf) cancelAnimationFrame(fadeRaf);
  player.setIsFading(true);

  const step = (now: number) => {
    const progress = Math.min(1, (now - startTime) / durationMs);
    audio.volume = Math.max(0, Math.min(1, start + (target - start) * progress));
    if (progress < 1) {
      fadeRaf = requestAnimationFrame(step);
    } else {
      player.setIsFading(false);
      fadeRaf = null;
    }
  };
  fadeRaf = requestAnimationFrame(step);
}

export function getFadeMs(): number {
  const settings = useSettingsStore.getState();
  return settings.fadeEnabled ? settings.fadeDuration * 1000 : 0;
}

export function ensurePlaying(): void {
  const player = usePlayerStore.getState();
  const audio = document.querySelector('audio#jodify-audio') as HTMLAudioElement | null;

  // Si hay audio HTML5 cargado (p. ej. stream directo en Electron o audio local)
  if (audio && audio.src && audio.src !== window.location.href && !audio.src.endsWith('/index.html')) {
    audio.play().then(() => player.setIsPlaying(true)).catch(() => undefined);
    useJamStore.getState().broadcastPlaybackChange('play');
    return;
  }

  if (isYouTubeSong(player.currentSong)) {
    ytPlayerService.play();
    player.setIsPlaying(true);
    useJamStore.getState().broadcastPlaybackChange('play');
    return;
  }

  if (!audio || !player.currentSong) return;
  audio.play().then(() => player.setIsPlaying(true)).catch(() => undefined);
  useJamStore.getState().broadcastPlaybackChange('play');
}

export function pausePlayback(): void {
  const player = usePlayerStore.getState();
  const audio = document.querySelector('audio#jodify-audio') as HTMLAudioElement | null;

  // Si hay audio HTML5 activo, pausarlo
  if (audio && audio.src && audio.src !== window.location.href && !audio.src.endsWith('/index.html')) {
    audio.pause();
    player.setIsPlaying(false);
    useJamStore.getState().broadcastPlaybackChange('pause');
    return;
  }

  if (isYouTubeSong(player.currentSong)) {
    ytPlayerService.pause();
    player.setIsPlaying(false);
    useJamStore.getState().broadcastPlaybackChange('pause');
    return;
  }

  if (!audio) return;
  audio.pause();
  player.setIsPlaying(false);
  useJamStore.getState().broadcastPlaybackChange('pause');
}

export async function playSong(song: Song, options: { fades?: boolean } = {}): Promise<boolean> {
  const audio = document.querySelector('audio#jodify-audio') as HTMLAudioElement | null;
  const player = usePlayerStore.getState();
  const settings = useSettingsStore.getState();
  const jam = useJamStore.getState();

  if (jam.active && !jam.isHost && !jam.permissions.allowPlaybackControl) {
    useToastStore.getState().show('El host bloqueó la reproducción', 'warning');
    return false;
  }

  // 1. Manejo nativo directo en cliente para canciones de YouTube (0 bloqueos, 100% audio completo)
  const ytId = extractYoutubeId(song);
  const offlineSong = await getSongOffline(song.id);
  const offlineIds = await getAllOfflineIds();

  if (ytId && !offlineSong) {
    player.setCurrentSong(song);
    player.setCurrentTime(0);
    player.setDuration(song.duration ?? 0);
    player.setSourceUrl(song.url);
    player.setOfflinePlayback(false);

    // En la app de escritorio (Electron), resolver flujo de audio directo de alta fidelidad
    const desktopPlayer = (window as any).jodifyPlayer;
    if (desktopPlayer && typeof desktopPlayer.resolveStream === 'function' && audio) {
      try {
        useToastStore.getState().show(`Cargando «${song.name}»…`, 'info', 1200);
        const directUrl = await desktopPlayer.resolveStream(ytId);
        if (directUrl) {
          ytPlayerService.stop();
          audio.src = directUrl;
          audio.volume = player.volume;
          audio.muted = player.muted;
          await audio.play();
          player.setIsPlaying(true);
          player.setSourceUrl(directUrl);
          useToastStore.getState().show(`Reproduciendo «${song.name}»`, 'success', 2000);
          logListeningHistory(song, false);
          return true;
        }
      } catch (err) {
        console.warn('[player.service] Falló stream directo local, probando reproductor integrado:', err);
      }
    }

    if (audio) {
      audio.pause();
      audio.src = '';
    }
    await ytPlayerService.playVideo(ytId);
    player.setIsPlaying(true);
    useToastStore.getState().show(`Reproduciendo «${song.name}»`, 'success', 2000);
    logListeningHistory(song, false);
    return true;
  }

  // Si no es canción de YouTube, detener el reproductor de YouTube
  ytPlayerService.stop();

  if (!audio) return false;

  if (options.fades !== false && settings.fadeEnabled && player.currentSong && player.isPlaying) {
    rampVolume(audio, 0, getFadeMs());
    await new Promise((r) => setTimeout(r, getFadeMs()));
  }

  player.setCurrentSong(song);
  player.setCurrentTime(0);
  player.setDuration(song.duration ?? 0);

  let sourceUrl: string | null = null;
  let blobUrl: string | null = null;
  let isOffline = false;

  const library = useLibraryStore.getState();

  if (offlineSong) {
    blobUrl = URL.createObjectURL(offlineSong.blob);
    sourceUrl = blobUrl;
    isOffline = true;
    if (player.blobUrl && player.blobUrl !== blobUrl) URL.revokeObjectURL(player.blobUrl);
  } else {
    sourceUrl = song.url ? resolveMediaUrl(song.url) : null;
  }

  if (!sourceUrl) {
    useToastStore.getState().show('Esta canción no tiene archivo de audio', 'error');
    return false;
  }

  audio.src = sourceUrl;
  audio.volume = player.volume;
  try {
    await audio.play();
  } catch (err) {
    const msg = err instanceof DOMException && err.name === 'NotAllowedError'
      ? 'Haz clic en reproducir para empezar'
      : 'Error reproduciendo la canción';
    useToastStore.getState().show(msg, 'warning');
  }

  player.setSourceUrl(sourceUrl, blobUrl);
  player.setOfflinePlayback(isOffline);
  player.setIsPlaying(!audio.paused);

  if (settings.fadeEnabled && options.fades !== false) {
    audio.volume = 0;
    rampVolume(audio, player.volume, getFadeMs());
  } else {
    audio.volume = player.volume;
  }

  useLibraryStore.getState().setDownloadedIds(offlineIds);

  logListeningHistory(song, library.currentTab === 'downloads' || isOffline);
  return true;
}

function logListeningHistory(song: Song, isOffline: boolean): void {
  const username = localStorage.getItem('currentUserName');
  if (!username) return;
  void isOffline;
  import('./users.service').then(({ usersService }) => {
    usersService.insertListeningHistory(username, song.id, song.name).catch(() => undefined);
    usersService.updateNowPlaying(username, song.id, song.name).catch(() => undefined);
  });
}

export function resolveSongUrl(song: Song, blobUrl?: string | null): string {
  if (blobUrl) return blobUrl;
  return song.url ? resolveMediaUrl(song.url) : '';
}
