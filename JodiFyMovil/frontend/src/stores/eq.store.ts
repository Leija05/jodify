import { create } from 'zustand';
import { mmkv, STORAGE_KEYS } from '../lib/mmkv';
import { applyNative, enableEqualizer } from '../services/equalizer.service';
import { apiFetch } from '../services/api';

const DEFAULT_BANDS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const BAND_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS: Record<string, number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass: [6, 4, 2, 1, 0, -1, -2, -3, -4, -5],
  vocal: [-3, -2, 0, 2, 4, 5, 4, 2, 0, -2],
  rock: [4, 3, 2, 0, -2, -1, 1, 3, 4, 5],
  electronic: [5, 3, 1, -1, -2, -1, 1, 3, 5, 6],
  classical: [2, 1, 0, -1, 0, 1, 2, 3, 4, 3],
  pop: [2, 1, 0, 1, 3, 4, 3, 2, 1, 0],
  jazz: [3, 2, 1, 0, 1, 2, 3, 2, 1, 0],
};

const CUSTOM_PRESETS_KEY = 'eq.custom_presets';

interface EqState {
  enabled: boolean;
  preset: string;
  values: number[];
  customPresets: Record<string, number[]>;
  frequencies: readonly number[];

  setEnabled: (enabled: boolean) => void;
  setPreset: (name: string) => void;
  setBand: (index: number, value: number) => void;
  setValues: (values: number[]) => void;
  smooth: () => void;
  vibe: () => void;
  saveCustom: (name: string) => boolean;
  deleteCustom: (name: string) => void;
  reset: () => void;
  loadPersisted: () => void;
  syncWithBackend: (username: string) => Promise<void>;
  fetchFromBackend: (username: string) => Promise<void>;
}

function loadPersistedState(): {
  enabled: boolean;
  preset: string;
  values: number[];
  customPresets: Record<string, number[]>;
} {
  try {
    const enabled = mmkv.getBoolean(STORAGE_KEYS.eqEnabled) ?? true;
    const preset = mmkv.getString(STORAGE_KEYS.eqPreset) ?? 'flat';
    const values = mmkv.getObject<number[]>(STORAGE_KEYS.eqBands) ?? DEFAULT_BANDS;
    const customPresets = mmkv.getObject<Record<string, number[]>>(CUSTOM_PRESETS_KEY) ?? {};
    return {
      enabled,
      preset,
      values: values.length === 10 ? values : DEFAULT_BANDS,
      customPresets,
    };
  } catch {
    return { enabled: true, preset: 'flat', values: DEFAULT_BANDS, customPresets: {} };
  }
}

function smoothValues(values: number[]): number[] {
  return values.map((v, i) => {
    const prev = values[i - 1] ?? v;
    const next = values[i + 1] ?? v;
    return Math.round(((prev + v + next) / 3) * 10) / 10;
  });
}

export const useEqStore = create<EqState>()((set, get) => ({
  enabled: true,
  preset: 'flat',
  values: DEFAULT_BANDS,
  customPresets: {},
  frequencies: BAND_FREQUENCIES,

  setEnabled: (enabled) => {
    set({ enabled });
    mmkv.setBoolean(STORAGE_KEYS.eqEnabled, enabled);
    void enableEqualizer(enabled);
    if (enabled) {
      void applyNative(get().values);
    }
  },

  setPreset: (name) => {
    const custom = get().customPresets;
    const values = EQ_PRESETS[name] ?? custom[name] ?? DEFAULT_BANDS;
    set({ preset: name, values });
    mmkv.setString(STORAGE_KEYS.eqPreset, name);
    mmkv.setObject(STORAGE_KEYS.eqBands, values);
    if (get().enabled) {
      void applyNative(values);
    }
  },

  setBand: (index, value) => {
    const clamped = Math.max(-12, Math.min(12, Math.round(value * 10) / 10));
    const nextValues = [...get().values];
    nextValues[index] = clamped;
    set({ values: nextValues, preset: 'custom' });
    mmkv.setString(STORAGE_KEYS.eqPreset, 'custom');
    mmkv.setObject(STORAGE_KEYS.eqBands, nextValues);
    if (get().enabled) {
      void applyNative(nextValues);
    }
  },

  setValues: (values) => {
    const clamped = values.map((v) => Math.max(-12, Math.min(12, Math.round(v * 10) / 10)));
    set({ values: clamped, preset: 'custom' });
    mmkv.setString(STORAGE_KEYS.eqPreset, 'custom');
    mmkv.setObject(STORAGE_KEYS.eqBands, clamped);
    if (get().enabled) {
      void applyNative(clamped);
    }
  },

  smooth: () => {
    const values = smoothValues(get().values);
    set({ values, preset: 'custom' });
    mmkv.setString(STORAGE_KEYS.eqPreset, 'custom');
    mmkv.setObject(STORAGE_KEYS.eqBands, values);
    if (get().enabled) {
      void applyNative(values);
    }
  },

  vibe: () => {
    const values = get().values.map((_, i) => {
      const isLow = i < 3;
      const isHigh = i > 6;
      return Math.round((isLow || isHigh ? 4 + Math.random() * 2 : Math.random() * 4 - 2) * 10) / 10;
    });
    set({ values, preset: 'custom' });
    mmkv.setString(STORAGE_KEYS.eqPreset, 'custom');
    mmkv.setObject(STORAGE_KEYS.eqBands, values);
    if (get().enabled) {
      void applyNative(values);
    }
  },

  saveCustom: (name) => {
    const clean = name.trim().toLowerCase();
    if (!clean) return false;
    const nextCustom = { ...get().customPresets, [clean]: [...get().values] };
    set({ customPresets: nextCustom, preset: clean });
    mmkv.setObject(CUSTOM_PRESETS_KEY, nextCustom);
    mmkv.setString(STORAGE_KEYS.eqPreset, clean);
    return true;
  },

  deleteCustom: (name) => {
    const clean = name.trim().toLowerCase();
    const nextCustom = { ...get().customPresets };
    delete nextCustom[clean];
    set({ customPresets: nextCustom });
    mmkv.setObject(CUSTOM_PRESETS_KEY, nextCustom);
    if (get().preset === clean) {
      get().setPreset('flat');
    }
  },

  reset: () => {
    set({ enabled: true, preset: 'flat', values: DEFAULT_BANDS });
    mmkv.setBoolean(STORAGE_KEYS.eqEnabled, true);
    mmkv.setString(STORAGE_KEYS.eqPreset, 'flat');
    mmkv.setObject(STORAGE_KEYS.eqBands, DEFAULT_BANDS);
    void applyNative(DEFAULT_BANDS);
  },

  loadPersisted: () => {
    const persisted = loadPersistedState();
    set(persisted);
    if (persisted.enabled) {
      void applyNative(persisted.values);
    }
  },

  syncWithBackend: async (username: string) => {
    try {
      const { preset, values, customPresets } = get();
      await apiFetch(`/api/users/${encodeURIComponent(username)}/preferences`, {
        method: 'PUT',
        body: {
          eq_preset: preset,
          eq_bands: values,
          custom_eq_presets: customPresets,
        },
        auth: true,
      });
    } catch (e) {
      console.warn('[EqStore] Failed to sync with backend:', e);
    }
  },

  fetchFromBackend: async (username: string) => {
    try {
      const prefs = await apiFetch<{
        eq_preset?: string;
        eq_bands?: number[];
        custom_eq_presets?: Record<string, number[]>;
      }>(`/api/users/${encodeURIComponent(username)}/preferences`, { auth: true });

      if (prefs) {
        if (prefs.custom_eq_presets) {
          set({ customPresets: prefs.custom_eq_presets });
          mmkv.setObject(CUSTOM_PRESETS_KEY, prefs.custom_eq_presets);
        }
        if (prefs.eq_bands && prefs.eq_bands.length === 10) {
          set({ values: prefs.eq_bands, preset: prefs.eq_preset ?? 'custom' });
          mmkv.setObject(STORAGE_KEYS.eqBands, prefs.eq_bands);
          if (prefs.eq_preset) mmkv.setString(STORAGE_KEYS.eqPreset, prefs.eq_preset);
          if (get().enabled) void applyNative(prefs.eq_bands);
        }
      }
    } catch (e) {
      console.warn('[EqStore] Failed to fetch from backend:', e);
    }
  },
}));