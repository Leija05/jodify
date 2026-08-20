import { API_BASE } from './constants';

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function pickCoverUrl(song: { cover_url?: string; coverUrl?: string; cover?: string; image_url?: string; thumbnail_url?: string; artwork_url?: string; picture?: string } | undefined | null): string | null {
  if (!song) return null;
  const base = `${API_BASE}`;
  const candidates = [
    song.cover_url,
    song.coverUrl,
    song.cover,
    song.image_url,
    song.thumbnail_url,
    song.artwork_url,
    song.picture,
  ];
  for (const c of candidates) {
    if (!c) continue;
    if (c.startsWith('http')) return c;
    return `${base}${c.startsWith('/') ? '' : '/'}${c}`;
  }
  return null;
}

/**
 * Resuelve el artista de una canción con varios fallbacks, para que nunca
 * se muestre "Desconocido" cuando el backend no trae el campo `artist`.
 * 1. artist del backend
 * 2. "Artista - Título" embebido en el nombre
 * 3. album
 * 4. added_by (quien subió la canción)
 */
export function resolveArtist(song: { name: string; artist?: string; album?: string; added_by?: string } | undefined | null): string | null {
  if (!song) return null;
  const artist = song.artist?.trim();
  if (artist) return artist;

  const name = song.name?.trim();
  if (name) {
    const match = name.match(/^\s*([^\-–—]{1,60}?)\s+[\-–—]\s+(.+?)\s*$/);
    if (match && match[2] && match[2].length <= 80) {
      const candidate = match[1].trim();
      if (candidate.length >= 2 && !candidate.toUpperCase().startsWith('FT')) return candidate;
    }
  }

  if (song.album?.trim()) return song.album.trim();
  if (song.added_by?.trim()) return `@${song.added_by.trim()}`;
  return null;
}

export function resolveMediaUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
