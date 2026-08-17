import { DotsSixVertical, X, ListBullets, TrashSimple, Clock } from '@phosphor-icons/react';
import { Drawer } from '../ui/Drawer';
import { EmptyState } from '../ui/EmptyState';
import { useQueueStore } from '../../store/queue.store';
import { usePlayerStore } from '../../store/player.store';
import { playSong } from '../../services/player.service';
import { useToastStore } from '../../store/toast.store';
import { songArtistMeta, formatDuration } from '../../lib/utils';
import { SongCover } from '../ui/SongCover';
import { useState } from 'react';

export function QueueDrawer() {
  const items = useQueueStore((s) => s.items);
  const remove = useQueueStore((s) => s.remove);
  const clear = useQueueStore((s) => s.clear);
  const move = useQueueStore((s) => s.move);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const totalSeconds = items.reduce((acc, s) => acc + (typeof s.duration === 'number' ? s.duration : 0), 0);

  const playFromQueue = async (index: number) => {
    const song = items[index];
    if (!song) return;
    await playSong(song);
    usePlayerStore.getState().setIsPlaying(true);
    remove(song.id);
  };

  return (
    <Drawer name="queue" title="Cola de reproducción">
      {items.length === 0 ? (
        <EmptyState
          icon={ListBullets}
          title="Cola vacía"
          description="Agrega canciones desde la biblioteca para encolarlas aquí."
        />
      ) : (
        <>
          <div className="jf-queue-tools">
            <span className="jf-insight">
              <ListBullets size={13} /> {items.length} {items.length === 1 ? 'canción' : 'canciones'}
            </span>
            {totalSeconds > 0 && (
              <span className="jf-insight">
                <Clock size={12} /> {formatDuration(totalSeconds)}
              </span>
            )}
            <button
              className="jf-queue-clear"
              onClick={() => {
                clear();
                useToastStore.getState().show('Cola limpiada', 'info', 1500);
              }}
            >
              <TrashSimple size={14} /> Limpiar
            </button>
          </div>
          <ul className="jf-queue-list">
          {items.map((song, index) => {
            const isCurrent = String(currentSong?.id) === String(song.id);
            return (
              <li
                key={song.id}
                className={`jf-queue-item ${isCurrent ? 'is-current' : ''}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', String(index));
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(index);
                }}
                onDragLeave={() => setDragOver((cur) => (cur === index ? null : cur))}
                onDrop={(e) => {
                  const from = Number(e.dataTransfer.getData('text/plain'));
                  setDragOver(null);
                  if (!Number.isNaN(from) && from !== index) move(from, index);
                }}
                onDragEnd={() => setDragOver(null)}
                onClick={() => void playFromQueue(index)}
                data-testid={`queue-item-${song.id}`}
              >
                {dragOver === index && <span className="jf-queue-drop-line" aria-hidden="true" />}
                <span className="jf-queue-grip" aria-hidden="true">
                  <DotsSixVertical size={14} />
                </span>
                <SongCover song={song} alt="" className="jf-queue-cover" />
                <div className="jf-queue-info">
                  <p className="jf-queue-name">{song.name}</p>
                  <p className="jf-queue-meta">{songArtistMeta(song) || song.added_by || 'JodiFy'}</p>
                </div>
                <button
                  className="jf-queue-remove"
                  aria-label={`Quitar ${song.name} de la cola`}
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
        </>
      )}
    </Drawer>
  );
}
