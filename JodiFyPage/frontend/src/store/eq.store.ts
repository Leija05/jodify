import { create } from 'zustand';
import { EQ_BANDS } from '../lib/constants';
import { useSettingsStore } from './settings.store';
import { equalizerApi } from '../services/equalizer.service';

interface EqState {
  enabled: boolean;
  values: number[];
  activePreset: string;
  preamp: number; // -12 a +12 dB
  bassBoost: number; // 0 a 100%
  clarity: number; // 0 a 100%

  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  setValue: (index: number, value: number) => void;
  setPreamp: (value: number) => void;
  setBassBoost: (value: number) => void;
  setClarity: (value: number) => void;
  applyPreset: (name: string) => void;
  saveCustom: (name: string) => boolean;
  removeCustom: (name: string) => void;
  reset: () => void;
  smooth: () => void;
  vibe: () => void;
}

function readNum(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return raw === 'true';
  } catch {
    return fallback;
  }
}

function smoothValues(values: number[]): number[] {
  return values.map((v, i) => {
    const prev = values[i - 1] ?? v;
    const next = values[i + 1] ?? v;
    return Math.round(((prev + v + next) / 3) * 10) / 10;
  });
}

export const useEqStore = create<EqState>((set, get) => {
  const settings = useSettingsStore.getState();
  const initialValues =
    settings.eqCustomValues && settings.eqCustomValues.length === EQ_BANDS.length
      ? settings.eqCustomValues
      : Array(EQ_BANDS.length).fill(0);

  const initialEnabled = readBool('jfEqEnabled', true);
  const initialPreamp = readNum('jfEqPreamp', 0);
  const initialBassBoost = readNum('jfEqBass', 0);
  const initialClarity = readNum('jfEqClarity', 0);

  const syncEngine = () => {
    const s = get();
    equalizerApi.syncAll({
      enabled: s.enabled,
      bandGains: s.values,
      preamp: s.preamp,
      bassBoost: s.bassBoost,
      clarity: s.clarity,
    });
  };

  return {
    enabled: initialEnabled,
    values: initialValues,
    activePreset: settings.eqPreset || 'flat',
    preamp: initialPreamp,
    bassBoost: initialBassBoost,
    clarity: initialClarity,

    setEnabled: (enabled) => {
      localStorage.setItem('jfEqEnabled', String(enabled));
      set({ enabled });
      equalizerApi.setEnabled(enabled);
    },

    toggleEnabled: () => {
      const next = !get().enabled;
      get().setEnabled(next);
    },

    setValue: (index, value) => {
      const values = [...get().values];
      values[index] = value;
      equalizerApi.setBandGain(index, value);
      set({ values, activePreset: '' });
      useSettingsStore.getState().set({ eqPreset: '', eqCustomValues: values });
    },

    setPreamp: (value) => {
      localStorage.setItem('jfEqPreamp', String(value));
      set({ preamp: value });
      equalizerApi.setPreamp(value);
    },

    setBassBoost: (value) => {
      localStorage.setItem('jfEqBass', String(value));
      set({ bassBoost: value });
      equalizerApi.setBassBoost(value);
    },

    setClarity: (value) => {
      localStorage.setItem('jfEqClarity', String(value));
      set({ clarity: value });
      equalizerApi.setClarity(value);
    },

    applyPreset: (name) => {
      const presets = useSettingsStore.getState().customEqPresets;
      const pool = { ...presets } as Record<string, number[]>;
      import('../lib/constants').then(({ DEFAULT_EQ_PRESETS }) => {
        const values = DEFAULT_EQ_PRESETS[name] ?? pool[name] ?? Array(EQ_BANDS.length).fill(0);
        set({ values, activePreset: name });
        syncEngine();
        useSettingsStore.getState().set({ eqPreset: name, eqCustomValues: values });
      });
    },

    saveCustom: (name) => {
      const clean = name.trim();
      if (!clean) return false;
      const custom = useSettingsStore.getState().customEqPresets;
      useSettingsStore.getState().set({ customEqPresets: { ...custom, [clean]: [...get().values] } });
      set({ activePreset: clean });
      return true;
    },

    removeCustom: (name) => {
      const custom = useSettingsStore.getState().customEqPresets;
      const { [name]: _removed, ...rest } = custom;
      useSettingsStore.getState().set({ customEqPresets: rest });
      if (get().activePreset === name) {
        get().reset();
      }
    },

    reset: () => {
      const flat = Array(EQ_BANDS.length).fill(0);
      set({ values: flat, activePreset: 'flat', preamp: 0, bassBoost: 0, clarity: 0 });
      localStorage.setItem('jfEqPreamp', '0');
      localStorage.setItem('jfEqBass', '0');
      localStorage.setItem('jfEqClarity', '0');
      syncEngine();
      useSettingsStore.getState().set({ eqPreset: 'flat', eqCustomValues: flat });
    },

    smooth: () => {
      const values = smoothValues(get().values);
      set({ values, activePreset: '' });
      syncEngine();
      useSettingsStore.getState().set({ eqPreset: '', eqCustomValues: values });
    },

    vibe: () => {
      // Curva V-Shape audiófila (punchy sub-bass, calidez controlada, agudos con aire)
      const values = [6.0, 4.5, 2.0, -1.0, -2.5, -1.0, 2.0, 4.5, 5.5, 6.0];
      set({ values, activePreset: 'vibe' });
      syncEngine();
      useSettingsStore.getState().set({ eqPreset: '', eqCustomValues: values });
    },
  };
});
