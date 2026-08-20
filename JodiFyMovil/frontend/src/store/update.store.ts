import { create } from 'zustand';
import { Platform } from 'react-native';
import type { UpdateCheckResult } from '../services/update.service';
import {
  checkForUpdate,
  currentAppVersion,
  getSkippedVersion,
  installUpdate,
  skipVersion,
} from '../services/update.service';
import type { UpdateModalStatus } from '../components/update/UpdateModal';

type UpdateStatus = 'checking' | 'available' | 'installing' | 'up-to-date' | 'error' | 'idle';

interface UpdateState {
  status: UpdateStatus;
  info: UpdateCheckResult | null;
  modalStatus: UpdateModalStatus;
  modalOpen: boolean;
  checked: boolean;

  runCheck: (silent?: boolean) => Promise<void>;
  doInstall: () => Promise<void>;
  handleLater: () => void;
  openModal: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: 'idle',
  info: null,
  modalStatus: 'available',
  modalOpen: false,
  checked: false,

  runCheck: async (silent = false) => {
    set({ status: 'checking' });
    const result = await checkForUpdate();
    if (!result) {
      set({ status: silent ? 'idle' : 'error' });
      return;
    }
    set({ info: result });
    if (!result.available) {
      set({ status: 'up-to-date' });
      return;
    }
    const skipped = await getSkippedVersion();
    set({ status: 'available' });
    if (result.latest === skipped) return;
    if (!silent) {
      set({ modalStatus: 'available', modalOpen: true });
    }
  },

  doInstall: async () => {
    const { info } = get();
    if (!info) return;
    if (!info.apkUrl) {
      set({ modalStatus: 'blocked' });
      return;
    }
    set({ status: 'installing', modalStatus: 'installing' });
    const ok = await installUpdate(info.apkUrl);
    if (!ok) {
      set({ modalStatus: Platform.OS === 'ios' ? 'blocked' : 'error', status: 'available' });
    }
  },

  handleLater: () => {
    const { info } = get();
    set({ modalOpen: false });
    if (info) void skipVersion(info.latest);
  },

  openModal: () => {
    set({ modalStatus: 'available', modalOpen: true });
  },
}));

export function updateLabel(status: UpdateStatus, info: UpdateCheckResult | null): string {
  switch (status) {
    case 'checking':
      return 'Buscando actualizaciones…';
    case 'available':
      return info ? `Nueva versión v${info.latest} disponible` : 'Actualización disponible';
    case 'installing':
      return 'Descargando e instalando…';
    case 'up-to-date':
      return `Estás al día (v${currentAppVersion()})`;
    case 'error':
      return 'No se pudo buscar actualizaciones';
    default:
      return `Versión v${currentAppVersion()}`;
  }
}