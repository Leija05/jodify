import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../lib/constants';
import type { AuthUser } from '../lib/types';
import { apiFetch } from './api';

interface LoginResponse {
  token?: string;
  username?: string;
  role?: string;
  access_token?: string;
  accessToken?: string;
}

async function saveUser(user: AuthUser): Promise<AuthUser> {
  await AsyncStorage.setItem(STORAGE_KEYS.token, user.token);
  await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  return user;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  const token = data.token ?? data.access_token ?? data.accessToken;
  if (!token) throw new Error('Respuesta de login inválida');
  return saveUser({
    username: data.username ?? username,
    role: data.role ?? 'user',
    token,
  });
}

/**
 * Acceso especial con clave de desarrollo (rol dev/admin).
 * Endpoint público: POST /api/dev/access con la clave JDFYDEV-….
 */
export async function devAccess(devKey: string): Promise<AuthUser> {
  const data = await apiFetch<LoginResponse>('/dev/access', {
    method: 'POST',
    body: { dev_key: devKey },
  });
  const token = data.token ?? data.access_token ?? data.accessToken;
  if (!token) throw new Error('Respuesta de acceso inválida');
  return saveUser({
    username: data.username ?? 'dev',
    role: data.role ?? 'dev',
    token,
  });
}

/**
 * Canjea un token de acceso generado por el dev: crea la cuenta con su rol
 * (admin/mod) y entra directamente. Endpoint: POST /api/dev/redeem.
 */
export async function redeemAccessToken(
  token: string,
  username: string,
  password: string,
): Promise<AuthUser> {
  const data = await apiFetch<LoginResponse>('/dev/redeem', {
    method: 'POST',
    body: { token, username, password },
  });
  const accessToken = data.token ?? data.access_token ?? data.accessToken;
  if (!accessToken) throw new Error('Respuesta de canje inválida');
  return saveUser({
    username: data.username ?? username,
    role: data.role ?? 'admin',
    token: accessToken,
  });
}

/**
 * Obtiene el usuario autenticado desde AsyncStorage (caché local).
 * Para revalidar con el backend, usar revalidateAuthUser().
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Revalida el token actual con el backend (GET /auth/me).
 * Si el token es válido, retorna el usuario actualizado y actualiza la caché.
 * Si no, limpia la sesión y retorna null.
 */
export async function revalidateAuthUser(): Promise<AuthUser | null> {
  try {
    const user = await apiFetch<{ username: string; role: string }>('/auth/me', {
      auth: true,
    });
    const cached = await getAuthUser();
    if (cached) {
      const updated: AuthUser = {
        ...cached,
        username: user.username ?? cached.username,
        role: user.role ?? cached.role,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updated));
      return updated;
    }
    return null;
  } catch {
    await logout();
    return null;
  }
}

/**
 * Valida el token actual con el backend (GET /auth/me).
 * Alias para revalidateAuthUser() por compatibilidad.
 */
export async function validateToken(): Promise<AuthUser | null> {
  return revalidateAuthUser();
}

export async function logout(): Promise<void> {
  await (AsyncStorage as unknown as { multiRemove: (keys: string[]) => Promise<void> }).multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.user, STORAGE_KEYS.likedIds]);
}
