/**
 * JodiFy Audio Buffer & Local Cache Service (IndexedDB)
 * Implements high-performance local caching for played and queued audio tracks.
 * Provides 0ms instant track transitions and seamless network drop resilience.
 */

import { openDB, type IDBPDatabase } from 'idb';

interface CachedAudioRecord {
  songId: string | number;
  blob: Blob;
  mimeType: string;
  cachedAt: number;
  lastAccessed: number;
  size: number;
}

const DB_NAME = 'JodifyAudioCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'audio_cache';
const MAX_CACHED_TRACKS = 35; // Maximum cached songs in LRU buffer
const inMemoryBlobUrls = new Map<string | number, string>();
let dbPromise: Promise<IDBPDatabase | null> | null = null;

async function getCacheDB(): Promise<IDBPDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'songId' });
          store.createIndex('lastAccessed', 'lastAccessed');
        }
      },
    }).catch((err) => {
      console.warn('[audioCache] IndexedDB indisponible:', err);
      dbPromise = null;
      return null;
    });
  }
  return dbPromise;
}

export const audioCacheService = {
  /**
   * Returns a hot blob: URL for immediate 0ms playback if track is cached.
   */
  async getCachedAudioUrl(songId: string | number): Promise<string | null> {
    const memUrl = inMemoryBlobUrls.get(songId);
    if (memUrl) return memUrl;

    try {
      const db = await getCacheDB();
      if (!db) return null;
      const record = (await db.get(STORE_NAME, songId)) as CachedAudioRecord | undefined;
      if (record && record.blob) {
        // Update access time for LRU
        record.lastAccessed = Date.now();
        void db.put(STORE_NAME, record).catch(() => undefined);

        const blobUrl = URL.createObjectURL(record.blob);
        inMemoryBlobUrls.set(songId, blobUrl);
        return blobUrl;
      }
    } catch (e) {
      console.warn('[audioCache] Error leyendo caché:', e);
    }
    return null;
  },

  /**
   * Checks if a track exists in cache.
   */
  async has(songId: string | number): Promise<boolean> {
    if (inMemoryBlobUrls.has(songId)) return true;
    const db = await getCacheDB();
    if (!db) return false;
    const count = await db.count(STORE_NAME, songId);
    return count > 0;
  },

  /**
   * Caches an audio track in the background and returns its hot object URL.
   */
  async cacheTrack(songId: string | number, streamUrl: string): Promise<string | null> {
    if (!songId || !streamUrl || streamUrl.startsWith('blob:')) return null;

    try {
      // Avoid duplicate fetches if already in memory
      if (inMemoryBlobUrls.has(songId)) {
        return inMemoryBlobUrls.get(songId)!;
      }

      const response = await fetch(streamUrl, {
        headers: { Accept: 'audio/*, application/octet-stream' },
      });

      if (!response.ok) return null;

      const blob = await response.blob();
      if (!blob || blob.size < 1024) return null;

      const record: CachedAudioRecord = {
        songId,
        blob,
        mimeType: blob.type || 'audio/mpeg',
        cachedAt: Date.now(),
        lastAccessed: Date.now(),
        size: blob.size,
      };

      const db = await getCacheDB();
      if (db) {
        await db.put(STORE_NAME, record);
        await this.evictOldRecords(db);
      }

      const blobUrl = URL.createObjectURL(blob);
      inMemoryBlobUrls.set(songId, blobUrl);
      return blobUrl;
    } catch (err) {
      console.warn('[audioCache] Error almacenando track en caché:', err);
      return null;
    }
  },

  /**
   * Evicts least recently used tracks when cache limit is exceeded.
   */
  async evictOldRecords(db: IDBPDatabase): Promise<void> {
    try {
      const count = await db.count(STORE_NAME);
      if (count <= MAX_CACHED_TRACKS) return;

      const tx = db.transaction(STORE_NAME, 'readwrite');
      const index = tx.store.index('lastAccessed');
      let cursor = await index.openCursor();
      let toRemove = count - MAX_CACHED_TRACKS;

      while (cursor && toRemove > 0) {
        const id = cursor.primaryKey as string | number;
        // Revoke memory URL if open
        const memUrl = inMemoryBlobUrls.get(id);
        if (memUrl) {
          try {
            URL.revokeObjectURL(memUrl);
          } catch {}
          inMemoryBlobUrls.delete(id);
        }
        await cursor.delete();
        toRemove--;
        cursor = await cursor.continue();
      }
      await tx.done;
    } catch {
      /* best-effort */
    }
  },

  /**
   * Clears the entire local audio cache.
   */
  async clearAll(): Promise<void> {
    inMemoryBlobUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    inMemoryBlobUrls.clear();

    const db = await getCacheDB();
    if (db) {
      await db.clear(STORE_NAME).catch(() => undefined);
    }
  },
};
