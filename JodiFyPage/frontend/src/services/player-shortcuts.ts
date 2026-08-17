import { usePlayerStore } from '../store/player.store';
import { useLibraryStore } from '../store/library.store';
import { useToastStore } from '../store/toast.store';
import { likesService } from './social.service';
import { songsService } from './songs.service';

export async function toggleLikeCurrent(): Promise<void> {
  const player = usePlayerStore.getState();
  const song = player.currentSong;
  const username = localStorage.getItem('currentUserName');
  if (!song || !username) return;

  const library = useLibraryStore.getState();
  const liked = library.likedIds.includes(song.id);
  const nextLiked = !liked;

  library.toggleLikeLocal(song.id, nextLiked);
  library.bumpLikes(song.id, nextLiked ? 1 : -1);

  try {
    if (nextLiked) {
      await likesService.addLike(username, song.id);
    } else {
      await likesService.removeLike(username, song.id);
    }
    await songsService.updateLikes(song.id, nextLiked ? 1 : -1);
    library.bumpLikes(song.id, 0);
  } catch (error) {
    useToastStore.getState().show('No se pudo sincronizar el like', 'error');
    library.toggleLikeLocal(song.id, liked);
    library.bumpLikes(song.id, liked ? 1 : -1);
    console.error(error);
  }
}
