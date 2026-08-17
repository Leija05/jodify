import { useEffect } from 'react';
import { loadLibrary } from './useOffline';

export function useLoadLibrary(session: { username: string } | null): void {
  useEffect(() => {
    if (session) {
      void loadLibrary(session.username);
    }
  }, [session]);
}
