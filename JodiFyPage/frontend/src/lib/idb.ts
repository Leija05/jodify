import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { OfflineSong } from './types';

interface JodifyDB extends DBSchema {
  songs: {
    key: number | string;
    value: OfflineSong;
  };
}

let dbPromise: Promise<IDBPDatabase<JodifyDB>> | null = null;

export async function getDB(): Promise<IDBPDatabase<JodifyDB> | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB<JodifyDB>('MusicOfflineDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs', { keyPath: 'id' });
        }
      },
    }).catch((err) => {
      console.warn('[idb] IndexedDB no disponible o bloqueada:', err);
      dbPromise = null;
      return null as any;
    });
  }
  try {
    const db = await dbPromise;
    return db || null;
  } catch (err) {
    console.warn('[idb] Error accediendo a IndexedDB:', err);
    dbPromise = null;
    return null;
  }
}

export async function saveSongOffline(song: OfflineSong): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;
    await db.put('songs', song);
  } catch (err) {
    console.warn('[idb] Error guardando canción offline:', err);
  }
}

export async function getSongOffline(id: number | string): Promise<OfflineSong | undefined> {
  try {
    const db = await getDB();
    if (!db) return undefined;
    let res = await db.get('songs', id);
    if (!res && typeof id === 'string' && !isNaN(Number(id))) {
      res = await db.get('songs', Number(id));
    } else if (!res && typeof id === 'number') {
      res = await db.get('songs', String(id));
    }
    return res;
  } catch (err) {
    console.warn('[idb] Error obteniendo canción offline:', err);
    return undefined;
  }
}

function parseYtId(target?: string | null): string | null {
  if (!target) return null;
  const str = String(target).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  const m = str.match(/(?:watch\?v=|youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export async function findSongOffline(song: {
  id?: number | string;
  youtube_id?: string;
  url?: string;
  name?: string;
  artist?: string;
}): Promise<OfflineSong | undefined> {
  try {
    if (song.id != null) {
      const direct = await getSongOffline(song.id);
      if (direct) return direct;
    }

    const all = await getAllSongsOffline();
    if (!all || all.length === 0) return undefined;

    const queryYt = song.youtube_id || parseYtId(song.url);
    const queryName = song.name ? song.name.trim().toLowerCase() : '';
    const queryArtist = song.artist ? song.artist.trim().toLowerCase() : '';

    for (const item of all) {
      if (song.id != null && String(item.id) === String(song.id)) return item;
      const itemYt = item.youtube_id || parseYtId(item.url);
      if (queryYt && itemYt && queryYt === itemYt) return item;
      if (song.url && item.url && song.url.trim() === item.url.trim()) return item;
      if (
        queryName &&
        item.name &&
        item.name.trim().toLowerCase() === queryName &&
        (!queryArtist || (item.artist && item.artist.trim().toLowerCase() === queryArtist))
      ) {
        return item;
      }
    }
    return undefined;
  } catch (err) {
    console.warn('[idb] Error en findSongOffline:', err);
    return undefined;
  }
}

export async function getAllSongsOffline(): Promise<OfflineSong[]> {
  try {
    const db = await getDB();
    if (!db) return [];
    return await db.getAll('songs');
  } catch (err) {
    console.warn('[idb] Error obteniendo canciones offline:', err);
    return [];
  }
}

export async function getAllOfflineIds(): Promise<Array<number | string>> {
  try {
    const db = await getDB();
    if (!db) return [];
    return await db.getAllKeys('songs');
  } catch (err) {
    console.warn('[idb] Error obteniendo IDs offline:', err);
    return [];
  }
}

export async function deleteSongOffline(id: number | string): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;
    await db.delete('songs', id);
    if (typeof id === 'string' && !isNaN(Number(id))) {
      await db.delete('songs', Number(id));
    } else if (typeof id === 'number') {
      await db.delete('songs', String(id));
    }
  } catch (err) {
    console.warn('[idb] Error eliminando canción offline:', err);
  }
}
