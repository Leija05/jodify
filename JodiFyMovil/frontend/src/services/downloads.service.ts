import { apiFetch } from './api';
import { API_BASE } from '../lib/constants';
import { mmkv, STORAGE_KEYS } from '../lib/mmkv';
import * as FileSystem from 'expo-file-system';
import type { Song } from '../lib/types';

type DownloadRecord = Song & { localUri: string; savedAt?: number };

const DOWNLOAD_DIR = `${FileSystem.documentDirectory}downloads/`;

async function ensureDownloadDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
  }
}

function getLocalUri(songId: string | number): string {
  return `${DOWNLOAD_DIR}${songId}.mp3`;
}

export async function getDownloadedIds(): Promise<Array<number | string>> {
  try {
    const data = mmkv.getObject<Record<string, DownloadRecord>>(STORAGE_KEYS.downloads) ?? {};
    return Object.keys(data);
  } catch {
    return [];
  }
}

export async function getDownloadedSongs(): Promise<DownloadRecord[]> {
  try {
    const data = mmkv.getObject<Record<string, DownloadRecord>>(STORAGE_KEYS.downloads) ?? {};
    return Object.values(data);
  } catch {
    return [];
  }
}

export async function isDownloaded(songId: string | number): Promise<boolean> {
  const ids = await getDownloadedIds();
  return ids.some((id) => String(id) === String(songId));
}

export async function downloadSong(song: Song): Promise<DownloadRecord> {
  await ensureDownloadDir();

  const localUri = getLocalUri(song.id);
  const existingInfo = await FileSystem.getInfoAsync(localUri);
  if (existingInfo.exists) {
    const record: DownloadRecord = { ...song, localUri, savedAt: Date.now() };
    await saveDownloadRecord(record);
    return record;
  }

  const sourceUrl = song.url?.startsWith('http') ? song.url : `${song.url?.startsWith('/') ? '' : '/api/songs'}/${song.id}/audio`;
  const fullUrl = sourceUrl.startsWith('http') ? sourceUrl : `${API_BASE}${sourceUrl}`;

  const downloadOptions: FileSystem.DownloadOptions = {
    headers: {},
  };

  const token = await apiFetch<string>('/api/auth/token', { method: 'GET' }).catch(() => null);
  if (token) {
    downloadOptions.headers = { Authorization: `Bearer ${token}` };
  }

  const result: FileSystem.DownloadResult = await FileSystem.downloadAsync(fullUrl, localUri, downloadOptions);

  if (result.status === 200) {
    const record: DownloadRecord = { ...song, localUri, savedAt: Date.now() };
    await saveDownloadRecord(record);
    return record;
  } else {
    throw new Error(`Download failed with status ${result.status}`);
  }
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