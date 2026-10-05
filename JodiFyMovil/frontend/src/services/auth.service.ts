import { apiFetch } from './api';
import { mmkv, mmkvReady, STORAGE_KEYS } from '../lib/mmkv';
import { secureStorage, AUTH_KEYS } from '../lib/secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserAccess } from '../lib/types';

export interface LoginResponse {
  token: string;
  user: UserAccess;
}

interface BackendAuthPayload {
  token: string;
  username: string;
  role: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const data = await apiFetch<BackendAuthPayload>('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  return {
    token: data.token,
    user: {
      id: 0,
      username: data.username,
      role: (data.role as any) || 'user',
      is_online: 1,
    },
  };
}

export async function register(username: string, password: string): Promise<LoginResponse> {
  const data = await apiFetch<BackendAuthPayload>('/api/auth/register', {
    method: 'POST',
    body: { username, password },
  });
  return {
    token: data.token,
    user: {
      id: 0,
      username: data.username,
      role: (data.role as any) || 'user',
      is_online: 1,
    },
  };
}

export async function validateToken(token: string): Promise<LoginResponse> {
  const data = await apiFetch<BackendAuthPayload>('/api/auth/me', {
    method: 'GET',
    token,
  });
  return {
    token: data.token || token,
    user: {
      id: 0,
      username: data.username,
      role: (data.role as any) || 'user',
      is_online: 1,
    },
  };
}

export async function refreshToken(): Promise<{ token: string }> {
  return apiFetch<{ token: string }>('/api/auth/refresh', {
    method: 'POST',
    auth: true,
  });
}

export async function getAuthUser(): Promise<UserAccess | null> {
  await mmkvReady;
  const user = mmkv.getObject<UserAccess>(STORAGE_KEYS.authUser);
  if (user) return user;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.authUser);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export async function setAuthUser(user: UserAccess): Promise<void> {
  mmkv.setObject(STORAGE_KEYS.authUser, user);
}

export async function clearAuth(): Promise<void> {
  mmkv.delete(STORAGE_KEYS.authUser);
  await secureStorage.deleteItem(AUTH_KEYS.accessToken);
  await secureStorage.deleteItem(AUTH_KEYS.refreshToken);
  mmkv.delete(STORAGE_KEYS.authToken);
  mmkv.delete(STORAGE_KEYS.authRefreshToken);
}

export async function saveToken(token: string): Promise<void> {
  await secureStorage.setItem(AUTH_KEYS.accessToken, token);
  mmkv.setString(STORAGE_KEYS.authToken, token);
}

export async function saveRefreshToken(refreshToken: string): Promise<void> {
  await secureStorage.setItem(AUTH_KEYS.refreshToken, refreshToken);
  mmkv.setString(STORAGE_KEYS.authRefreshToken, refreshToken);
}

export async function getToken(): Promise<string | null> {
  await mmkvReady;
  const token = await secureStorage.getItem(AUTH_KEYS.accessToken);
  if (token) return token;
  const mmkvTok = mmkv.getString(STORAGE_KEYS.authToken) ?? mmkv.getString(STORAGE_KEYS.token);
  if (mmkvTok) return mmkvTok;
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.authToken);
  } catch {
    return null;
  }
}

export async function getStoredRefreshToken(): Promise<string | null> {
  const token = await secureStorage.getItem(AUTH_KEYS.refreshToken);
  return token ?? mmkv.getString(STORAGE_KEYS.authRefreshToken) ?? null;
}

export async function logout(): Promise<void> {
  await clearAuth();
}