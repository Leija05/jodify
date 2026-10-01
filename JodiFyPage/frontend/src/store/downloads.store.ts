import { create } from 'zustand';
import type { Song } from '../lib/types';

export interface DownloadTask {
  id: string;
  song: Song;
  progress: number; // 0 to 100
  bytesReceived: number;
  totalBytes: number;
  status: 'queued' | 'downloading' | 'completed' | 'error';
  error?: string;
  startedAt: number;
  completedAt?: number;
}

interface DownloadsState {
  tasks: Record<string, DownloadTask>;
  isModalOpen: boolean;

  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;

  enqueueDownload: (song: Song) => void;
  updateProgress: (songId: string | number, received: number, total: number, percent: number) => void;
  finishDownload: (songId: string | number) => void;
  failDownload: (songId: string | number, errorMessage: string) => void;
  clearCompleted: () => void;
}

export const useDownloadsStore = create<DownloadsState>((set) => ({
  tasks: {},
  isModalOpen: false,

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
  toggleModal: () => set((s) => ({ isModalOpen: !s.isModalOpen })),

  enqueueDownload: (song) => {
    const sId = String(song.id);
    set((state) => ({
      tasks: {
        ...state.tasks,
        [sId]: {
          id: sId,
          song,
          progress: 0,
          bytesReceived: 0,
          totalBytes: 0,
          status: 'downloading',
          startedAt: Date.now(),
        },
      },
    }));
  },

  updateProgress: (songId, received, total, percent) => {
    const sId = String(songId);
    set((state) => {
      const task = state.tasks[sId];
      if (!task) return state;
      return {
        tasks: {
          ...state.tasks,
          [sId]: {
            ...task,
            bytesReceived: received,
            totalBytes: total,
            progress: Math.min(100, Math.max(0, percent)),
            status: 'downloading',
          },
        },
      };
    });
  },

  finishDownload: (songId) => {
    const sId = String(songId);
    set((state) => {
      const task = state.tasks[sId];
      if (!task) return state;
      return {
        tasks: {
          ...state.tasks,
          [sId]: {
            ...task,
            progress: 100,
            status: 'completed',
            completedAt: Date.now(),
          },
        },
      };
    });
  },

  failDownload: (songId, errorMessage) => {
    const sId = String(songId);
    set((state) => {
      const task = state.tasks[sId];
      if (!task) return state;
      return {
        tasks: {
          ...state.tasks,
          [sId]: {
            ...task,
            status: 'error',
            error: errorMessage,
            completedAt: Date.now(),
          },
        },
      };
    });
  },

  clearCompleted: () => {
    set((state) => {
      const nextTasks: Record<string, DownloadTask> = {};
      Object.entries(state.tasks).forEach(([id, task]) => {
        if (task.status === 'downloading' || task.status === 'queued') {
          nextTasks[id] = task;
        }
      });
      return { tasks: nextTasks };
    });
  },
}));
