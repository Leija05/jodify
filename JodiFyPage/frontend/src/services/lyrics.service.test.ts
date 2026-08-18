import { describe, expect, it, beforeEach, vi } from 'vitest';
import { clearLyricsCache, fetchLyrics } from './lyrics.service';

describe('fetchLyrics', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    clearLyricsCache();
  });

  it('sin artista no consulta lyrics.ovh', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => new Response('{}', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await fetchLyrics('Hielo');
    expect(result).toBeNull();
    const calls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((url) => url.startsWith('https://lrclib.net'))).toBe(true);
  });

  it('comparte la misma petición entre llamadas concurrentes', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL) => new Response(JSON.stringify({ lyrics: 'Letra de prueba' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const [a, b, c] = await Promise.all([
      fetchLyrics('Hielo', 'Caifanes'),
      fetchLyrics('Hielo', 'Caifanes'),
      fetchLyrics('Hielo', 'Caifanes'),
    ]);
    expect(a).toBe('Letra de prueba');
    expect(b).toBe('Letra de prueba');
    expect(c).toBe('Letra de prueba');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('no repite la búsqueda para la misma canción en secuencia', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => new Response('{}', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchLyrics('Hielo');
    await fetchLyrics('Hielo');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});