import { apiFetch } from './api';
import type { ListeningHistoryRow } from '../lib/types';

export async function recordHistory(songId: string | number, username: string, songName?: string): Promise<void> {
  await apiFetch<void>('/api/history', {
    method: 'POST',
    body: { song_id: songId, username, song_name: songName ?? null },
  });
}

export async function fetchHistory(username: string, limit = 50): Promise<ListeningHistoryRow[]> {
  return apiFetch<ListeningHistoryRow[]>(`/api/users/${encodeURIComponent(username)}/history?limit=${limit}`);
}

export async function fetchTopSongs(username: string, limit = 5): Promise<Array<{ song_name: string; count: number }>> {
  return apiFetch<Array<{ song_name: string; count: number }>>(`/api/users/${encodeURIComponent(username)}/top-songs?limit=${limit}`);
}

export async function fetchListeningStats(username: string): Promise<{ liked: number; played: number; downloaded: number }> {
  return apiFetch<{ liked: number; played: number; downloaded: number }>(`/api/users/${encodeURIComponent(username)}/stats`);
}