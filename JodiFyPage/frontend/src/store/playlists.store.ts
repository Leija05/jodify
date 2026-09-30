import { create } from 'zustand';
import { useToastStore } from './toast.store';
import { usePlayerStore } from './player.store';
import { useLibraryStore } from './library.store';
import { playSong } from '../services/player.service';

export interface CustomPlaylist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  color?: string;
  songIds: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface PlaylistsState {
  playlists: CustomPlaylist[];
  activePlaylistId: string | null;

  loadPlaylists: (username: string) => void;
  createPlaylist: (
    name: string,
    initialSongId?: string,
    username?: string,
    description?: string,
    color?: string,
  ) => CustomPlaylist;
  addSongToPlaylist: (playlistId: string, songId: string) => boolean;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  playPlaylist: (playlistId: string) => Promise<void>;
  setActivePlaylist: (id: string | null) => void;
}

const PRESET_COLORS = [
  'linear-gradient(135deg, #7f00ff 0%, #00f0ff 100%)',
  'linear-gradient(135deg, #ff0080 0%, #7f00ff 100%)',
  'linear-gradient(135deg, #00f0ff 0%, #00ff88 100%)',
  'linear-gradient(135deg, #ff5e62 0%, #ff9966 100%)',
  'linear-gradient(135deg, #4158d0 0%, #c850c0 46%, #ffcc70 100%)',
  'linear-gradient(135deg, #130cb7 0%, #52e5e7 100%)',
];

export const usePlaylistsStore = create<PlaylistsState>((set, get) => ({
  playlists: [],
  activePlaylistId: null,

  loadPlaylists: (username: string) => {
    if (!username) return;
    try {
      const raw = localStorage.getItem(`jf_playlists_${username}`);
      if (raw) {
        const parsed = JSON.parse(raw) as CustomPlaylist[];
        set({ playlists: Array.isArray(parsed) ? parsed : [] });
      } else {
        // Inicializar con playlist por defecto
        const initial: CustomPlaylist = {
          id: 'favorites-mix',
          name: 'Mix Personalizado',
          description: 'Tus temas más escuchados y añadidos',
          color: PRESET_COLORS[0],
          songIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: username,
        };
        localStorage.setItem(`jf_playlists_${username}`, JSON.stringify([initial]));
        set({ playlists: [initial] });
      }
    } catch {
      set({ playlists: [] });
    }
  },

  createPlaylist: (name, initialSongId, username = 'Usuario', description = '', color) => {
    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    const newPl: CustomPlaylist = {
      id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || 'Mi Playlist',
      description: description.trim() || (initialSongId ? 'Creada desde una canción' : 'Lista de reproducción personalizada'),
      color: color || randomColor,
      songIds: initialSongId ? [String(initialSongId)] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: username,
    };

    set((state) => {
      const updated = [newPl, ...state.playlists];
      try {
        localStorage.setItem(`jf_playlists_${username}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return { playlists: updated };
    });

    useToastStore.getState().show(`Playlist «${newPl.name}» creada`, 'success', 2200);
    return newPl;
  },

  addSongToPlaylist: (playlistId, songId) => {
    const sId = String(songId);
    let added = false;
    let plName = '';
    let user = '';

    set((state) => {
      const updated = state.playlists.map((pl) => {
        if (pl.id !== playlistId) return pl;
        plName = pl.name;
        user = pl.createdBy;
        if (pl.songIds.includes(sId)) {
          added = false;
          return pl;
        }
        added = true;
        return {
          ...pl,
          songIds: [...pl.songIds, sId],
          updatedAt: new Date().toISOString(),
        };
      });

      if (added && user) {
        try {
          localStorage.setItem(`jf_playlists_${user}`, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return { playlists: updated };
    });

    if (added) {
      useToastStore.getState().show(`Añadida a «${plName}»`, 'success', 1800);
    } else {
      useToastStore.getState().show(`Esta canción ya está en «${plName}»`, 'info', 1800);
    }
    return added;
  },

  removeSongFromPlaylist: (playlistId, songId) => {
    const sId = String(songId);
    set((state) => {
      const updated = state.playlists.map((pl) => {
        if (pl.id !== playlistId) return pl;
        return {
          ...pl,
          songIds: pl.songIds.filter((id) => id !== sId),
          updatedAt: new Date().toISOString(),
        };
      });
      const first = updated[0];
      if (first?.createdBy) {
        try {
          localStorage.setItem(`jf_playlists_${first.createdBy}`, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return { playlists: updated };
    });
    useToastStore.getState().show('Canción quitada de la playlist', 'info', 1600);
  },

  deletePlaylist: (playlistId) => {
    set((state) => {
      const target = state.playlists.find((p) => p.id === playlistId);
      const updated = state.playlists.filter((p) => p.id !== playlistId);
      if (target?.createdBy) {
        try {
          localStorage.setItem(`jf_playlists_${target.createdBy}`, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return { playlists: updated, activePlaylistId: state.activePlaylistId === playlistId ? null : state.activePlaylistId };
    });
    useToastStore.getState().show('Playlist eliminada', 'info', 1800);
  },

  playPlaylist: async (playlistId) => {
    const pl = get().playlists.find((p) => p.id === playlistId);
    if (!pl || pl.songIds.length === 0) {
      useToastStore.getState().show('Esta playlist no contiene canciones aún', 'warning', 2000);
      return;
    }
    const library = useLibraryStore.getState().songs;
    const songsToPlay = pl.songIds
      .map((id) => library.find((s) => String(s.id) === String(id)))
      .filter(Boolean) as typeof library;

    if (songsToPlay.length === 0) {
      useToastStore.getState().show('No se encontraron canciones en la biblioteca', 'error');
      return;
    }

    set({ activePlaylistId: playlistId });
    await playSong(songsToPlay[0]);
    usePlayerStore.getState().setIsPlaying(true);
    useToastStore.getState().show(`Reproduciendo playlist «${pl.name}»`, 'success', 2200);
  },

  setActivePlaylist: (id) => set({ activePlaylistId: id }),
}));
