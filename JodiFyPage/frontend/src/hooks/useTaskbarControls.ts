import { useEffect } from 'react';
import { usePlayerStore } from '../store/player.store';
import { useLibraryStore } from '../store/library.store';

// Sincroniza el estado del reproductor con los botones del thumbar de Windows
// (hover sobre el icono en la barra de tarea) y ejecuta los controles que
// llegan desde el main process. No hace nada en navegador / PWA.
export function useTaskbarControls() {
  useEffect(() => {
    const api = window.jodifyPlayer;
    if (!api) return;

    let last = { playing: false, hasTrack: false, liked: false };
    const sync = () => {
      const player = usePlayerStore.getState();
      const song = player.currentSong;
      const library = useLibraryStore.getState();
      const isLiked = song ? library.likedIds.some((id) => String(id) === String(song.id)) : false;
      const next = {
        playing: player.isPlaying,
        hasTrack: !!song,
        liked: isLiked,
      };
      if (
        next.playing !== last.playing ||
        next.hasTrack !== last.hasTrack ||
        next.liked !== last.liked
      ) {
        last = next;
        api.setState(next);
      }
    };

    sync();
    const unsubscribePlayer = usePlayerStore.subscribe(sync);
    const unsubscribeLibrary = useLibraryStore.subscribe(sync);

    const unsubscribeControl = api.onControl(({ action }) => {
      const player = usePlayerStore.getState();
      if (action === 'toggle') {
        player.togglePlay();
      } else if (action === 'next') {
        void player.next();
      } else if (action === 'prev') {
        void player.previous();
      } else if (action === 'like') {
        void import('../services/player-shortcuts').then(({ toggleLikeCurrent }) => {
          void toggleLikeCurrent().then(() => {
            sync();
          });
        });
      }
    });

    return () => {
      unsubscribePlayer();
      unsubscribeLibrary();
      unsubscribeControl();
    };
  }, []);
}