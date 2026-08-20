import type { LyricsLine } from '../lib/types';
import { isSynced, parseLrc, plainLines } from '../lib/lrc';

const LRCLIB_API = 'https://lrclib.net/api';
const LYRICS_OVH_API = 'https://api.lyrics.ovh/v1';

const cache = new Map<string, LyricsLine[] | null>();

function cacheKey(name: string, artist?: string): string {
  return `${artist ?? ''}::${name}`.toLowerCase();
}

export function hasCachedLyrics(name: string, artist?: string): boolean {
  return cache.has(cacheKey(name, artist));
}

function pickLrc(text: string): string | null {
  if (!text) return null;
  const lrcIdx = text.indexOf('[ti:');
  const timeTagIdx = text.indexOf('[');
  if (lrcIdx !== -1 || timeTagIdx === 0 || /\[\d{1,2}:\d{1,2}/.test(text.slice(0, 40))) return text;
  return null;
}

export async function fetchLyrics(name: string, artist?: string): Promise<LyricsLine[] | null> {
  const key = cacheKey(name, artist);
  if (cache.has(key)) return cache.get(key) ?? null;

  let lines: LyricsLine[] | null = null;

  try {
    const res = await fetch(
      `${LRCLIB_API}/search?track_name=${encodeURIComponent(name)}&artist_name=${encodeURIComponent(artist ?? '')}&synced=true`,
    );
    if (res.ok) {
      const results = (await res.json()) as Array<{ syncedLyrics?: string; plainLyrics?: string }>;
      const first = results.find((r) => r.syncedLyrics) ?? results[0];
      const raw = first?.syncedLyrics ?? first?.plainLyrics;
      const lrc = raw ? pickLrc(raw) : null;
      if (lrc) {
        const parsed = parseLrc(lrc);
        if (parsed.length > 0 && isSynced(parsed)) lines = parsed;
      }
    }
  } catch {
    // fallback below
  }

  if (!lines && artist) {
    try {
      const res = await fetch(`${LYRICS_OVH_API}/${encodeURIComponent(artist)}/${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = (await res.json()) as { lyrics?: string };
        if (data.lyrics && !/^No lyrics/i.test(data.lyrics)) lines = plainLines(data.lyrics);
      }
    } catch {
      // give up
    }
  }

  cache.set(key, lines);
  return lines;
}

export function lyricsFromSong(songLyrics?: string): LyricsLine[] | null {
  if (!songLyrics) return null;
  const lrc = pickLrc(songLyrics);
  const parsed = lrc ? parseLrc(lrc) : plainLines(songLyrics);
  return parsed.length > 0 ? parsed : null;
}
