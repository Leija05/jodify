import { useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { useJamStore, restoreJamState } from '../store/jam.store';
import { jamService } from '../services/jam.service';
import { useToastStore } from '../store/toast.store';

export function useJamBoot(): void {
  const { session } = useSession();

  useEffect(() => {
    const restored = restoreJamState();
    if (!restored) return;

    const username = session?.username ?? 'Invitado';
    const store = useJamStore.getState();
    store.start(restored.code, restored.isHost, restored.sessionId ?? 0);

    const reconnect = async () => {
      try {
        const record = restored.sessionId
          ? await jamService.fetchSessionState(restored.sessionId)
          : await jamService.fetchActiveSession(restored.code);
        if (!record || !record.is_active) {
          store.stop();
          useToastStore.getState().show('Tu Jam ya no está activa', 'info');
          return;
        }
        jamService.connect(restored.code, username, restored.isHost, record.id);
      } catch {
        useToastStore.getState().show('No se pudo reconectar a la Jam', 'warning');
      }
    };
    void reconnect();
  }, [session]);
}
