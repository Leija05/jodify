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

let lastSyncedSongId: string | number | null = null;
let lastSyncedPlaying: boolean | null = null;
let lastSyncTime = 0;
let lastPositionSent = 0;

export async function syncLockScreen(
  song: Song | null,
  isPlaying: boolean,
  position = 0,
  duration = 0,
  force = false
): Promise<void> {
  try {
    if (!song) {
      lastSyncedSongId = null;
      lastSyncedPlaying = null;
      if (Platform.OS === 'android' && JodifyMediaModule?.stopPlayback) {
        JodifyMediaModule.stopPlayback();
      }
      return;
    }

    const now = Date.now();
    const songId = song.id;
    const songChanged = songId !== lastSyncedSongId;
    const playChanged = isPlaying !== lastSyncedPlaying;
    const posJumped = Math.abs(position - lastPositionSent) > 3.0; // manual seek
    const timeElapsed = now - lastSyncTime > 4000; // sync state every 4s

    // Skip redundant IPC and bridge calls if neither song, play state nor significant seek occurred
    if (!force && !songChanged && !playChanged && !posJumped && !timeElapsed) {
      return;
    }

    lastSyncedSongId = songId;
    lastSyncedPlaying = isPlaying;
    lastSyncTime = now;
    lastPositionSent = position;

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