import { create } from 'zustand';
import { mmkv, STORAGE_KEYS } from '../lib/mmkv';
import type { UserAccess, SleepTimerState } from '../lib/types';

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
      const user = mmkv.getObject<UserAccess>(STORAGE_KEYS.authUser);
      const volume = mmkv.getNumber(STORAGE_KEYS.userVolume) ?? 1;
      const muted = mmkv.getBoolean(STORAGE_KEYS.userMuted) ?? false;
      const hapticsEnabled = mmkv.getBoolean(STORAGE_KEYS.hapticsEnabled) ?? true;
      const theme = mmkv.getString(STORAGE_KEYS.theme) as 'dark' | 'light' | 'system' ?? 'dark';
      const sleepTimer = mmkv.getObject<SleepTimerState>(STORAGE_KEYS.sleepTimer);

      if (sleepTimer?.endAt && sleepTimer.endAt > Date.now()) {
        set({ sleepTimer });
      } else if (sleepTimer) {
        mmkv.delete(STORAGE_KEYS.sleepTimer);
      }

      set({ user: user ?? null, volume, muted, hapticsEnabled, theme });
    } catch {
    }
  },
}));