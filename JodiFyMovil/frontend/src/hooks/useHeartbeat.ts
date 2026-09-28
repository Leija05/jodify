import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSettingsStore } from '../stores/settings.store';
import { usePlayerStore } from '../stores/player.store';
import { sendHeartbeat, updateNowPlaying } from '../services/users.service';

export function useHeartbeat() {
  const user = useSettingsStore((s) => s.user);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentAppState = useRef<AppStateStatus>(AppState.currentState);
  const lastHeartbeatRef = useRef(0);
  const lastSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const beat = async (forcePresence?: 'online' | 'background' | 'offline') => {
      const now = Date.now();
      const state = currentAppState.current;
      const presence: 'online' | 'background' | 'offline' =
        forcePresence ?? (state === 'active' ? 'online' : 'background');

      try {
        await sendHeartbeat(user.username, presence !== 'offline', presence);
        lastHeartbeatRef.current = now;
      } catch {
        // ignore network error
      }
    };

    void beat();
    intervalRef.current = setInterval(() => {
      void beat();
    }, 25000);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      currentAppState.current = nextAppState;
      const presence = nextAppState === 'active' ? 'online' : 'background';
      void beat(presence);
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
      void sendHeartbeat(user.username, false, 'offline').catch(() => {});
    };
  }, [user?.username]);

  useEffect(() => {
    if (!user) return;

    const songId = currentSong ? String(currentSong.id) : null;
    const songName = currentSong ? currentSong.name : null;

    if (songId !== lastSongIdRef.current) {
      lastSongIdRef.current = songId;
      updateNowPlaying(user.username, songId ? Number(songId) : null, isPlaying ? songName : null).catch(() => {});
    }
  }, [user?.username, currentSong?.id, currentSong?.name, isPlaying]);
}