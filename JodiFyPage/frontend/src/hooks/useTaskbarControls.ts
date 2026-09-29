import { useEffect } from 'react';
import { usePlayerStore } from '../store/player.store';
import { useLibraryStore } from '../store/library.store';

import { resolveMediaUrl, songArtistMeta } from '../lib/utils';

// Sincroniza el estado del reproductor con los botones del thumbar de Windows
// y el servidor local de OBS Overlay.
export function useTaskbarControls() {
  useEffect(() => {
    const api = window.jodifyPlayer;
    if (!api) return;

    let last = { playing: false, hasTrack: false, liked: false, songId: null as any };
    const sync = () => {
      const player = usePlayerStore.getState();
      const song = player.currentSong;
      const library = useLibraryStore.getState();
      const isLiked = song ? library.likedIds.some((id) => String(id) === String(song.id)) : false;
      const songId = song?.id ?? null;
      const next = {
        playing: player.isPlaying,
        hasTrack: !!song,
        liked: isLiked,
        songId,
        title: song?.name ?? null,
        artist: songArtistMeta(song),
        album: song?.album ?? null,
        addedBy: song?.added_by ?? null,
        cover: song ? resolveMediaUrl(song.cover_url ?? null) : null,
        currentTime: player.currentTime,
        duration: player.duration,
      };
      if (
        next.playing !== last.playing ||
        next.hasTrack !== last.hasTrack ||
        next.liked !== last.liked ||
        next.songId !== last.songId
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