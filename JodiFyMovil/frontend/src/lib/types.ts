export interface Song {
  id: number | string;
  name: string;
  url?: string;
  artist?: string;
  album?: string;
  lyrics?: string;
  likes?: number;
  added_by?: string;
  created_at?: string;
  duration?: number;
  category?: string;
  genre?: string;
  cover_url?: string;
  coverUrl?: string;
  cover?: string;
  image_url?: string;
  thumbnail_url?: string;
  artwork_url?: string;
  picture?: string;
  play_count?: number;
  localUri?: string;
}

export interface LyricsLine {
  time: number;
  text: string;
}

export interface DownloadRecord extends Song {
  localUri: string;
  savedAt: number;
}

export interface AuthUser {
  username: string;
  role: string;
  token: string;
}

export interface SleepTimerState {
  endAt: number | null;
  durationMinutes: number;
  triggered: boolean;
}

export type LibraryTab = 'global' | 'liked' | 'downloads';

export type RepeatMode = 'off' | 'all' | 'one';
