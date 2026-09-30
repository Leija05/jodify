import { api, API_BASE } from '../lib/api';
import type { Song } from '../lib/types';

export interface ResolvedTrack {
  id?: string;
  type: 'track';
  source: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  thumbnail?: string;
  stream_url: string;
  download_url?: string;
  original_url: string;
  webpage_url?: string;
}

export interface ResolvedPlaylistItem {
  id?: string;
  title: string;
  artist?: string;
  duration?: number;
  thumbnail?: string;
  url: string;
}

export interface ResolvedPlaylist {
  type: 'playlist';
  source: string;
  title: string;
  artist?: string;
  thumbnail?: string;
  count: number;
  items: ResolvedPlaylistItem[];
  original_url: string;
}

export type ResolvedMedia = ResolvedTrack | ResolvedPlaylist;

export interface SongSuggestion {
  id: string;
  url: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  thumbnail?: string;
  stream_url?: string;
  notes?: string;
  suggested_by: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export const linksService = {
  async resolveLink(url: string): Promise<ResolvedMedia> {
    const res = await api.post<{ success: boolean; data: ResolvedMedia }>('/links/resolve', { url });
    return res.data;
  },

  async suggestSong(payload: {
    url: string;
    title: string;
    artist?: string;
    album?: string;
    duration?: number;
    thumbnail?: string;
    stream_url?: string;
    notes?: string;
  }): Promise<SongSuggestion> {
    const res = await api.post<{ success: boolean; suggestion: SongSuggestion }>('/links/suggest', payload);
    return res.suggestion;
  },

  async getSuggestions(status?: string): Promise<SongSuggestion[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return api.get<SongSuggestion[]>(`/links/suggestions${query}`);
  },

  async approveSuggestion(id: string): Promise<Song> {
    const res = await api.post<{ success: boolean; song: Song }>(`/links/suggestions/${id}/approve`);
    return res.song;
  },

  async deleteSuggestion(id: string): Promise<void> {
    await api.del(`/links/suggestions/${id}`);
  },

  getDownloadUrl(url: string, filename?: string): string {
    const params = new URLSearchParams({ url });
    if (filename) params.append('filename', filename);
    return `${API_BASE}/links/download-proxy?${params.toString()}`;
  },
};
