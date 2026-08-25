import { apiFetch } from './api';

export interface CommunityUser {
  username: string;
  role: string;
  online: boolean;
  last_seen?: string;
  now_playing?: {
    song_id: number | string;
    song_name: string;
    artist?: string;
  };
}

/**
 * Servicio de usuarios y comunidad.
 * Sincroniza heartbeat, now-playing y lista de usuarios online
 * con el backend (igual que web/desktop).
 */

/** Envía heartbeat para mantener el estado "online". */
export async function sendHeartbeat(username: string): Promise<void> {
  try {
    await apiFetch(`/users/${encodeURIComponent(username)}/heartbeat`, {
      method: 'POST',
      auth: true,
    });
  } catch {
    // El heartbeat es best-effort; no falla la app si no se envía.
  }
}

/** Actualiza la canción que el usuario está escuchando ahora. */
export async function updateNowPlaying(
  username: string,
  songId: number | string,
  songName: string,
  artist?: string,
): Promise<void> {
  try {
    await apiFetch(`/users/${encodeURIComponent(username)}/now-playing`, {
      method: 'POST',
      body: { song_id: songId, song_name: songName, artist },
      auth: true,
    });
  } catch {
    // best-effort
  }
}

/** Obtiene la lista de usuarios de la comunidad. */
export async function fetchCommunityUsers(): Promise<CommunityUser[]> {
  try {
    return await apiFetch<CommunityUser[]>('/users/community', { auth: true });
  } catch {
    return [];
  }
}

/** Obtiene el perfil de un usuario. */
export async function fetchUserProfile(username: string): Promise<CommunityUser | null> {
  try {
    return await apiFetch<CommunityUser>(`/users/${encodeURIComponent(username)}`, { auth: true });
  } catch {
    return null;
  }
}
