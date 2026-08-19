import { useEffect } from 'react';
import { usePlayerStore } from '../store/player.store';

// Sincroniza el estado del reproductor con los botones del thumbar de Windows
// (hover sobre el icono en la barra de tarea) y ejecuta los controles que
// llegan desde el main process. No hace nada en navegador / PWA.
export function useTaskbarControls() {
  useEffect(() => {
    const api = window.jodifyPlayer;
    if (!api) return;

    let last = { playing: false, hasTrack: false };
    const sync = () => {
      const player = usePlayerStore.getState();
      const next = { playing: player.isPlaying, hasTrack: !!player.currentSong };
      if (next.playing !== last.playing || next.hasTrack !== last.hasTrack) {
        last = next;
        api.setState(next);
      }
    };
    sync();
    const unsubscribe = usePlayerStore.subscribe(sync);

    const unsubscribeControl = api.onControl(({ action }) => {
      const player = usePlayerStore.getState();
      if (action === 'toggle') {
        player.togglePlay();
      } else if (action === 'next') {
        void player.next();
      } else if (action === 'prev') {
        void player.previous();
      } else if (action === 'like') {
        void import('../services/player-shortcuts').then(({ toggleLikeCurrent }) => toggleLikeCurrent());
      }
    });

    return () => {
      unsubscribe();
      unsubscribeControl();
    };
  }, []);
}