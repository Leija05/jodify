import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { STORAGE_KEYS } from '../lib/constants';
import type { DownloadRecord, Song } from '../lib/types';
import { resolveMediaUrl } from '../lib/utils';

const MUSIC_DIR = new Directory(Paths.document, 'music');

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80);
}

async function ensureMusicDir(): Promise<void> {
  if (!MUSIC_DIR.exists) MUSIC_DIR.create({ intermediates: true, idempotent: true });
}

async function readRecords(): Promise<DownloadRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.downloaded);
    return raw ? (JSON.parse(raw) as DownloadRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeRecords(records: DownloadRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.downloaded, JSON.stringify(records));
}

export async function downloadSong(song: Song): Promise<DownloadRecord> {
  await ensureMusicDir();
  const url = resolveMediaUrl(song.url);
  if (!url) throw new Error('La canción no tiene URL de audio');

  const file = new File(MUSIC_DIR, `${sanitizeName(String(song.id))}.mp3`);
  if (file.exists) file.delete();

  await File.downloadFileAsync(url, file, { idempotent: true });

  const record: DownloadRecord = {
    ...song,
    localUri: file.uri,
    savedAt: Date.now(),
  };

  const records = await readRecords();
  const next = records.filter((r) => String(r.id) !== String(song.id));
  next.push(record);
  await writeRecords(next);
  return record;
}

export async function getDownloadedSongs(): Promise<DownloadRecord[]> {
  const records = await readRecords();
  return records
    .filter((r) => {
      try {
        return new File(r.localUri).exists;
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.savedAt - a.savedAt);
}

export async function deleteDownloadedSong(songId: number | string): Promise<void> {
  const records = await readRecords();
  const target = records.find((r) => String(r.id) === String(songId));
  if (target) {
    try {
      const f = new File(target.localUri);
      if (f.exists) f.delete();
    } catch {
      // archivo ya no existe
    }
  }
  await writeRecords(records.filter((r) => String(r.id) !== String(songId)));
}

export async function isSongDownloaded(songId: number | string): Promise<boolean> {
  const records = await readRecords();
  return records.some((r) => String(r.id) === String(songId));
}

export async function clearAllDownloads(): Promise<void> {
  await ensureMusicDir();
  for (const child of MUSIC_DIR.list()) {
    try {
      child.delete();
    } catch {
      // ignorar
    }
  }
  await writeRecords([]);
}

export async function getDownloadedIds(): Promise<Array<number | string>> {
  const records = await readRecords();
  return records.map((r) => r.id);
}

export async function getDownloadedRecord(songId: number | string): Promise<DownloadRecord | null> {
  const records = await readRecords();
  return records.find((r) => String(r.id) === String(songId)) ?? null;
}