import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { SessionProvider } from './context/SessionContext';
import { SongContextMenu } from './components/ui/SongContextMenu';
import { useContextMenuStore } from './store/contextmenu.store';
import { useLibraryStore } from './store/library.store';
import { usePlayerStore } from './store/player.store';
import { useQueueStore } from './store/queue.store';
import { confirmDialog } from './store/confirm.store';
import type { Song } from './lib/types';

const song: Song = {
  id: 1,
  name: 'Viento',
  artist: 'Caifanes',
  url: '/api/songs/1/audio',
  likes: 5,
  added_by: 'dev',
};

vi.mock('./store/confirm.store', () => ({
  confirmDialog: vi.fn(async () => true),
}));

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function resetStores(): void {
  act(() => {
    useContextMenuStore.setState(useContextMenuStore.getInitialState());
    useLibraryStore.setState(useLibraryStore.getInitialState());
    usePlayerStore.setState(usePlayerStore.getInitialState());
    useQueueStore.setState(useQueueStore.getInitialState());
  });
  localStorage.clear();
}

function renderMenu(role: string) {
  localStorage.setItem('jodify_session_active', 'true');
  localStorage.setItem('currentUserName', role);
  localStorage.setItem('jodify_user_role', role);
  return render(
    <SessionProvider>
      <SongContextMenu />
    </SessionProvider>,
  );
}

function openMenu(): void {
  act(() => {
    useContextMenuStore.getState().show(100, 100, song);
  });
}

describe('menú contextual de canciones', () => {
  beforeEach(() => {
    resetStores();
    vi.mocked(confirmDialog).mockClear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = new URL(String(input), 'http://local.test').pathname;
        const method = (init?.method ?? 'GET').toUpperCase();
        if (path.endsWith('/songs') && method === 'DELETE') return jsonResponse(200, {});
        if (path.endsWith('/likes') || path.includes('downloads')) return jsonResponse(200, []);
        return jsonResponse(200, {});
      }),
    );
  });

  it('dev ve todas las opciones, incluida Eliminar canción', async () => {
    renderMenu('dev');
    openMenu();
    await screen.findByTestId('context-menu');
    expect(screen.getByTestId('cm-play')).toBeInTheDocument();
    expect(screen.getByTestId('cm-queue')).toBeInTheDocument();
    expect(screen.getByTestId('cm-download')).toBeInTheDocument();
    expect(screen.getByTestId('cm-offline')).toBeInTheDocument();
    expect(screen.getByTestId('cm-like')).toBeInTheDocument();
    expect(screen.getByTestId('cm-edit')).toBeInTheDocument();
    expect(screen.getByTestId('cm-delete')).toBeInTheDocument();
    expect(screen.getByText('Editar información')).toBeInTheDocument();
    expect(screen.getByText('Eliminar canción')).toBeInTheDocument();
  });

  it('usuario normal no ve Eliminar canción', async () => {
    renderMenu('user');
    openMenu();
    await screen.findByTestId('context-menu');
    expect(screen.getByTestId('cm-play')).toBeInTheDocument();
    expect(screen.getByTestId('cm-queue')).toBeInTheDocument();
    expect(screen.getByTestId('cm-download')).toBeInTheDocument();
    expect(screen.getByTestId('cm-offline')).toBeInTheDocument();
    expect(screen.getByTestId('cm-like')).toBeInTheDocument();
    expect(screen.queryByTestId('cm-delete')).toBeNull();
  });

  it('agregar a la cola encola la canción y muestra toast', async () => {
    renderMenu('user');
    openMenu();
    await screen.findByTestId('context-menu');
    fireEvent.click(screen.getByTestId('cm-queue'));
    expect(useQueueStore.getState().items).toHaveLength(1);
    expect(useQueueStore.getState().items[0].id).toBe(song.id);
    expect(useContextMenuStore.getState().open).toBe(false);
  });

  it('eliminar en modo dev borra de la base de datos y del store local', async () => {
    renderMenu('dev');
    openMenu();
    await screen.findByTestId('context-menu');
    useLibraryStore.setState({ ...useLibraryStore.getInitialState(), songs: [song] });
    fireEvent.click(screen.getByTestId('cm-delete'));
    await vi.waitFor(() => {
      expect(useLibraryStore.getState().songs).toHaveLength(0);
    });
    expect(usePlayerStore.getState().currentSong).toBeNull();
  });

  it('cierra con Escape', async () => {
    renderMenu('user');
    openMenu();
    await screen.findByTestId('context-menu');
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(useContextMenuStore.getState().open).toBe(false);
  });
});