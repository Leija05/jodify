import { create } from 'zustand';

export type ModalName =
  | 'settings'
  | 'queue'
  | 'equalizer'
  | 'jam'
  | 'jamRecommend'
  | 'jamHostRecommendations'
  | 'jamHistory'
  | 'profile'
  | 'shortcuts'
  | 'upload'
  | 'editSong'
  | 'devCenter'
  | 'deleteSongs'
  | 'discord'
  | 'community'
  | 'userDetail'
  | 'history'
  | 'fullscreen'
  | 'offline';

interface UiState {
  modal: ModalName | null;
  modalPayload: Record<string, unknown>;
  focusMode: boolean;
  sidebarOpen: boolean;
  lyricsPanelOpen: boolean;
  shortcutHintVisible: boolean;
  open: (modal: ModalName, payload?: Record<string, unknown>) => void;
  close: (modal?: ModalName) => void;
  closeAll: () => void;
  toggle: (modal: ModalName) => void;
  setFocusMode: (value: boolean) => void;
  setSidebarOpen: (value: boolean) => void;
  setLyricsPanelOpen: (value: boolean) => void;
  setShortcutHintVisible: (value: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  modal: null,
  modalPayload: {},
  focusMode: false,
  sidebarOpen: false,
  lyricsPanelOpen: true,
  shortcutHintVisible: false,
  open: (modal, payload = {}) => set({ modal, modalPayload: payload }),
  close: (modal) => set((state) => (modal === undefined || state.modal === modal ? { modal: null, modalPayload: {} } : state)),
  closeAll: () => set({ modal: null, modalPayload: {} }),
  toggle: (modal) => set((state) => (state.modal === modal ? { modal: null } : { modal, modalPayload: {} })),
  setFocusMode: (value) => set({ focusMode: value }),
  setSidebarOpen: (value) => set({ sidebarOpen: value }),
  setLyricsPanelOpen: (value) => set({ lyricsPanelOpen: value }),
  setShortcutHintVisible: (value) => set({ shortcutHintVisible: value }),
}));

export const openModal = (m: ModalName) => useUiStore.getState().open(m);
export const closeModal = (m?: ModalName) => useUiStore.getState().close(m);
