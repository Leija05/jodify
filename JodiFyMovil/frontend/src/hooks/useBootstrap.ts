import { useEffect } from 'react';
import { useLibraryStore } from '../store/library.store';
import { useSettingsStore } from '../store/settings.store';

export function useBootstrap() {
  useEffect(() => {
    void useLibraryStore.getState().load();
    void useSettingsStore.getState().loadUser();
  }, []);
}