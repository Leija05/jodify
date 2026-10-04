import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSettingsStore } from '../stores/settings.store';
import { usePlayerStore } from '../stores/player.store';
import { sendHeartbeat, updateNowPlaying, recordListeningTime } from '../services/users.service';

export function useHeartbeat() {
  const user = useSettingsStore((s) => s.user);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listeningIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentAppState = useRef<AppStateStatus>(AppState.currentState);
  const lastHeartbeatRef = useRef(0);
  const lastProfileSyncRef = useRef(0);
  const lastStateRef = useRef<{ songId: string | number | null; playing: boolean }>({
    songId: null,
    playing: false,
  });

  // 1. Presence Heartbeat
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

        // Sync fresh profile state from Render backend every 45s
        if (now - lastProfileSyncRef.current > 45000) {
          lastProfileSyncRef.current = now;
          useSettingsStore.getState().refreshProfile().catch(() => {});
        }
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

  // 2. Real-time Now Playing Sync with Render backend
  useEffect(() => {
    if (!user) return;

    const activeSongId = currentSong?.id ?? null;
    const activeSongName = currentSong?.name ?? null;
    const activeIsPlaying = Boolean(isPlaying && currentSong);

    const prev = lastStateRef.current;
    if (prev.songId !== activeSongId || prev.playing !== activeIsPlaying) {
      lastStateRef.current = { songId: activeSongId, playing: activeIsPlaying };
      updateNowPlaying(
        user.username,
        activeIsPlaying ? activeSongId : null,
        activeIsPlaying ? activeSongName : null
      ).catch(() => {});
    }
  }, [user?.username, currentSong?.id, currentSong?.name, isPlaying]);

  // 3. Listening Time Accumulator (Syncs listening stats to Render in real-time)
  useEffect(() => {
    if (!user || !isPlaying || !currentSong) {
      if (listeningIntervalRef.current) {
        clearInterval(listeningIntervalRef.current);
        listeningIntervalRef.current = null;
      }
      return;
    }

    // Every 15 seconds of playback, increment listening_seconds on backend
    listeningIntervalRef.current = setInterval(() => {
      if (user?.username) {
        recordListeningTime(user.username, 15).catch(() => {});
      }
    }, 15000);

    return () => {
      if (listeningIntervalRef.current) {
        clearInterval(listeningIntervalRef.current);
        listeningIntervalRef.current = null;
      }
    };
  }, [user?.username, isPlaying, currentSong?.id]);
}