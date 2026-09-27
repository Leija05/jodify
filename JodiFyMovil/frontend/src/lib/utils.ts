import type { Song, LibraryTab, SortMode, LyricsLine, ParsedLyrics } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = temp;
  }
  return result;
}

export function pickCoverUrl(song: Song): string | null {
  return (
    song.cover_url ??
    song.coverUrl ??
    song.cover ??
    song.image_url ??
    song.thumbnail_url ??
    song.artwork_url ??
    song.picture ??
    null
  );
}

export function resolveArtist(song: Song): string | null {
  return song.artist ?? song.album ?? null;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDurationLong(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatRelativeTime(dateString: string): string {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

export function sortSongs(songs: Song[], mode: SortMode): Song[] {
  const sorted = [...songs];
  switch (mode) {
    case 'recent':
      return sorted.sort((a, b) =>
        (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0)
      );
    case 'old':
      return sorted.sort((a, b) =>
        (a.created_at ? new Date(a.created_at).getTime() : 0) - (b.created_at ? new Date(b.created_at).getTime() : 0)
      );
    case 'popular':
      return sorted.sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
    case 'artist':
      return sorted.sort((a, b) => (resolveArtist(a) ?? '').localeCompare(resolveArtist(b) ?? ''));
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}

export function filterSongsByTab(
  songs: Song[],
  tab: LibraryTab,
  likedIds: Array<number | string>,
  downloadedIds: Array<number | string>
): Song[] {
  const likedSet = new Set(likedIds.map(String));
  const downloadedSet = new Set(downloadedIds.map(String));

  switch (tab) {
    case 'liked':
      return songs.filter((s) => likedSet.has(String(s.id)));
    case 'downloads':
      return songs.filter((s) => downloadedSet.has(String(s.id)));
    default:
      return songs;
  }
}

export function searchSongs(
  songs: Song[],
  query: string,
  resolveArtistFn: (song: Song) => string | null = resolveArtist
): Song[] {
  const q = query.trim().toLowerCase();
  if (!q) return songs;
  return songs.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (resolveArtistFn(s) ?? '').toLowerCase().includes(q)
  );
}

export function parseLRC(lrc: string): ParsedLyrics {
  const lines: LyricsLine[] = [];
  const regex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(lrc)) !== null) {
    const minutes = parseInt(match[1] ?? '0', 10);
    const seconds = parseInt(match[2] ?? '0', 10);
    const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
    const time = minutes * 60 + seconds + ms / 1000;
    const text = (match[4] ?? '').trim();
    if (text) lines.push({ time, text });
  }

  return {
    lines: lines.sort((a, b) => a.time - b.time),
    synced: lines.length > 0,
    format: 'lrc',
  };
}

export function parsePlainLyrics(text: string): ParsedLyrics {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((text, index) => ({ time: index * 4, text }));

  return {
    lines,
    synced: false,
    format: 'plain',
  };
}

export function parseLyrics(text: string): ParsedLyrics {
  if (text.includes('[') && text.includes(']') && /\d{2}:\d{2}/.test(text)) {
    return parseLRC(text);
  }
  return parsePlainLyrics(text);
}

export function findActiveLyricIndex(lines: LyricsLine[], currentTime: number): number {
  if (!lines.length) return -1;
  let low = 0;
  let high = lines.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const line = lines[mid];
    if (line && line.time <= currentTime) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}

export function getSongIdString(id: number | string): string {
  return String(id);
}

export function songIdsEqual(a: number | string, b: number | string): boolean {
  return String(a) === String(b);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastRun >= ms) {
      lastRun = now;
      fn(...args);
    }
  };
}

export function isOnline(): Promise<boolean> {
  return fetch('https://www.google.com/generate_204', { method: 'HEAD', cache: 'no-cache' })
    .then(() => true)
    .catch(() => false);
}

export function getDominantColor(_uri: string): Promise<string> {
  return Promise.resolve('#7F00FF');
}

export function hapticFeedback(_type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'light'): void {
}