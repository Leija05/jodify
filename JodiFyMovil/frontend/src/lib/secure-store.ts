import * as SecureStore from 'expo-secure-store';
import { mmkv, STORAGE_KEYS } from './mmkv';

/**
 * Gestor de almacenamiento seguro para tokens de autenticación y claves sensibles.
 * Utiliza Android Keystore y Apple Keychain con cifrado de hardware mediante expo-secure-store.
 * Cuenta con fallback transparente sobre MMKV con cifrado AES-256 si SecureStore no está disponible.
 */
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch {
      // Fallback a MMKV cifrado
      mmkv.setString(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      const val = await SecureStore.getItemAsync(key);
      if (val !== null && val !== undefined) return val;
    } catch {
      // Fallback a MMKV cifrado
    }
    const fallback = mmkv.getString(key);
    return fallback ?? null;
  },

  async deleteItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
    mmkv.delete(key);
  },
};

export const AUTH_KEYS = {
  accessToken: STORAGE_KEYS.authToken,
  refreshToken: STORAGE_KEYS.authRefreshToken,
};
