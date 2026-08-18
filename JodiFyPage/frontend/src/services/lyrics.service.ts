import { api } from '../lib/api';

const LYRIC_PROVIDERS = [
  (artist: string, title: string) => `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`,
  (artist: string, title: string) => `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
];

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

const inFlight = new Map<string, Promise<string | null>>();
const cache = new Map<string, string | null>();

export function clearLyricsCache(): void {
  inFlight.clear();
  cache.clear();
}

export async function fetchLyrics(name: string, artist?: string): Promise<string | null> {
  const search = name.trim();
  if (!search) return null;

  const key = `${artist ?? ''}|${search}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const task = (async (): Promise<string | null> => {
    const artists = [...new Set([artist, search].filter(Boolean) as string[])];
    for (const currentArtist of artists) {
      for (let i = 0; i < LYRIC_PROVIDERS.length; i++) {
        // Sin artista real, lyrics.ovh no puede buscar con sentido ("Hielo/Hielo").
        if (i === 1 && !artist) continue;
        const build = LYRIC_PROVIDERS[i];
        try {
          const response = await fetch(build(currentArtist, search));
          if (!response.ok) continue;
          const text = await response.text();
          let json: unknown;
          try {
            json = JSON.parse(text);
          } catch {
            continue;
          }
          if (Array.isArray(json)) {
            const hit = pickLrclibHit(json, search);
            if (hit) return hit.syncedLyrics ?? hit.plainLyrics ?? null;
          } else {
            const record = json as { lyrics?: string };
            if (record.lyrics && record.lyrics.trim()) return record.lyrics;
          }
        } catch {
          continue;
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
