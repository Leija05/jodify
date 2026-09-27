import { apiFetch } from './api';
import { mmkv, STORAGE_KEYS } from '../lib/mmkv';
import { secureStorage, AUTH_KEYS } from '../lib/secure-store';
import type { UserAccess } from '../lib/types';

export interface LoginResponse {
  token: string;
  user: UserAccess;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

export async function register(username: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/register', {
    method: 'POST',
    body: { username, password },
  });
}

export async function validateToken(token: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/validate', {
    method: 'POST',
    body: { token },
    auth: true,
  });
}

export async function refreshToken(): Promise<{ token: string }> {
  return apiFetch<{ token: string }>('/api/auth/refresh', {
    method: 'POST',
    auth: true,
  });
}

export async function getAuthUser(): Promise<UserAccess | null> {
  const user = mmkv.getObject<UserAccess>(STORAGE_KEYS.authUser);
  return user ?? null;
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
  const token = await secureStorage.getItem(AUTH_KEYS.accessToken);
  return token ?? mmkv.getString(STORAGE_KEYS.authToken) ?? null;
}

export async function getStoredRefreshToken(): Promise<string | null> {
  const token = await secureStorage.getItem(AUTH_KEYS.refreshToken);
  return token ?? mmkv.getString(STORAGE_KEYS.authRefreshToken) ?? null;
}

export async function logout(): Promise<void> {
  await clearAuth();
}