import { create } from 'zustand';

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'error' | 'up-to-date';
export type ModalStatus = 'idle' | 'downloading' | 'installing' | 'success' | 'error';

interface UpdateInfo {
  current: string;
  latest: string;
  notes: string;
  mandatory: boolean;
  downloadUrl: string;
}

interface UpdateState {
  status: UpdateStatus;
  modalOpen: boolean;
  modalStatus: ModalStatus;
  info: UpdateInfo | null;
  progress: number;
  error: string | null;
  checked: boolean;

  runCheck: (manual?: boolean) => Promise<void>;
  doInstall: () => Promise<void>;
  handleLater: () => void;
  openModal: () => void;
  closeModal: () => void;
  setProgress: (progress: number) => void;
}

export function updateLabel(status: UpdateStatus, info: UpdateInfo | null): string {
  switch (status) {
    case 'checking': return 'Buscando actualizaciones...';
    case 'available': return `v${info?.latest ?? '?'} disponible`;
    case 'downloading': return 'Descargando...';
    case 'installing': return 'Instalando...';
    case 'error': return 'Error al actualizar';
    case 'up-to-date': return 'Actualizado';
    default: return 'Sin comprobar';
  }
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: 'idle',
  modalOpen: false,
  modalStatus: 'idle',
  info: null,
  progress: 0,
  error: null,
  checked: false,

  runCheck: async (manual = false) => {
    if (get().status === 'checking') return;
    set({ status: 'checking', error: null });
    try {
      const res = await fetch('https://api.github.com/repos/Leija05/jodify/releases/latest');
      if (!res.ok) throw new Error('Failed to fetch release');
      const data = await res.json();
      const latestVersion = data.tag_name?.replace('v', '') ?? '0.0.0';
      const currentVersion = '1.0.0';

      const isNewer = latestVersion
        .split('.')
        .map(Number)
        .some((v: number, i: number) => v > (currentVersion.split('.').map(Number)[i] ?? 0));

      if (isNewer) {
        set({
          status: 'available',
          info: {
            current: currentVersion,
            latest: latestVersion,
            notes: data.body ?? 'Sin notas de versión',
            mandatory: false,
            downloadUrl: data.assets?.[0]?.browser_download_url ?? '',
          },
        });
        if (manual) {
          set({ modalOpen: true, modalStatus: 'idle' });
        }
      } else {
        set({ status: 'up-to-date' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      set({ status: 'error', error: msg });
      if (manual) {
        set({ modalOpen: true, modalStatus: 'error' });
      }
    }
  },

  doInstall: async () => {
    set({ modalStatus: 'installing', progress: 0 });
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      set({ modalStatus: 'success', progress: 100, status: 'up-to-date' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al instalar';
      set({ modalStatus: 'error', error: msg });
    }
  },

  handleLater: () => {
    set({ modalOpen: false, modalStatus: 'idle', progress: 0 });
  },

  openModal: () => {
    set({ modalOpen: true, modalStatus: 'idle' });
  },

  closeModal: () => {
    set({ modalOpen: false, modalStatus: 'idle', progress: 0 });
  },

  setProgress: (progress) => {
    set({ progress: Math.max(0, Math.min(100, progress)) });
  },
}));