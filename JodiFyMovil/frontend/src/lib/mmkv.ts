import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStore = new Map<string, string | number | boolean>();

export const mmkvReady: Promise<void> = (async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    for (const [k, v] of pairs) {
      if (v !== null && !memoryStore.has(k)) {
        memoryStore.set(k, v);
      }
    }
  } catch {}
})();

let storage: {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string | number | boolean) => void;
  getNumber: (key: string) => number | undefined;
  getBoolean: (key: string) => boolean | undefined;
  delete: (key: string) => void;
  clearAll: () => void;
  getAllKeys: () => string[];
  contains: (key: string) => boolean;
} | null = null;

try {
  // Use dynamic require so Expo Go does not crash when bundling
  const mmkvModule = require('react-native-mmkv');
  if (mmkvModule && mmkvModule.MMKV) {
    storage = new mmkvModule.MMKV({
      id: 'jodify-storage',
      encryptionKey: 'jodify-secure-key-2024',
    });
  }
} catch (e) {
  console.warn('[MMKV] Native storage unavailable, using AsyncStorage fallback for Expo Go:', e);
}

export const mmkv = {
  getString: (key: string): string | undefined => {
    if (storage) return storage.getString(key);
    const v = memoryStore.get(key);
    return typeof v === 'string' ? v : undefined;
  },
  setString: (key: string, value: string): void => {
    if (storage) {
      storage.set(key, value);
    } else {
      memoryStore.set(key, value);
      AsyncStorage.setItem(key, value).catch(() => {});
    }
  },
  getNumber: (key: string): number | undefined => {
    if (storage) return storage.getNumber(key);
    const v = memoryStore.get(key);
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const parsed = parseFloat(v);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  },
  setNumber: (key: string, value: number): void => {
    if (storage) {
      storage.set(key, value);
    } else {
      memoryStore.set(key, value);
      AsyncStorage.setItem(key, String(value)).catch(() => {});
    }
  },
  getBoolean: (key: string): boolean | undefined => {
    if (storage) return storage.getBoolean(key);
    const v = memoryStore.get(key);
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v === 'true';
    return undefined;
  },
  setBoolean: (key: string, value: boolean): void => {
    if (storage) {
      storage.set(key, value);
    } else {
      memoryStore.set(key, value);
      AsyncStorage.setItem(key, String(value)).catch(() => {});
    }
  },
  getObject: <T>(key: string): T | undefined => {
    const value = storage ? storage.getString(key) : (memoryStore.get(key) as string | undefined);
    if (!value) return undefined;
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  },
  setObject: <T>(key: string, value: T): void => {
    try {
      const json = JSON.stringify(value);
      if (storage) {
        storage.set(key, json);
      } else {
        memoryStore.set(key, json);
        AsyncStorage.setItem(key, json).catch(() => {});
      }
    } catch {
    }
  },
  delete: (key: string): void => {
    if (storage) storage.delete(key);
    memoryStore.delete(key);
    AsyncStorage.removeItem(key).catch(() => {});
  },
  clearAll: (): void => {
    if (storage) storage.clearAll();
    memoryStore.clear();
    AsyncStorage.clear().catch(() => {});
  },
  getAllKeys: (): string[] => {
    if (storage) return storage.getAllKeys();
    return Array.from(memoryStore.keys());
  },
  contains: (key: string): boolean => {
    if (storage) return storage.contains(key);
    return memoryStore.has(key);
  },
};

export const STORAGE_KEYS = {
  token: 'auth.token',
  authToken: 'auth.token',
  user: 'auth.user',
  authUser: 'auth.user',
  refreshToken: 'auth.refreshToken',
  authRefreshToken: 'auth.refreshToken',
  userVolume: 'user.volume',
  userMuted: 'user.muted',
  eqEnabled: 'eq.enabled',
  eqPreset: 'eq.preset',
  eqBands: 'eq.bands',
  libraryTab: 'library.tab',
  librarySort: 'library.sort',
  librarySearch: 'library.search',
  downloads: 'downloads.index',
  sleepTimer: 'sleep.timer',
  jamClientId: 'jam.clientId',
  jamState: 'jam.state',
  onboardingComplete: 'app.onboardingComplete',
  lastVersionCheck: 'app.lastVersionCheck',
  pushToken: 'push.token',
  theme: 'app.theme',
  hapticsEnabled: 'app.hapticsEnabled',
  reducedMotion: 'app.reducedMotion',
} as const;