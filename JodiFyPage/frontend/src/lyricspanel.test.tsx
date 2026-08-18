import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { LyricsPanel } from './components/layout/LyricsPanel';
import { usePlayerStore } from './store/player.store';
import { useSettingsStore } from './store/settings.store';
import type { Song } from './lib/types';

const songWithLyrics: Song = {
  id: 1,
  name: 'Viento',
  artist: 'Caifanes',
  album: 'El Diablito',
  lyrics: '[00:01] Hola\n[00:05] Mundo',
  url: '/songs/1/audio',
};

function resetStores(): void {
  act(() => {
    usePlayerStore.setState(usePlayerStore.getInitialState());
    useSettingsStore.setState(useSettingsStore.getInitialState());
  });
}

describe('panel de letras', () => {
  beforeEach(() => {
    resetStores();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })),
    );
  });

  it('muestra las letras locales de la canción al reproducir', async () => {
    act(() => {
      usePlayerStore.setState({ ...usePlayerStore.getInitialState(), currentSong: songWithLyrics, isPlaying: true });
    });
    render(<LyricsPanel />);
    expect(await screen.findByText('Hola')).toBeInTheDocument();
    expect(screen.getByText('Mundo')).toBeInTheDocument();
    expect(screen.queryByText(/Buscando letras/)).toBeNull();
  });

  it('muestra el mensaje vacío cuando la canción no tiene letras', async () => {
    act(() => {
      usePlayerStore.setState({ ...usePlayerStore.getInitialState(), currentSong: { ...songWithLyrics, lyrics: undefined } });
    });
    render(<LyricsPanel />);
    expect(await screen.findByText(/Sin letras disponibles/)).toBeInTheDocument();
  });

  it('invita a reproducir cuando no hay canción', () => {
    render(<LyricsPanel />);
    expect(screen.getByText(/Reproduce una canción/)).toBeInTheDocument();
  });
});