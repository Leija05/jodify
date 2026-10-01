import { useEffect } from 'react';
import { loadLibrary } from './useOffline';
import { onBackendReconnect } from '../store/backend.store';
import { usePlaylistsStore } from '../store/playlists.store';

export function useLoadLibrary(session: { username: string } | null): void {
  useEffect(() => {
    if (session) {
      void loadLibrary(session.username);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const unsubscribe = onBackendReconnect(() => {
      void loadLibrary(session.username);
      void usePlaylistsStore.getState().loadPlaylists(session.username);
    });
    return unsubscribe;
  }, [session]);
}
