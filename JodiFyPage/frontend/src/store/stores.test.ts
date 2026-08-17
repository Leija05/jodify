import { beforeEach, describe, expect, it } from 'vitest';
import { useQueueStore } from './queue.store';
import { useLibraryStore, selectFilteredSongs } from './library.store';
import { useJamStore } from './jam.store';
import type { Song } from '../lib/types';

const songA: Song = { id: 1, name: 'Alpha', url: '/a.mp3', likes: 10, added_by: 'ana', created_at: '2024-01-01' };
const songB: Song = { id: 2, name: 'Beta', url: '/b.mp3', likes: 5, added_by: 'ben', created_at: '2024-02-01' };
const songC: Song = { id: 3, name: 'Gamma', url: '/c.mp3', likes: 1, added_by: 'ana', created_at: '2024-03-01' };

describe('useQueueStore', () => {
  beforeEach(() => {
    useQueueStore.setState({ items: [] });
    useJamStore.setState({ active: false });
  });

  it('agrega canciones sin duplicados', () => {
    const store = useQueueStore.getState();
    store.add(songA);
    store.add(songA);
    store.add(songB);
    expect(useQueueStore.getState().items).toHaveLength(2);
  });

  it('elimina por id', () => {
    const store = useQueueStore.getState();
    store.add(songA);
    store.remove(1);
    expect(useQueueStore.getState().items).toHaveLength(0);
  });

  it('mueve canciones de posición', () => {
    const store = useQueueStore.getState();
    store.addMany([songA, songB, songC]);
    store.move(0, 2);
    expect(useQueueStore.getState().items.map((s) => s.id)).toEqual([2, 3, 1]);
  });

  it('ignora movimientos fuera de rango', () => {
    const store = useQueueStore.getState();
    store.addMany([songA, songB]);
    store.move(-1, 2);
    expect(useQueueStore.getState().items.map((s) => s.id)).toEqual([1, 2]);
  });
});

describe('selectFilteredSongs', () => {
  beforeEach(() => {
    useLibraryStore.setState({
      songs: [songA, songB, songC],
      likedIds: [1, 3],
      downloadedIds: [2],
      currentTab: 'global',
      searchTerm: '',
      currentSort: 'recent',
      addedByFilter: '',
    });
  });

  it('devuelve todas las canciones por defecto', () => {
    expect(selectFilteredSongs(useLibraryStore.getState())).toHaveLength(3);
  });

  it('filtra por favoritas', () => {
    useLibraryStore.setState({ currentTab: 'personal' });
    const ids = selectFilteredSongs(useLibraryStore.getState()).map((s) => s.id);
    expect(ids).toEqual([3, 1]);
  });

  it('filtra por descargadas', () => {
    useLibraryStore.setState({ currentTab: 'downloads' });
    const ids = selectFilteredSongs(useLibraryStore.getState()).map((s) => s.id);
    expect(ids).toEqual([2]);
  });

  it('busca por nombre sin importar mayúsculas', () => {
    useLibraryStore.setState({ searchTerm: 'beT' });
    const names = selectFilteredSongs(useLibraryStore.getState()).map((s) => s.name);
    expect(names).toEqual(['Beta']);
  });

  it('ordena por likes en modo popular', () => {
    useLibraryStore.setState({ currentSort: 'popular' });
    const ids = selectFilteredSongs(useLibraryStore.getState()).map((s) => s.id);
    expect(ids).toEqual([1, 2, 3]);
  });

  it('ordena por antigüedad en modo old', () => {
    useLibraryStore.setState({ currentSort: 'old' });
    const ids = selectFilteredSongs(useLibraryStore.getState()).map((s) => s.id);
    expect(ids).toEqual([1, 2, 3]);
  });
});
