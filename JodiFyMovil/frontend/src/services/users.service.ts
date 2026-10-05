import { apiFetch } from './api';
import type { CommunityUser } from '../lib/types';

export type { CommunityUser };

export async function fetchCommunityUsers(): Promise<CommunityUser[]> {
  return apiFetch<CommunityUser[]>('/api/users');
}

export async function fetchUserProfile(username: string): Promise<CommunityUser> {
  return apiFetch<CommunityUser>(`/api/users/${encodeURIComponent(username)}`);
}

export async function fetchUserStats(username: string): Promise<{ liked: number; played: number; downloaded: number; listening_seconds?: number }> {
  return apiFetch<{ liked: number; played: number; downloaded: number; listening_seconds?: number }>(`/api/users/${encodeURIComponent(username)}/stats`);
}

export async function fetchUserTopSongs(username: string, limit = 5): Promise<Array<{ song_name: string; count: number }>> {
  return apiFetch<Array<{ song_name: string; count: number }>>(`/api/users/${encodeURIComponent(username)}/top-songs?limit=${limit}`);
}

export async function fetchUserHistory(username: string, limit = 50): Promise<Array<{ song_id: number; song_name: string; played_at: string }>> {
  return apiFetch<Array<{ song_id: number; song_name: string; played_at: string }>>(`/api/users/${encodeURIComponent(username)}/history?limit=${limit}`);
}

export async function setDiscordId(username: string, discordId: string): Promise<void> {
  await apiFetch<void>(`/api/users/${encodeURIComponent(username)}/discord`, {
    method: 'PUT',
    body: { discord_id: discordId },
    auth: true,
  });
}

export async function sendHeartbeat(
  username: string,
  online: boolean,
  presence: 'online' | 'background' | 'offline' = 'online'
): Promise<void> {
  await apiFetch<void>(`/api/users/${encodeURIComponent(username)}/heartbeat`, {
    method: 'POST',
    body: { online, presence },
    auth: true,
  });
}

export async function updateUserProfile(
  username: string,
  data: {
    display_name?: string | null | undefined;
    new_username?: string | null | undefined;
    avatar_url?: string | null | undefined;
    avatar_source?: ('custom' | 'discord' | 'presets' | 'initials') | undefined;
    discord_id?: string | null | undefined;
    bio?: string | null | undefined;
    theme?: string | undefined;
    avatar_frame?: string | undefined;
    accent_color?: string | null | undefined;
    profile_effect?: string | undefined;
    profile_animation?: string | undefined;
    profile_bg_mode?: string | undefined;
    custom_gradient_start?: string | null | undefined;
    custom_gradient_end?: string | null | undefined;
    vibe?: string | null | undefined;
    custom_badge?: string | null | undefined;
    anthem_song_id?: number | string | null | undefined;
    anthem_song_name?: string | null | undefined;
    pet_type?: string | null | undefined;
    pet_variant?: string | null | undefined;
    pet_name?: string | null | undefined;
  }
): Promise<CommunityUser> {
  return apiFetch<CommunityUser>(`/api/users/${encodeURIComponent(username)}/profile`, {
    method: 'PUT',
    body: data,
    auth: true,
  });
}

export async function updateNowPlaying(username: string, songId: number | string | null, songName: string | null): Promise<void> {
  await apiFetch<void>(`/api/users/${encodeURIComponent(username)}/now-playing`, {
    method: 'PUT',
    body: { song_id: songId, song_name: songName },
    auth: true,
  });
}

export async function recordListeningTime(username: string, seconds = 15): Promise<void> {
  await apiFetch<void>(`/api/users/${encodeURIComponent(username)}/listening-time`, {
    method: 'POST',
    body: { seconds },
    auth: true,
  });
}