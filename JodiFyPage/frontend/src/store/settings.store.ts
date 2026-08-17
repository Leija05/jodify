import { create } from 'zustand';
import type { SleepTimerState } from '../lib/types';

export interface SettingsState {
  theme: 'dark' | 'light';
  disableVisualizer: boolean;
  disableDynamicBg: boolean;
  focusMode: boolean;
  fadeEnabled: boolean;
  fadeDuration: number;
  sleepTimer: SleepTimerState | null;
  obsOverlayBaseUrl: string;
  eqPreset: string;
  eqCustomValues: number[] | null;
  customEqPresets: Record<string, number[]>;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  set: (patch: Partial<SettingsState>) => void;
  setSleepTimer: (timer: SleepTimerState | null) => void;
}

const LS = {
  theme: 'theme',
  visualizer: 'disableVisualizer',
  dynamicBg: 'disableDynamicBg',
  focus: 'focusMode',
  fade: 'fadeEnabled',
  fadeDuration: 'fadeDuration',
  sleepTimer: 'sleepTimerData',
  obsUrl: 'obsOverlayPublicBaseUrl',
  eqPreset: 'eqPreset',
  eqValues: 'eqCustomValues',
  eqCustom: 'customEqPresets',
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const initialState: SettingsState = {
  theme: load<'dark' | 'light'>(LS.theme, 'dark'),
  disableVisualizer: load(LS.visualizer, false),
  disableDynamicBg: load(LS.dynamicBg, false),
  focusMode: load(LS.focus, false),
  fadeEnabled: load(LS.fade, true),
  fadeDuration: load(LS.fadeDuration, 4),
  sleepTimer: load<SleepTimerState | null>(LS.sleepTimer, null),
  obsOverlayBaseUrl: load(LS.obsUrl, ''),
  eqPreset: load(LS.eqPreset, 'flat'),
  eqCustomValues: load<number[] | null>(LS.eqValues, null),
  customEqPresets: load<Record<string, number[]>>(LS.eqCustom, {}),
  setTheme: () => {},
  toggleTheme: () => {},
  set: () => {},
  setSleepTimer: () => {},
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initialState,

  setTheme: (theme) => {
    localStorage.setItem(LS.theme, JSON.stringify(theme));
    set({ theme });
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(LS.theme, JSON.stringify(next));
    set({ theme: next });
  },

  set: (patch) => {
    const { theme, ...rest } = patch;
    if (theme !== undefined) localStorage.setItem(LS.theme, JSON.stringify(theme));
    for (const [key, value] of Object.entries(rest)) {
      const lsKey = (LS as Record<string, string>)[key];
      if (lsKey) localStorage.setItem(lsKey, JSON.stringify(value));
    }
    set(patch);
  },

  setSleepTimer: (timer) => {
    if (timer) localStorage.setItem(LS.sleepTimer, JSON.stringify(timer));
    else localStorage.removeItem(LS.sleepTimer);
    set({ sleepTimer: timer });
  },
}));
