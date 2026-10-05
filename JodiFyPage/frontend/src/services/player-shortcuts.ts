import { usePlayerStore } from '../store/player.store';
import { useLibraryStore } from '../store/library.store';
import { useToastStore } from '../store/toast.store';
import { likesService } from './social.service';
import { songsService } from './songs.service';
import { extractYoutubeId } from './player.service';
import type { Song } from '../lib/types';

export function cacheExternalLikedSong(s: Song): void {
  try {
    const raw = localStorage.getItem('jf_external_liked_songs') || '[]';
    const list: Song[] = JSON.parse(raw);
    const filtered = list.filter((item) => String(item.id) !== String(s.id) && item.name !== s.name);
    filtered.unshift(s);
    localStorage.setItem('jf_external_liked_songs', JSON.stringify(filtered.slice(0, 100)));
  } catch {}
}

export function removeExternalLikedSong(id: number | string): void {
  try {
    const raw = localStorage.getItem('jf_external_liked_songs') || '[]';
    const list: Song[] = JSON.parse(raw);
    const filtered = list.filter((item) => String(item.id) !== String(id));
    localStorage.setItem('jf_external_liked_songs', JSON.stringify(filtered));
  } catch {}
}

export async function toggleLikeCurrent(): Promise<void> {
  const player = usePlayerStore.getState();
  const song = player.currentSong;
  const username = localStorage.getItem('currentUserName');
  if (!song || !username) return;

  const library = useLibraryStore.getState();
  const sId = String(song.id);
  const ytId = song.youtube_id || extractYoutubeId(song);
  const liked = library.likedIds.some((id) => {
    const idStr = String(id);
    return idStr === sId || (ytId && idStr === ytId);
  });
  const nextLiked = !liked;

  // Si es una canción externa/virtual o buscada que aún no está persistida en la BD
  const isVirtual =
    sId.startsWith('link-') ||
    sId.startsWith('yt-') ||
    !library.songs.some((s) => String(s.id) === sId);

  if (isVirtual && nextLiked) {
    try {
      const registered = await songsService.registerSong({
        name: song.name,
        artist: song.artist,
        album: song.album || 'Enlace Web',
        url: song.url,
        youtube_id: ytId || undefined,
        cover_url: song.cover_url,
        duration: song.duration,
        added_by: username,
        liked_by: username,
      });

      library.upsertSong(registered);
      library.toggleLikeLocal(registered.id, true);
      cacheExternalLikedSong(registered);

      if (String(registered.id) !== sId) {
        library.toggleLikeLocal(song.id, false);
        player.setCurrentSong(registered);
      }

      useToastStore
        .getState()
        .show(`«${registered.name}» guardada en tus Me Gusta ❤️`, 'success', 2200);
      return;
    } catch (err) {
      console.warn('[toggleLikeCurrent] Error registrando canción externa, continuando con fallback:', err);
    }
  }

  library.toggleLikeLocal(song.id, nextLiked);
  library.bumpLikes(song.id, nextLiked ? 1 : -1);

  if (nextLiked) {
    cacheExternalLikedSong(song);
  } else {
    removeExternalLikedSong(song.id);
  }

  try {
    if (nextLiked) {
      await likesService.addLike(username, song.id);
    } else {
      await likesService.removeLike(username, song.id);
      if (ytId) {
        await likesService.removeLike(username, ytId).catch(() => {});
      }
    }
    await songsService.updateLikes(song.id, nextLiked ? 1 : -1).catch(() => 0);
    library.bumpLikes(song.id, 0);
    useToastStore
      .getState()
      .show(
        nextLiked ? `«${song.name}» agregada a tus Me Gusta ❤️` : `«${song.name}» eliminada de Me Gusta`,
        nextLiked ? 'success' : 'info',
        1800
      );
  } catch (error) {
    useToastStore.getState().show('No se pudo sincronizar el like con el servidor', 'error');
    library.toggleLikeLocal(song.id, liked);
    library.bumpLikes(song.id, liked ? 1 : -1);
    console.error(error);
  }
}
