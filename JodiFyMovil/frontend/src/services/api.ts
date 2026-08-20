import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, STORAGE_KEYS } from '../lib/constants';

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.token);
}

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, auth = false } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { detail?: string };
      if (data?.detail) message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } catch {
      // keep fallback message
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiFetchBlob(path: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}
