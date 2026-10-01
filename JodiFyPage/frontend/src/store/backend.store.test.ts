import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { useBackendStore, onBackendReconnect } from './backend.store';

describe('useBackendStore - Detección y reconexión en tiempo real', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useBackendStore.setState({
      status: 'online',
      isWaking: false,
      countdown: 5,
      retrying: false,
      retryAttempts: 0,
      dismissed: false,
      lastChecked: null,
      errorMessage: null,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('inicia en estado online', () => {
    const state = useBackendStore.getState();
    expect(state.status).toBe('online');
    expect(state.countdown).toBe(5);
    expect(state.retryAttempts).toBe(0);
  });

  it('cambia a offline cuando se reporta una falla de conexión', () => {
    useBackendStore.getState().reportFailure(502, 'Bad Gateway');
    const state = useBackendStore.getState();

    expect(state.status).toBe('offline');
    expect(state.isWaking).toBe(true);
    expect(state.countdown).toBe(5);
  });

  it('decrementa el contador cada segundo cuando está offline', () => {
    useBackendStore.getState().reportFailure(undefined, 'Failed to fetch');
    expect(useBackendStore.getState().status).toBe('offline');
    expect(useBackendStore.getState().countdown).toBe(5);

    vi.advanceTimersByTime(1000);
    expect(useBackendStore.getState().countdown).toBe(4);

    vi.advanceTimersByTime(2000);
    expect(useBackendStore.getState().countdown).toBe(2);
  });

  it('ejecuta callbacks de reconexión cuando vuelve a estar online', async () => {
    let reconnected = false;
    const unsubscribe = onBackendReconnect(() => {
      reconnected = true;
    });

    useBackendStore.getState().reportFailure(502, 'Down');
    expect(useBackendStore.getState().status).toBe('offline');

    // Simular que fetch a /health ahora responde ok
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200 })));

    const success = await useBackendStore.getState().checkNow(false);
    expect(success).toBe(true);
    expect(useBackendStore.getState().status).toBe('online');
    expect(reconnected).toBe(true);

    unsubscribe();
  });

  it('permite minimizar y restaurar el banner (modo pill)', () => {
    expect(useBackendStore.getState().dismissed).toBe(false);

    useBackendStore.getState().toggleDismissed();
    expect(useBackendStore.getState().dismissed).toBe(true);

    useBackendStore.getState().setDismissed(false);
    expect(useBackendStore.getState().dismissed).toBe(false);
  });
});
