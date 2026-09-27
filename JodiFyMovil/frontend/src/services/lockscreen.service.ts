import type { AudioMetadata } from '../lib/types';

export async function activateLockScreenForSong(song: any): Promise<void> {
  if (!song) return;
  try {
    const coverUrl = song.cover_url ?? song.coverUrl ?? song.cover ?? song.image_url ?? song.thumbnail_url ?? song.artwork_url ?? song.picture;
    const metadata: AudioMetadata = {
      title: song.name,
      artist: song.artist ?? 'Desconocido',
      albumTitle: song.album,
      artworkUrl: coverUrl,
      duration: song.duration ?? 0,
    };
    // Sync with system media session if available
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.albumTitle ?? '',
        artwork: metadata.artworkUrl ? [{ src: metadata.artworkUrl }] : [],
      });
    }
  } catch (e) {
    console.warn('[LockScreen] Failed to activate:', e);
  }
}

export async function syncLockScreen(
  song: any | null,
  isPlaying: boolean,
  _playbackState?: any
): Promise<void> {
  try {
    if (song && typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  } catch (e) {
    console.warn('[LockScreen] Failed to sync:', e);
  }
}

export async function clearLockScreen(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
  } catch (e) {
    console.warn('[LockScreen] Failed to clear:', e);
  }
}

export async function setPlaybackSpeed(_rate: number): Promise<void> {
  // playback speed handled in audio player
}