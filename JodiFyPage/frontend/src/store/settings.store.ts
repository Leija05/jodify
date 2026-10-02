import { create } from 'zustand';
import type { SleepTimerState } from '../lib/types';
import type { Language } from '../lib/i18n';

export interface SettingsState {
  language: Language;
  theme: 'dark' | 'light';
  performanceMode: boolean;
  reduceBlur: boolean;
  reduceAnimations: boolean;
  petEcoMode: boolean;
  disableVisualizer: boolean;
  disableDynamicBg: boolean;
  focusMode: boolean;
  fadeEnabled: boolean;
  fadeDuration: number;
  volumeNormalization: boolean;
  audioQuality: 'auto' | 'high' | 'lossless';
  ambientIntensity: number;
  analogNoise: boolean;
  spatialAudio: boolean;
  smartAutoRadio: boolean;
  obsTheme: 'default' | 'neon' | 'glass' | 'minimal';
  sleepTimer: SleepTimerState | null;
  obsOverlayBaseUrl: string;
  eqPreset: string;
  eqCustomValues: number[] | null;
  customEqPresets: Record<string, number[]>;
  setLanguage: (language: Language) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  set: (patch: Partial<SettingsState>) => void;
  setSleepTimer: (timer: SleepTimerState | null) => void;
}

const LS = {
  language: 'language',
  theme: 'theme',
  performanceMode: 'performanceMode',
  reduceBlur: 'reduceBlur',
  reduceAnimations: 'reduceAnimations',
  petEcoMode: 'petEcoMode',
  visualizer: 'disableVisualizer',
  dynamicBg: 'disableDynamicBg',
  focus: 'focusMode',
  fade: 'fadeEnabled',
  fadeDuration: 'fadeDuration',
  volumeNormalization: 'volumeNormalization',
  audioQuality: 'audioQuality',
  ambientIntensity: 'ambientIntensity',
  analogNoise: 'analogNoise',
  spatialAudio: 'spatialAudio',
  smartAutoRadio: 'smartAutoRadio',
  obsTheme: 'obsTheme',
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

function syncPerformanceDom(state: { performanceMode?: boolean; reduceBlur?: boolean; reduceAnimations?: boolean }) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isPerf = Boolean(state.performanceMode);
  const isNoBlur = Boolean(state.reduceBlur || state.performanceMode);
  const isNoAnim = Boolean(state.reduceAnimations || state.performanceMode);

  if (isPerf) root.setAttribute('data-performance-mode', 'true');
  else root.removeAttribute('data-performance-mode');

  if (isNoBlur) root.setAttribute('data-reduce-blur', 'true');
  else root.removeAttribute('data-reduce-blur');

  if (isNoAnim) root.setAttribute('data-reduce-animations', 'true');
  else root.removeAttribute('data-reduce-animations');
}

const initialState: SettingsState = {
  language: load<Language>(LS.language, 'es'),
  theme: load<'dark' | 'light'>(LS.theme, 'dark'),
  performanceMode: load(LS.performanceMode, false),
  reduceBlur: load(LS.reduceBlur, false),
  reduceAnimations: load(LS.reduceAnimations, false),
  petEcoMode: load(LS.petEcoMode, false),
  disableVisualizer: load(LS.visualizer, false),
  disableDynamicBg: load(LS.dynamicBg, false),
  focusMode: load(LS.focus, false),
  fadeEnabled: load(LS.fade, true),
  fadeDuration: load(LS.fadeDuration, 4),
  volumeNormalization: load(LS.volumeNormalization, false),
  audioQuality: load<'auto' | 'high' | 'lossless'>(LS.audioQuality, 'lossless'),
  ambientIntensity: load(LS.ambientIntensity, 85),
  analogNoise: load(LS.analogNoise, true),
  spatialAudio: load(LS.spatialAudio, false),
  smartAutoRadio: load(LS.smartAutoRadio, true),
  obsTheme: load<'default' | 'neon' | 'glass' | 'minimal'>(LS.obsTheme, 'default'),
  sleepTimer: load<SleepTimerState | null>(LS.sleepTimer, null),
  obsOverlayBaseUrl: load(LS.obsUrl, ''),
  eqPreset: load(LS.eqPreset, 'flat'),
  eqCustomValues: load<number[] | null>(LS.eqValues, null),
  customEqPresets: load<Record<string, number[]>>(LS.eqCustom, {}),
  setLanguage: () => {},
  setTheme: () => {},
  toggleTheme: () => {},
  set: () => {},
  setSleepTimer: () => {},
};

// Sincronizar atributos de aceleración desde el arranque inicial
syncPerformanceDom(initialState);

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initialState,

  setLanguage: (language) => {
    localStorage.setItem(LS.language, JSON.stringify(language));
    set({ language });
  },

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
    const nextState = { ...get(), ...patch };

    // Si se activa el Modo Alto Rendimiento maestro, activar automáticamente las optimizaciones
    if (patch.performanceMode !== undefined) {
      if (patch.performanceMode) {
        if (patch.reduceBlur === undefined) patch.reduceBlur = true;
        if (patch.reduceAnimations === undefined) patch.reduceAnimations = true;
        if (patch.disableDynamicBg === undefined) patch.disableDynamicBg = true;
        if (patch.disableVisualizer === undefined) patch.disableVisualizer = true;
        if (patch.petEcoMode === undefined) patch.petEcoMode = true;
      }
    }

    syncPerformanceDom({ ...nextState, ...patch });

    const { theme, language, ...rest } = patch;
    if (theme !== undefined) localStorage.setItem(LS.theme, JSON.stringify(theme));
    if (language !== undefined) localStorage.setItem(LS.language, JSON.stringify(language));
    for (const [key, value] of Object.entries(rest)) {
      const lsKey = (LS as Record<string, string>)[key];
      if (lsKey) localStorage.setItem(lsKey, JSON.stringify(value));
    }
    set(patch);
    try {
      const username = localStorage.getItem('currentUserName');
      if (username) {
        import('../services/users.service').then(({ usersService }) => {
          const current = get();
          usersService
            .updatePreferences(username, {
              theme: current.theme,
              eq_preset: current.eqPreset,
              custom_eq_presets: current.customEqPresets,
              fade_enabled: current.fadeEnabled,
              fade_duration: current.fadeDuration,
            })
            .catch(() => undefined);
        });
      }
    } catch {
      /* ignore */
    }
  },

  setSleepTimer: (sleepTimer) => {
    if (sleepTimer) localStorage.setItem(LS.sleepTimer, JSON.stringify(sleepTimer));
    else localStorage.removeItem(LS.sleepTimer);
    set({ sleepTimer });
  },
}));
