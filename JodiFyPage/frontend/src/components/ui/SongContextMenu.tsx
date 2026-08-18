import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CloudArrowDown, CloudCheck, Download, Heart, PencilSimple, Play, Queue, Trash } from '@phosphor-icons/react';
import { useContextMenuStore } from '../../store/contextmenu.store';
import { usePlayerStore } from '../../store/player.store';
import { useLibraryStore } from '../../store/library.store';
import { useQueueStore } from '../../store/queue.store';
import { useToastStore } from '../../store/toast.store';
import { useUiStore } from '../../store/ui.store';
import { useIsDev, useSession } from '../../context/SessionContext';
import { resolveMediaUrl } from '../../lib/utils';
import { playSong } from '../../services/player.service';
import { toggleLikeCurrent } from '../../services/player-shortcuts';
import { downloadSong, removeDownload } from '../../services/offline.service';
import { confirmDialog } from '../../store/confirm.store';
import { songsService } from '../../services/songs.service';
import { downloadsService, likesService, logsService } from '../../services/social.service';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  testId?: string;
}

function MenuItem({ icon, label, onClick, danger, testId }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`jf-context-menu-item${danger ? ' is-danger' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      data-testid={testId}
    >
      <span className="jf-context-menu-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function SongContextMenu() {
  const { open, x, y, song, hide } = useContextMenuStore();
  const { session } = useSession();
  const isDev = useIsDev();
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [ready, setReady] = useState(false);

  const isLiked = song ? useLibraryStore.getState().likedIds.includes(song.id) : false;
  const isDownloaded = song ? useLibraryStore.getState().downloadedIds.includes(song.id) : false;

  useLayoutEffect(() => {
    if (!open) return;
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    setPos({
      x: Math.max(pad, Math.min(x, window.innerWidth - rect.width - pad)),
      y: Math.max(pad, Math.min(y, window.innerHeight - rect.height - pad)),
    });
    setReady(true);
  }, [open, x, y]);

  useEffect(() => {
    if (!open) return;
    setReady(false);
    const close = () => hide();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, hide]);

  const handlePlay = async () => {
    hide();
    if (!song) return;
    const player = usePlayerStore.getState();
    if (String(player.currentSong?.id) === String(song.id)) {
      player.togglePlay();
      return;
    }
    await playSong(song);
    usePlayerStore.getState().setIsPlaying(true);
  };

  const handleQueue = () => {
    hide();
    if (!song) return;
    const added = useQueueStore.getState().add(song);
    if (added) useToastStore.getState().show(`«${song.name}» en la cola`, 'info', 1800);
  };

  const handleDownloadToDevice = async () => {
    hide();
    if (!song) return;
    const toast = useToastStore.getState();
    toast.show(`Descargando «${song.name}»…`, 'info', 2000);
    try {
      await downloadsService.downloadSongToDevice(resolveMediaUrl(song.url), song.name);
    } catch {
      toast.show('No se pudo descargar la canción', 'error');
    }
  };

  const handleOffline = async () => {
    if (!session || !song) return;
    hide();
    const toast = useToastStore.getState();
    if (isDownloaded) {
      await removeDownload(song.id, session.username);
      toast.show(`«${song.name}» fuera de línea`, 'info', 1800);
    } else {
      toast.show(`Guardando «${song.name}»…`, 'info', 1800);
      await downloadSong(song, session.username);
      toast.show(`«${song.name}» disponible sin conexión`, 'success', 2200);
    }
  };

  const handleLike = async () => {
    if (!session || !song) return;
    hide();
    const player = usePlayerStore.getState();
    if (String(song.id) === String(player.currentSong?.id)) {
      await toggleLikeCurrent();
      return;
    }
    const library = useLibraryStore.getState();
    const liked = library.likedIds.includes(song.id);
    library.toggleLikeLocal(song.id, !liked);
    library.bumpLikes(song.id, !liked ? 1 : -1);
    try {
      if (!liked) await likesService.addLike(session.username, song.id);
      else await likesService.removeLike(session.username, song.id);
    } catch {
      useToastStore.getState().show('No se pudo sincronizar el like', 'error');
    }
  };

  const handleEdit = () => {
    if (!song) return;
    hide();
    useUiStore.getState().open('editSong', { song });
  };

  const handleDelete = async () => {
    if (!song || !isDev) return;
    hide();
    const ok = await confirmDialog({
      title: 'Eliminar canción',
      message: `Se eliminará «${song.name}» de la base de datos junto con sus me gusta, descargas e historial. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    const toast = useToastStore.getState();
    try {
      await songsService.deleteSongs([song.id]);
      useLibraryStore.getState().removeSongs([song.id]);
      useQueueStore.getState().remove(song.id);
      const player = usePlayerStore.getState();
      if (String(player.currentSong?.id) === String(song.id)) {
        player.setCurrentSong(null);
        player.setIsPlaying(false);
        player.setSourceUrl(null);
      }
      toast.show(`«${song.name}» eliminada`, 'success', 2200);
      void logsService.add('delete_song', `Canción eliminada: ${song.name}`);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'No se pudo eliminar la canción', 'error');
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && song && (
        <motion.div
          ref={menuRef}
          className="jf-context-menu"
          role="menu"
          data-testid="context-menu"
          style={{ left: pos.x, top: pos.y, visibility: ready ? 'visible' : 'hidden' }}
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="jf-context-menu-head">
            <p className="jf-context-menu-title">{song.name}</p>
          </div>
          <MenuItem icon={<Play size={15} />} label="Reproducir" onClick={handlePlay} testId="cm-play" />
          <MenuItem icon={<Queue size={15} />} label="Agregar a la cola" onClick={handleQueue} testId="cm-queue" />
          <MenuItem icon={<Download size={15} />} label="Descargar" onClick={handleDownloadToDevice} testId="cm-download" />
          {session && (
            <>
              <MenuItem
                icon={isDownloaded ? <CloudCheck size={15} /> : <CloudArrowDown size={15} />}
                label={isDownloaded ? 'Quitar offline' : 'Guardar offline'}
                onClick={handleOffline}
                testId="cm-offline"
              />
              <MenuItem
                icon={<Heart size={15} weight={isLiked ? 'fill' : 'regular'} />}
                label={isLiked ? 'Quitar de favoritas' : 'Me gusta'}
                onClick={handleLike}
                testId="cm-like"
              />
            </>
          )}
          {isDev && (
            <>
              <MenuItem icon={<PencilSimple size={15} />} label="Editar información" onClick={handleEdit} testId="cm-edit" />
              <div className="jf-context-menu-sep" />
              <MenuItem icon={<Trash size={15} />} label="Eliminar canción" danger onClick={handleDelete} testId="cm-delete" />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}