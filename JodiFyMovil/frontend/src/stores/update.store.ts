import { create } from 'zustand';
import {
  checkForAppUpdate,
  downloadApkWithProgress,
  installDownloadedApk,
  currentAppVersion,
  type DownloadProgressData,
  type UpdateCheckResult,
} from '../services/update.service';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready_to_install'
  | 'installing'
  | 'up-to-date'
  | 'error';

export interface UpdateStoreInfo {
  id?: string | undefined;
  current: string;
  latest: string;
  buildNumber: number;
  notes: string;
  mandatory: boolean;
  downloadUrl: string;
  filename: string;
  sizeBytes: number;
  uploadedAt?: string | undefined;
}

interface UpdateState {
  status: UpdateStatus;
  modalOpen: boolean;
  info: UpdateStoreInfo | null;
  progress: DownloadProgressData;
  downloadedFileUri: string | null;
  error: string | null;
  checked: boolean;

  runCheck: (manual?: boolean) => Promise<void>;
  startDownload: () => Promise<void>;
  doInstall: () => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
  cancelDownload: () => void;
}

const DEFAULT_PROGRESS: DownloadProgressData = {
  percent: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  speedMBps: 0,
  remainingSeconds: 0,
};

let activeCancelRef: { current: (() => void) | null } = { current: null };

export function updateLabel(status: UpdateStatus, info: UpdateStoreInfo | null): string {
  switch (status) {
    case 'checking':
      return 'Buscando actualizaciones en la base de datos...';
    case 'available':
      return `v${info?.latest ?? '?'} disponible para descargar`;
    case 'downloading':
      return 'Descargando nueva versión...';
    case 'ready_to_install':
      return 'Actualización descargada · Lista para instalar';
    case 'installing':
      return 'Abriendo instalador del sistema...';
    case 'error':
      return 'Error al verificar actualizaciones';
    case 'up-to-date':
      return `Al día (v${currentAppVersion()})`;
    default:
      return `JodiFy v${currentAppVersion()}`;
  }
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: 'idle',
  modalOpen: false,
  info: null,
  progress: DEFAULT_PROGRESS,
  downloadedFileUri: null,
  error: null,
  checked: false,

  runCheck: async (manual = false) => {
    if (get().status === 'checking' || get().status === 'downloading') return;
    set({ status: 'checking', error: null });

    try {
      const res: UpdateCheckResult = await checkForAppUpdate();

      if (res.update_available && res.download_url && res.version) {
        const storeInfo: UpdateStoreInfo = {
          id: res.id,
          current: currentAppVersion(),
          latest: res.version,
          buildNumber: res.build_number || 1,
          notes: res.release_notes || 'Mejoras de rendimiento y nuevas funciones.',
          mandatory: Boolean(res.mandatory),
          downloadUrl: res.download_url,
          filename: res.filename || `JodiFy-v${res.version}.apk`,
          sizeBytes: res.size_bytes || 0,
          uploadedAt: res.uploaded_at,
        };

        set({
          status: 'available',
          info: storeInfo,
          checked: true,
          modalOpen: manual || Boolean(res.mandatory),
        });
      } else {
        set({
          status: 'up-to-date',
          checked: true,
          error: null,
        });
      }
    } catch (err: any) {
      const msg = err?.message || 'No se pudo conectar con el servidor de actualizaciones';
      set({
        status: 'error',
        error: msg,
        checked: true,
      });
      if (manual) {
        set({ modalOpen: true });
      }
    }
  },

  startDownload: async () => {
    const info = get().info;
    if (!info || !info.downloadUrl) return;

    set({
      status: 'downloading',
      modalOpen: true,
      error: null,
      progress: { ...DEFAULT_PROGRESS, totalBytes: info.sizeBytes },
    });

    try {
      activeCancelRef = { current: null };
      const localUri = await downloadApkWithProgress(
        info.downloadUrl,
        info.filename,
        (progressData) => {
          set({ progress: progressData });
        },
        activeCancelRef
      );

      set({
        status: 'ready_to_install',
        downloadedFileUri: localUri,
      });

      // Automatically launch the installation package prompt
      try {
        await installDownloadedApk(localUri);
      } catch (launchErr: any) {
        console.warn('[Update] Auto-launch install prompt error:', launchErr);
      }
    } catch (err: any) {
      const msg = err?.message || 'Error durante la descarga de la actualización';
      set({
        status: 'error',
        error: msg,
      });
    }
  },

  doInstall: async () => {
    const fileUri = get().downloadedFileUri;
    if (!fileUri) {
      // If not yet downloaded, initiate download first
      await get().startDownload();
      return;
    }

    set({ status: 'installing' });
    try {
      await installDownloadedApk(fileUri);
      set({ status: 'ready_to_install' });
    } catch (err: any) {
      set({
        status: 'error',
        error: err?.message || 'Error al iniciar el instalador de Android',
      });
    }
  },

  cancelDownload: () => {
    if (activeCancelRef.current) {
      activeCancelRef.current();
      activeCancelRef.current = null;
    }
    set({
      status: 'available',
      progress: DEFAULT_PROGRESS,
    });
  },

  openModal: () => set({ modalOpen: true }),
  closeModal: () => {
    if (get().status === 'downloading') {
      get().cancelDownload();
    }
    set({ modalOpen: false });
  },
}));