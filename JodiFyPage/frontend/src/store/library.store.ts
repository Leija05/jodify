import { create } from 'zustand';
import type { Song, Tab, SortMode } from '../lib/types';
import { sortSongs } from '../lib/utils';

interface LibraryState {
  songs: Song[];
  likedIds: Array<number | string>;
  downloadedIds: Array<number | string>;
  currentTab: Tab;
  searchTerm: string;
  currentSort: SortMode;
  addedByFilter: string;
  loaded: boolean;
  refreshing: boolean;
  setSongs: (songs: Song[]) => void;
  upsertSong: (song: Song) => void;
  setLikedIds: (ids: Array<number | string>) => void;
  setDownloadedIds: (ids: Array<number | string>) => void;
  setCurrentTab: (tab: Tab) => void;
  setSearchTerm: (term: string) => void;
  setCurrentSort: (sort: SortMode) => void;
  setAddedByFilter: (user: string) => void;
  removeSongs: (ids: Array<number | string>) => void;
  toggleLikeLocal: (songId: number | string, liked: boolean) => void;
  bumpLikes: (songId: number | string, delta: number) => void;
  setLoaded: (v: boolean) => void;
  setRefreshing: (v: boolean) => void;
}

function readLs<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export const useLibraryStore = create<LibraryState>((set) => ({
  songs: [],
  likedIds: [],
  downloadedIds: [],
  currentTab: readLs<Tab>('jfCurrentTab', 'global'),
  searchTerm: readLs<string>('jfSearch', ''),
  currentSort: readLs<SortMode>('jfSort', 'recent'),
  addedByFilter: '',
  loaded: false,
  refreshing: false,

  setSongs: (songs) => set({ songs }),
  upsertSong: (song) => set((s) => ({ songs: s.songs.some((x) => x.id === song.id) ? s.songs.map((x) => (x.id === song.id ? song : x)) : [song, ...s.songs] })),
  setLikedIds: (ids) => set({ likedIds: ids }),
  setDownloadedIds: (ids) => set({ downloadedIds: ids }),
  setCurrentTab: (tab) => {
    localStorage.setItem('jfCurrentTab', JSON.stringify(tab));
    set({ currentTab: tab });
  },
  setSearchTerm: (term) => {
    localStorage.setItem('jfSearch', JSON.stringify(term));
    set({ searchTerm: term });
  },
  setCurrentSort: (sort) => {
    localStorage.setItem('jfSort', JSON.stringify(sort));
    set({ currentSort: sort });
  },
  setAddedByFilter: (user) => set({ addedByFilter: user }),

  removeSongs: (ids) => {
    const idSet = new Set(ids.map(String));
    set((s) => ({ songs: s.songs.filter((x) => !idSet.has(String(x.id))) }));
  },

  toggleLikeLocal: (songId, liked) => {
    set((s) => ({
      likedIds: liked ? [...new Set([...s.likedIds, songId])] : s.likedIds.filter((id) => id !== songId),
    }));
  },

  bumpLikes: (songId, delta) => {
    set((s) => ({
      songs: s.songs.map((x) => (x.id === songId ? { ...x, likes: Math.max(0, (Number(x.likes ?? 0) + delta)) } : x)),
    }));
  },

  setLoaded: (v) => set({ loaded: v }),
  setRefreshing: (v) => set({ refreshing: v }),
}));

export function selectFilteredSongs(state: LibraryState): Song[] {
  const { songs, currentTab, searchTerm, currentSort, addedByFilter, likedIds, downloadedIds } = state;
  let list = songs;
  if (currentTab === 'personal') list = songs.filter((s) => likedIds.includes(s.id));
  if (currentTab === 'downloads') list = songs.filter((s) => downloadedIds.includes(s.id));
  if (addedByFilter) list = list.filter((s) => s.added_by === addedByFilter);
  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    list = list.filter((s) => s.name.toLowerCase().includes(q) || String(s.artist ?? '').toLowerCase().includes(q));
  }
  return sortSongs(list, currentSort);
}
