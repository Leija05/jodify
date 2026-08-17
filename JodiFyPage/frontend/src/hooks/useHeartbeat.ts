import { useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { usersService } from '../services/users.service';
import { HEARTBEAT_MS } from '../lib/constants';

export function useHeartbeat(enabled: boolean, username?: string | null): void {
  const { session } = useSession();
  const user = username ?? session?.username;

  useEffect(() => {
    if (!enabled || !user || !session) return;
    let cancelled = false;

    const beat = () => {
      usersService.heartbeat(user, true).catch(() => undefined);
    };

    beat();
    const timer = setInterval(() => {
      if (!cancelled) beat();
    }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, user, session]);
}
