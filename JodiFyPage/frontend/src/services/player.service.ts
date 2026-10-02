import type { Song } from '../lib/types';
import { usePlayerStore } from '../store/player.store';
import { useLibraryStore } from '../store/library.store';
import { useSettingsStore } from '../store/settings.store';
import { useJamStore } from '../store/jam.store';
import { useToastStore } from '../store/toast.store';
import { getSongOffline, findSongOffline } from '../lib/idb';
import { API_BASE } from '../lib/api';
import { resolveMediaUrl } from '../lib/utils';
import { linksService } from './links.service';
import { ytPlayerService } from './yt-player.service';

export function extractYoutubeId(song: Song | null | undefined): string | null {
  if (!song) return null;
  if (song.youtube_id && /^[a-zA-Z0-9_-]{11}$/.test(song.youtube_id)) {
    return song.youtube_id;
  }
  const idMatch = String(song.id || '').match(/^yt-([a-zA-Z0-9_-]{11})$/);
  if (idMatch) return idMatch[1];

  const fullText = decodeURIComponent(`${song.url || ''} ${String(song.id || '')}`);
  if (fullText.includes('spotify.com') || fullText.includes('soundcloud.com')) {
    return null;
  }
  if (!fullText.includes('youtube.com') && !fullText.includes('youtu.be')) {
    return null;
  }
  const match = fullText.match(/(?:watch\?v=|youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
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

  if (isYouTubeSong(player.currentSong) && !player.isOfflinePlayback && ytPlayerService.isPlayingVideo()) {
    ytPlayerService.play();
    player.setIsPlaying(true);
    useJamStore.getState().broadcastPlaybackChange('play');
    return;
  }

  // Si hay audio HTML5 cargado (p. ej. stream directo en Electron o audio local)
  if (audio && audio.src && audio.src !== window.location.href && !audio.src.endsWith('/index.html')) {
    audio.play().then(() => player.setIsPlaying(true)).catch(() => undefined);
    useJamStore.getState().broadcastPlaybackChange('play');
    return;
  }

  if (isYouTubeSong(player.currentSong) && !player.isOfflinePlayback) {
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

  if (isYouTubeSong(player.currentSong) && !player.isOfflinePlayback && ytPlayerService.isPlayingVideo()) {
    ytPlayerService.pause();
    player.setIsPlaying(false);
    useJamStore.getState().broadcastPlaybackChange('pause');
    return;
  }

  // Si hay audio HTML5 activo, pausarlo
  if (audio && audio.src && audio.src !== window.location.href && !audio.src.endsWith('/index.html')) {
    audio.pause();
    player.setIsPlaying(false);
    useJamStore.getState().broadcastPlaybackChange('pause');
    return;
  }

  if (isYouTubeSong(player.currentSong) && !player.isOfflinePlayback) {
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

  // 1. REPRODUCCIÓN PRIORITARIA SIN CONEXIÓN (MODO OFFLINE)
  // Si la canción está descargada en el almacén local IndexedDB, reproducir directamente desde el Blob
  // instantáneamente, con 0 latencia, 0 peticiones a internet y 100% fidelidad sin conexión.
  let offlineSong = await getSongOffline(song.id);
  if (!offlineSong) {
    offlineSong = await findSongOffline(song);
  }

  if (offlineSong && offlineSong.blob) {
    ytPlayerService.stop();
    if (!audio) return false;

    if (options.fades !== false && settings.fadeEnabled && player.currentSong && player.isPlaying) {
      rampVolume(audio, 0, getFadeMs());
      await new Promise((r) => setTimeout(r, getFadeMs()));
    }

    const effectiveSong: Song = {
      ...song,
      ...offlineSong,
      cover_url: (offlineSong as any).offline_cover || offlineSong.cover_url || song.cover_url,
    };

    player.setCurrentSong(effectiveSong);
    player.setCurrentTime(0);
    player.setDuration(offlineSong.duration || song.duration || 0);

    const blobUrl = URL.createObjectURL(offlineSong.blob);
    if (player.blobUrl && player.blobUrl !== blobUrl) {
      try {
        URL.revokeObjectURL(player.blobUrl);
      } catch {}
    }

    audio.src = blobUrl;
    audio.volume = player.volume;
    audio.muted = player.muted;
    try {
      await audio.play();
    } catch (err) {
      console.warn('[player.service] Falló reproducción de blob offline:', err);
      const msg = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Haz clic en reproducir para empezar'
        : 'Error reproduciendo canción sin conexión';
      useToastStore.getState().show(msg, 'warning');
      return false;
    }

    player.setSourceUrl(blobUrl, blobUrl);
    player.setOfflinePlayback(true);
    player.setIsPlaying(!audio.paused);

    if (settings.fadeEnabled && options.fades !== false) {
      audio.volume = 0;
      rampVolume(audio, player.volume, getFadeMs());
    } else {
      audio.volume = player.volume;
    }

    useToastStore.getState().show(`Reproduciendo «${song.name}» (Sin conexión) ⚡`, 'success', 2200);
    logListeningHistory(effectiveSong, true);
    return true;
  }

  // 2. Si la canción no está descargada y NO hay conexión a internet activa
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    useToastStore.getState().show('Esta canción no está descargada para escuchar sin conexión', 'warning', 2500);
    return false;
  }

  // 3. Si la canción no tiene youtube_id pero proviene de Spotify o es un enlace de búsqueda (en línea)
  if (!extractYoutubeId(song) && (song.source === 'spotify' || (song.url && (song.url.includes('search_query') || song.url.includes('spotify.com'))))) {
    try {
      const match = await linksService.matchTrack(song.artist || '', song.name);
      if (match && match.youtube_id) {
        song.youtube_id = match.youtube_id;
        song.url = match.url;
        song.source = 'youtube';
        useLibraryStore.getState().upsertSong(song);
      }
    } catch (e) {
      console.warn('[player.service] No se pudo emparejar con YouTube:', e);
    }
  }

  // 4. Manejo nativo en cliente para canciones de YouTube (en línea)
  const ytId = extractYoutubeId(song);

  if (ytId) {
    player.setCurrentSong(song);
    player.setCurrentTime(0);
    player.setDuration(song.duration ?? 0);
    player.setSourceUrl(song.url);
    player.setOfflinePlayback(false);

    // En la app de escritorio o navegador, probar streams de audio directos de alta fidelidad
    const streamCandidates: string[] = [];
    const desktopPlayer = (window as any).jodifyPlayer;
    if (desktopPlayer && typeof desktopPlayer.resolveStream === 'function') {
      try {
        const directUrl = await desktopPlayer.resolveStream(ytId);
        if (directUrl) streamCandidates.push(directUrl);
      } catch (err) {
        console.warn('[player.service] Error obteniendo stream local:', err);
      }
    }
    // Fallback robusto al stream del backend
    streamCandidates.push(`${API_BASE}/links/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ytId}`)}`);

    for (const streamCandidate of streamCandidates) {
      if (!audio) break;
      try {
        useToastStore.getState().show(`Cargando «${song.name}»…`, 'info', 1200);
        ytPlayerService.stop();
        audio.src = streamCandidate;
        audio.volume = player.volume;
        audio.muted = player.muted;
        await audio.play();
        player.setIsPlaying(true);
        player.setSourceUrl(streamCandidate);
        useToastStore.getState().show(`Reproduciendo «${song.name}»`, 'success', 2000);
        logListeningHistory(song, false);
        return true;
      } catch (err) {
        console.warn(`[player.service] Falló stream directo (${streamCandidate}), probando siguiente opción:`, err);
      }
    }

    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    const ytSuccess = await ytPlayerService.playVideo(ytId);
    if (ytSuccess || !song.url || song.url.includes('youtube.com') || song.url.includes('youtu.be')) {
      player.setIsPlaying(true);
      useToastStore.getState().show(`Reproduciendo «${song.name}»`, 'success', 2000);
      logListeningHistory(song, false);
      return true;
    }
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

  // Si la URL es una búsqueda o Spotify que no se emparejó, enrutarla al endpoint de stream del backend
  if (song.url && (song.url.includes('search_query') || song.url.includes('spotify.com') || song.source === 'spotify')) {
    sourceUrl = `${API_BASE}/links/stream?url=${encodeURIComponent(song.url)}`;
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

  player.setSourceUrl(sourceUrl);
  player.setOfflinePlayback(false);
  player.setIsPlaying(!audio.paused);

  if (settings.fadeEnabled && options.fades !== false) {
    audio.volume = 0;
    rampVolume(audio, player.volume, getFadeMs());
  } else {
    audio.volume = player.volume;
  }

  logListeningHistory(song, false);
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
