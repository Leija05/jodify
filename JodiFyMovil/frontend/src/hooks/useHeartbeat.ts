import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../stores/settings.store';
import { usePlayerStore } from '../stores/player.store';
import { sendHeartbeat, updateNowPlaying } from '../services/users.service';

export function useHeartbeat() {
  const user = useSettingsStore((s) => s.user);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const position = usePlayerStore((s) => s.position);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHeartbeatRef = useRef(0);
  const lastSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const beat = async () => {
      const now = Date.now();
      if (now - lastHeartbeatRef.current >= 30000) {
        try {
          await sendHeartbeat(user.username, true);
          lastHeartbeatRef.current = now;
        } catch {
          // ignore
        }
      }
    };

    beat();
    intervalRef.current = setInterval(beat, 15000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sendHeartbeat(user.username, false).catch(() => {});
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const songId = currentSong ? String(currentSong.id) : null;
    const songName = currentSong ? currentSong.name : null;

    if (songId !== lastSongIdRef.current || isPlaying) {
      lastSongIdRef.current = songId;
      updateNowPlaying(user.username, songId ? Number(songId) : null, songName).catch(() => {});
    }
  }, [user, currentSong, isPlaying, position]);
}