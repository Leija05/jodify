import { useEffect, useState } from 'react';
import { useLibraryStore } from '../store/library.store';
import { useSession } from '../context/SessionContext';
import { songsService } from '../services/songs.service';
import { likesService, downloadsService } from '../services/social.service';
import { getAllOfflineIds } from '../lib/idb';
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
    if (username) {
      const [songs, likedIds, downloadedIds] = await Promise.all([
        songsService.fetchAll().catch(() => [] as never[]),
        likesService.fetchLikedIds(username).catch(() => []),
        downloadsService.fetchDownloadedIds(username).catch(() => []),
      ]);
      library.setSongs(songs);
      library.setLikedIds(likedIds);
      library.setDownloadedIds(downloadedIds);
    } else {
      const songs = await songsService.fetchAll().catch(() => [] as never[]);
      const offlineIds = await getAllOfflineIds();
      library.setSongs(songs);
      library.setDownloadedIds(offlineIds);
    }
    library.setLoaded(true);
  } finally {
    library.setRefreshing(false);
  }
}

export async function enterOfflineMode(): Promise<void> {
  const library = useLibraryStore.getState();
  library.setCurrentTab('downloads');
  const offlineIds = await getAllOfflineIds();
  library.setDownloadedIds(offlineIds);
  library.setLoaded(true);
  useUiStore.getState().close('offline');
}
