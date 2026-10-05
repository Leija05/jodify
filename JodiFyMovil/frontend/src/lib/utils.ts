import type { Song, LibraryTab, SortMode, LyricsLine, ParsedLyrics } from './types';
import { API_BASE } from './constants';

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
  const relativePath = (
    song.cover_url ??
    song.coverUrl ??
    song.cover ??
    song.image_url ??
    song.thumbnail_url ??
    song.artwork_url ??
    song.picture ??
    null
  );
  if (!relativePath) return null;
  // If already absolute URL, return as-is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://') || relativePath.startsWith('blob:') || relativePath.startsWith('data:')) {
    return relativePath;
  }
  // Prepend API base for relative paths
  const base = API_BASE.replace(/\/+$/, '');
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${base}${cleanPath}`;
}

export function resolveSongTitle(song: Song): string {
  const rawName = (song.name || '').trim();
  const rawArtist = (song.artist || '').trim();

  const delimiterMatch = rawName.match(/^([^-–—]+)\s*[-–—]\s*(.+)$/);
  if (delimiterMatch && delimiterMatch[1] && delimiterMatch[2]) {
    const extractedArtist = delimiterMatch[1].trim().toLowerCase();
    if (!rawArtist || rawArtist.toLowerCase() === extractedArtist || rawArtist.toLowerCase() === rawName.toLowerCase()) {
      return delimiterMatch[2].trim();
    }
  }
  return rawName || 'Sin título';
}

export function resolveArtist(song: Song): string | null {
  const rawArtist = (song.artist || '').trim();
  const rawName = (song.name || '').trim();

  // 1. If artist is provided, valid, and distinct from song name
  if (
    rawArtist &&
    rawArtist.toLowerCase() !== rawName.toLowerCase() &&
    !/^(desconocido|unknown|none|null|undefined)$/i.test(rawArtist)
  ) {
    return rawArtist;
  }

  // 3. Fallback to album if present
  if (song.album && song.album.trim() && !/^(enlace web|playlist import)$/i.test(song.album.trim())) {
    return song.album.trim();
  }

  return null;
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

export function isSongLiked(song: Song, likedSet: Set<string>): boolean {
  if (!song) return false;
  const sId = String(song.id);
  if (likedSet.has(sId)) return true;
  if (sId.startsWith('yt-') && likedSet.has(sId.slice(3))) return true;
  if (likedSet.has(`yt-${sId}`)) return true;

  if (song.youtube_id) {
    const ytId = String(song.youtube_id);
    if (likedSet.has(ytId)) return true;
    if (likedSet.has(`yt-${ytId}`)) return true;
    if (ytId.startsWith('yt-') && likedSet.has(ytId.slice(3))) return true;
  }
  return false;
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
      return songs.filter((s) => isSongLiked(s, likedSet));
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

const TIME_TAG = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const OFFSET_TAG = /^\[offset:\s*([+-]?\d+)\s*\]$/i;

export function parseLRC(lrc: string): ParsedLyrics {
  const lines: LyricsLine[] = [];
  let offsetMs = 0;

  for (const raw of lrc.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const offsetMatch = line.match(OFFSET_TAG);
    if (offsetMatch) {
      offsetMs = parseInt(offsetMatch[1] || '0', 10) || 0;
      continue;
    }
    if (/^\[[a-z]{2}:/i.test(line)) continue;

    const tags = [...line.matchAll(TIME_TAG)];
    if (tags.length === 0) continue;
    const text = line.replace(TIME_TAG, '').trim();
    if (!text) continue;

    for (const tag of tags) {
      const minutes = parseInt(tag[1] || '0', 10);
      const seconds = parseInt(tag[2] || '0', 10);
      const fraction = (tag[3] ?? '').padEnd(3, '0').slice(0, 3);
      const millis = parseInt(fraction || '0', 10);
      const time = Math.max(0, minutes * 60 + seconds + millis / 1000 + offsetMs / 1000);
      lines.push({ time, text });
    }
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

export interface MelomanoRank {
  level: number;
  title: string;
  badgeEmoji: string;
  badgeColor: string;
  currentXp: number;
  nextLevelXp: number;
  progressPercent: number;
  listenedMinutes: number;
  listenedHours: number;
}

export function calculateMelomanoLevel(
  stats: { liked?: number; played?: number; downloaded?: number; listening_seconds?: number } | null | undefined
): MelomanoRank {
  const liked = stats?.liked ?? 0;
  const played = stats?.played ?? 0;
  const downloaded = stats?.downloaded ?? 0;
  const sec = stats?.listening_seconds ?? 0;

  const realMinutes = Math.floor(sec / 60);
  const estimatedPlayedMinutes = Math.round(played * 3.2);
  const listenedMinutes = Math.max(realMinutes, estimatedPlayedMinutes);
  const listenedHours = Math.round((listenedMinutes / 60) * 10) / 10;

  const currentXp = liked * 12 + played * 4 + downloaded * 16 + Math.round(listenedMinutes * 2.5);
  const level = Math.max(1, Math.floor(Math.sqrt(currentXp / 30)) + 1);

  const prevLevelXp = Math.pow(level - 1, 2) * 30;
  const nextLevelXp = Math.pow(level, 2) * 30;
  const span = Math.max(1, nextLevelXp - prevLevelXp);
  const progressInLevel = Math.max(0, currentXp - prevLevelXp);
  const progressPercent = Math.min(100, Math.round((progressInLevel / span) * 100));

  let title = 'Iniciado del Ritmo';
  let badgeEmoji = '🎵';
  let badgeColor = '#94a3b8';

  if (level >= 30) {
    title = 'Deidad Sonora Omnipresente';
    badgeEmoji = '👑';
    badgeColor = '#ffd700';
  } else if (level >= 20) {
    title = 'Maestro de la Sinfonía';
    badgeEmoji = '⚡';
    badgeColor = '#f43f5e';
  } else if (level >= 15) {
    title = 'Leyenda del Vinilo';
    badgeEmoji = '💎';
    badgeColor = '#a855f7';
  } else if (level >= 10) {
    title = 'Audiófilo Experto';
    badgeEmoji = '🎧';
    badgeColor = '#00f0ff';
  } else if (level >= 5) {
    title = 'Explorador de Frecuencias';
    badgeEmoji = '🌊';
    badgeColor = '#10b981';
  } else if (level >= 2) {
    title = 'Melómano Curioso';
    badgeEmoji = '📻';
    badgeColor = '#3b82f6';
  }

  return {
    level,
    title,
    badgeEmoji,
    badgeColor,
    currentXp,
    nextLevelXp,
    progressPercent,
    listenedMinutes,
    listenedHours,
  };
}