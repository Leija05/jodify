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
      const library = useLibraryStore.getState();
      if (library.currentTab === 'downloads') {
        library.setCurrentTab('global');
      }
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

const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);

export async function loadLibrary(username: string | null): Promise<void> {
  const library = useLibraryStore.getState();
  library.setRefreshing(true);
  try {
    const offlineSongs = await getAllSongsOffline();
    const offlineKeys = await getAllOfflineIds();

    // 1. DISPONIBILIDAD OFFLINE INSTANTÁNEA (0ms):
    // Inyectar inmediatamente lo descargado en la memoria activa para que el usuario nunca espere
    if (offlineSongs.length > 0) {
      const existingIds = new Set(library.songs.map((s) => String(s.id)));
      const initialMerged = [...library.songs];
      for (const os of offlineSongs) {
        if (!existingIds.has(String(os.id))) {
          initialMerged.push(os);
          existingIds.add(String(os.id));
        }
      }
      library.setSongs(initialMerged);
      library.setDownloadedIds(offlineKeys);
      library.setLoaded(true);
    }

    // 2. Si no hay conexión o estamos en modo offline, no bloquear en llamadas remotas
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      library.setLoaded(true);
      return;
    }

    const effectiveUser = username || (typeof localStorage !== 'undefined' ? localStorage.getItem('currentUserName') : null);

    // 3. Sincronización en línea con protección de timeout (18s para soportar arranque en frío de Render)
    if (effectiveUser) {
      const [fetchedSongs, fetchedLikedIds, downloadedIds] = await Promise.all([
        withTimeout(songsService.fetchAll().catch((): Song[] => []), 18000, []),
        withTimeout(likesService.fetchLikedIds(effectiveUser).catch((): Array<number | string> => []), 10000, []),
        withTimeout(downloadsService.fetchDownloadedIds(effectiveUser).catch((): Array<number | string> => []), 10000, []),
      ]);
      const songs: Song[] = [...fetchedSongs];
      const likedIds: Array<number | string> = [...fetchedLikedIds];

      const norm = (s?: string) => (s || '').trim().toLowerCase();
      const songKey = (s: { name?: string; artist?: string }) => `${norm(s.name)}|${norm(s.artist)}`;

      const existingIds = new Set(songs.map((s) => String(s.id)));
      const existingKeys = new Map<string, Song>();
      const existingYtIds = new Map<string, Song>();

      for (const s of songs) {
        existingKeys.set(songKey(s), s);
        if (s.youtube_id) existingYtIds.set(String(s.youtube_id), s);
      }

      // Integrar y conciliar canciones externas guardadas en Me Gusta (con deduplicación inteligente)
      try {
        const rawCached = localStorage.getItem('jf_external_liked_songs');
        if (rawCached) {
          const cachedSongs: Song[] = JSON.parse(rawCached);

          const genuinelyNewSongs: Song[] = [];
          const updatedCachedSongs: Song[] = [];

          for (const cs of cachedSongs) {
            const key = songKey(cs);
            const csYt = cs.youtube_id;
            const matched =
              (cs.id && existingIds.has(String(cs.id)) ? songs.find((s) => String(s.id) === String(cs.id)) : undefined) ||
              existingKeys.get(key) ||
              (csYt ? existingYtIds.get(String(csYt)) : undefined);

            if (matched) {
              // Ya existe en la base de datos oficial: vincular al ID oficial y no duplicar
              updatedCachedSongs.push({ ...cs, id: matched.id });
              if (!likedIds.some((id) => String(id) === String(matched.id))) {
                likedIds.push(matched.id);
              }
            } else {
              // Es una canción verdaderamente nueva y externa
              songs.push(cs);
              existingIds.add(String(cs.id));
              existingKeys.set(key, cs);
              if (csYt) existingYtIds.set(String(csYt), cs);
              if (!likedIds.some((id) => String(id) === String(cs.id))) {
                likedIds.push(cs.id);
              }
              genuinelyNewSongs.push(cs);
              updatedCachedSongs.push(cs);
            }
          }

          localStorage.setItem('jf_external_liked_songs', JSON.stringify(updatedCachedSongs));

          // Auto-sincronizar canciones externas nuevas hacia la base de datos central en la nube
          if (genuinelyNewSongs.length > 0) {
            const batchPayload = genuinelyNewSongs.map((v) => ({
              name: v.name,
              artist: v.artist,
              album: v.album || 'Enlace Web',
              url: v.url || '',
              youtube_id: v.youtube_id,
              cover_url: v.cover_url,
              duration: v.duration,
              added_by: effectiveUser || 'Sincronización',
              liked_by: effectiveUser || undefined,
            }));
            void songsService
              .registerBatch(batchPayload, true)
              .then((res) => {
                if (res.added && res.added.length > 0) {
                  for (const song of res.added) {
                    useLibraryStore.getState().upsertSong(song);
                  }
                }
              })
              .catch(() => undefined);
          }
        }
      } catch {}

      // Integrar canciones descargadas en IndexedDB para que SIEMPRE aparezcan aunque no haya red
      for (const os of offlineSongs) {
        const key = songKey(os);
        const osYt = os.youtube_id;
        const exists =
          existingIds.has(String(os.id)) ||
          existingKeys.has(key) ||
          (osYt && existingYtIds.has(String(osYt)));
        if (!exists) {
          songs.push(os);
          existingIds.add(String(os.id));
          existingKeys.set(key, os);
          if (osYt) existingYtIds.set(String(osYt), os);
        }
      }

      const combinedDownloaded = Array.from(new Set([...downloadedIds.map(String), ...offlineKeys.map(String)]));

      library.setSongs(songs);
      library.setLikedIds(likedIds);
      library.setDownloadedIds(combinedDownloaded);
    } else {
      const songs = await withTimeout(songsService.fetchAll().catch(() => [] as Song[]), 18000, []);
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
    const merged = [...library.songs];
    for (const os of offlineSongs) {
      if (!existingIds.has(String(os.id))) {
        merged.push(os);
        existingIds.add(String(os.id));
      }
    }
    library.setSongs(merged);
  }

  library.setDownloadedIds(offlineIds);
  library.setLoaded(true);
  useUiStore.getState().close('offline');
  useToastStore.getState().show('Modo sin conexión activado', 'info', 2000);
}
