import { motion } from 'motion/react';
import { Heart, Download, Queue, Play, Pause } from '@phosphor-icons/react';
import type { Song } from '../../lib/types';
import { usePlayerStore } from '../../store/player.store';
import { useLibraryStore } from '../../store/library.store';
import { useQueueStore } from '../../store/queue.store';
import { useToastStore } from '../../store/toast.store';
import { useContextMenuStore } from '../../store/contextmenu.store';
import { useSession } from '../../context/SessionContext';
import { songArtistMeta } from '../../lib/utils';
import { SongCover } from '../ui/SongCover';
import { toggleLikeCurrent } from '../../services/player-shortcuts';
import { downloadSong, removeDownload } from '../../services/offline.service';

import type { PlaybackContext } from '../../store/player.store';

interface SongRowProps {
  song: Song;
  index: number;
  showDownloaded?: boolean;
  contextSongs?: Song[];
  contextTitle?: string;
  contextType?: PlaybackContext['type'];
}

export function SongRow({ song, index, contextSongs, contextTitle, contextType }: SongRowProps) {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const likedIds = useLibraryStore((s) => s.likedIds);
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const { session } = useSession();

  const isCurrent = String(currentSong?.id) === String(song.id);
  const isLiked = likedIds.some((id) => String(id) === String(song.id));
  const isDownloaded = downloadedIds.some((id) => String(id) === String(song.id));

  const handlePlay = async () => {
    if (isCurrent) {
      usePlayerStore.getState().togglePlay();
      return;
    }

    const library = useLibraryStore.getState();
    const isDeviceOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    const songsToUse = contextSongs && contextSongs.length > 0
      ? contextSongs
      : (isDeviceOffline || library.currentTab === 'downloads'
          ? library.songs.filter((s) => library.downloadedIds.some((id) => String(id) === String(s.id)))
          : library.currentTab === 'personal'
            ? library.songs.filter((s) => library.likedIds.some((id) => String(id) === String(s.id)))
            : library.songs);

    const titleToUse = contextTitle || (
      isDeviceOffline || library.currentTab === 'downloads' ? 'Tus descargas' :
      library.currentTab === 'personal' ? 'Tus favoritas' :
      'Tu biblioteca'
    );

    const typeToUse = contextType || (
      isDeviceOffline || library.currentTab === 'downloads' ? 'downloads' :
      library.currentTab === 'personal' ? 'favorites' :
      'library'
    );

    await usePlayerStore.getState().playWithContext(song, songsToUse, titleToUse, typeToUse);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) {
      useToastStore.getState().show('Inicia sesión para guardar favoritos', 'info', 1800);
      return;
    }
    if (String(song.id) === String(currentSong?.id)) {
      await toggleLikeCurrent();
      return;
    }
    const library = useLibraryStore.getState();
    const liked = library.likedIds.some((id) => String(id) === String(song.id));
    library.toggleLikeLocal(song.id, !liked);
    library.bumpLikes(song.id, !liked ? 1 : -1);
    try {
      const { likesService } = await import('../../services/social.service');
      if (!liked) await likesService.addLike(session.username, song.id);
      else await likesService.removeLike(session.username, song.id);
    } catch {
      useToastStore.getState().show('No se pudo sincronizar el like', 'error');
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const user = session?.username || 'local_user';
    if (isDownloaded) {
      await removeDownload(song.id, user);
    } else {
      await downloadSong(song, user);
    }
  };

  const handleQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    const added = useQueueStore.getState().add(song);
    if (added) useToastStore.getState().show(`«${song.name}» en la cola`, 'info', 1800);
  };

  return (
    <motion.li
      className={`jf-song ${isCurrent ? 'is-current' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.45), ease: [0.16, 1, 0.3, 1] }}
      onClick={handlePlay}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        useContextMenuStore.getState().show(e.clientX, e.clientY, song);
      }}
      data-testid={`song-row-${song.id}`}
    >
      <div className="jf-song-cover-wrap">
        <SongCover song={song} alt="" className="jf-song-cover" />
        {isCurrent && isPlaying && (
          <span className="jf-song-playing-bars" aria-hidden="true">
            <span className="bar-1" />
            <span className="bar-2" />
            <span className="bar-3" />
          </span>
        )}
        <span className="jf-song-cover-hover">
          {isCurrent && isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
        </span>
      </div>
      <div className="jf-song-info">
        <p className="jf-song-name">{song.name}</p>
        <p className="jf-song-meta">
          {songArtistMeta(song) || (song.added_by ? `Por ${song.added_by}` : 'JodiFy')}
          {song.album ? ` · ${song.album}` : ''}
          {song.likes ? ` · ${song.likes} ♥` : ''}
        </p>
      </div>
      <div className="jf-song-actions">
        <button className={`jf-song-action ${isDownloaded ? 'is-active' : ''}`} aria-label="Descargar" onClick={handleDownload}>
          <Download size={16} weight={isDownloaded ? 'fill' : 'regular'} />
        </button>
        <button className={`jf-song-action ${isLiked ? 'is-liked' : ''}`} aria-label="Me gusta" onClick={handleLike}>
          <Heart size={16} weight={isLiked ? 'fill' : 'regular'} />
        </button>
        <button className="jf-song-action" aria-label="Agregar a la cola" onClick={handleQueue}>
          <Queue size={16} />
        </button>
      </div>
      <div className="jf-song-cover-pop" aria-hidden="true">
        <SongCover song={song} alt="" eager />
      </div>
    </motion.li>
  );
}
