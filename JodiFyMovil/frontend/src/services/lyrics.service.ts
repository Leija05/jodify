import { apiFetch } from './api';
import { parseLyrics, type ParsedLyrics } from '../lib/lrc';
import type { LyricsLine } from '../lib/types';

const lyricsCache = new Map<string, LyricsLine[]>();

export function getPreloadedLyrics(songName: string, artist?: string): LyricsLine[] | null {
  const key = `${songName.trim().toLowerCase()}:::${(artist ?? '').trim().toLowerCase()}`;
  return lyricsCache.get(key) ?? null;
}

export function cacheLyrics(songName: string, lines: LyricsLine[], artist?: string): void {
  const key = `${songName.trim().toLowerCase()}:::${(artist ?? '').trim().toLowerCase()}`;
  lyricsCache.set(key, lines);
}

export async function fetchLyrics(songName: string, artist?: string): Promise<LyricsLine[]> {
  const key = `${songName.trim().toLowerCase()}:::${(artist ?? '').trim().toLowerCase()}`;
  const cached = lyricsCache.get(key);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({ song: songName });
    if (artist) params.append('artist', artist);
    const res = await apiFetch<{ lyrics: string; synced: boolean }>(`/api/lyrics?${params.toString()}`);
    if (res.lyrics) {
      const parsed = parseLyrics(res.lyrics);
      lyricsCache.set(key, parsed.lines);
      return parsed.lines;
    }
    lyricsCache.set(key, []);
    return [];
  } catch {
    return [];
  }
}

export function lyricsFromSong(lyrics?: string): LyricsLine[] | null {
  if (!lyrics) return null;
  const parsed = parseLyrics(lyrics);
  return parsed.lines;
}

export async function getLyricsWithMeta(songName: string, artist?: string): Promise<ParsedLyrics> {
  try {
    const params = new URLSearchParams({ song: songName });
    if (artist) params.append('artist', artist);
    const res = await apiFetch<{ lyrics: string; synced: boolean }>(`/api/lyrics?${params.toString()}`);
    if (res.lyrics) {
      return parseLyrics(res.lyrics);
    }
    return { lines: [], synced: false, format: 'plain' };
  } catch {
    return { lines: [], synced: false, format: 'plain' };
  }
}