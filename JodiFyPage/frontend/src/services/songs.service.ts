import { api, API_BASE, getAuthToken } from '../lib/api';
import type { Song } from '../lib/types';
import { sanitizeFileName } from '../lib/utils';
import { deleteSongOffline } from '../lib/idb';

export const songsService = {
  async fetchAll(): Promise<Song[]> {
    return api.get<Song[]>('/songs');
  },

  async updateLikes(songId: number | string, delta: number): Promise<number> {
    const result = await api.post<{ likes: number }>(`/songs/${songId}/likes`, { delta });
    return result.likes;
  },

  async uploadAudio(file: File, _onProgress?: (percent: number) => void): Promise<Song> {
    const formData = new FormData();
    formData.append('file', file, sanitizeFileName(file.name) || file.name);

    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/songs/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!response.ok) {
      const detail = (json as { detail?: unknown } | null)?.detail;
      throw new Error(typeof detail === 'string' ? detail : 'Error al subir la canción');
    }
    return json as Song;
  },

  async deleteSongs(ids: Array<number | string>): Promise<void> {
    await api.del('/songs', { ids });

    for (const id of ids) {
      await deleteSongOffline(id).catch(() => undefined);
    }
  },

  async fetchTopSongs(limit = 10): Promise<Array<{ song_id: string; song_name: string; count: number }>> {
    return api.get<Array<{ song_id: string; song_name: string; count: number }>>(`/songs/top?limit=${limit}`);
  },

  async syncSeedSongs(): Promise<{ created: number }> {
    return api.post<{ created: number }>('/songs/sync');
  },
};

export async function extractMetadataFromFile(file: File): Promise<{ title?: string; artist?: string; picture?: string }> {
  try {
    const { parseBlob } = await import('music-metadata');
    const metadata = await parseBlob(file, { duration: true });
    const picture = metadata.common.picture?.[0];
    let pictureUrl: string | undefined;
    if (picture) {
      const blob = new Blob([picture.data], { type: picture.format });
      pictureUrl = URL.createObjectURL(blob);
    }
    return {
      title: metadata.common.title,
      artist: metadata.common.artist,
      picture: pictureUrl,
    };
  } catch {
    return {};
  }
}

export async function checkSongNameExists(name: string): Promise<boolean> {
  const result = await api.post<{ exists: boolean }>('/songs/check', { name });
  return result.exists;
}
