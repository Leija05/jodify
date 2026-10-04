import { API_BASE, STORAGE_KEYS } from '../lib/constants';
import { mmkv } from '../lib/mmkv';
import { secureStorage, AUTH_KEYS } from '../lib/secure-store';

async function getToken(): Promise<string | null> {
  const secure = await secureStorage.getItem(AUTH_KEYS.accessToken);
  if (secure) return secure;
  const token = mmkv.getString(STORAGE_KEYS.authToken) ?? mmkv.getString(STORAGE_KEYS.token);
  return token ?? null;
}

const CANDIDATE_BASES = [
  (API_BASE || 'https://jodify-backend.onrender.com').replace(/\/+$/, ''),
];

let currentBase = CANDIDATE_BASES[0]!;

export function getActiveApiBase(): string {
  return currentBase;
}

export function getCandidateBases(): string[] {
  return [currentBase, ...CANDIDATE_BASES.filter((b) => b !== currentBase)];
}

export function setActiveApiBase(base: string): void {
  currentBase = base.replace(/\/+$/, '');
}

function resolveUrl(path: string, base: string = currentBase): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export async function apiFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    auth?: boolean;
    headers?: Record<string, string>;
    token?: string;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const { method = 'GET', body, auth = false, headers: customHeaders, token: explicitToken, timeoutMs = 25000 } = options;
  const headers: Record<string, string> = { Accept: 'application/json', ...customHeaders };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (explicitToken) {
    headers.Authorization = `Bearer ${explicitToken}`;
  } else if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const basesToTry = [currentBase, ...CANDIDATE_BASES.filter((b) => b !== currentBase)];
  let lastError: any = null;

  for (const base of basesToTry) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const init: RequestInit = { method, headers, signal: controller.signal };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(resolveUrl(path, base), init);
      clearTimeout(timer);
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const data = (await res.json()) as { detail?: string };
          if (data?.detail) message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        } catch {
        }
        throw new Error(message);
      }
      currentBase = base;
      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      if (err.message && err.message.startsWith('HTTP 4')) {
        throw err;
      }
      continue;
    }
  }

  if (lastError?.name === 'AbortError') {
    throw new Error('Tiempo de espera agotado. Verifica tu conexión.');
  }
  throw lastError ?? new Error('No se pudo conectar con el servidor.');
}

export async function apiFetchBlob(path: string): Promise<Blob> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const basesToTry = [currentBase, ...CANDIDATE_BASES.filter((b) => b !== currentBase)];
  let lastError: any = null;

  for (const base of basesToTry) {
    try {
      const res = await fetch(resolveUrl(path, base), { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      currentBase = base;
      return await res.blob();
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError ?? new Error('No se pudo descargar el archivo.');
}

export function buildQueryKey(base: readonly unknown[], params: Record<string, unknown> = {}): readonly unknown[] {
  return [...base, params];
}