import { create } from 'zustand';
import type { LibraryTab, Song, SortMode } from '../lib/types';
import { getAuthUser } from '../services/auth.service';
import { getDownloadedIds, getDownloadedSongs } from '../services/downloads.service';
import { fetchLikedIds, fetchSongs, addLike, removeLike, updateLikeCount } from '../services/songs.service';

interface LibraryState {
  songs: Song[];
  likedIds: Array<number | string>;
  downloadedIds: Array<number | string>;
  loading: boolean;
  error: string | null;
  search: string;
  tab: LibraryTab;
  sort: SortMode;
  refreshing: boolean;
  lastUserId: string | null;

  load: () => Promise<void>;
  refresh: () => Promise<void>;
  setSearch: (q: string) => void;
  setTab: (tab: LibraryTab) => void;
  setSort: (sort: SortMode) => void;
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

import { mmkv } from '../lib/mmkv';

const CACHED_SONGS_KEY = 'library.cached_songs';
const CACHED_LIKES_KEY = 'library.cached_likes';

function getCachedLibrary(): { songs: Song[]; likedIds: Array<number | string> } {
  try {
    const songs = mmkv.getObject<Song[]>(CACHED_SONGS_KEY) ?? [];
    const likedIds = mmkv.getObject<Array<number | string>>(CACHED_LIKES_KEY) ?? [];
    return { songs, likedIds };
  } catch {
    return { songs: [], likedIds: [] };
  }
}

const initialCached = getCachedLibrary();

export const useLibraryStore = create<LibraryState>((set, get) => ({
  songs: initialCached.songs,
  likedIds: initialCached.likedIds,
  downloadedIds: [],
  loading: initialCached.songs.length === 0,
  error: null,
  search: '',
  tab: 'global',
  sort: 'recent',
  refreshing: false,
  lastUserId: null,

  load: async () => {
    const user = await getAuthUser();
    const userId = user?.username ?? null;

    if (get().lastUserId === userId && get().songs.length > 0 && userId) return;

    if (get().songs.length === 0) {
      set({ loading: true, error: null });
    }
    try {
      const [songs, likedIds, downloadedIds] = await Promise.all([
        fetchSongs(),
        loadLikesForUser(),
        getDownloadedIds(),
      ]);
      const songsWithLocal = await mergeDownloadedLocalUris(songs);
      set({ songs: songsWithLocal, likedIds, downloadedIds, loading: false, error: null, lastUserId: userId });
      try {
        mmkv.setObject(CACHED_SONGS_KEY, songsWithLocal);
        mmkv.setObject(CACHED_LIKES_KEY, likedIds);
      } catch {}
    } catch {
      if (get().songs.length === 0) {
        set({ loading: false, error: 'No se pudo conectar con el servidor de JodiFy.' });
      } else {
        set({ loading: false });
      }
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
      try {
        mmkv.setObject(CACHED_SONGS_KEY, songsWithLocal);
        mmkv.setObject(CACHED_LIKES_KEY, likedIds);
      } catch {}
    } catch {
      set({ refreshing: false });
    }
  },

  setSearch: (q) => set({ search: q }),
  setTab: (tab) => set({ tab }),
  setSort: (sort) => set({ sort }),

  refreshLikes: async () => {
    try {
      const user = await getAuthUser();
      const likedIds = user ? await fetchLikedIds(user.username) : [];
      set({ likedIds });
      try {
        mmkv.setObject(CACHED_LIKES_KEY, likedIds);
      } catch {}
    } catch {
      set({ likedIds: [] });
    }
  },

  toggleLike: async (song) => {
    const user = await getAuthUser();
    if (!user) return false;
    const liked = get().likedIds.some((id) => String(id) === String(song.id));
    const next = !liked;
    const delta = next ? 1 : -1;
    const nextLikedIds = next
      ? [...get().likedIds, song.id]
      : get().likedIds.filter((id) => String(id) !== String(song.id));

    set({
      likedIds: nextLikedIds,
      songs: get().songs.map((s) =>
        String(s.id) === String(song.id)
          ? { ...s, likes: Math.max(0, (s.likes ?? 0) + delta) }
          : s,
      ),
    });
    try {
      mmkv.setObject(CACHED_LIKES_KEY, nextLikedIds);
    } catch {}

    try {
      if (next) {
        await addLike(song.id, user.username);
      } else {
        await removeLike(song.id, user.username);
      }
      void updateLikeCount(song.id, user.username, delta).catch(() => {});
    } catch (e: any) {
      console.warn('[Like] Network sync warning, kept in local cache:', e);
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