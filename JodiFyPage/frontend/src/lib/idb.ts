import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { OfflineSong } from './types';

interface JodifyDB extends DBSchema {
  songs: {
    key: number | string;
    value: OfflineSong;
  };
}

let dbPromise: Promise<IDBPDatabase<JodifyDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<JodifyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<JodifyDB>('MusicOfflineDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveSongOffline(song: OfflineSong): Promise<void> {
  const db = await getDB();
  await db.put('songs', song);
}

export async function getSongOffline(id: number | string): Promise<OfflineSong | undefined> {
  const db = await getDB();
  return db.get('songs', id);
}

export async function getAllSongsOffline(): Promise<OfflineSong[]> {
  const db = await getDB();
  return db.getAll('songs');
}

export async function getAllOfflineIds(): Promise<Array<number | string>> {
  const db = await getDB();
  return db.getAllKeys('songs');
}

export async function deleteSongOffline(id: number | string): Promise<void> {
  const db = await getDB();
  await db.delete('songs', id);
}
