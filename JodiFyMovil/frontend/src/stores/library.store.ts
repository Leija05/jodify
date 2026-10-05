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

import { mmkv, mmkvReady } from '../lib/mmkv';

const CACHED_SONGS_KEY = 'library.cached_songs';
const CACHED_LIKES_KEY = 'library.cached_likes';

async function loadLikesForUser(): Promise<Array<number | string>> {
  await mmkvReady;
  let user = await getAuthUser();
  if (!user?.username) {
    try {
      const { useSettingsStore } = require('./settings.store');
      user = useSettingsStore.getState().user;
    } catch {}
  }
  if (!user?.username) {
    return getCachedLibrary().likedIds;
  }
  try {
    const ids = await fetchLikedIds(user.username);
    if (Array.isArray(ids) && ids.length > 0) {
      return ids;
    }
    return ids || [];
  } catch {
    return getCachedLibrary().likedIds;
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
    await mmkvReady;
    let user = await getAuthUser();
    if (!user?.username) {
      try {
        const { useSettingsStore } = require('./settings.store');
        user = useSettingsStore.getState().user;
      } catch {}
    }
    const userId = user?.username ?? null;

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
      await mmkvReady;
      let user = await getAuthUser();
      if (!user?.username) {
        try {
          const { useSettingsStore } = require('./settings.store');
          user = useSettingsStore.getState().user;
        } catch {}
      }
      if (!user?.username) return;
      const likedIds = await fetchLikedIds(user.username);
      if (Array.isArray(likedIds)) {
        set({ likedIds });
        try {
          mmkv.setObject(CACHED_LIKES_KEY, likedIds);
        } catch {}
      }
    } catch {
      // Keep existing likes on network error
    }
  },

  toggleLike: async (song) => {
    await mmkvReady;
    let user = await getAuthUser();
    if (!user?.username) {
      try {
        const { useSettingsStore } = require('./settings.store');
        user = useSettingsStore.getState().user;
      } catch {}
    }
    if (!user) return false;

    const sId = String(song.id);
    const ytId = song.youtube_id ? String(song.youtube_id) : null;
    const cleanYt = ytId?.replace(/^yt-/, '');
    const cleanSId = sId.replace(/^yt-/, '');

    const liked = get().likedIds.some((id) => {
      const idStr = String(id);
      const cleanId = idStr.replace(/^yt-/, '');
      return (
        idStr === sId ||
        cleanId === cleanSId ||
        (ytId && (idStr === ytId || cleanId === cleanYt))
      );
    });

    const next = !liked;
    const delta = next ? 1 : -1;

    const filterOut = (id: number | string) => {
      const str = String(id);
      const cStr = str.replace(/^yt-/, '');
      if (str === sId || cStr === cleanSId) return false;
      if (ytId && (str === ytId || cStr === cleanYt)) return false;
      return true;
    };

    const nextLikedIds = next
      ? [...get().likedIds.filter(filterOut), song.id]
      : get().likedIds.filter(filterOut);

    set({
      likedIds: nextLikedIds,
      songs: get().songs.map((s) => {
        const currentSId = String(s.id);
        const currentYt = s.youtube_id ? String(s.youtube_id) : null;
        const matches =
          currentSId === sId ||
          currentSId.replace(/^yt-/, '') === cleanSId ||
          (ytId && (currentYt === ytId || currentYt?.replace(/^yt-/, '') === cleanYt));
        return matches ? { ...s, likes: Math.max(0, (s.likes ?? 0) + delta) } : s;
      }),
    });
    try {
      mmkv.setObject(CACHED_LIKES_KEY, nextLikedIds);
    } catch {}

    try {
      if (next) {
        await addLike(song.id, user.username);
        if (cleanYt && cleanYt !== sId) {
          await addLike(cleanYt, user.username).catch(() => {});
        }
      } else {
        await removeLike(song.id, user.username);
        if (cleanYt) {
          await removeLike(cleanYt, user.username).catch(() => {});
          await removeLike(`yt-${cleanYt}`, user.username).catch(() => {});
        }
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