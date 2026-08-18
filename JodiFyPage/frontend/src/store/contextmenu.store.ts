import { create } from 'zustand';
import type { Song } from '../lib/types';

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  song: Song | null;
  show: (x: number, y: number, song: Song) => void;
  hide: () => void;
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  open: false,
  x: 0,
  y: 0,
  song: null,
  show: (x, y, song) => set({ open: true, x, y, song }),
  hide: () => set({ open: false }),
}));