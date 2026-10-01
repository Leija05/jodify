import { useState, useMemo, useRef } from 'react';
import {
  DotsSixVertical,
  X,
  ListBullets,
  TrashSimple,
  Clock,
  Play,
  Plus,
  Sparkle,
  MusicNotes,
} from '@phosphor-icons/react';
import { Drawer } from '../ui/Drawer';
import { EmptyState } from '../ui/EmptyState';
import { useQueueStore } from '../../store/queue.store';
import { usePlayerStore } from '../../store/player.store';
import { useLibraryStore } from '../../store/library.store';
import { playSong } from '../../services/player.service';
import { useToastStore } from '../../store/toast.store';
import { songArtistMeta, formatDuration } from '../../lib/utils';
import { SongCover } from '../ui/SongCover';
import type { Song } from '../../lib/types';

export function QueueDrawer() {
  const items = useQueueStore((s) => s.items);
  const remove = useQueueStore((s) => s.remove);
  const clear = useQueueStore((s) => s.clear);
  const move = useQueueStore((s) => s.move);

  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const repeatMode = usePlayerStore((s) => s.repeatMode);

  const librarySongs = useLibraryStore((s) => s.songs);
  const currentTab = useLibraryStore((s) => s.currentTab);
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const likedIds = useLibraryStore((s) => s.likedIds);

  const [dragOver, setDragOver] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragOccurredRef = useRef(false);

  // Pool de la colección actual según la pestaña activa
  const pool = useMemo(() => {
    if (currentTab === 'downloads') {
      return librarySongs.filter((s) => downloadedIds.includes(s.id));
    }
    if (currentTab === 'personal') {
      return librarySongs.filter((s) => likedIds.includes(s.id));
    }
    return librarySongs;
  }, [librarySongs, currentTab, downloadedIds, likedIds]);

  // Canciones siguientes de la colección (excluyendo las que ya están en la cola manual prioritaria)
  const upcomingFromCollection = useMemo(() => {
    if (pool.length === 0) return [];
    const manualIds = new Set(items.map((x) => String(x.id)));
    const currentIdx = pool.findIndex((s) => String(s.id) === String(currentSong?.id));

    if (currentIdx === -1) {
      return pool.filter((s) => !manualIds.has(String(s.id)));
    }

    if (repeatMode === 'all') {
      const after = pool.slice(currentIdx + 1);
      const before = pool.slice(0, currentIdx);
      return [...after, ...before].filter((s) => !manualIds.has(String(s.id)));
    }

    return pool.slice(currentIdx + 1).filter((s) => !manualIds.has(String(s.id)));
  }, [pool, currentSong?.id, items, repeatMode]);

  const totalPrioritySeconds = items.reduce(
    (acc, s) => acc + (typeof s.duration === 'number' ? s.duration : 0),
    0,
  );

  const playFromQueue = async (index: number) => {
    const song = items[index];
    if (!song) return;
    await playSong(song);
    usePlayerStore.getState().setIsPlaying(true);
    remove(song.id);
  };

  const playDirectly = async (song: Song) => {
    await playSong(song);
    usePlayerStore.getState().setIsPlaying(true);
  };

  const totalUpcomingCount = items.length + upcomingFromCollection.length;

  return (
    <Drawer name="queue" title="Cola de reproducción">
      {/* 1. SECCIÓN: REPRODUCIENDO AHORA */}
      {currentSong ? (
        <div className="jf-queue-section jf-queue-now-playing">
          <div className="jf-queue-section-header">
            <span className="jf-queue-badge jf-queue-badge--live">
              <span className="jf-pulse-dot" /> Reproduciendo ahora
            </span>
          </div>
          <div className="jf-queue-now-card">
            <SongCover song={currentSong} alt="" className="jf-queue-now-cover" />
            <div className="jf-queue-now-meta">
              <p className="jf-queue-now-title">{currentSong.name}</p>
              <p className="jf-queue-now-artist">{songArtistMeta(currentSong) || currentSong.added_by || 'JodiFy'}</p>
              {typeof currentSong.duration === 'number' && currentSong.duration > 0 && (
                <span className="jf-queue-now-time">
                  <Clock size={11} /> {formatDuration(currentSong.duration)}
                </span>
              )}
            </div>
            {isPlaying && (
              <div className="jf-queue-eq-bars" aria-hidden="true">
                <span /><span /><span /><span />
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* 2. SECCIÓN: COLA PRIORITARIA (Añadidas manualmente por el usuario) */}
      <div className="jf-queue-section">
        <div className="jf-queue-section-header">
          <div className="jf-queue-header-left">
            <span className="jf-queue-badge jf-queue-badge--priority">
              <Sparkle size={12} weight="fill" /> A continuación (Prioridad)
            </span>
            <span className="jf-queue-count-pill">{items.length}</span>
          </div>
          {items.length > 0 && (
            <div className="jf-queue-header-actions">
              {totalPrioritySeconds > 0 && (
                <span className="jf-insight">
                  <Clock size={12} /> {formatDuration(totalPrioritySeconds)}
                </span>
              )}
              <button
                className="jf-queue-clear"
                onClick={() => {
                  clear();
                  useToastStore.getState().show('Cola prioritaria vaciada', 'info', 1500);
                }}
                title="Limpiar canciones prioritarias"
              >
                <TrashSimple size={13} /> Limpiar
              </button>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="jf-queue-empty-priority">
            <p className="jf-queue-empty-text">
              No tienes canciones en prioridad. Haz clic derecho en cualquier canción y selecciona{' '}
              <strong>"Añadir a la cola"</strong> para que suene de inmediato.
            </p>
          </div>
        ) : (
          <ul className="jf-queue-list">
            {items.map((song, index) => {
              const isItemDragging = draggingIndex === index;
              return (
                <li
                  key={`priority-${song.id}`}
                  className={`jf-queue-item jf-queue-item--priority ${isItemDragging ? 'is-dragging' : ''} ${dragOver === index ? 'is-drag-over' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    dragOccurredRef.current = true;
                    setDraggingIndex(index);
                    e.dataTransfer.setData('text/plain', String(index));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOver !== index) setDragOver(index);
                  }}
                  onDragLeave={() => setDragOver((cur) => (cur === index ? null : cur))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const textData = e.dataTransfer.getData('text/plain');
                    const customData = e.dataTransfer.getData('application/json');
                    setDragOver(null);
                    setDraggingIndex(null);

                    if (customData) {
                      try {
                        const parsed = JSON.parse(customData);
                        if (parsed.type === 'upcoming' && parsed.song) {
                          const songToInsert = parsed.song;
                          const currentItems = useQueueStore.getState().items;
                          const existsIdx = currentItems.findIndex((x) => String(x.id) === String(songToInsert.id));
                          if (existsIdx !== -1) {
                            move(existsIdx, index);
                          } else {
                            useQueueStore.getState().add(songToInsert);
                            setTimeout(() => {
                              const fresh = useQueueStore.getState().items;
                              const newIdx = fresh.findIndex((x) => String(x.id) === String(songToInsert.id));
                              if (newIdx !== -1 && newIdx !== index) {
                                move(newIdx, index);
                              }
                            }, 40);
                          }
                          useToastStore.getState().show(`«${songToInsert.name}» colocada a continuación`, 'success', 1500);
                          return;
                        }
                      } catch {
                        // ignore
                      }
                    }

                    const from = Number(textData);
                    if (!Number.isNaN(from) && from !== index) {
                      move(from, index);
                      useToastStore.getState().show('Orden de la cola actualizado', 'success', 1200);
                    }
                    setTimeout(() => {
                      dragOccurredRef.current = false;
                    }, 120);
                  }}
                  onDragEnd={() => {
                    setDragOver(null);
                    setDraggingIndex(null);
                    setTimeout(() => {
                      dragOccurredRef.current = false;
                    }, 120);
                  }}
                  onClick={() => {
                    if (dragOccurredRef.current) return;
                    void playFromQueue(index);
                  }}
                  title="Mantén pulsado click izquierdo y arrastra para mover de posición o poner arriba de otra"
                  data-testid={`queue-item-${song.id}`}
                >
                  {dragOver === index && <span className="jf-queue-drop-line" aria-hidden="true" />}
                  <span className="jf-queue-grip" aria-hidden="true" title="Arrastrar para reordenar">
                    <DotsSixVertical size={16} weight="bold" />
                  </span>
                  <SongCover song={song} alt="" className="jf-queue-cover" />
                  <div className="jf-queue-info">
                    <p className="jf-queue-name">{song.name}</p>
                    <p className="jf-queue-meta">{songArtistMeta(song) || song.added_by || 'JodiFy'}</p>
                  </div>
                  {typeof song.duration === 'number' && song.duration > 0 && (
                    <span className="jf-queue-duration">{formatDuration(song.duration)}</span>
                  )}
                  <button
                    className="jf-queue-remove"
                    aria-label={`Quitar ${song.name} de la cola`}
                    title="Quitar de prioridad"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(song.id);
                      useToastStore.getState().show('Quitado de la cola', 'info', 1500);
                    }}
                  >
                    <X size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 3. SECCIÓN: SIGUIENTE EN TU LISTA / COLECCIÓN */}
      <div className="jf-queue-section">
        <div className="jf-queue-section-header">
          <div className="jf-queue-header-left">
            <span className="jf-queue-badge">
              <ListBullets size={13} /> Siguiente de tu lista
            </span>
            <span className="jf-queue-count-pill">{upcomingFromCollection.length}</span>
          </div>
          {repeatMode === 'all' && (
            <span className="jf-queue-loop-tag">En bucle</span>
          )}
        </div>

        {upcomingFromCollection.length === 0 ? (
          <EmptyState
            icon={MusicNotes}
            title="Final de la lista"
            description="No hay más canciones siguientes en esta lista. Activa Repetir colección o agrega más temas."
          />
        ) : (
          <ul className="jf-queue-list">
            {upcomingFromCollection.map((song, i) => (
              <li
                key={`upcoming-${song.id}-${i}`}
                className="jf-queue-item jf-queue-item--upcoming"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({ type: 'upcoming', song }));
                  e.dataTransfer.effectAllowed = 'copyMove';
                }}
                onClick={() => void playDirectly(song)}
                title="Haz clic para reproducir, o arrastra hacia arriba para colocarla en la cola prioritaria"
              >
                <span className="jf-queue-index">{i + 1}</span>
                <SongCover song={song} alt="" className="jf-queue-cover" />
                <div className="jf-queue-info">
                  <p className="jf-queue-name">{song.name}</p>
                  <p className="jf-queue-meta">{songArtistMeta(song) || song.added_by || 'JodiFy'}</p>
                </div>
                {typeof song.duration === 'number' && song.duration > 0 && (
                  <span className="jf-queue-duration">{formatDuration(song.duration)}</span>
                )}
                <div className="jf-queue-item-actions">
                  <button
                    className="jf-queue-action-btn"
                    title="Mover a continuación directa (arriba del todo)"
                    onClick={(e) => {
                      e.stopPropagation();
                      useQueueStore.getState().addPriority(song);
                      useToastStore.getState().show(`"${song.name}" se reproducirá a continuación`, 'success', 1600);
                    }}
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    className="jf-queue-action-btn jf-queue-action-btn--play"
                    title="Reproducir ahora"
                    onClick={(e) => {
                      e.stopPropagation();
                      void playDirectly(song);
                    }}
                  >
                    <Play size={13} weight="fill" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalUpcomingCount > 0 && (
        <div className="jf-queue-footer-summary">
          <span>Total en cola: <strong>{totalUpcomingCount}</strong> canciones</span>
        </div>
      )}
    </Drawer>
  );
}
