import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { DEFAULT_EQ_PRESETS, EQ_BANDS, STORAGE_KEYS } from '../lib/constants';
import { applyNative, setNativeEnabled } from '../services/equalizer.service';

interface EqState {
  enabled: boolean;
  values: number[];
  preset: string | null;
  loaded: boolean;

  load: () => Promise<void>;
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
  setBand: (index: number, db: number) => void;
  setPreset: (name: string) => void;
  reset: () => void;
}

const FLAT: number[] = (DEFAULT_EQ_PRESETS as Record<string, number[]>).flat ?? [0, 0, 0, 0, 0];

function isFlat(values: number[]): boolean {
  return values.every((v) => v === 0);
}

function findPreset(values: number[]): string | null {
  if (isFlat(values)) return 'flat';
  for (const [name, levels] of Object.entries(DEFAULT_EQ_PRESETS)) {
    if (levels.length === values.length && levels.every((l, i) => l === values[i])) {
      return name;
    }
  }
  return null;
}

async function persist(enabled: boolean, values: number[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.eq, JSON.stringify({ enabled, values }));
  } catch {
    // sin almacenamiento: el ecualizador sigue funcionando en memoria
  }
}

function applyToNative(enabled: boolean, values: number[]): void {
  void (async () => {
    await setNativeEnabled(enabled);
    if (enabled) await applyNative(values);
  })();
}

export const useEqStore = create<EqState>((set, get) => ({
  enabled: false,
  values: [...FLAT],
  preset: 'flat',
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.eq);
      if (raw) {
        const parsed = JSON.parse(raw) as { enabled?: boolean; values?: number[] };
        const values =
          Array.isArray(parsed.values) && parsed.values.length === EQ_BANDS.length
            ? parsed.values.map((v) => (Number.isFinite(v) ? v : 0))
            : [...FLAT];
        const enabled = !!parsed.enabled;
        set({ enabled, values, preset: findPreset(values), loaded: true });
        if (enabled) {
          await setNativeEnabled(true);
          await applyNative(values);
        }
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  toggle: () => {
    const { enabled, values } = get();
    const next = !enabled;
    set({ enabled: next });
    applyToNative(next, values);
    void persist(next, values);
  },

  setEnabled: (enabled) => {
    const { values } = get();
    set({ enabled });
    applyToNative(enabled, values);
    void persist(enabled, values);
  },

  setBand: (index, db) => {
    const { enabled, values } = get();
    const next = values.map((v, i) => (i === index ? Math.round(db) : v));
    set({ values: next, preset: findPreset(next) });
    if (enabled) void applyNative(next);
    void persist(enabled, next);
  },

  setPreset: (name) => {
    const levels = DEFAULT_EQ_PRESETS[name];
    if (!levels) return;
    const { enabled } = get();
    const next = [...levels];
    set({ values: next, preset: name });
    applyToNative(enabled, next);
    void persist(enabled, next);
  },

  reset: () => {
    const { enabled } = get();
    const next = [...FLAT];
    set({ values: next, preset: 'flat' });
    if (enabled) void applyNative(next);
    void persist(enabled, next);
  },
}));