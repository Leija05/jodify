import { apiFetch, getActiveApiBase } from './api';
import { API_BASE } from '../lib/constants';
import { mmkv, STORAGE_KEYS } from '../lib/mmkv';
import * as FileSystem from 'expo-file-system';
import type { Song } from '../lib/types';

type DownloadRecord = Song & { localUri: string; savedAt?: number };

const DOWNLOAD_DIR = `${FileSystem.documentDirectory}downloads/`;
const MIN_AUDIO_BYTES = 10240; // 10 KB minimum for a real audio file

async function ensureDownloadDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
  }
}

function getLocalUri(songId: string | number): string {
  return `${DOWNLOAD_DIR}${songId}.mp3`;
}

export async function getDownloadedSongs(): Promise<DownloadRecord[]> {
  try {
    const data = mmkv.getObject<Record<string, DownloadRecord>>(STORAGE_KEYS.downloads) ?? {};
    const valid: DownloadRecord[] = [];
    let hasInvalid = false;

    for (const [key, record] of Object.entries(data)) {
      try {
        const info = await FileSystem.getInfoAsync(record.localUri);
        if (info.exists && (info.size ?? 0) >= MIN_AUDIO_BYTES) {
          valid.push(record);
        } else {
          hasInvalid = true;
          delete data[key];
          if (info.exists) {
            await FileSystem.deleteAsync(record.localUri, { idempotent: true }).catch(() => {});
          }
        }
      } catch {
        hasInvalid = true;
        delete data[key];
      }
    }

    if (hasInvalid) {
      mmkv.setObject(STORAGE_KEYS.downloads, data);
    }

    return valid;
  } catch {
    return [];
  }
}

export async function getDownloadedIds(): Promise<Array<number | string>> {
  const songs = await getDownloadedSongs();
  return songs.map((s) => s.id);
}

export async function isDownloaded(songId: string | number): Promise<boolean> {
  const localUri = getLocalUri(songId);
  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists && (info.size ?? 0) >= MIN_AUDIO_BYTES) {
      return true;
    }
    if (info.exists) {
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
    }
  } catch {}
  return false;
}

export function resolveDownloadUrl(song: Song): string {
  const rawUrl = (song.url || song.stream_url || '').trim();
  const activeBase = (getActiveApiBase() || API_BASE || 'https://jodify-backend.onrender.com').replace(/\/+$/, '');

  // 1. YouTube ID
  if (song.youtube_id && /^[a-zA-Z0-9_-]{11}$/.test(song.youtube_id)) {
    return `${activeBase}/api/links/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${song.youtube_id}`)}`;
  }

  // 2. Full HTTP(S) URL
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    if (
      rawUrl.includes('youtube.com') ||
      rawUrl.includes('youtu.be') ||
      rawUrl.includes('spotify.com') ||
      rawUrl.includes('search_query') ||
      song.source === 'spotify'
    ) {
      return `${activeBase}/api/links/stream?url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  }

  // 3. Relative URL
  if (rawUrl.length > 0) {
    const clean = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    const withApi = clean.startsWith('/api/') ? clean : `/api${clean}`;
    return `${activeBase}${withApi}`;
  }

  // 4. Default to songs audio
  return `${activeBase}/api/songs/${song.id}/audio`;
}

export function startResumableDownload(
  song: Song,
  onProgress?: (data: { totalBytesWritten: number; totalBytesExpectedToWrite: number; percent: number }) => void
): {
  downloadPromise: Promise<DownloadRecord>;
  cancel: () => Promise<void>;
} {
  const localUri = getLocalUri(song.id);
  const fullUrl = resolveDownloadUrl(song);

  let downloadResumable: FileSystem.DownloadResumable | null = null;
  let cancelled = false;

  const downloadPromise = (async () => {
    await ensureDownloadDir();

    // Check if valid file already exists
    const existingInfo = await FileSystem.getInfoAsync(localUri);
    if (existingInfo.exists && (existingInfo.size ?? 0) >= MIN_AUDIO_BYTES) {
      const record: DownloadRecord = { ...song, localUri, savedAt: Date.now() };
      await saveDownloadRecord(record);
      onProgress?.({
        totalBytesWritten: existingInfo.size,
        totalBytesExpectedToWrite: existingInfo.size,
        percent: 100,
      });
      return record;
    } else if (existingInfo.exists) {
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
    }

    const downloadOptions: FileSystem.DownloadOptions = {
      headers: {},
    };

    const token = await apiFetch<string>('/api/auth/token', { method: 'GET' }).catch(() => null);
    if (token) {
      downloadOptions.headers = { Authorization: `Bearer ${token}` };
    }

    downloadResumable = FileSystem.createDownloadResumable(
      fullUrl,
      localUri,
      downloadOptions,
      (progress) => {
        if (cancelled) return;
        const written = progress.totalBytesWritten;
        const total = progress.totalBytesExpectedToWrite;
        let percent = 0;
        if (total > 0) {
          percent = Math.min(100, Math.max(0, Math.round((written / total) * 100)));
        } else if (written > 0) {
          // If total is not provided (chunked streaming), simulate a plausible progress up to 95%
          percent = Math.min(95, Math.max(5, Math.round((written / (5 * 1024 * 1024)) * 100)));
        }
        onProgress?.({
          totalBytesWritten: written,
          totalBytesExpectedToWrite: total,
          percent,
        });
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result || cancelled) {
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
      throw new Error('Descarga cancelada');
    }

    const resultInfo = await FileSystem.getInfoAsync(localUri);
    const fileSize = resultInfo.exists ? resultInfo.size : 0;

    if (result.status >= 200 && result.status < 300 && fileSize >= MIN_AUDIO_BYTES) {
      const record: DownloadRecord = { ...song, localUri, savedAt: Date.now() };
      await saveDownloadRecord(record);
      onProgress?.({
        totalBytesWritten: fileSize,
        totalBytesExpectedToWrite: fileSize,
        percent: 100,
      });
      return record;
    } else {
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
      throw new Error(`Error del servidor (${result.status})`);
    }
  })();

  return {
    downloadPromise,
    cancel: async () => {
      cancelled = true;
      try {
        if (downloadResumable) {
          await downloadResumable.cancelAsync();
        }
      } catch {}
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
    },
  };
}

export async function downloadSong(song: Song): Promise<DownloadRecord> {
  const { downloadPromise } = startResumableDownload(song);
  return await downloadPromise;
}

async function saveDownloadRecord(record: DownloadRecord): Promise<void> {
  const data = mmkv.getObject<Record<string, DownloadRecord>>(STORAGE_KEYS.downloads) ?? {};
  data[String(record.id)] = record;
  mmkv.setObject(STORAGE_KEYS.downloads, data);
}

export async function deleteDownloadedSong(songId: string | number): Promise<void> {
  const localUri = getLocalUri(songId);
  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  }

  const data = mmkv.getObject<Record<string, DownloadRecord>>(STORAGE_KEYS.downloads) ?? {};
  delete data[String(songId)];
  mmkv.setObject(STORAGE_KEYS.downloads, data);
}

export async function clearAllDownloads(): Promise<void> {
  const data = mmkv.getObject<Record<string, DownloadRecord>>(STORAGE_KEYS.downloads) ?? {};
  for (const record of Object.values(data)) {
    const info = await FileSystem.getInfoAsync(record.localUri);
    if (info.exists) {
      await FileSystem.deleteAsync(record.localUri, { idempotent: true });
    }
  }
  mmkv.delete(STORAGE_KEYS.downloads);
}

export async function getDownloadProgress(songId: string | number): Promise<number> {
  const downloaded = await isDownloaded(songId);
  return downloaded ? 100 : 0;
}