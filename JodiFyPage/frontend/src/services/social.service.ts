import { api } from '../lib/api';
import { LANYARD_API_URL } from '../lib/constants';
import type { DiscordProfile, LanyardProfile } from '../lib/types';

export const likesService = {
  async fetchLikedIds(username: string): Promise<Array<number | string>> {
    return api.get<Array<number | string>>(`/likes?username=${encodeURIComponent(username)}`);
  },

  async addLike(username: string, songId: number | string): Promise<void> {
    await api.post('/likes', { username, song_id: songId });
  },

  async removeLike(username: string, songId: number | string): Promise<void> {
    await api.del(`/likes?username=${encodeURIComponent(username)}&song_id=${String(songId)}`);
  },

  async hasLike(username: string, songId: number | string): Promise<boolean> {
    const result = await api.get<{ has: boolean }>(
      `/likes/has?username=${encodeURIComponent(username)}&song_id=${String(songId)}`,
    );
    return result.has;
  },
};

export const downloadsService = {
  async fetchDownloadedIds(username: string): Promise<Array<number | string>> {
    return api.get<Array<number | string>>(`/downloads?username=${encodeURIComponent(username)}`);
  },

  async markDownload(username: string, songId: number | string): Promise<void> {
    await api.post('/downloads', { username, song_id: songId });
  },

  async removeDownload(username: string, songId: number | string): Promise<void> {
    await api.del(`/downloads?username=${encodeURIComponent(username)}&song_id=${String(songId)}`);
  },

  async downloadSongToDevice(songUrl: string, name: string): Promise<void> {
    const response = await fetch(songUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.mp3`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },
};

export const logsService = {
  async fetch(
    limit = 50,
  ): Promise<Array<{ id: number | string; event_type: string; message: string; admin_user?: string; created_at: string }>> {
    return api.get<Array<{ id: number | string; event_type: string; message: string; admin_user?: string; created_at: string }>>(
      `/logs?limit=${limit}`,
    );
  },

  async add(eventType: string, message: string, adminUser?: string): Promise<void> {
    await api.post('/logs', {
      event_type: eventType,
      message,
      admin_user: adminUser ?? localStorage.getItem('currentUserName') ?? null,
    });
  },
};

export async function fetchLanyardProfile(discordId: string): Promise<DiscordProfile | null> {
  try {
    const response = await fetch(`${LANYARD_API_URL}/${discordId}`);
    if (!response.ok) return null;
    const json = (await response.json()) as LanyardProfile;
    const user = json.data.discord_user;
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : null;
    return {
      discord_id: user.id,
      display_name: user.display_name ?? user.global_name ?? user.username,
      user_name: user.username,
      avatar_url: avatarUrl,
      presence: json.data.discord_status,
    };
  } catch {
    return null;
  }
}

export async function fetchLikesForUsers(usernames: string[]): Promise<Record<string, number>> {
  if (usernames.length === 0) return {};
  return api.get<Record<string, number>>(`/likes/counts?usernames=${usernames.map(encodeURIComponent).join(',')}`);
}

export async function fetchDownloadsForUsers(usernames: string[]): Promise<Record<string, number>> {
  if (usernames.length === 0) return {};
  return api.get<Record<string, number>>(`/downloads/counts?usernames=${usernames.map(encodeURIComponent).join(',')}`);
}