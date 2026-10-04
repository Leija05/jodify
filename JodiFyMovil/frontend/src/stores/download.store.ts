import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import type { Song } from '../lib/types';
import { startResumableDownload } from '../services/downloads.service';
import { useLibraryStore } from './library.store';
import { useUiStore } from './ui.store';
import { useToastStore } from './toast.store';

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'error';

export interface DownloadTask {
  song: Song;
  status: DownloadStatus;
  progress: number; // 0 - 100
  bytesWritten: number;
  totalBytes: number;
  error?: string | undefined;
  cancelFn?: (() => Promise<void>) | undefined;
  startedAt: number;
}

interface DownloadState {
  tasks: Record<string, DownloadTask>;

  isDownloading: (songId: string | number) => boolean;
  getTask: (songId: string | number) => DownloadTask | undefined;
  startDownload: (song: Song, openModal?: boolean) => Promise<void>;
  retryDownload: (songId: string | number) => Promise<void>;
  cancelDownload: (songId: string | number) => Promise<void>;
  removeTask: (songId: string | number) => void;
  clearCompleted: () => void;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  tasks: {},

  isDownloading: (songId) => {
    const key = String(songId);
    const task = get().tasks[key];
    return task?.status === 'downloading' || task?.status === 'pending';
  },

  getTask: (songId) => {
    return get().tasks[String(songId)];
  },

  startDownload: async (song, openModal = true) => {
    const key = String(song.id);

    // If modal requested, open it so user sees the progress sheet
    if (openModal) {
      useUiStore.getState().openDownloadsModal();
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Initialize or reset task
    const initialTask: DownloadTask = {
      song,
      status: 'downloading',
      progress: 0,
      bytesWritten: 0,
      totalBytes: 0,
      error: undefined,
      cancelFn: undefined,
      startedAt: Date.now(),
    };

    set((state) => ({
      tasks: {
        ...state.tasks,
        [key]: initialTask,
      },
    }));

    let lastUpdate = 0;
    const { downloadPromise, cancel } = startResumableDownload(song, ({ totalBytesWritten, totalBytesExpectedToWrite, percent }) => {
      const now = Date.now();
      // Throttle UI updates to max once per 100ms or when hitting 100%
      if (now - lastUpdate > 100 || percent >= 100) {
        lastUpdate = now;
        set((state) => {
          const current = state.tasks[key];
          if (!current || current.status !== 'downloading') return state;
          const updatedTask: DownloadTask = {
            ...current,
            progress: percent,
            bytesWritten: totalBytesWritten,
            totalBytes: totalBytesExpectedToWrite,
          };
          return {
            tasks: {
              ...state.tasks,
              [key]: updatedTask,
            },
          };
        });
      }
    });

    // Store cancel callback
    set((state) => {
      const current = state.tasks[key];
      if (!current) return state;
      const updatedTask: DownloadTask = {
        ...current,
        cancelFn: cancel,
      };
      return {
        tasks: {
          ...state.tasks,
          [key]: updatedTask,
        },
      };
    });

    try {
      const record = await downloadPromise;

      // Update state to completed
      set((state) => {
        const current = state.tasks[key];
        if (!current) return state;
        const updatedTask: DownloadTask = {
          ...current,
          status: 'completed',
          progress: 100,
          cancelFn: undefined,
        };
        return {
          tasks: {
            ...state.tasks,
            [key]: updatedTask,
          },
        };
      });

      // Update library
      useLibraryStore.getState().markDownloaded(record.id, record.localUri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useToastStore.getState().show(`"${song.name}" descargada`, 'success');
    } catch (err: any) {
      const msg = err?.message ?? 'Error al descargar';
      set((state) => {
        const current = state.tasks[key];
        if (!current) return state;
        const updatedTask: DownloadTask = {
          ...current,
          status: 'error',
          error: String(msg),
          cancelFn: undefined,
        };
        return {
          tasks: {
            ...state.tasks,
            [key]: updatedTask,
          },
        };
      });

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      useToastStore.getState().show(`Error al descargar "${song.name}"`, 'error');
    }
  },

  retryDownload: async (songId) => {
    const key = String(songId);
    const task = get().tasks[key];
    if (!task) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await get().startDownload(task.song, false);
  },

  cancelDownload: async (songId) => {
    const key = String(songId);
    const task = get().tasks[key];
    if (!task) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (task.cancelFn) {
      await task.cancelFn().catch(() => {});
    }

    set((state) => {
      const updated = { ...state.tasks };
      delete updated[key];
      return { tasks: updated };
    });
  },

  removeTask: (songId) => {
    const key = String(songId);
    set((state) => {
      const updated = { ...state.tasks };
      delete updated[key];
      return { tasks: updated };
    });
  },

  clearCompleted: () => {
    set((state) => {
      const updated: Record<string, DownloadTask> = {};
      for (const [k, t] of Object.entries(state.tasks)) {
        if (t.status !== 'completed') {
          updated[k] = t;
        }
      }
      return { tasks: updated };
    });
  },
}));
