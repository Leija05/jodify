import { create } from 'zustand';
import { checkBackendHealth } from '../services/backend.service';
import { registerBackendHook } from '../lib/api';
import { useToastStore } from './toast.store';

export type BackendConnectionStatus = 'online' | 'offline' | 'checking';

const reconnectCallbacks = new Set<() => void>();

let countdownInterval: ReturnType<typeof setInterval> | null = null;

interface BackendState {
  status: BackendConnectionStatus;
  isWaking: boolean;
  countdown: number;
  retrying: boolean;
  retryAttempts: number;
  dismissed: boolean;
  lastChecked: number | null;
  errorMessage: string | null;

  init: () => void;
  checkNow: (manual?: boolean) => Promise<boolean>;
  reportFailure: (status?: number, message?: string) => void;
  reportSuccess: () => void;
  toggleDismissed: () => void;
  setDismissed: (dismissed: boolean) => void;
}

const DEFAULT_COUNTDOWN = 5;

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function startCountdown(get: () => BackendState, set: (fn: (s: BackendState) => Partial<BackendState>) => void) {
  stopCountdown();
  countdownInterval = setInterval(() => {
    const current = get();
    if (current.status !== 'offline') {
      stopCountdown();
      return;
    }

    if (current.retrying) {
      return;
    }

    if (current.countdown <= 1) {
      set(() => ({ countdown: 0 }));
      void current.checkNow(false);
    } else {
      set((s) => ({ countdown: s.countdown - 1 }));
    }
  }, 1000);
}

export const useBackendStore = create<BackendState>((set, get) => ({
  status: 'online',
  isWaking: false,
  countdown: DEFAULT_COUNTDOWN,
  retrying: false,
  retryAttempts: 0,
  dismissed: false,
  lastChecked: null,
  errorMessage: null,

  init: () => {
    // Escuchar eventos en requests API
    registerBackendHook({
      onSuccess: () => {
        get().reportSuccess();
      },
      onFailure: (status, message) => {
        get().reportFailure(status, message);
      },
    });

    // Realizar un chequeo inicial no bloqueante
    void get().checkNow(false);
  },

  checkNow: async (manual = false) => {
    const state = get();
    if (state.retrying) return false;

    set({ retrying: true });

    try {
      const result = await checkBackendHealth(manual ? 5000 : 4000);
      const now = Date.now();

      if (result.ok) {
        stopCountdown();
        const wasOffline = state.status === 'offline';
        set({
          status: 'online',
          isWaking: false,
          retrying: false,
          retryAttempts: 0,
          countdown: DEFAULT_COUNTDOWN,
          lastChecked: now,
          errorMessage: null,
          dismissed: false,
        });

        if (wasOffline) {
          useToastStore.getState().show('¡Conexión con el servidor restablecida!', 'success', 3600);
          // Ejecutar suscripciones de recuperación
          reconnectCallbacks.forEach((cb) => {
            try {
              cb();
            } catch (e) {
              console.warn('[backend] Error en callback de reconexión:', e);
            }
          });
        }
        return true;
      }

      // Si no fue exitoso
      const nextAttempts = state.retryAttempts + 1;
      const isWaking = Boolean(result.isWaking);
      set({
        status: 'offline',
        isWaking,
        retrying: false,
        retryAttempts: nextAttempts,
        countdown: DEFAULT_COUNTDOWN,
        lastChecked: now,
        errorMessage: result.error || 'El servidor no responde',
      });

      if (manual) {
        useToastStore
          .getState()
          .show(
            isWaking
              ? 'El servidor se está iniciando (arranque en frío). Espera unos segundos...'
              : 'El servidor aún no responde. Reintentando en tiempo real...',
            'warning',
            3200,
          );
      }

      startCountdown(get, set);
      return false;
    } catch {
      set({
        status: 'offline',
        retrying: false,
        countdown: DEFAULT_COUNTDOWN,
        retryAttempts: state.retryAttempts + 1,
      });
      startCountdown(get, set);
      return false;
    }
  },

  reportFailure: (httpStatus, message) => {
    const state = get();
    const isWaking = httpStatus === 502 || httpStatus === 503 || httpStatus === 504;

    if (state.status !== 'offline') {
      set({
        status: 'offline',
        isWaking,
        countdown: DEFAULT_COUNTDOWN,
        errorMessage: message || 'No se pudo conectar con el backend',
      });
      startCountdown(get, set);
    } else if (isWaking && !state.isWaking) {
      set({ isWaking: true });
    }
  },

  reportSuccess: () => {
    const state = get();
    if (state.status === 'offline') {
      void state.checkNow(false);
    }
  },

  toggleDismissed: () => set((s) => ({ dismissed: !s.dismissed })),
  setDismissed: (dismissed) => set({ dismissed }),
}));

export function onBackendReconnect(callback: () => void): () => void {
  reconnectCallbacks.add(callback);
  return () => {
    reconnectCallbacks.delete(callback);
  };
}
