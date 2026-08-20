import type { Song } from '../lib/types';
import { pickCoverUrl, resolveArtist } from '../lib/utils';
import { getPlayer, playerGeneration } from '../store/audio';

/**
 * Control de la pantalla de bloqueo / notificación multimedia
 * (expo-audio). La notificación aparece con la portada, el título y el
 * artista de la canción activa, y permite play/pausa/anterior/siguiente.
 *
 * El player de expo-audio se recrea al cambiar de fuente, así que la
 * sesión de lock screen hay que reactivarla con cada player nuevo:
 * se detecta con `playerGeneration()`.
 */

let activeSongId: string | null = null;
let activeGeneration = -1;

function buildMetadata(song: Song) {
  return {
    title: song.name,
    artist: resolveArtist(song) ?? '',
    albumTitle: song.album ?? '',
    artworkUrl: pickCoverUrl(song) ?? undefined,
  };
}

/**
 * Activa (o actualiza) la notificación de reproducción. Se llama de forma
 * inmediata al arrancar una canción para que la notificación aparezca sin
 * esperar el primer tick de estado.
 */
export function activateLockScreenForSong(song: Song): void {
  const gen = playerGeneration();
  if (gen !== activeGeneration) {
    activeGeneration = gen;
    activeSongId = null;
  }
  const key = String(song.id);
  const metadata = buildMetadata(song);
  try {
    const player = getPlayer();
    if (activeSongId === null) {
      player.setActiveForLockScreen(true, metadata);
    } else if (activeSongId !== key) {
      player.updateLockScreenMetadata(metadata);
    }
    activeSongId = key;
  } catch {
    // expo-audio puede fallar si aún no hay sesión multimedia; se reintenta en el próximo tick
  }
}

/** Sincroniza la notificación con el estado real del player. */
export function syncLockScreen(song: Song | null, playing: boolean, playbackState: string): void {
  const isPlaying = playing || playbackState === 'playing';

  if (isPlaying) {
    if (!song) return;
    const gen = playerGeneration();
    if (gen !== activeGeneration) {
      activeGeneration = gen;
      activeSongId = null;
    }
    const key = String(song.id);
    const metadata = buildMetadata(song);
    try {
      const player = getPlayer();
      if (activeSongId === null) {
        player.setActiveForLockScreen(true, metadata);
      } else if (activeSongId !== key) {
        player.updateLockScreenMetadata(metadata);
      }
    } catch {
      // se reintenta en el próximo tick
    }
    activeSongId = key;
    return;
  }

  // No se oculta la notificación al pausar (así se puede reanudar desde ahí),
  // solo cuando la reproducción terminó o el player quedó sin fuente.
  if (playbackState === 'ended' || playbackState === 'idle') {
    if (activeSongId !== null) {
      try {
        getPlayer().clearLockScreenControls();
      } catch {
        // noop
      }
      activeSongId = null;
    }
  }
}