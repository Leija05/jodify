import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Role } from '../lib/types';
import { getAuthToken, setAuthToken } from '../lib/api';
import { saveToken } from '../lib/token';
import { usersService } from '../services/users.service';
import { useToastStore } from '../store/toast.store';

export interface Session {
  username: string;
  role: Role;
  display_name?: string | null;
  avatar_url?: string | null;
  avatar_source?: 'custom' | 'discord' | 'initials' | null;
  avatar_frame?: string | null;
  custom_badge?: string | null;
  accent_color?: string | null;
  theme?: string | null;
  bio?: string | null;
  vibe?: string | null;
}

interface SessionContextValue {
  session: Session | null;
  ready: boolean;
  login: (username: string, password: string, keepSession: boolean) => Promise<boolean>;
  devLogin: (devKey: string) => Promise<{ ok: boolean; error?: string }>;
  tokenLogin: (token: string, save: boolean) => Promise<{ ok: boolean; error?: string; role?: Role }>;
  savedTokenLogin: () => Promise<{ ok: boolean; error?: string }>;
  applyUserSession: (result: { username: string; role: Role }, keepSession: boolean) => void;
  updateSessionProfile: (updates: Partial<Session>) => void;
  applyDevAccess: (result: { token: string; username: string; role: string }, save: boolean) => void;
  redeem: (token: string, username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const SESSION_KEY = 'jodify_session_active';
const USER_KEY = 'currentUserName';
const ROLE_KEY = 'jodify_user_role';
const PROFILE_CACHE_KEY = 'jodify_saved_profile';

async function syncUserPreferences(username: string) {
  try {
    const prefs = await usersService.getPreferences(username);
    if (prefs) {
      const { useSettingsStore } = await import('../store/settings.store');
      const patch: any = {};
      if (prefs.theme) patch.theme = prefs.theme;
      if (prefs.eq_preset) patch.eqPreset = prefs.eq_preset;
      if (prefs.custom_eq_presets) patch.customEqPresets = prefs.custom_eq_presets;
      if (prefs.fade_enabled !== undefined) patch.fadeEnabled = prefs.fade_enabled;
      if (prefs.fade_duration != null) patch.fadeDuration = prefs.fade_duration;
      useSettingsStore.getState().set(patch);
    }
  } catch {
    /* non-blocking */
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  const fetchAndApplyProfile = useCallback(async (username: string) => {
    try {
      const prof = await usersService.fetchProfile(username);
      if (prof) {
        setSession((prev) => {
          if (!prev || prev.username.toLowerCase() !== username.toLowerCase()) return prev;
          const updated: Session = {
            ...prev,
            display_name: prof.display_name,
            avatar_url: prof.avatar_url,
            avatar_source: prof.avatar_source,
            avatar_frame: prof.avatar_frame,
            custom_badge: prof.custom_badge,
            accent_color: prof.accent_color,
            theme: prof.theme,
            bio: prof.bio,
            vibe: prof.vibe,
          };
          try {
            localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updated));
          } catch {}
          const desktopAuth = (window as any).jodifyAuth;
          if (desktopAuth && typeof desktopAuth.saveSession === 'function') {
            desktopAuth.saveSession({
              ...updated,
              token: getAuthToken(),
            }).catch(() => undefined);
          }
          return updated;
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const updateSessionProfile = useCallback((updates: Partial<Session>) => {
    setSession((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(next));
      } catch {}
      const desktopAuth = (window as any).jodifyAuth;
      if (desktopAuth && typeof desktopAuth.saveSession === 'function') {
        desktopAuth.saveSession({
          ...next,
          token: getAuthToken(),
        }).catch(() => undefined);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    async function initSession() {
      try {
        let active = localStorage.getItem(SESSION_KEY) === 'true';
        let username: string | null = localStorage.getItem(USER_KEY);
        let role: Role | null = localStorage.getItem(ROLE_KEY) as Role | null;
        let cachedProfile: Partial<Session> = {};

        try {
          const raw = localStorage.getItem(PROFILE_CACHE_KEY);
          if (raw) cachedProfile = JSON.parse(raw);
        } catch {}

        // Si estamos en Electron, sincronizar siempre con el almacén persistente de disco
        const desktopAuth = (window as any).jodifyAuth;
        if (desktopAuth && typeof desktopAuth.getSavedSession === 'function') {
          const diskSession = await desktopAuth.getSavedSession();
          if (diskSession && diskSession.username) {
            active = true;
            username = String(diskSession.username);
            role = (diskSession.role as Role) || 'user';
            cachedProfile = { ...cachedProfile, ...diskSession };
            localStorage.setItem(SESSION_KEY, 'true');
            localStorage.setItem(USER_KEY, username);
            localStorage.setItem(ROLE_KEY, role);
            if (diskSession.token) {
              setAuthToken(String(diskSession.token));
            }
          }
        }

        const validUser = username;
        if (active && validUser) {
          setSession({
            username: validUser,
            role: role ?? 'user',
            display_name: cachedProfile.display_name ?? null,
            avatar_url: cachedProfile.avatar_url ?? null,
            avatar_source: cachedProfile.avatar_source ?? 'custom',
            avatar_frame: cachedProfile.avatar_frame ?? 'none',
            custom_badge: cachedProfile.custom_badge ?? null,
            accent_color: cachedProfile.accent_color ?? null,
            theme: cachedProfile.theme ?? null,
            bio: cachedProfile.bio ?? null,
            vibe: cachedProfile.vibe ?? null,
          });
          syncUserPreferences(validUser).catch(() => undefined);
          fetchAndApplyProfile(validUser).catch(() => undefined);
        }
      } catch {
        /* ignore */
      } finally {
        setReady(true);
      }
    }

    void initSession();
  }, [fetchAndApplyProfile]);

  const applyUserSession = useCallback((result: { username: string; role: Role }, keepSession: boolean) => {
    setSession((prev) => {
      const base: Session = {
        username: result.username,
        role: result.role,
        ...(prev && prev.username.toLowerCase() === result.username.toLowerCase() ? prev : {}),
      };
      if (keepSession) {
        try {
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(base));
        } catch {}
      }
      return base;
    });
    localStorage.setItem(USER_KEY, result.username);
    localStorage.setItem(ROLE_KEY, result.role);

    const desktopAuth = (window as any).jodifyAuth;
    if (keepSession) {
      localStorage.setItem(SESSION_KEY, 'true');
      if (desktopAuth && typeof desktopAuth.saveSession === 'function') {
        desktopAuth.saveSession({
          username: result.username,
          role: result.role,
          token: getAuthToken(),
        }).catch(() => undefined);
      }
    } else {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(PROFILE_CACHE_KEY);
      if (desktopAuth && typeof desktopAuth.clearSession === 'function') {
        desktopAuth.clearSession().catch(() => undefined);
      }
    }

    usersService.heartbeat(result.username, true).catch(() => undefined);
    syncUserPreferences(result.username).catch(() => undefined);
    fetchAndApplyProfile(result.username).catch(() => undefined);
  }, [fetchAndApplyProfile]);

  const login = useCallback(async (username: string, password: string, keepSession: boolean): Promise<boolean> => {
    try {
      const result = await usersService.login(username, password);
      if (!result) {
        useToastStore.getState().show('Usuario o contraseña incorrectos', 'error');
        return false;
      }
      applyUserSession(result, keepSession);
      return true;
    } catch (error) {
      useToastStore.getState().show('No se pudo iniciar sesión', 'error');
      console.error(error);
      return false;
    }
  }, [applyUserSession]);

  const logout = useCallback(async () => {
    if (session) {
      try {
        await usersService.heartbeat(session.username, false);
      } catch {
        /* ignore */
      }
    }
    setAuthToken(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(PROFILE_CACHE_KEY);
    const desktopAuth = (window as any).jodifyAuth;
    if (desktopAuth && typeof desktopAuth.clearSession === 'function') {
      desktopAuth.clearSession().catch(() => undefined);
    }
    setSession(null);
  }, [session]);

  const applyDevAccess = useCallback(
    (result: { token: string; username: string; role: string }, save: boolean): void => {
      setAuthToken(result.token);
      const role = (result.role ?? 'dev') as Role;
      setSession({ username: result.username, role });
      localStorage.setItem(USER_KEY, result.username);
      localStorage.setItem(ROLE_KEY, role);
      localStorage.setItem(SESSION_KEY, 'true');
      if (save) saveToken(result.token);
      usersService.heartbeat(result.username, true).catch(() => undefined);
      syncUserPreferences(result.username).catch(() => undefined);
      fetchAndApplyProfile(result.username).catch(() => undefined);
    },
    [fetchAndApplyProfile],
  );

  const devLogin = useCallback(async (devKey: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { devService } = await import('../services/dev.service');
      const result = await devService.accessWithKey(devKey);
      applyDevAccess(result, false);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo entrar al modo dev';
      return { ok: false, error: message };
    }
  }, [applyDevAccess]);

  const tokenLogin = useCallback(
    async (token: string, save: boolean): Promise<{ ok: boolean; error?: string; role?: Role }> => {
      try {
        const result = await devLogin(token);
        if (!result.ok) return { ok: false, error: result.error };
        const role = (localStorage.getItem(ROLE_KEY) as Role | null) ?? 'dev';
        if (save) saveToken(token.trim());
        return { ok: true, role };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo validar el token';
        return { ok: false, error: message };
      }
    },
    [devLogin],
  );

  const savedTokenLogin = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const { getSavedToken } = await import('../lib/token');
    const saved = getSavedToken();
    if (!saved) return { ok: false, error: 'No hay token guardado' };
    return tokenLogin(saved, true);
  }, [tokenLogin]);

  const redeem = useCallback(
    async (token: string, username: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const { devService } = await import('../services/dev.service');
        const result = await devService.redeemToken(token, username, password);
        const { setAuthToken } = await import('../lib/api');
        setAuthToken(result.token);
        const role = (result.role ?? 'user') as Role;
        setSession({ username: result.username, role });
        localStorage.setItem(USER_KEY, result.username);
        localStorage.setItem(ROLE_KEY, role);
        localStorage.setItem(SESSION_KEY, 'true');
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo canjear el token';
        return { ok: false, error: message };
      }
    },
    [],
  );

  const value = useMemo(
    () => ({ session, ready, login, devLogin, tokenLogin, savedTokenLogin, applyUserSession, updateSessionProfile, applyDevAccess, redeem, logout }),
    [session, ready, login, devLogin, tokenLogin, savedTokenLogin, applyUserSession, updateSessionProfile, applyDevAccess, redeem, logout],
  );

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
