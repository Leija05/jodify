import { create } from 'zustand';
import { EQ_BANDS } from '../lib/constants';
import { useSettingsStore } from './settings.store';
import { equalizerApi } from '../services/equalizer.service';

interface EqState {
  values: number[];
  activePreset: string;
  setValue: (index: number, value: number) => void;
  applyPreset: (name: string) => void;
  saveCustom: (name: string) => void;
  removeCustom: (name: string) => void;
  reset: () => void;
  smooth: () => void;
  vibe: () => void;
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
  const initialValues = settings.eqCustomValues && settings.eqCustomValues.length === EQ_BANDS.length
    ? settings.eqCustomValues
    : Array(EQ_BANDS.length).fill(0);

  const applyToEngine = (values: number[]) => {
    equalizerApi.setBandGains(values);
  };

  return {
    values: initialValues,
    activePreset: settings.eqPreset,

    setValue: (index, value) => {
      const values = [...get().values];
      values[index] = value;
      applyToEngine(values);
      set({ values, activePreset: '' });
      useSettingsStore.getState().set({ eqPreset: '', eqCustomValues: values });
    },

    applyPreset: (name) => {
      const presets = useSettingsStore.getState().customEqPresets;
      const pool = { ...presets } as Record<string, number[]>;
      import('../lib/constants').then(({ DEFAULT_EQ_PRESETS }) => {
        const values = DEFAULT_EQ_PRESETS[name] ?? pool[name] ?? Array(EQ_BANDS.length).fill(0);
        applyToEngine(values);
        set({ values, activePreset: name });
        useSettingsStore.getState().set({ eqPreset: name, eqCustomValues: values });
      });
    },

    saveCustom: (name) => {
      const clean = name.toLowerCase().trim();
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
      if (get().activePreset === name) get().reset();
    },

    reset: () => {
      const flat = Array(EQ_BANDS.length).fill(0);
      applyToEngine(flat);
      set({ values: flat, activePreset: 'flat' });
      useSettingsStore.getState().set({ eqPreset: 'flat', eqCustomValues: flat });
    },

    smooth: () => {
      const values = smoothValues(get().values);
      applyToEngine(values);
      set({ values, activePreset: '' });
      useSettingsStore.getState().set({ eqPreset: '', eqCustomValues: values });
    },

    vibe: () => {
      const values = get().values.map((_, i) => {
        const isLow = i < 3;
        const isHigh = i > 6;
        return Math.round((isLow || isHigh ? 4 + Math.random() * 2 : Math.random() * 4 - 2) * 10) / 10;
      });
      applyToEngine(values);
      set({ values, activePreset: '' });
      useSettingsStore.getState().set({ eqPreset: '', eqCustomValues: values });
    },
  };
});
