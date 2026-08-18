import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
}

type Resolver = (ok: boolean) => void;

interface ConfirmState {
  item: (ConfirmOptions & { resolve: Resolver }) | null;
  request: (options: ConfirmOptions) => Promise<boolean>;
  resolve: (ok: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  item: null,
  request: (options) =>
    new Promise<boolean>((resolve) => {
      set({ item: { ...options, resolve } });
    }),
  resolve: (ok) => {
    set((state) => {
      state.item?.resolve(ok);
      return { item: null };
    });
  },
}));

export const confirmDialog = (options: ConfirmOptions | string): Promise<boolean> => {
  const opts = typeof options === 'string' ? { title: options } : options;
  return useConfirmStore.getState().request(opts);
};