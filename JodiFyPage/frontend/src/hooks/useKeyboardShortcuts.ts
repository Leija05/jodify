import { useEffect } from 'react';
import { usePlayerStore } from '../store/player.store';
import { useSettingsStore } from '../store/settings.store';
import { useUiStore } from '../store/ui.store';

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      const player = usePlayerStore.getState();
      const ui = useUiStore.getState();
      const settings = useSettingsStore.getState();

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          if (player.currentSong) player.togglePlay();
          break;
        case 'n':
        case 'arrowright':
          if (e.shiftKey || e.key === 'n') void player.next();
          break;
        case 'p':
        case 'arrowleft':
          if (e.shiftKey || e.key === 'p') void player.previous();
          break;
        case 'arrowup':
          e.preventDefault();
          player.setVolume(Math.min(1, player.volume + 0.05));
          break;
        case 'arrowdown':
          e.preventDefault();
          player.setVolume(Math.max(0, player.volume - 0.05));
          break;
        case 'l':
          if (player.currentSong) {
            import('../services/player-shortcuts').then(({ toggleLikeCurrent }) => toggleLikeCurrent());
          }
          break;
        case 'm':
          player.setMuted(!player.muted);
          break;
        case 's':
          player.toggleShuffle();
          break;
        case 'r':
          player.toggleLoop();
          break;
        case 't':
          settings.toggleTheme();
          break;
        case 'q':
          ui.toggle('queue');
          break;
        case 'e':
          ui.toggle('equalizer');
          break;
        case 'j':
          ui.toggle('jam');
          break;
        case 'f':
          if (player.currentSong) ui.open('fullscreen');
          break;
        case '?':
        case '/':
          ui.toggle('shortcuts');
          break;
        case 'escape':
          ui.closeAll();
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function useShortcutHint(): void {
  useEffect(() => {
    const ui = useUiStore.getState();
    ui.setShortcutHintVisible(true);
    const t = setTimeout(() => ui.setShortcutHintVisible(false), 5000);
    return () => clearTimeout(t);
  }, []);
}
