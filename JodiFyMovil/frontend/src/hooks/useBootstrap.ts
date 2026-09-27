import { useEffect } from 'react';
import { useLibraryStore } from '../stores/library.store';
import { useEqStore } from '../stores/eq.store';
import { useSettingsStore } from '../stores/settings.store';
import { useJamStore } from '../stores/jam.store';

export function useBootstrap() {
  const loadLibrary = useLibraryStore((s) => s.load);
  const loadEq = useEqStore((s) => s.loadPersisted);
  const loadSettings = useSettingsStore((s) => s.loadPersisted);
  const restoreJam = useJamStore((s) => s.restore);

  useEffect(() => {
    loadLibrary();
    loadEq();
    loadSettings();
    restoreJam();
  }, [loadLibrary, loadEq, loadSettings, restoreJam]);
}