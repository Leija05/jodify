import { api, ApiError, setAuthToken } from '../lib/api';
import type { Role, UserAccess } from '../lib/types';

export interface LoginResult {
  role: Role;
  username: string;
}

export const usersService = {
  async login(username: string, password: string): Promise<LoginResult | null> {
    const clean = username.trim();

    try {
      const result = await api.post<{ token: string; username: string; role: Role }>('/auth/login', {
        username: clean,
        password,
      });
      setAuthToken(result.token);
      return { role: result.role, username: result.username };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },

  async register(username: string, password: string, role: Role): Promise<void> {
    await api.post('/auth/register', { username: username.trim(), password, role });
  },

  async listUsers(): Promise<UserAccess[]> {
    return api.get<UserAccess[]>('/users');
  },

  async deleteUser(id: number | string): Promise<void> {
    await api.del(`/users/${id}`);
  },

  async heartbeat(username: string, isOnline = true): Promise<void> {
    await api.post(`/users/${encodeURIComponent(username)}/heartbeat`, { online: isOnline });
  },

  async setDiscordId(username: string, discordId: string | null): Promise<void> {
    await api.put(`/users/${encodeURIComponent(username)}/discord`, { discord_id: discordId });
  },

  async updateNowPlaying(username: string, songId: number | string | null, songName: string | null): Promise<void> {
    await api.put(`/users/${encodeURIComponent(username)}/now-playing`, { song_id: songId, song_name: songName });
  },

  async fetchProfile(username: string): Promise<UserAccess | null> {
    try {
      return await api.get<UserAccess>(`/users/${encodeURIComponent(username)}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },

  async insertListeningHistory(username: string, songId: number | string, songName?: string): Promise<void> {
    await api.post('/history', { username, song_id: songId, song_name: songName ?? null });
  },
};

export async function fetchCommunityUsers(): Promise<UserAccess[]> {
  return api.get<UserAccess[]>('/users');
}

export async function fetchListeningStats(username: string): Promise<{ liked: number; played: number; downloaded: number }> {
  return api.get<{ liked: number; played: number; downloaded: number }>(`/users/${encodeURIComponent(username)}/stats`);
}

export async function fetchTopSongs(username: string, limit = 5): Promise<Array<{ song_name: string; count: number }>> {
  return api.get<Array<{ song_name: string; count: number }>>(
    `/users/${encodeURIComponent(username)}/top-songs?limit=${limit}`,
  );
}

export async function fetchListeningHistory(
  username: string,
  limit = 50,
): Promise<Array<{ song_name?: string; song_id?: string | number; played_at: string }>> {
  return api.get<Array<{ song_name?: string; song_id?: string | number; played_at: string }>>(
    `/users/${encodeURIComponent(username)}/history?limit=${limit}`,
  );
}
