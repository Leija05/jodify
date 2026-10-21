import { api } from '../lib/api';
import { cleanArtistName, cleanSongTitle } from '../lib/utils';

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function pickLrclibHit(json: unknown, title: string): { syncedLyrics?: string; plainLyrics?: string } | undefined {
  if (!Array.isArray(json)) return undefined;
  const target = normalize(title);
  const withSynced = json.filter(
    (item: { syncedLyrics?: string }) => typeof item?.syncedLyrics === 'string' && item.syncedLyrics.trim().length > 0,
  );
  const pool = withSynced.length > 0 ? withSynced : json.filter(
    (item: { plainLyrics?: string }) => typeof item?.plainLyrics === 'string' && item.plainLyrics.trim().length > 0,
  );
  if (pool.length === 0) return undefined;
  return (
    pool.find((item: { trackName?: string }) => normalize(item?.trackName ?? '').includes(target))
    ?? (json.find((item: { trackName?: string }) => normalize(item?.trackName ?? '').includes(target)) as
      | { syncedLyrics?: string; plainLyrics?: string }
      | undefined)
    ?? pool[0]
  );
}

async function safeFetchJson(url: string, timeoutMs = 3500): Promise<unknown | null> {
  if (typeof window === 'undefined') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const text = await response.text();
    return JSON.parse(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const inFlight = new Map<string, Promise<string | null>>();
const cache = new Map<string, string | null>();

export function clearLyricsCache(): void {
  inFlight.clear();
  cache.clear();
}

export async function fetchLyrics(name: string, artist?: string): Promise<string | null> {
  const cleanTitle = cleanSongTitle(name);
  if (!cleanTitle) return null;

  const { primary: primaryArtist, full: fullArtist } = cleanArtistName(artist);
  const key = `${fullArtist}|${cleanTitle}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const task = (async (): Promise<string | null> => {
    // 1. Probar en lrclib.net con artista primario y título limpio
    const lrclibUrls: string[] = [];
    if (primaryArtist) {
      lrclibUrls.push(
        `https://lrclib.net/api/search?artist_name=${encodeURIComponent(primaryArtist)}&track_name=${encodeURIComponent(cleanTitle)}`,
      );
    }
    if (fullArtist && fullArtist !== primaryArtist) {
      lrclibUrls.push(
        `https://lrclib.net/api/search?artist_name=${encodeURIComponent(fullArtist)}&track_name=${encodeURIComponent(cleanTitle)}`,
      );
    }
    // Búsqueda general con query combinada como fallback en lrclib
    lrclibUrls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${primaryArtist} ${cleanTitle}`.trim())}`);

    for (const url of lrclibUrls) {
      const json = await safeFetchJson(url, 3000);
      if (Array.isArray(json) && json.length > 0) {
        const hit = pickLrclibHit(json, cleanTitle);
        if (hit?.syncedLyrics || hit?.plainLyrics) {
          return hit.syncedLyrics ?? hit.plainLyrics ?? null;
        }
      }
    }

    // 2. Probar en lyrics.ovh únicamente si disponemos de artista real (nunca el título como artista)
    const ovhArtists = [primaryArtist, fullArtist].filter(Boolean);
    const uniqueOvhArtists = [...new Set(ovhArtists)];

    for (const art of uniqueOvhArtists) {
      const ovhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(art)}/${encodeURIComponent(cleanTitle)}`;
      const json = await safeFetchJson(ovhUrl, 2500);
      if (json && typeof json === 'object') {
        const record = json as { lyrics?: string };
        if (record.lyrics && record.lyrics.trim().length > 0) {
          return record.lyrics.trim();
        }
      }
    }

    return null;
  })();

  inFlight.set(key, task);
  try {
    const result = await task;
    cache.set(key, result);
    return result;
  } finally {
    inFlight.delete(key);
  }
}

export function getNowPlayingFromDb(username: string): void {
  void username;
}

export async function fetchRecentHistory(username: string, limit = 50): Promise<Array<{ song_name: string | null; played_at: string }>> {
  return api.get<Array<{ song_name: string | null; played_at: string }>>(
    `/users/${encodeURIComponent(username)}/history?limit=${limit}`,
  );
}
