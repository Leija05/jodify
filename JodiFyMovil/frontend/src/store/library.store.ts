import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { STORAGE_KEYS } from '../lib/constants';
import type { LibraryTab, Song } from '../lib/types';
import { getAuthUser } from '../services/auth.service';
import { getDownloadedIds, getDownloadedSongs } from '../services/downloads.service';
import { fetchLikedIds, fetchSongs, addLike, removeLike } from '../services/songs.service';

interface LibraryState {
  songs: Song[];
  likedIds: Array<number | string>;
  downloadedIds: Array<number | string>;
  loading: boolean;
  error: string | null;
  search: string;
  tab: LibraryTab;
  refreshing: boolean;

  load: () => Promise<void>;
  refresh: () => Promise<void>;
  setSearch: (q: string) => void;
  setTab: (tab: LibraryTab) => void;
  refreshLikes: () => Promise<void>;
  toggleLike: (song: Song) => Promise<boolean>;
  markDownloaded: (songId: number | string, localUri?: string) => void;
  unmarkDownloaded: (songId: number | string) => void;
  clearDownloads: () => void;
}

async function loadLikesForUser(): Promise<Array<number | string>> {
  const user = await getAuthUser();
  if (!user) return [];
  try {
    return await fetchLikedIds(user.username);
  } catch {
    return [];
  }
}

async function mergeDownloadedLocalUris(songs: Song[]): Promise<Song[]> {
  try {
    const downloaded = await getDownloadedSongs();
    if (downloaded.length === 0) return songs;
    return songs.map((s) => {
      const rec = downloaded.find((d) => String(d.id) === String(s.id));
      return rec ? { ...s, localUri: rec.localUri } : s;
    });
  } catch {
    return songs;
  }
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  songs: [],
  likedIds: [],
  downloadedIds: [],
  loading: true,
  error: null,
  search: '',
  tab: 'global',
  refreshing: false,

  load: async () => {
    if (get().songs.length > 0) return;
    set({ loading: true, error: null });
    try {
      const [songs, likedIds, downloadedIds] = await Promise.all([
        fetchSongs(),
        loadLikesForUser(),
        getDownloadedIds(),
      ]);
      const songsWithLocal = await mergeDownloadedLocalUris(songs);
      set({ songs: songsWithLocal, likedIds, downloadedIds, loading: false });
    } catch {
      set({ loading: false, error: 'No se pudo conectar con el servidor de JodiFy.' });
    }
  },

  refresh: async () => {
    set({ refreshing: true });
    try {
      const [songs, likedIds, downloadedIds] = await Promise.all([
        fetchSongs(),
        loadLikesForUser(),
        getDownloadedIds(),
      ]);
      const songsWithLocal = await mergeDownloadedLocalUris(songs);
      set({ songs: songsWithLocal, likedIds, downloadedIds, refreshing: false });
    } catch {
      set({ refreshing: false, error: 'No se pudo conectar con el servidor de JodiFy.' });
    }
  },

  setSearch: (q) => set({ search: q }),
  setTab: (tab) => set({ tab }),

  refreshLikes: async () => {
    try {
      const user = await getAuthUser();
      const likedIds = user ? await fetchLikedIds(user.username) : [];
      set({ likedIds });
    } catch {
      set({ likedIds: [] });
    }
  },

  toggleLike: async (song) => {
    const user = await getAuthUser();
    if (!user) return false;
    const liked = get().likedIds.some((id) => String(id) === String(song.id));
    const next = !liked;
    set({
      likedIds: next
        ? [...get().likedIds, song.id]
        : get().likedIds.filter((id) => String(id) !== String(song.id)),
    });
    try {
      if (next) {
        await addLike(song.id, user.username);
      } else {
        await removeLike(song.id, user.username);
      }
    } catch {
      set({
        likedIds: liked
          ? [...get().likedIds, song.id]
          : get().likedIds.filter((id) => String(id) !== String(song.id)),
      });
      return false;
    }
    return true;
  },

  markDownloaded: (songId, localUri) => {
    if (get().downloadedIds.some((id) => String(id) === String(songId))) return;
    set((state) => ({
      downloadedIds: [...state.downloadedIds, songId],
      songs: localUri
        ? state.songs.map((s) => (String(s.id) === String(songId) ? { ...s, localUri } : s))
        : state.songs,
    }));
  },

  unmarkDownloaded: (songId) => {
    set((state) => ({
      downloadedIds: state.downloadedIds.filter((id) => String(id) !== String(songId)),
    }));
  },

  clearDownloads: () => {
    set({ downloadedIds: [] });
  },
}));
