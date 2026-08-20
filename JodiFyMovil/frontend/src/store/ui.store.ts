import { create } from 'zustand';
import type { Song } from '../lib/types';

export type TabId = 'home' | 'library' | 'settings';

interface UiState {
  tab: TabId;
  fullscreenOpen: boolean;
  lyricsModalOpen: boolean;
  authOpen: boolean;
  songActionsSong: Song | null;
  songActionsOpen: boolean;
  equalizerOpen: boolean;
  secretOpen: boolean;

  setTab: (tab: TabId) => void;
  openFullscreen: () => void;
  closeFullscreen: () => void;
  openLyricsModal: () => void;
  closeLyricsModal: () => void;
  openAuth: () => void;
  closeAuth: () => void;
  openSongActions: (song: Song) => void;
  closeSongActions: () => void;
  openEqualizer: () => void;
  closeEqualizer: () => void;
  openSecret: () => void;
  closeSecret: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  tab: 'home',
  fullscreenOpen: false,
  lyricsModalOpen: false,
  authOpen: false,
  songActionsSong: null,
  songActionsOpen: false,
  equalizerOpen: false,
  secretOpen: false,

  setTab: (tab) => set({ tab }),
  openFullscreen: () => set({ fullscreenOpen: true }),
  closeFullscreen: () => set({ fullscreenOpen: false }),
  openLyricsModal: () => set({ lyricsModalOpen: true }),
  closeLyricsModal: () => set({ lyricsModalOpen: false }),
  openAuth: () => set({ authOpen: true }),
  closeAuth: () => set({ authOpen: false }),
  openSongActions: (song) => set({ songActionsSong: song, songActionsOpen: true }),
  closeSongActions: () => set({ songActionsOpen: false }),
  openEqualizer: () => set({ equalizerOpen: true }),
  closeEqualizer: () => set({ equalizerOpen: false }),
  openSecret: () => set({ secretOpen: true }),
  closeSecret: () => set({ secretOpen: false }),
}));