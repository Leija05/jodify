import { create } from 'zustand';
import { checkSongNameExists, extractMetadataFromFile, songsService } from '../services/songs.service';
import { logsService } from '../services/social.service';
import { useLibraryStore } from './library.store';
import { useToastStore } from './toast.store';

export type UploadStatus = 'pending' | 'extracting' | 'uploading' | 'success' | 'error' | 'duplicate';

export interface UploadTask {
  id: string;
  file: File;
  name: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
}

interface UploadStoreState {
  tasks: UploadTask[];
  isUploading: boolean;
  isModalOpen: boolean;
  hasFinishedNotice: boolean;

  openModal: () => void;
  closeModal: () => void;
  dismissNotice: () => void;
  enqueueFiles: (files: File[], username: string) => void;
  clearCompleted: () => void;
  retryTask: (id: string, username: string) => void;
}

export const useUploadStore = create<UploadStoreState>((set, get) => ({
  tasks: [],
  isUploading: false,
  isModalOpen: false,
  hasFinishedNotice: false,

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
  dismissNotice: () => set({ hasFinishedNotice: false }),

  enqueueFiles: (files, username) => {
    if (!files || files.length === 0) return;

    const newTasks: UploadTask[] = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      name: file.name.replace(/\.[^.]+$/, ''),
      status: 'pending',
      progress: 0,
    }));

    set((state) => ({
      tasks: [...state.tasks, ...newTasks],
      isModalOpen: true,
      hasFinishedNotice: false,
    }));

    // Iniciar procesamiento en background si no está ya corriendo
    if (!get().isUploading) {
      void processQueue(username);
    }
  },

  clearCompleted: () => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.status !== 'success'),
      hasFinishedNotice: false,
    }));
  },

  retryTask: (id, username) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status: 'pending', progress: 0, error: undefined } : t)),
    }));
    if (!get().isUploading) {
      void processQueue(username);
    }
  },
}));

async function processQueue(username: string) {
  const store = useUploadStore;
  store.setState({ isUploading: true, hasFinishedNotice: false });

  while (true) {
    const tasks = store.getState().tasks;
    const nextTask = tasks.find((t) => t.status === 'pending');
    if (!nextTask) break;

    const id = nextTask.id;
    const file = nextTask.file;

    // 1. Fase de extracción de metadatos y carátula
    store.setState((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: 'extracting', progress: 15, startedAt: Date.now() } : t)),
    }));

    try {
      const defaultName = (nextTask.name || file.name || 'canción').replace(/\.[^.]+$/, '');
      const meta = await extractMetadataFromFile(file);
      const finalName = (meta.title || defaultName).trim();
      const finalArtist = (meta.artist || '').trim();
      const finalAlbum = (meta.album || '').trim();

      store.setState((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                name: finalName,
                artist: finalArtist || undefined,
                album: finalAlbum || undefined,
                coverUrl: meta.picture,
                progress: 30,
              }
            : t,
        ),
      }));

      // 2. Comprobar si ya existe en la base de datos
      const exists = await checkSongNameExists(finalName);
      if (exists) {
        store.setState((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: 'duplicate',
                  progress: 100,
                  error: 'Ya existe una canción con este título en la base de datos',
                  finishedAt: Date.now(),
                }
              : t,
          ),
        }));
        continue;
      }

      // 3. Subir a la base de datos (MongoDB GridFS)
      store.setState((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: 'uploading', progress: 50 } : t)),
      }));

      const coverBlob =
        meta.pictureData && meta.pictureFormat
          ? new Blob([meta.pictureData], { type: meta.pictureFormat })
          : undefined;

      const createdSong = await songsService.uploadAudio(file, {
        name: finalName,
        cover: coverBlob,
        album: finalAlbum,
        lyrics: meta.lyrics,
        artist: finalArtist,
      });

      // 4. Éxito
      store.setState((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                status: 'success',
                progress: 100,
                finishedAt: Date.now(),
              }
            : t,
        ),
      }));

      if (createdSong) {
        useLibraryStore.getState().upsertSong(createdSong);
      }
      void logsService.add('upload', `Canción subida a base de datos: ${finalName}`, username);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error inesperado al subir';
      store.setState((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                status: 'error',
                progress: 100,
                error: errMsg,
                finishedAt: Date.now(),
              }
            : t,
        ),
      }));
    }
  }

  const allTasks = store.getState().tasks;
  const anySuccess = allTasks.some((t) => t.status === 'success');
  store.setState({ isUploading: false, hasFinishedNotice: anySuccess });

  if (anySuccess) {
    useToastStore.getState().show('Subida a base de datos completada', 'success', 3000);
  }
}
