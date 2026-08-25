import { apiFetch } from './api';
import type { Song } from '../lib/types';

/**
 * Servicio de historial de reproducción.
 * Registra cada canción reproducida en el backend (igual que web/desktop).
 */
export async function recordHistory(
  songId: number | string,
  username: string,
): Promise<void> {
  try {
    await apiFetch('/history', {
      method: 'POST',
      body: { song_id: songId, username },
      auth: true,
    });
  } catch {
    // El historial es best-effort; no falla la app si no se registra.
  }
}

/** Obtiene el historial de reproducción del usuario. */
export async function fetchHistory(username: string): Promise<Song[]> {
  try {
    return await apiFetch<Song[]>(`/history/${encodeURIComponent(username)}`, {
      auth: true,
    });
  } catch {
    return [];
  }
}
