import { API_BASE, STORAGE_KEYS } from '../lib/constants';
import { mmkv } from '../lib/mmkv';
import { secureStorage, AUTH_KEYS } from '../lib/secure-store';

async function getToken(): Promise<string | null> {
  const secure = await secureStorage.getItem(AUTH_KEYS.accessToken);
  if (secure) return secure;
  const token = mmkv.getString(STORAGE_KEYS.authToken) ?? mmkv.getString(STORAGE_KEYS.token);
  return token ?? null;
}

function resolveUrl(path: string): string {
  const base = (API_BASE || 'https://jodify-backend.onrender.com').replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const { method = 'GET', body, auth = false } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(resolveUrl(path), init);
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { detail?: string };
      if (data?.detail) message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } catch {
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiFetchBlob(path: string): Promise<Blob> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(resolveUrl(path), { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

export function buildQueryKey(base: readonly unknown[], params: Record<string, unknown> = {}): readonly unknown[] {
  return [...base, params];
}