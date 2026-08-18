import { useEffect } from 'react';
import { usePlayerStore } from '../store/player.store';
import { resolveMediaUrl } from '../lib/utils';

export function useMediaSession(): void {
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const update = () => {
      const { currentSong, isPlaying } = usePlayerStore.getState();
      if (!currentSong) return;
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.name,
          artist: currentSong.artist ?? currentSong.added_by ?? 'JodiFy',
          album: currentSong.album ?? 'JodiFy',
          artwork: currentSong.cover_url
            ? [{ src: resolveMediaUrl(currentSong.cover_url), sizes: '512x512', type: 'image/jpeg' }]
            : [],
        });
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      } catch {
        /* ignore */
      }
    };

    const setHandler = (action: MediaSessionAction, handler: () => void) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        /* unsupported action */
      }
    };

    setHandler('play', () => {
      const audio = document.querySelector('audio#jodify-audio') as HTMLAudioElement | null;
      audio?.play().catch(() => undefined);
    });
    setHandler('pause', () => {
      const audio = document.querySelector('audio#jodify-audio') as HTMLAudioElement | null;
      audio?.pause();
    });
    setHandler('nexttrack', () => void usePlayerStore.getState().next());
    setHandler('previoustrack', () => void usePlayerStore.getState().previous());

    const unsub = usePlayerStore.subscribe(update);
    update();
    return unsub;
  }, []);
}
