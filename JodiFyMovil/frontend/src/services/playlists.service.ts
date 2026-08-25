import { apiFetch } from './api';

export interface Playlist {
  id: string | number;
  name: string;
  cover_url?: string;
  song_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePlaylistData {
  name: string;
  songIds?: Array<string | number>;
}

export async function fetchPlaylists(): Promise<Playlist[]> {
  try {
    return await apiFetch<Playlist[]>('/playlists', { auth: true });
  } catch {
    return [];
  }
}

export async function fetchPlaylistSongs(playlistId: string | number): Promise<Playlist[]> {
  try {
    return await apiFetch<Playlist[]>(`/playlists/${playlistId}/songs`, { auth: true });
  } catch {
    return [];
  }
}

export async function createPlaylist(data: CreatePlaylistData): Promise<Playlist> {
  return apiFetch<Playlist>('/playlists', {
    method: 'POST',
    body: data,
    auth: true,
  });
}

export async function updatePlaylist(playlistId: string | number, name: string): Promise<Playlist> {
  return apiFetch<Playlist>(`/playlists/${playlistId}`, {
    method: 'PATCH',
    body: { name },
    auth: true,
  });
}

export async function deletePlaylist(playlistId: string | number): Promise<void> {
  await apiFetch(`/playlists/${playlistId}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function addToPlaylist(playlistId: string | number, songId: string | number): Promise<void> {
  await apiFetch(`/playlists/${playlistId}/songs`, {
    method: 'POST',
    body: { song_id: songId },
    auth: true,
  });
}

export async function removeFromPlaylist(playlistId: string | number, songId: string | number): Promise<void> {
  await apiFetch(`/playlists/${playlistId}/songs/${songId}`, {
    method: 'DELETE',
    auth: true,
  });
}