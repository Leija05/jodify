import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { STORAGE_KEYS } from '../lib/constants';
import type { AuthUser, SleepTimerState } from '../lib/types';
import { revalidateAuthUser, logout as apiLogout } from '../services/auth.service';
import { useLibraryStore } from './library.store';

interface SettingsState {
  user: AuthUser | null;
  authChecked: boolean;
  sleepTimer: SleepTimerState;
  downloadsStorage: number;

  loadUser: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
  startSleepTimer: (minutes: number) => void;
  cancelSleepTimer: () => void;
  setDownloadsStorage: (bytes: number) => void;
}

const defaultSleep: SleepTimerState = { endAt: null, durationMinutes: 0, triggered: false };

async function readSleepTimer(): Promise<SleepTimerState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.sleepTimer);
    if (!raw) return defaultSleep;
    const parsed = JSON.parse(raw) as SleepTimerState;
    if (typeof parsed.endAt !== 'number') return defaultSleep;
    if (parsed.endAt < Date.now()) {
      await AsyncStorage.removeItem(STORAGE_KEYS.sleepTimer);
      return defaultSleep;
    }
    return parsed;
  } catch {
    return defaultSleep;
  }
}

export const useSettingsStore = create<SettingsState>((set) => ({
  user: null,
  authChecked: false,
  sleepTimer: defaultSleep,
  downloadsStorage: 0,

  loadUser: async () => {
    const [user, sleepTimer] = await Promise.all([revalidateAuthUser(), readSleepTimer()]);
    set({ user, authChecked: true, sleepTimer });
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    await apiLogout();
    set({ user: null });
    useLibraryStore.getState().refreshLikes();
  },

  startSleepTimer: (minutes) => {
    const endAt = Date.now() + minutes * 60_000;
    const state: SleepTimerState = { endAt, durationMinutes: minutes, triggered: false };
    void AsyncStorage.setItem(STORAGE_KEYS.sleepTimer, JSON.stringify(state));
    set({ sleepTimer: state });
  },

  cancelSleepTimer: () => {
    void AsyncStorage.removeItem(STORAGE_KEYS.sleepTimer);
    set({ sleepTimer: defaultSleep });
  },

  setDownloadsStorage: (bytes) => set({ downloadsStorage: bytes }),
}));

export function getSleepRemainingMs(state: SleepTimerState): number {
  if (!state.endAt) return 0;
  return Math.max(0, state.endAt - Date.now());
}