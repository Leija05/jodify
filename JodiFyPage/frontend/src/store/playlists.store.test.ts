import { describe, expect, it, beforeEach } from 'vitest';
import { usePlaylistsStore } from './playlists.store';

describe('playlists.store', () => {
  beforeEach(() => {
    localStorage.clear();
    usePlaylistsStore.setState({ playlists: [], activePlaylistId: null });
  });

  it('crea una nueva playlist correctamente', () => {
    const store = usePlaylistsStore.getState();
    const pl = store.createPlaylist('Noches de Neón', 'song-123', 'admin', 'Música synthwave');

    expect(pl.name).toBe('Noches de Neón');
    expect(pl.songIds).toContain('song-123');
    expect(pl.createdBy).toBe('admin');
    expect(usePlaylistsStore.getState().playlists.length).toBe(1);
  });

  it('añade y quita canciones de una playlist', () => {
    const store = usePlaylistsStore.getState();
    const pl = store.createPlaylist('Favoritas', undefined, 'dev');

    const added = store.addSongToPlaylist(pl.id, 'song-456');
    expect(added).toBe(true);

    const updatedPl = usePlaylistsStore.getState().playlists.find((p) => p.id === pl.id);
    expect(updatedPl?.songIds).toContain('song-456');

    // No debe duplicar si ya existe
    const addedAgain = store.addSongToPlaylist(pl.id, 'song-456');
    expect(addedAgain).toBe(false);

    // Quitar canción
    store.removeSongFromPlaylist(pl.id, 'song-456');
    const afterRemove = usePlaylistsStore.getState().playlists.find((p) => p.id === pl.id);
    expect(afterRemove?.songIds).not.toContain('song-456');
  });

  it('elimina una playlist', () => {
    const store = usePlaylistsStore.getState();
    const pl = store.createPlaylist('Temporal', undefined, 'dev');
    expect(usePlaylistsStore.getState().playlists.length).toBe(1);

    store.deletePlaylist(pl.id);
    expect(usePlaylistsStore.getState().playlists.length).toBe(0);
  });
});
