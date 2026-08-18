import { api, API_BASE, getAuthToken } from '../lib/api';
import type { Song } from '../lib/types';
import { sanitizeFileName } from '../lib/utils';
import { deleteSongOffline } from '../lib/idb';

interface UploadOptions {
  name?: string;
  cover?: Blob;
  album?: string;
  lyrics?: string;
  artist?: string;
}

export const songsService = {
  async fetchAll(): Promise<Song[]> {
    return api.get<Song[]>('/songs');
  },

  async updateLikes(songId: number | string, delta: number): Promise<number> {
    const result = await api.post<{ likes: number }>(`/songs/${songId}/likes`, { delta });
    return result.likes;
  },

  async uploadAudio(file: File, options: UploadOptions = {}): Promise<Song> {
    const formData = new FormData();
    formData.append('file', file, sanitizeFileName(file.name) || file.name);
    if (options.name) formData.append('name', options.name);
    if (options.cover) formData.append('cover', options.cover, 'cover.jpg');
    if (options.album) formData.append('album', options.album);
    if (options.lyrics) formData.append('lyrics', options.lyrics);
    if (options.artist) formData.append('artist', options.artist);

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

  async updateSongMeta(
    songId: number | string,
    fields: { name?: string; artist?: string; album?: string; lyrics?: string },
  ): Promise<Song> {
    return api.patch<Song>(`/songs/${songId}`, fields);
  },

  async fetchTopSongs(limit = 10): Promise<Array<{ song_id: string; song_name: string; count: number }>> {
    return api.get<Array<{ song_id: string; song_name: string; count: number }>>(`/songs/top?limit=${limit}`);
  },

  async syncSeedSongs(): Promise<{ created: number }> {
    return api.post<{ created: number }>('/songs/sync');
  },
};

export async function extractMetadataFromFile(
  file: File,
): Promise<{
  title?: string;
  artist?: string;
  album?: string;
  lyrics?: string;
  picture?: string;
  pictureData?: Uint8Array;
  pictureFormat?: string;
}> {
  try {
    const { parseBlob } = await import('music-metadata');
    const metadata = await parseBlob(file, { duration: true });
    const picture = metadata.common.picture?.[0];
    let pictureUrl: string | undefined;
    if (picture) {
      const blob = new Blob([picture.data], { type: picture.format });
      pictureUrl = URL.createObjectURL(blob);
    }
    const lyricTags = metadata.common.lyrics;
    const lyrics =
      typeof lyricTags === 'string'
        ? lyricTags
        : Array.isArray(lyricTags)
          ? lyricTags.map((l) => l.text).filter(Boolean).join('\n') || undefined
          : undefined;
    return {
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      lyrics,
      picture: pictureUrl,
      pictureData: picture?.data,
      pictureFormat: picture?.format,
    };
  } catch {
    return {};
  }
}

export async function checkSongNameExists(name: string): Promise<boolean> {
  const result = await api.post<{ exists: boolean }>('/songs/check', { name });
  return result.exists;
}
