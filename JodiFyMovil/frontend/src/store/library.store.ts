import { create } from 'zustand';
import type { LibraryTab, Song } from '../lib/types';
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
  refreshing: boolean;
  lastUserId: string | null;

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
  lastUserId: null,

  load: async () => {
    const user = await getAuthUser();
    const userId = user?.username ?? null;

    // Forzar recarga si cambió el usuario (login/logout)
    if (get().lastUserId === userId && get().songs.length > 0 && userId) return;

    set({ loading: true, error: null });
    try {
      const [songs, likedIds, downloadedIds] = await Promise.all([
        fetchSongs(),
        loadLikesForUser(),
        getDownloadedIds(),
      ]);
      const songsWithLocal = await mergeDownloadedLocalUris(songs);
      set({ songs: songsWithLocal, likedIds, downloadedIds, loading: false, lastUserId: userId });
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
    const delta = next ? 1 : -1;
    set({
      likedIds: next
        ? [...get().likedIds, song.id]
        : get().likedIds.filter((id) => String(id) !== String(song.id)),
      songs: get().songs.map((s) =>
        String(s.id) === String(song.id)
          ? { ...s, likes: Math.max(0, (s.likes ?? 0) + delta) }
          : s,
      ),
    });
    try {
      if (next) {
        await addLike(song.id, user.username);
      } else {
        await removeLike(song.id, user.username);
      }
      // Actualizar contador en backend con delta
      await updateLikeCount(song.id, user.username, delta);
    } catch {
      // Revertir en caso de error
      set({
        likedIds: liked
          ? [...get().likedIds, song.id]
          : get().likedIds.filter((id) => String(id) !== String(song.id)),
        songs: get().songs.map((s) =>
          String(s.id) === String(song.id)
            ? { ...s, likes: Math.max(0, (s.likes ?? 0) + (liked ? 1 : -1)) }
            : s,
        ),
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
