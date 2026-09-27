import { apiFetch } from './api';
import type { CommunityUser } from '../lib/types';

export type { CommunityUser };

export async function fetchCommunityUsers(): Promise<CommunityUser[]> {
  return apiFetch<CommunityUser[]>('/api/users');
}

export async function fetchUserProfile(username: string): Promise<CommunityUser> {
  return apiFetch<CommunityUser>(`/api/users/${encodeURIComponent(username)}`);
}

export async function fetchUserStats(username: string): Promise<{ liked: number; played: number; downloaded: number }> {
  return apiFetch<{ liked: number; played: number; downloaded: number }>(`/api/users/${encodeURIComponent(username)}/stats`);
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

export async function sendHeartbeat(username: string, online: boolean): Promise<void> {
  await apiFetch<void>(`/api/users/${encodeURIComponent(username)}/heartbeat`, {
    method: 'POST',
    body: { online },
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