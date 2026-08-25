import { useEffect } from 'react';
import { useLibraryStore } from '../store/library.store';
import { useSettingsStore } from '../store/settings.store';

/**
 * Bootstrap de la app: carga datos iniciales y reactiva
 * likes/library cuando cambia el usuario (login/logout).
 */
export function useBootstrap() {
  const user = useSettingsStore((s) => s.user);

  useEffect(() => {
    void useLibraryStore.getState().load();
    void useSettingsStore.getState().loadUser();
  }, []);

  // Cuando cambia el usuario, refrescar likes y forzar recarga de library
  useEffect(() => {
    void useLibraryStore.getState().refreshLikes();
    // Forzar recarga de canciones si el usuario cambió
    useLibraryStore.setState({ songs: [], lastUserId: null });
    void useLibraryStore.getState().load();
  }, [user]);
}
