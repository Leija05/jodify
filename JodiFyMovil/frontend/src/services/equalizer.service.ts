import { NativeModules, Platform } from 'react-native';

/**
 * Puente hacia el ecualizador nativo de Android (JodifyEqualizer).
 *
 * El módulo nativo existe en builds generados con `expo run:android`
 * (config plugin `with-jodify-equalizer`). En Expo Go o en iOS no hay
 * módulo nativo: todos los métodos degradan a no-op para que la app
 * siga funcionando con normalidad.
 */

type NativeEq = {
  isAvailable: (callback: (available: boolean, bands: number) => void) => void;
  setEnabled: (enabled: boolean) => void;
  setBandGains: (gains: number[]) => void;
  getBandFrequencies: (callback: (frequencies: number[]) => void) => void;
  release: () => void;
};

let checked = false;
let nativeModule: NativeEq | null = null;

function native(): NativeEq | null {
  if (Platform.OS !== 'android') return null;
  if (!checked) {
    checked = true;
    try {
      const mod = (NativeModules as Record<string, unknown>).JodifyEqualizer;
      nativeModule = mod ? (mod as NativeEq) : null;
    } catch {
      nativeModule = null;
    }
  }
  return nativeModule;
}

export function isEqualizerAvailable(): boolean {
  return native() !== null;
}

export async function checkNativeAvailability(): Promise<{ available: boolean; bands: number }> {
  const mod = native();
  if (!mod) return { available: false, bands: 0 };
  return new Promise((resolve) => {
    try {
      mod.isAvailable((available, bands) => resolve({ available, bands }));
    } catch {
      resolve({ available: false, bands: 0 });
    }
  });
}

export async function setNativeEnabled(enabled: boolean): Promise<void> {
  const mod = native();
  if (!mod) return;
  try {
    mod.setEnabled(enabled);
  } catch {
    // el dispositivo no soporta el ecualizador
  }
}

/** Aplica las ganancias (dB, típicamente -12..12) a las 5 bandas de la UI. */
export async function applyNative(values: number[]): Promise<void> {
  const mod = native();
  if (!mod || values.length === 0) return;
  try {
    mod.setBandGains(values.map((v) => (Number.isFinite(v) ? v : 0)));
  } catch {
    // noop
  }
}

export async function fetchNativeBandFrequencies(): Promise<number[]> {
  const mod = native();
  if (!mod) return [];
  return new Promise((resolve) => {
    try {
      mod.getBandFrequencies((frequencies) => resolve(frequencies ?? []));
    } catch {
      resolve([]);
    }
  });
}

export async function releaseNativeEqualizer(): Promise<void> {
  const mod = native();
  if (!mod) return;
  try {
    mod.release();
  } catch {
    // noop
  }
}