import { useEffect, useState } from 'react';
import { useLibraryStore } from '../store/library.store';
import { useSession } from '../context/SessionContext';
import { songsService } from '../services/songs.service';
import { likesService, downloadsService } from '../services/social.service';
import { getAllOfflineIds, getAllSongsOffline } from '../lib/idb';
import type { Song } from '../lib/types';
import { useToastStore } from '../store/toast.store';
import { useUiStore } from '../store/ui.store';

export function useOffline(): { isOffline: boolean } {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { session } = useSession();

  useEffect(() => {
    const onOnline = () => {
      setIsOffline(false);
      useUiStore.getState().close('offline');
      if (session) {
        void loadLibrary(session.username).then(() => {
          useToastStore.getState().show('Volviste a estar en línea', 'success');
        });
      }
    };
    const onOffline = () => {
      setIsOffline(true);
      useUiStore.getState().open('offline');
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [session]);

  return { isOffline };
}

export async function loadLibrary(username: string | null): Promise<void> {
  const library = useLibraryStore.getState();
  library.setRefreshing(true);
  try {
    const offlineSongs = await getAllSongsOffline();
    const offlineKeys = await getAllOfflineIds();

    if (username) {
      const [fetchedSongs, fetchedLikedIds, downloadedIds] = await Promise.all([
        songsService.fetchAll().catch((): Song[] => []),
        likesService.fetchLikedIds(username).catch((): Array<number | string> => []),
        downloadsService.fetchDownloadedIds(username).catch((): Array<number | string> => []),
      ]);
      const songs: Song[] = [...fetchedSongs];
      const likedIds: Array<number | string> = [...fetchedLikedIds];

      // Integrar canciones externas guardadas en Me Gusta
      try {
        const rawCached = localStorage.getItem('jf_external_liked_songs');
        if (rawCached) {
          const cachedSongs: Song[] = JSON.parse(rawCached);
          const existingIds = new Set(songs.map((s) => String(s.id)));
          for (const cs of cachedSongs) {
            if (!existingIds.has(String(cs.id))) {
              songs.push(cs);
              if (!likedIds.some((id) => String(id) === String(cs.id))) {
                likedIds.push(cs.id);
              }
            }
          }
        }
      } catch {}

      // Integrar canciones descargadas en IndexedDB para que SIEMPRE aparezcan aunque no haya red
      const existingSongIds = new Set(songs.map((s) => String(s.id)));
      for (const os of offlineSongs) {
        if (!existingSongIds.has(String(os.id))) {
          songs.push(os);
          existingSongIds.add(String(os.id));
        }
      }

      const combinedDownloaded = Array.from(new Set([...downloadedIds.map(String), ...offlineKeys.map(String)]));

      library.setSongs(songs);
      library.setLikedIds(likedIds);
      library.setDownloadedIds(combinedDownloaded);
    } else {
      const songs = await songsService.fetchAll().catch(() => [] as Song[]);
      const existingSongIds = new Set(songs.map((s) => String(s.id)));
      for (const os of offlineSongs) {
        if (!existingSongIds.has(String(os.id))) {
          songs.push(os);
          existingSongIds.add(String(os.id));
        }
      }
      library.setSongs(songs);
      library.setDownloadedIds(offlineKeys);
    }
    library.setLoaded(true);
  } finally {
    library.setRefreshing(false);
  }
}

export async function enterOfflineMode(): Promise<void> {
  const library = useLibraryStore.getState();
  library.setCurrentTab('downloads');
  const offlineSongs = await getAllSongsOffline();
  const offlineIds = await getAllOfflineIds();

  if (offlineSongs.length > 0) {
    const existingIds = new Set(library.songs.map((s) => String(s.id)));
    for (const os of offlineSongs) {
      if (!existingIds.has(String(os.id))) {
        library.upsertSong(os);
      }
    }
  }

  library.setDownloadedIds(offlineIds);
  library.setLoaded(true);
  useUiStore.getState().close('offline');
}
