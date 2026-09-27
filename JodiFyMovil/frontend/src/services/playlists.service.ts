import { apiFetch } from './api';
import type { Playlist } from '../lib/types';

export async function fetchPlaylists(): Promise<Playlist[]> {
  return apiFetch<Playlist[]>('/api/playlists');
}

export async function fetchPlaylist(id: string | number): Promise<Playlist> {
  return apiFetch<Playlist>(`/api/playlists/${id}`);
}

export async function createPlaylist(name: string, songIds: (number | string)[] = []): Promise<Playlist> {
  return apiFetch<Playlist>('/api/playlists', {
    method: 'POST',
    body: { name, song_ids: songIds },
    auth: true,
  });
}

export async function updatePlaylist(id: string | number, data: Partial<Playlist>): Promise<Playlist> {
  return apiFetch<Playlist>(`/api/playlists/${id}`, {
    method: 'PATCH',
    body: data,
    auth: true,
  });
}

export async function deletePlaylist(id: string | number): Promise<void> {
  await apiFetch<void>(`/api/playlists/${id}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function addSongToPlaylist(playlistId: string | number, songId: string | number): Promise<void> {
  await apiFetch<void>(`/api/playlists/${playlistId}/songs`, {
    method: 'POST',
    body: { song_id: songId },
    auth: true,
  });
}

export async function removeSongFromPlaylist(playlistId: string | number, songId: string | number): Promise<void> {
  await apiFetch<void>(`/api/playlists/${playlistId}/songs/${songId}`, {
    method: 'DELETE',
    auth: true,
  });
}