import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  CloudArrowDown,
  CloudCheck,
  Download,
  Heart,
  PencilSimple,
  Play,
  Queue,
  Trash,
  Playlist,
  Sparkle,
  Copy,
  CaretRight,
  FolderPlus,
} from '@phosphor-icons/react';
import { useContextMenuStore } from '../../store/contextmenu.store';
import { usePlayerStore } from '../../store/player.store';
import { useLibraryStore } from '../../store/library.store';
import { useQueueStore } from '../../store/queue.store';
import { useToastStore } from '../../store/toast.store';
import { useUiStore } from '../../store/ui.store';
import { usePlaylistsStore } from '../../store/playlists.store';
import { useIsAdmin, useIsDev, useSession } from '../../context/SessionContext';
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
  rightSlot?: React.ReactNode;
}

function MenuItem({ icon, label, onClick, danger, testId, rightSlot }: MenuItemProps) {
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
      <span className="jf-context-menu-label">{label}</span>
      {rightSlot && <span className="jf-context-menu-right-slot">{rightSlot}</span>}
    </button>
  );
}

export function SongContextMenu() {
  const { open, x, y, song, hide } = useContextMenuStore();
  const { session } = useSession();
  const isAdmin = useIsAdmin();
  const isDev = useIsDev();
  const canManage = isAdmin || isDev;
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);

  const playlists = usePlaylistsStore((s) => s.playlists);
  const isLiked = song ? useLibraryStore.getState().likedIds.some((id) => String(id) === String(song.id)) : false;
  const isDownloaded = song ? useLibraryStore.getState().downloadedIds.some((id) => String(id) === String(song.id)) : false;

  useLayoutEffect(() => {
    if (!open) return;
    const el = menuRef.current;
    const rect = el?.getBoundingClientRect();
    const pad = 12;
    const menuWidth = rect?.width || 220;
    const menuHeight = rect?.height || 360;
    setPos({
      x: Math.max(pad, Math.min(x, window.innerWidth - menuWidth - pad)),
      y: Math.max(pad, Math.min(y, window.innerHeight - menuHeight - pad)),
    });
  }, [open, x, y]);

  useEffect(() => {
    if (!open) {
      setShowPlaylistSubmenu(false);
      return;
    }

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hide();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };

    const onResize = () => hide();

    const timer = setTimeout(() => {
      window.addEventListener('mousedown', onPointerDown);
      window.addEventListener('touchstart', onPointerDown);
    }, 40);

    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
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

  const handleQueuePriority = () => {
    hide();
    if (!song) return;
    useQueueStore.getState().addPriority(song);
    useToastStore.getState().show(`«${song.name}» sonará a continuación`, 'success', 2000);
  };

  const handleQueue = () => {
    hide();
    if (!song) return;
    const added = useQueueStore.getState().add(song);
    if (added) useToastStore.getState().show(`«${song.name}» en la cola`, 'info', 1800);
  };

  const handleCreatePlaylist = () => {
    hide();
    if (!song) return;
    useUiStore.getState().open('createPlaylist', { song });
  };

  const handleAddToExistingPlaylist = (playlistId: string) => {
    hide();
    if (!song) return;
    usePlaylistsStore.getState().addSongToPlaylist(playlistId, String(song.id));
  };

  const handleCopyInfo = () => {
    hide();
    if (!song) return;
    const text = `${song.name} - ${song.artist || 'JodiFy'}`;
    void navigator.clipboard.writeText(text);
    useToastStore.getState().show('Título copiado al portapapeles', 'info', 1600);
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
    if (!song) return;
    hide();
    const user = session?.username || 'local_user';
    if (isDownloaded) {
      await removeDownload(song.id, user);
    } else {
      await downloadSong(song, user);
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
    if (!song || !canManage) return;
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
          style={{ left: pos.x, top: pos.y }}
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="jf-context-menu-head">
            <p className="jf-context-menu-title">{song.name}</p>
            {song.artist && <span className="jf-context-menu-meta">{song.artist}</span>}
          </div>

          <MenuItem icon={<Play size={15} weight="fill" />} label="Reproducir ahora" onClick={handlePlay} testId="cm-play" />
          <MenuItem
            icon={<Sparkle size={15} weight="fill" className="is-accent-icon" />}
            label="Reproducir a continuación"
            onClick={handleQueuePriority}
            testId="cm-queue-priority"
          />
          <MenuItem icon={<Queue size={15} />} label="Agregar a la cola" onClick={handleQueue} testId="cm-queue" />

          <div className="jf-context-menu-sep" />

          {/* Opciones de Playlist */}
          <MenuItem
            icon={<FolderPlus size={15} weight="bold" />}
            label="Crear playlist con esta canción"
            onClick={handleCreatePlaylist}
            testId="cm-create-playlist"
          />

          {playlists.length > 0 && (
            <div
              className="jf-context-menu-submenu-wrapper"
              onMouseEnter={() => setShowPlaylistSubmenu(true)}
              onMouseLeave={() => setShowPlaylistSubmenu(false)}
            >
              <MenuItem
                icon={<Playlist size={15} />}
                label="Agregar a playlist…"
                onClick={() => setShowPlaylistSubmenu((v) => !v)}
                testId="cm-add-to-playlist"
                rightSlot={<CaretRight size={12} weight="bold" />}
              />
              <AnimatePresence>
                {showPlaylistSubmenu && (
                  <motion.div
                    className="jf-context-submenu"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.14 }}
                  >
                    <div className="jf-context-submenu-head">
                      <span>Tus playlists</span>
                    </div>
                    {playlists.map((pl) => (
                      <button
                        key={pl.id}
                        type="button"
                        className="jf-context-menu-item jf-context-submenu-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToExistingPlaylist(pl.id);
                        }}
                      >
                        <span className="jf-playlist-dot" style={{ background: pl.color }} />
                        <span className="jf-playlist-sub-name">{pl.name}</span>
                        {pl.songIds.includes(String(song.id)) && <span className="jf-playlist-sub-in">✓</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="jf-context-menu-sep" />

          <MenuItem icon={<Download size={15} />} label="Descargar archivo" onClick={handleDownloadToDevice} testId="cm-download" />
          <MenuItem icon={<Copy size={15} />} label="Copiar título y artista" onClick={handleCopyInfo} testId="cm-copy" />

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

          {canManage && (
            <>
              <div className="jf-context-menu-sep" />
              <MenuItem icon={<PencilSimple size={15} />} label="Editar información" onClick={handleEdit} testId="cm-edit" />
              <MenuItem icon={<Trash size={15} />} label="Eliminar canción" danger onClick={handleDelete} testId="cm-delete" />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}