import { create } from 'zustand';
import type { Song } from '../lib/types';
import { useToastStore } from './toast.store';
import { useJamStore } from './jam.store';

interface QueueState {
  items: Song[];
  add: (song: Song) => boolean;
  addMany: (songs: Song[]) => void;
  remove: (songId: number | string) => void;
  clear: () => void;
  move: (fromIndex: number, toIndex: number) => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  items: [],

  add: (song) => {
    if (get().items.some((s) => s.id === song.id)) return false;
    const jam = useJamStore.getState();
    if (jam.active && !jam.isHost && !jam.permissions.allowQueueAdd) {
      useToastStore.getState().show('El host bloqueó agregar a la cola', 'warning');
      return false;
    }
    set((s) => ({ items: [...s.items, song] }));
    jam.broadcastQueueAdd(String(song.id));
    return true;
  },

  addMany: (songs) => {
    set((s) => {
      const existing = new Set(s.items.map((x) => String(x.id)));
      const fresh = songs.filter((x) => !existing.has(String(x.id)));
      return { items: [...s.items, ...fresh] };
    });
  },

  remove: (songId) => {
    const jam = useJamStore.getState();
    if (jam.active && !jam.isHost && !jam.permissions.allowQueueRemove) {
      useToastStore.getState().show('El host bloqueó quitar de la cola', 'warning');
      return;
    }
    set((s) => ({ items: s.items.filter((x) => x.id !== songId) }));
    jam.broadcastQueueRemove(songId);
  },

  clear: () => set({ items: [] }),

  move: (fromIndex, toIndex) => {
    set((s) => {
      if (fromIndex < 0 || fromIndex >= s.items.length || toIndex < 0 || toIndex >= s.items.length) return s;
      const items = [...s.items];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return { items };
    });
  },
}));
