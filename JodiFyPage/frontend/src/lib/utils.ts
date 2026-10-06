import { API_BASE } from './api';

export function formatTime(seconds: number | undefined | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDuration(seconds: number | undefined | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^\w\-. ]+/g, '').replace(/\s+/g, '_').slice(0, 80);
}

export function initialOf(username: string | undefined | null): string {
  if (!username) return '?';
  return username.trim().charAt(0).toUpperCase();
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function getSongCoverCandidates(song: Record<string, unknown>): string[] {
  return [
    song.offline_cover,
    song.offlineCoverUrl,
    song.cover_url,
    song.coverUrl,
    song.cover,
    song.image_url,
    song.thumbnail_url,
    song.artwork_url,
    song.picture,
  ]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .map((url) => resolveMediaUrl(url))
    .filter((v): v is string => v.length > 0);
}

export function songArtistMeta(song: { artist?: unknown } | null | undefined): string {
  const artist = song?.artist;
  return typeof artist === 'string' && artist.length > 0 ? artist : '';
}

export function sortSongs(songs: any[], mode: string): any[] {
  const copy = [...songs];
  if (mode === 'recent') copy.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
  if (mode === 'old') copy.sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
  if (mode === 'popular') copy.sort((a, b) => Number(b.likes ?? 0) - Number(a.likes ?? 0));
  if (mode === 'artist') {
    copy.sort((a, b) => String(a.artist ?? a.added_by ?? '').localeCompare(String(b.artist ?? b.added_by ?? ''), 'es', { sensitivity: 'base' }) || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }
  if (mode === 'name') {
    copy.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }
  return copy;
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function throttle<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: A | undefined;
  const invoke = () => {
    last = Date.now();
    timer = undefined;
    if (lastArgs) fn(...lastArgs);
    lastArgs = undefined;
  };
  return (...args: A) => {
    lastArgs = args;
    const elapsed = Date.now() - last;
    if (elapsed >= ms) invoke();
    else if (!timer) timer = setTimeout(invoke, ms - elapsed);
  };
}

export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  const base = API_BASE || '';
  const cleanBase = base.replace(/\/+$/, '');
  const hostBase = cleanBase.replace(/\/api$/, '');
  const target = url.startsWith('/api') ? hostBase : cleanBase;
  const relative = url.startsWith('/') ? url : `/${url}`;
  return target ? `${target}${relative}` : relative;
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
  stats: { liked?: number; played?: number; downloaded?: number; listening_seconds?: number } | null | undefined,
): MelomanoRank {
  const liked = Math.max(0, stats?.liked ?? 0);
  const played = Math.max(0, stats?.played ?? 0);
  const downloaded = Math.max(0, stats?.downloaded ?? 0);
  const sec = Math.max(0, stats?.listening_seconds ?? 0);

  // Minutos de escucha acumulados (tiempo real registrado en segundos o base histórica por reproducciones)
  const realMinutes = Math.floor(sec / 60);
  const estimatedPlayedMinutes = Math.round(played * 3.2);
  const listenedMinutes = Math.max(realMinutes, estimatedPlayedMinutes);
  const listenedHours = Math.round((listenedMinutes / 60) * 10) / 10;

  // Fórmula de XP ponderada fuertemente por tiempo de escucha activa
  const currentXp = (liked * 12) + (played * 4) + (downloaded * 16) + Math.round(listenedMinutes * 2.5);
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

export function resolveAvatarSrc(user?: {
  username?: string | null;
  avatar_source?: string | null;
  avatar_url?: string | null;
  discord?: { avatar_url?: string | null } | null;
  discord_id?: string | null;
} | null): string | null {
  if (!user) return null;
  const source = user.avatar_source || 'custom';
  if (source === 'discord') {
    if (user.discord?.avatar_url) return user.discord.avatar_url;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached =
          (user.discord_id ? localStorage.getItem(`jf_discord_avatar_${user.discord_id}`) : null) ||
          (user.username ? localStorage.getItem(`jf_discord_avatar_${user.username}`) : null) ||
          localStorage.getItem('jf_discord_avatar_current');
        if (cached) return cached;
      }
    } catch {}
    return user.avatar_url || null;
  }
  if (source === 'initials') {
    return null;
  }
  return user.avatar_url || user.discord?.avatar_url || null;
}

