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
    return await db.get('songs', id);
  } catch (err) {
    console.warn('[idb] Error obteniendo canción offline:', err);
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
  } catch (err) {
    console.warn('[idb] Error eliminando canción offline:', err);
  }
}
