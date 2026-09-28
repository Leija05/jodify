import { NativeModules, Platform } from 'react-native';
import type { Song } from '../lib/types';
import { pickCoverUrl, resolveArtist } from '../lib/utils';
import { getSongPalette } from '../lib/palette';

const { JodifyMediaModule } = NativeModules;

export async function activateLockScreenForSong(
  song: Song | null,
  isPlaying = true,
  position = 0
): Promise<void> {
  if (!song) return;
  try {
    const coverUrl = pickCoverUrl(song);
    const artist = resolveArtist(song) ?? 'Desconocido';
    const palette = getSongPalette(song);

    if (Platform.OS === 'android' && JodifyMediaModule?.updatePlayback) {
      JodifyMediaModule.updatePlayback(
        song.name,
        artist,
        coverUrl ?? null,
        isPlaying,
        position,
        song.duration ?? 0,
        palette.primary ?? '#7F00FF'
      );
    }

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.name,
        artist,
        album: song.album ?? '',
        artwork: coverUrl ? [{ src: coverUrl }] : [],
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  } catch (e) {
    console.warn('[LockScreen] Failed to activate:', e);
  }
}

export async function syncLockScreen(
  song: Song | null,
  isPlaying: boolean,
  position = 0,
  duration = 0
): Promise<void> {
  try {
    if (!song) {
      if (Platform.OS === 'android' && JodifyMediaModule?.stopPlayback) {
        JodifyMediaModule.stopPlayback();
      }
      return;
    }

    const coverUrl = pickCoverUrl(song);
    const artist = resolveArtist(song) ?? 'Desconocido';
    const palette = getSongPalette(song);

    if (Platform.OS === 'android' && JodifyMediaModule?.updatePlayback) {
      JodifyMediaModule.updatePlayback(
        song.name,
        artist,
        coverUrl ?? null,
        isPlaying,
        position,
        duration > 0 ? duration : (song.duration ?? 0),
        palette.primary ?? '#7F00FF'
      );
    }

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  } catch (e) {
    console.warn('[LockScreen] Failed to sync:', e);
  }
}

export async function clearLockScreen(): Promise<void> {
  try {
    if (Platform.OS === 'android' && JodifyMediaModule?.stopPlayback) {
      JodifyMediaModule.stopPlayback();
    }
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