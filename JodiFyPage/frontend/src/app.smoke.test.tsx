import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { usePlayerStore } from './store/player.store';
import { useLibraryStore } from './store/library.store';
import { useUiStore } from './store/ui.store';
import { useQueueStore } from './store/queue.store';
import { useJamStore } from './store/jam.store';
import { useSettingsStore } from './store/settings.store';
import { useToastStore } from './store/toast.store';
import { useEqStore } from './store/eq.store';
import type { Song } from './lib/types';

const songs: Song[] = [
  { id: 1, name: 'Viento', artist: 'Caifanes', url: '/api/songs/1/audio', likes: 5, added_by: 'dev', cover_url: 'https://example.com/viento.jpg' },
  { id: 2, name: 'Selfless', artist: 'The Strokes', url: '/api/songs/2/audio' },
  { id: 3, name: 'Otro Atardecer', artist: 'Bad Bunny', url: '/api/songs/3/audio' },
];

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function resetStores(): void {
  const mockCtx = {
    createLinearGradient: () => ({ addColorStop: () => undefined }),
    clearRect: () => undefined,
    beginPath: () => undefined,
    rect: () => undefined,
    roundRect: () => undefined,
    fill: () => undefined,
    scale: () => undefined,
    fillStyle: '',
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
  HTMLCanvasElement.prototype.getContext = (() => mockCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  usePlayerStore.setState(usePlayerStore.getInitialState());
  useLibraryStore.setState(useLibraryStore.getInitialState());
  useQueueStore.setState(useQueueStore.getInitialState());
  useUiStore.setState(useUiStore.getInitialState());
  useJamStore.setState(useJamStore.getInitialState());
  useSettingsStore.setState(useSettingsStore.getInitialState());
  useToastStore.setState(useToastStore.getInitialState());
  useEqStore.setState(useEqStore.getInitialState());
  localStorage.clear();
}

describe('smoke render de la app completa', () => {
  beforeEach(() => {
    resetStores();
    window.history.pushState({}, '', '/');
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input), 'http://local.test').pathname;
      const method = (init?.method ?? 'GET').toUpperCase();
      if (path.endsWith('/songs') && method === 'GET') return jsonResponse(200, songs);
      if (path.includes('likes') || path.includes('downloads')) return jsonResponse(200, []);
      return jsonResponse(200, {});
    }));
  });

  it('renderiza la intro sin sesión y lleva al login', () => {
    render(<App />);
    expect(screen.getByTestId('intro-screen')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('intro-login-cta'));
    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
  });

  it('abre el panel de token con la combinación de teclas', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('intro-login-cta'));
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true, altKey: true });
    expect(screen.getByTestId('dev-token-input')).toBeInTheDocument();
    expect(screen.getByTestId('dev-token-validate')).toBeInTheDocument();
  });

  it('renderiza la app completa con sesión sin crashear (regresión #310/#520)', async () => {
    localStorage.setItem('jodify_session_active', 'true');
    localStorage.setItem('currentUserName', 'dev');
    localStorage.setItem('jodify_user_role', 'dev');
    render(<App />);
    await screen.findByTestId('main-app');
    expect(screen.getByTestId('player-bar')).toBeInTheDocument();
  });

  it('carga las canciones y las pinta', async () => {
    localStorage.setItem('jodify_session_active', 'true');
    localStorage.setItem('currentUserName', 'dev');
    localStorage.setItem('jodify_user_role', 'dev');
    render(<App />);
    await screen.findByTestId('song-row-1');
    expect(screen.getByText('Viento')).toBeInTheDocument();
    expect(screen.getByText('Otro Atardecer')).toBeInTheDocument();
  });

  it('abre la pantalla grande con una canción sin crashear', async () => {
    localStorage.setItem('jodify_session_active', 'true');
    localStorage.setItem('currentUserName', 'dev');
    localStorage.setItem('jodify_user_role', 'dev');
    usePlayerStore.setState({ ...usePlayerStore.getInitialState(), currentSong: songs[0], isPlaying: true });
    useUiStore.setState({ ...useUiStore.getInitialState(), modal: 'fullscreen' });
    render(<App />);
    await screen.findByTestId('main-app');
    expect(screen.getAllByText('Viento').length).toBeGreaterThan(0);
    expect(screen.getByText('Ahora suena')).toBeInTheDocument();
  });
});
