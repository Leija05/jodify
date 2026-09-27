import { MMKV } from 'react-native-mmkv';

const memoryStore = new Map<string, string | number | boolean>();

let storage: MMKV | null = null;
try {
  storage = new MMKV({
    id: 'jodify-storage',
    encryptionKey: 'jodify-secure-key-2024',
  });
} catch (e) {
  console.warn('[MMKV] Native storage unavailable, using memory fallback:', e);
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
    }
  },
  getNumber: (key: string): number | undefined => {
    if (storage) return storage.getNumber(key);
    const v = memoryStore.get(key);
    return typeof v === 'number' ? v : undefined;
  },
  setNumber: (key: string, value: number): void => {
    if (storage) {
      storage.set(key, value);
    } else {
      memoryStore.set(key, value);
    }
  },
  getBoolean: (key: string): boolean | undefined => {
    if (storage) return storage.getBoolean(key);
    const v = memoryStore.get(key);
    return typeof v === 'boolean' ? v : undefined;
  },
  setBoolean: (key: string, value: boolean): void => {
    if (storage) {
      storage.set(key, value);
    } else {
      memoryStore.set(key, value);
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
      }
    } catch {
    }
  },
  delete: (key: string): void => {
    if (storage) storage.delete(key);
    memoryStore.delete(key);
  },
  clearAll: (): void => {
    if (storage) storage.clearAll();
    memoryStore.clear();
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