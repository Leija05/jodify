import { create } from 'zustand';
import { mmkv, STORAGE_KEYS } from '../lib/mmkv';
import type { UserAccess, SleepTimerState } from '../lib/types';
import { apiFetch } from '../services/api';

interface SettingsState {
  user: UserAccess | null;
  sleepTimer: SleepTimerState;
  volume: number;
  muted: boolean;
  hapticsEnabled: boolean;
  theme: 'dark' | 'light' | 'system';
  notificationsEnabled: boolean;

  setUser: (user: UserAccess | null) => void;
  updateUser: (partial: Partial<UserAccess>) => void;
  refreshProfile: () => Promise<void>;
  logout: () => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  startSleepTimer: (minutes: number) => void;
  cancelSleepTimer: () => void;
  loadPersisted: () => void;
}

const DEFAULT_SLEEP_TIMER: SleepTimerState = {
  endAt: null,
  durationMinutes: 0,
  triggered: false,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  user: null,
  sleepTimer: DEFAULT_SLEEP_TIMER,
  volume: 1,
  muted: false,
  hapticsEnabled: true,
  theme: 'dark',
  notificationsEnabled: true,

  setUser: (user) => {
    set({ user });
    if (user) {
      mmkv.setObject(STORAGE_KEYS.authUser, user);
    } else {
      mmkv.delete(STORAGE_KEYS.authUser);
    }
  },

  updateUser: (partial) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...partial };
    set({ user: updated });
    mmkv.setObject(STORAGE_KEYS.authUser, updated);
  },

  refreshProfile: async () => {
    const current = get().user;
    if (!current?.username) return;
    try {
      const fresh = await apiFetch<UserAccess>(`/api/users/${encodeURIComponent(current.username)}`);
      if (fresh) {
        const merged: UserAccess = {
          ...current,
          ...fresh,
          display_name: fresh.display_name ?? current.display_name,
          avatar_url: fresh.avatar_url ?? current.avatar_url,
          avatar_frame: fresh.avatar_frame ?? current.avatar_frame,
          profile_animation: fresh.profile_animation ?? current.profile_animation,
          theme: fresh.theme ?? current.theme,
          custom_badge: (fresh as any).custom_badge ?? current.custom_badge,
        };
        set({ user: merged });
        mmkv.setObject(STORAGE_KEYS.authUser, merged);
        return;
      }
    } catch {
      // Offline fallback: try community cache
      try {
        const cached = mmkv.getObject<any[]>('community.cached_users');
        const match = cached?.find((c) => c.username?.toLowerCase() === current.username.toLowerCase());
        if (match) {
          const merged: UserAccess = {
            ...current,
            display_name: match.display_name ?? current.display_name,
            avatar_url: match.avatar_url ?? current.avatar_url,
            avatar_frame: match.avatar_frame ?? current.avatar_frame,
            profile_animation: match.profile_animation ?? current.profile_animation,
            theme: match.theme ?? current.theme,
            custom_badge: match.custom_badge ?? current.custom_badge,
          };
          set({ user: merged });
          mmkv.setObject(STORAGE_KEYS.authUser, merged);
        }
      } catch {}
    }
  },

  logout: () => {
    set({ user: null, sleepTimer: DEFAULT_SLEEP_TIMER });
    mmkv.delete(STORAGE_KEYS.authUser);
    mmkv.delete(STORAGE_KEYS.authToken);
    mmkv.delete(STORAGE_KEYS.authRefreshToken);
  },

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped, muted: clamped === 0 });
    mmkv.setNumber(STORAGE_KEYS.userVolume, clamped);
    mmkv.setBoolean(STORAGE_KEYS.userMuted, clamped === 0);
  },

  setMuted: (muted) => {
    set({ muted, volume: muted ? 0 : get().volume });
    mmkv.setBoolean(STORAGE_KEYS.userMuted, muted);
    if (muted) mmkv.setNumber(STORAGE_KEYS.userVolume, 0);
  },

  setHapticsEnabled: (enabled) => {
    set({ hapticsEnabled: enabled });
    mmkv.setBoolean(STORAGE_KEYS.hapticsEnabled, enabled);
  },

  setTheme: (theme) => {
    set({ theme });
    mmkv.setString(STORAGE_KEYS.theme, theme);
  },

  setNotificationsEnabled: (enabled) => {
    set({ notificationsEnabled: enabled });
  },

  startSleepTimer: (minutes) => {
    const endAt = Date.now() + minutes * 60 * 1000;
    set({ sleepTimer: { endAt, durationMinutes: minutes, triggered: false } });
    mmkv.setObject(STORAGE_KEYS.sleepTimer, { endAt, durationMinutes: minutes, triggered: false });
  },

  cancelSleepTimer: () => {
    set({ sleepTimer: DEFAULT_SLEEP_TIMER });
    mmkv.delete(STORAGE_KEYS.sleepTimer);
  },

  loadPersisted: () => {
    try {
      let user = mmkv.getObject<UserAccess>(STORAGE_KEYS.authUser);
      const volume = mmkv.getNumber(STORAGE_KEYS.userVolume) ?? 1;
      const muted = mmkv.getBoolean(STORAGE_KEYS.userMuted) ?? false;
      const hapticsEnabled = mmkv.getBoolean(STORAGE_KEYS.hapticsEnabled) ?? true;
      const theme = mmkv.getString(STORAGE_KEYS.theme) as 'dark' | 'light' | 'system' ?? 'dark';
      const sleepTimer = mmkv.getObject<SleepTimerState>(STORAGE_KEYS.sleepTimer);

      if (user?.username && (!user.avatar_url || !user.avatar_frame)) {
        try {
          const cached = mmkv.getObject<any[]>('community.cached_users');
          const match = cached?.find((c) => c.username?.toLowerCase() === user?.username?.toLowerCase());
          if (match) {
            user = {
              ...user,
              display_name: match.display_name ?? user.display_name,
              avatar_url: match.avatar_url ?? user.avatar_url,
              avatar_frame: match.avatar_frame ?? user.avatar_frame,
              profile_animation: match.profile_animation ?? user.profile_animation,
              theme: match.theme ?? user.theme,
              custom_badge: match.custom_badge ?? user.custom_badge,
            };
            mmkv.setObject(STORAGE_KEYS.authUser, user);
          }
        } catch {}
      }

      if (sleepTimer?.endAt && sleepTimer.endAt > Date.now()) {
        set({ sleepTimer });
      } else if (sleepTimer) {
        mmkv.delete(STORAGE_KEYS.sleepTimer);
      }

      set({ user: user ?? null, volume, muted, hapticsEnabled, theme });
      if (user?.username) {
        void get().refreshProfile();
      }
    } catch {
    }
  },
}));