import { create } from 'zustand';
import { uid } from '../lib/utils';
import type { ToastItem } from '../lib/types';

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, type?: ToastItem['type'], duration?: number) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, type = 'info', duration = 3200) => {
    const id = uid();
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, message, type, duration }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (m: string, d?: number) => useToastStore.getState().show(m, 'success', d),
  warning: (m: string, d?: number) => useToastStore.getState().show(m, 'warning', d),
  error: (m: string, d?: number) => useToastStore.getState().show(m, 'error', d),
  info: (m: string, d?: number) => useToastStore.getState().show(m, 'info', d),
};
