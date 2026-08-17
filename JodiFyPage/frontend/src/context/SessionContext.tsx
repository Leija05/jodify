import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Role } from '../lib/types';
import { usersService } from '../services/users.service';
import { useToastStore } from '../store/toast.store';

export interface Session {
  username: string;
  role: Role;
}

interface SessionContextValue {
  session: Session | null;
  ready: boolean;
  login: (username: string, password: string, keepSession: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const SESSION_KEY = 'jodify_session_active';
const USER_KEY = 'currentUserName';
const ROLE_KEY = 'jodify_user_role';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const active = localStorage.getItem(SESSION_KEY) === 'true';
      const username = localStorage.getItem(USER_KEY);
      const role = localStorage.getItem(ROLE_KEY) as Role | null;
      if (active && username) {
        setSession({ username, role: role ?? 'user' });
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const login = useCallback(async (username: string, password: string, keepSession: boolean): Promise<boolean> => {
    try {
      const result = await usersService.login(username, password);
      if (!result) {
        useToastStore.getState().show('Usuario o contraseña incorrectos', 'error');
        return false;
      }
      setSession({ username: result.username, role: result.role });
      localStorage.setItem(USER_KEY, result.username);
      localStorage.setItem(ROLE_KEY, result.role);
      localStorage.setItem(SESSION_KEY, keepSession ? 'true' : 'true');

      usersService.heartbeat(result.username, true).catch(() => undefined);
      return true;
    } catch (error) {
      useToastStore.getState().show('No se pudo iniciar sesión', 'error');
      console.error(error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    if (session) {
      try {
        await usersService.heartbeat(session.username, false);
      } catch {
        /* ignore */
      }
    }
    const { setAuthToken } = await import('../lib/api');
    setAuthToken(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
    setSession(null);
  }, [session]);

  const value = useMemo(() => ({ session, ready, login, logout }), [session, ready, login, logout]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export function useIsAdmin(): boolean {
  const { session } = useSession();
  return session ? session.role === 'admin' || session.role === 'dev' : false;
}

export function useIsDev(): boolean {
  const { session } = useSession();
  return session?.role === 'dev';
}
