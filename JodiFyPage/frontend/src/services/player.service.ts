import type { Song } from '../lib/types';
import { usePlayerStore } from '../store/player.store';
import { useLibraryStore } from '../store/library.store';
import { useSettingsStore } from '../store/settings.store';
import { useJamStore } from '../store/jam.store';
import { useToastStore } from '../store/toast.store';
import { getSongOffline, getAllOfflineIds } from '../lib/idb';
import { resolveMediaUrl } from '../lib/utils';

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
  const audio = document.querySelector('audio#jodify-audio') as HTMLAudioElement | null;
  const player = usePlayerStore.getState();
  if (!audio || !player.currentSong) return;
  audio.play().then(() => player.setIsPlaying(true)).catch(() => undefined);
  useJamStore.getState().broadcastPlaybackChange('play');
}

export function pausePlayback(): void {
  const audio = document.querySelector('audio#jodify-audio') as HTMLAudioElement | null;
  const player = usePlayerStore.getState();
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
  if (!audio) return false;

  if (jam.active && !jam.isHost && !jam.permissions.allowPlaybackControl) {
    useToastStore.getState().show('El host bloqueó la reproducción', 'warning');
    return false;
  }

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

  const offlineSong = await getSongOffline(song.id);
  const offlineIds = await getAllOfflineIds();
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
  });
}

export function resolveSongUrl(song: Song, blobUrl?: string | null): string {
  if (blobUrl) return blobUrl;
  return song.url ? resolveMediaUrl(song.url) : '';
}
