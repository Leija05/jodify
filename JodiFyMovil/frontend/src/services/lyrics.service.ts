import { apiFetch } from './api';
import { parseLyrics, type ParsedLyrics } from '../lib/lrc';
import type { LyricsLine } from '../lib/types';

export async function fetchLyrics(songName: string, artist?: string): Promise<LyricsLine[]> {
  try {
    const params = new URLSearchParams({ song: songName });
    if (artist) params.append('artist', artist);
    const res = await apiFetch<{ lyrics: string; synced: boolean }>(`/api/lyrics?${params.toString()}`);
    if (res.lyrics) {
      const parsed = parseLyrics(res.lyrics);
      return parsed.lines;
    }
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