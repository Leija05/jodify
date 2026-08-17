export type Role = 'dev' | 'admin' | 'user';
export type Tab = 'global' | 'personal' | 'downloads';
export type SortMode = 'recent' | 'old' | 'popular' | 'artist' | 'name';
export type Presence = 'online' | 'idle' | 'dnd' | 'offline';

export interface Song {
  id: number | string;
  name: string;
  url: string;
  artist?: string;
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
}

export interface UserAccess {
  id: number;
  username: string;
  password?: string;
  role: Role;
  is_online?: number;
  last_seen?: string;
  discord_id?: string | null;
  current_song_id?: number | null;
  current_song_name?: string | null;
  listening_since?: string | null;
  created_at?: string;
}

export interface LikeRow {
  id: number;
  username: string;
  song_id: number;
  created_at?: string;
}

export interface DownloadRow {
  id: number;
  username: string;
  song_id: number;
  created_at?: string;
}

export interface LogRow {
  id: number;
  event_type: string;
  message: string;
  admin_user?: string;
  created_at: string;
}

export interface ListeningHistoryRow {
  id?: number;
  username: string;
  song_id: number;
  song_name?: string;
  played_at: string;
}

export interface JamSession {
  id: number;
  code: string;
  host_username: string;
  is_active: boolean;
  current_song_id?: number | null;
  current_time?: number;
  is_playing?: boolean;
  updated_at: string;
}

export interface JamMember {
  id: number;
  jam_id: number;
  username: string;
  is_host: boolean;
  active: boolean;
  last_seen: string;
}

export interface JamHistoryEntry {
  id: number | string;
  code: string;
  host_username: string;
  is_active: boolean;
  current_song_id?: number | string | null;
  current_time?: number;
  is_playing?: boolean;
  created_at?: string;
  updated_at?: string;
  members: Array<{ username: string; is_host: boolean; active: boolean; last_seen?: string }>;
}

export interface JamPermissions {
  allowQueueAdd: boolean;
  allowQueueRemove: boolean;
  allowPlaybackControl: boolean;
}

export interface JamUser {
  username: string;
  isHost: boolean;
  clientId?: string;
}

export interface DiscordProfile {
  avatar_url?: string | null;
  display_name?: string;
  discord_id: string;
  user_name?: string;
  global_name?: string;
  presence?: Presence;
}

export interface CommunityUser extends UserAccess {
  discord?: DiscordProfile | null;
  stat_likes?: number;
  stat_played?: number;
  stat_downloads?: number;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
}

export interface SleepTimerState {
  endAt: number;
  durationMinutes: number;
  triggered?: boolean;
}

export interface LyricsLine {
  time: number;
  text: string;
}

export interface OfflineSong extends Song {
  blob: Blob;
  savedAt: number;
}

export interface UploadItem {
  id: string;
  name: string;
  status: 'uploading' | 'success' | 'error' | 'duplicate' | 'canceled';
  progress: number;
  error?: string;
  coverUrl?: string;
}

export interface RecommendationRequest {
  songId: number | string;
  songName: string;
  username: string;
  timestamp: number;
}

export interface LanyardProfile {
  data: {
    discord_user: {
      id: string;
      username: string;
      global_name?: string;
      display_name?: string;
      avatar?: string | null;
      avatar_decoration?: string | null;
    };
    discord_status: Presence;
    activities: Array<{ type: number; name: string; state?: string }>;
    listening_to_spotify?: boolean;
    spotify?: {
      album?: string;
      artist?: string;
      timestamps?: { start?: number; end?: number };
      track_id?: string;
      song?: string;
    };
  };
}
