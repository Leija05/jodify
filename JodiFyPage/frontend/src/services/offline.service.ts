import { saveSongOffline, getSongOffline, deleteSongOffline } from '../lib/idb';
import { resolveMediaUrl } from '../lib/utils';
import { downloadsService } from './social.service';
import { useLibraryStore } from '../store/library.store';
import { useToastStore } from '../store/toast.store';
import { songsService } from './songs.service';
import type { Song } from '../lib/types';

export async function downloadSong(song: Song, username: string): Promise<void> {
  try {
    const existing = await getSongOffline(song.id);
    if (existing) {
      useToastStore.getState().show('Ya está descargada', 'info', 1800);
      return;
    }
    const response = await fetch(resolveMediaUrl(song.url));
    if (!response.ok) throw new Error('fetch failed');
    const blob = await response.blob();
    await saveSongOffline({ ...song, blob, savedAt: Date.now() });
    await downloadsService.markDownload(username, song.id);
    const library = useLibraryStore.getState();
    library.setDownloadedIds([...new Set([...library.downloadedIds, song.id])]);
    useToastStore.getState().show(`«${song.name}» descargada`, 'success');
  } catch (error) {
    useToastStore.getState().show('Falló la descarga', 'error');
    console.error(error);
  }
}

export async function removeDownload(songId: number | string, username: string): Promise<void> {
  await deleteSongOffline(songId);
  await downloadsService.removeDownload(username, songId).catch(() => undefined);
  const library = useLibraryStore.getState();
  library.setDownloadedIds(library.downloadedIds.filter((id) => id !== songId));
  useToastStore.getState().show('Descarga eliminada', 'info', 1800);
}

export async function downloadAllSongs(songs: Song[], username: string): Promise<void> {
  useToastStore.getState().show(`Descargando ${songs.length} canciones…`, 'info');
  let ok = 0;
  for (const song of songs) {
    try {
      await downloadSong(song, username);
      ok++;
    } catch {
      /* keep going */
    }
  }
  useToastStore.getState().show(`${ok}/${songs.length} canciones descargadas`, ok === songs.length ? 'success' : 'warning');
}

export async function refreshLibraryAfterDelete(): Promise<void> {
  const songs = await songsService.fetchAll();
  useLibraryStore.getState().setSongs(songs);
}
