import type { Song } from '../lib/types';
import { apiFetch } from './api';

export async function fetchSongs(): Promise<Song[]> {
  const data = await apiFetch<Song[]>('/songs');
  return Array.isArray(data) ? data : [];
}

export async function fetchSongAudioUrl(songId: number | string): Promise<string | null> {
  return apiFetch<string>(`/songs/${songId}/audio`);
}

export async function fetchTopSongs(
  limit = 10,
): Promise<Array<{ song_id: string; song_name: string; count: number }>> {
  const data = await apiFetch<Array<{ song_id: string; song_name: string; count: number }>>(`/songs/top?limit=${limit}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchLikedIds(username: string): Promise<Array<number | string>> {
  const data = await apiFetch<Array<number | string>>(`/likes?username=${encodeURIComponent(username)}`);
  return Array.isArray(data) ? data.map((id) => String(id)) : [];
}

export async function addLike(songId: number | string, username: string): Promise<void> {
  await apiFetch('/likes', {
    method: 'POST',
    body: { username, song_id: String(songId) },
  });
}

export async function removeLike(songId: number | string, username: string): Promise<void> {
  await apiFetch(`/likes?username=${encodeURIComponent(username)}&song_id=${String(songId)}`, {
    method: 'DELETE',
  });
}

export async function updateLikeCount(songId: number | string, username: string, delta: number): Promise<void> {
  await apiFetch(`/songs/${songId}/likes`, {
    method: 'POST',
    body: { username, delta },
    auth: true,
  });
}

export async function fetchDownloadedIds(username: string): Promise<Array<number | string>> {
  const data = await apiFetch<Array<{ song_id: number | string }>>(`/downloads?username=${encodeURIComponent(username)}`);
  return Array.isArray(data) ? data.map((r) => r.song_id) : [];
}
