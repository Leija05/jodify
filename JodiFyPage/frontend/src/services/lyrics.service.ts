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

export async function fetchLyrics(name: string, artist?: string): Promise<string | null> {
  const search = name.trim();
  if (!search) return null;

  const artists = artist ? [artist, search] : [search];
  for (const currentArtist of artists) {
    for (const build of LYRIC_PROVIDERS) {
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
}

export function getNowPlayingFromDb(username: string): void {
  void username;
}

export async function fetchRecentHistory(username: string, limit = 50): Promise<Array<{ song_name: string | null; played_at: string }>> {
  return api.get<Array<{ song_name: string | null; played_at: string }>>(
    `/users/${encodeURIComponent(username)}/history?limit=${limit}`,
  );
}
