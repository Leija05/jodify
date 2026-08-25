import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../store/settings.store';
import { sendHeartbeat, updateNowPlaying } from '../services/users.service';
import { usePlayerStore } from '../store/player.store';

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 segundos

/**
 * Hook que envía heartbeat al backend cada 30s (igual que web/desktop).
 * Solo se activa cuando hay un usuario logueado.
 * También actualiza el "now-playing" cuando cambia la canción.
 */
export function useHeartbeat() {
  const user = useSettingsStore((s) => s.user);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Heartbeat inmediato al loguear
    void sendHeartbeat(user.username);

    // Heartbeat cada 30s
    intervalRef.current = setInterval(() => {
      void sendHeartbeat(user.username);
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user]);

  // Actualizar now-playing cuando cambia la canción
  useEffect(() => {
    if (!user) return;

    const unsub = usePlayerStore.subscribe((state) => {
      const song = state.currentSong;
      if (!song) return;
      const songId = String(song.id);
      if (songId === lastSongIdRef.current) return;
      lastSongIdRef.current = songId;

      void updateNowPlaying(user.username, song.id, song.name, song.artist);
    });

    return unsub;
  }, [user]);
}
