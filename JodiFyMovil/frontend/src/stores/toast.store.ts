import { create } from 'zustand';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  duration?: number | undefined;
  action?: { label: string; onPress: () => void } | undefined;
}

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, type?: ToastItem['type'], duration?: number, action?: ToastItem['action']) => void;
  hide: (id: string) => void;
  clear: () => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (message, type = 'info', duration = 4000, action) => {
    const id = String(++toastId);
    const toast: ToastItem = { id, message, type, duration, action: action ?? undefined };
    set((state) => ({ toasts: [...state.toasts, toast] }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },

  hide: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));