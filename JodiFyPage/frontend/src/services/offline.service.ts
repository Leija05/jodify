import { saveSongOffline, getSongOffline, deleteSongOffline } from '../lib/idb';
import { resolveMediaUrl, getSongCoverCandidates } from '../lib/utils';
import { downloadsService } from './social.service';
import { useLibraryStore } from '../store/library.store';
import { useToastStore } from '../store/toast.store';
import { useDownloadsStore } from '../store/downloads.store';
import type { Song } from '../lib/types';
import { linksService } from './links.service';
import { extractYoutubeId } from './player.service';

/**
 * Descarga con seguimiento real de bytes y cálculo de porcentaje progresivo.
 */
async function fetchAudioWithProgress(
  url: string,
  onProgress?: (receivedBytes: number, totalBytes: number, percent: number) => void
): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Error al transferir audio`);

  const contentLength = res.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

  if (!res.body) {
    const b = await res.blob();
    if (onProgress) onProgress(b.size, b.size, 100);
    return b;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      receivedBytes += value.length;
      if (onProgress) {
        if (totalBytes > 0) {
          const percent = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
          onProgress(receivedBytes, totalBytes, percent);
        } else {
          // Estimación adaptativa si el servidor no envía Content-Length
          const estimatedTotal = Math.max(receivedBytes * 1.3, 4 * 1024 * 1024);
          const percent = Math.min(95, Math.round((receivedBytes / estimatedTotal) * 100));
          onProgress(receivedBytes, estimatedTotal, percent);
        }
      }
    }
  }

  const contentType = res.headers.get('content-type') || 'audio/mpeg';
  const blob = new Blob(chunks, { type: contentType });
  if (onProgress) {
    onProgress(blob.size, blob.size, 100);
  }
  return blob;
}

async function fetchImageAsDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const resolved = resolveMediaUrl(url);
    const res = await fetch(resolved, { mode: 'cors' }).catch(() => null);
    if (!res || !res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadSong(song: Song, username?: string | null): Promise<void> {
  const dlStore = useDownloadsStore.getState();
  const effectiveUser = username || localStorage.getItem('currentUserName') || 'local_user';

  try {
    const existing = await getSongOffline(song.id);
    if (existing) {
      useToastStore.getState().show(`«${song.name}» ya está descargada`, 'info', 1800);
      return;
    }

    // Registra la tarea y abre el modal de progreso
    dlStore.enqueueDownload(song);
    dlStore.openModal();

    const onProgress = (received: number, total: number, percent: number) => {
      dlStore.updateProgress(song.id, received, total, percent);
    };

    const ytId = extractYoutubeId(song);
    let blob: Blob | null = null;

    // 1. En Electron con canciones de YouTube, intentar primero el stream local sin restricciones CORS
    const desktopPlayer = (window as any).jodifyPlayer;
    if (ytId && desktopPlayer && typeof desktopPlayer.resolveStream === 'function') {
      try {
        const localStream = await desktopPlayer.resolveStream(ytId);
        if (localStream) {
          blob = await fetchAudioWithProgress(localStream, onProgress);
        }
      } catch (e) {
        console.warn('[offline.service] Stream local de Electron no disponible, recurriendo a proxy:', e);
      }
    }

    // 2. Si no se obtuvo por Electron (o es web / otro enlace), intentar con el proxy del backend o media local
    if (!blob || blob.size < 1000) {
      const isExternal = Boolean(ytId) ||
        (Boolean(song.url) && (song.url.startsWith('http://') || song.url.startsWith('https://')) &&
         (song.url.includes('youtube.com') || song.url.includes('youtu.be') || song.url.includes('spotify.com') || song.url.includes('soundcloud.com')));

      let targetUrl: string;
      if (isExternal) {
        const rawTarget = (song.url && (song.url.includes('youtube.com') || song.url.includes('youtu.be')))
          ? song.url
          : (ytId ? `https://www.youtube.com/watch?v=${ytId}` : (song.url || ''));
        targetUrl = linksService.getDownloadUrl(rawTarget, `${song.name}.mp3`);
      } else {
        targetUrl = resolveMediaUrl(song.url);
      }

      blob = await fetchAudioWithProgress(targetUrl, onProgress);
      if (!blob || blob.size < 1000) throw new Error('Archivo de audio descargado corrupto o vacío');
    }

    // Guardar carátula como Data URL para que se vea siempre sin conexión
    let offlineCover: string | null = null;
    try {
      const coverCandidates = getSongCoverCandidates(song as unknown as Record<string, unknown>);
      if (coverCandidates.length > 0) {
        offlineCover = await fetchImageAsDataUrl(coverCandidates[0]);
      }
    } catch {}

    const offlinePayload = {
      ...song,
      blob,
      savedAt: Date.now(),
      offline_cover: offlineCover || (song as any).offline_cover,
    };

    await saveSongOffline(offlinePayload);
    if (effectiveUser && effectiveUser !== 'local_user') {
      await downloadsService.markDownload(effectiveUser, song.id).catch(() => undefined);
    }

    const library = useLibraryStore.getState();
    const updatedIds = Array.from(new Set([...library.downloadedIds.map(String), String(song.id)]));
    library.setDownloadedIds(updatedIds);
    library.upsertSong(offlinePayload);

    dlStore.finishDownload(song.id);
    useToastStore.getState().show(`«${song.name}» guardada sin conexión ✓`, 'success', 2200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Falló la descarga';
    dlStore.failDownload(song.id, msg);
    useToastStore.getState().show(`Error al descargar «${song.name}»`, 'error');
    console.error('[offline.service] Error descargando canción:', error);
  }
}

export async function removeDownload(songId: number | string, username?: string | null): Promise<void> {
  const effectiveUser = username || localStorage.getItem('currentUserName');
  await deleteSongOffline(songId);
  if (effectiveUser) {
    await downloadsService.removeDownload(effectiveUser, songId).catch(() => undefined);
  }
  const library = useLibraryStore.getState();
  library.setDownloadedIds(library.downloadedIds.filter((id) => String(id) !== String(songId)));
  useToastStore.getState().show('Descarga eliminada', 'info', 1800);
}

export async function downloadAllSongs(songs: Song[], username: string): Promise<void> {
  const dlStore = useDownloadsStore.getState();
  dlStore.openModal();
  useToastStore.getState().show(`Descargando ${songs.length} canciones…`, 'info', 3000);

  let ok = 0;
  for (const song of songs) {
    try {
      await downloadSong(song, username);
      ok++;
    } catch {
      /* continue with rest */
    }
  }
  useToastStore.getState().show(`${ok}/${songs.length} canciones descargadas`, ok === songs.length ? 'success' : 'warning');
}

export async function refreshLibraryAfterDelete(): Promise<void> {
  // no-op placeholder
}
