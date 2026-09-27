import { apiFetch, apiFetchBlob } from './api';
import type { Song } from '../lib/types';

export async function fetchSongs(): Promise<Song[]> {
  return apiFetch<Song[]>('/api/songs');
}

export async function fetchSong(id: string | number): Promise<Song> {
  return apiFetch<Song>(`/api/songs/${id}`);
}

export async function fetchTopSongs(limit = 10): Promise<Array<{ song_id: string; song_name: string; count: number }>> {
  return apiFetch<Array<{ song_id: string; song_name: string; count: number }>>(`/api/songs/top?limit=${limit}`);
}

export async function fetchLikedIds(username: string): Promise<Array<number | string>> {
  return apiFetch<Array<number | string>>(`/api/likes?username=${encodeURIComponent(username)}`);
}

export async function hasLike(username: string, songId: string | number): Promise<boolean> {
  const res = await apiFetch<{ has: boolean }>(`/api/likes/has?username=${encodeURIComponent(username)}&song_id=${songId}`);
  return res.has;
}

export async function addLike(songId: string | number, username: string): Promise<void> {
  await apiFetch<void>('/api/likes', {
    method: 'POST',
    body: { song_id: songId, username },
  });
}

export async function removeLike(songId: string | number, username: string): Promise<void> {
  await apiFetch<void>(`/api/likes?username=${encodeURIComponent(username)}&song_id=${songId}`, {
    method: 'DELETE',
  });
}

export async function updateLikeCount(songId: string | number, _username: string, delta: number): Promise<{ likes: number }> {
  return apiFetch<{ likes: number }>(`/api/songs/${songId}/likes`, {
    method: 'POST',
    body: { delta: Math.max(-1, Math.min(1, delta)) },
  });
}

export async function streamAudio(songId: string | number): Promise<Blob> {
  return apiFetchBlob(`/api/songs/${songId}/audio`);
}

export async function streamCover(songId: string | number): Promise<Blob> {
  return apiFetchBlob(`/api/songs/${songId}/cover`);
}