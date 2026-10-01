import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CloudArrowDown,
  CheckCircle,
  WarningCircle,
  SpinnerGap,
  Trash,
} from '@phosphor-icons/react';
import { useDownloadsStore } from '../../store/downloads.store';
import { SongCover } from '../ui/SongCover';
import { formatDuration } from '../../lib/utils';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function DownloadsModal() {
  const tasks = useDownloadsStore((s) => s.tasks);
  const isModalOpen = useDownloadsStore((s) => s.isModalOpen);
  const closeModal = useDownloadsStore((s) => s.closeModal);
  const clearCompleted = useDownloadsStore((s) => s.clearCompleted);

  const taskList = useMemo(() => {
    return Object.values(tasks).sort((a, b) => b.startedAt - a.startedAt);
  }, [tasks]);

  const activeTasks = useMemo(() => {
    return taskList.filter((t) => t.status === 'downloading' || t.status === 'queued');
  }, [taskList]);

  const completedTasks = useMemo(() => {
    return taskList.filter((t) => t.status === 'completed');
  }, [taskList]);

  const errorTasks = useMemo(() => {
    return taskList.filter((t) => t.status === 'error');
  }, [taskList]);

  if (!isModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="jf-dl-modal-backdrop" onClick={closeModal}>
        <motion.div
          className="jf-dl-modal"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="jf-dl-modal-header">
            <div className="jf-dl-modal-title-group">
              <div className="jf-dl-modal-icon-badge">
                <CloudArrowDown size={22} weight="fill" />
              </div>
              <div>
                <h3 className="jf-dl-modal-title">Gestor de Descargas</h3>
                <p className="jf-dl-modal-subtitle">
                  {activeTasks.length > 0
                    ? `Descargando ${activeTasks.length} ${activeTasks.length === 1 ? 'canción' : 'canciones'} en segundo plano`
                    : 'Todas las descargas han finalizado'}
                </p>
              </div>
            </div>

            <div className="jf-dl-modal-actions">
              {completedTasks.length > 0 && (
                <button
                  type="button"
                  className="jf-dl-action-btn"
                  onClick={clearCompleted}
                  title="Limpiar completadas"
                >
                  <Trash size={14} />
                  <span>Limpiar</span>
                </button>
              )}
              <button
                type="button"
                className="jf-dl-close-btn"
                onClick={closeModal}
                title="Minimizar ventana (las descargas continuarán en segundo plano)"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
          </div>

          {/* Banner de Descargas Activas en Segundo Plano */}
          {activeTasks.length > 0 && (
            <div className="jf-dl-active-banner">
              <div className="jf-dl-spinner-pulse">
                <SpinnerGap size={18} weight="bold" className="jf-spin" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="jf-dl-banner-text">
                  Puedes cerrar esta ventana sin interrumpir las descargas. Podrás reabrirla desde el indicador en pantalla.
                </span>
              </div>
            </div>
          )}

          {/* Lista de Tareas de Descarga */}
          <div className="jf-dl-list">
            {taskList.length === 0 ? (
              <div className="jf-dl-empty">
                <CloudArrowDown size={44} weight="duotone" />
                <p className="jf-dl-empty-title">Sin descargas activas</p>
                <p className="jf-dl-empty-sub">
                  Haz clic en el botón de descarga en cualquier canción para guardarla y escucharla sin conexión.
                </p>
              </div>
            ) : (
              taskList.map((task) => (
                <div
                  key={task.id}
                  className={`jf-dl-item is-${task.status}`}
                  data-testid={`dl-item-${task.id}`}
                >
                  <div className="jf-dl-item-cover-wrap">
                    <SongCover song={task.song} alt="" className="jf-dl-item-cover" />
                    {task.status === 'downloading' && (
                      <span className="jf-dl-item-badge is-downloading">
                        <SpinnerGap size={12} weight="bold" className="jf-spin" />
                      </span>
                    )}
                    {task.status === 'completed' && (
                      <span className="jf-dl-item-badge is-completed">
                        <CheckCircle size={12} weight="fill" />
                      </span>
                    )}
                    {task.status === 'error' && (
                      <span className="jf-dl-item-badge is-error">
                        <WarningCircle size={12} weight="fill" />
                      </span>
                    )}
                  </div>

                  <div className="jf-dl-item-details">
                    <div className="jf-dl-item-head">
                      <span className="jf-dl-item-name" title={task.song.name}>
                        {task.song.name}
                      </span>
                      <span className={`jf-dl-item-percent is-${task.status}`}>
                        {task.status === 'completed'
                          ? 'Completado'
                          : task.status === 'error'
                          ? 'Error'
                          : `${task.progress}%`}
                      </span>
                    </div>

                    <div className="jf-dl-item-sub">
                      <span>{task.song.artist || 'Artista'}</span>
                      {task.bytesReceived > 0 && (
                        <span>
                          • {formatBytes(task.bytesReceived)}
                          {task.totalBytes > 0 ? ` / ${formatBytes(task.totalBytes)}` : ''}
                        </span>
                      )}
                      {task.song.duration && (
                        <span>• {formatDuration(task.song.duration)}</span>
                      )}
                    </div>

                    {/* Barra de Progreso REAL */}
                    <div className="jf-dl-progress-track">
                      <div
                        className={`jf-dl-progress-fill is-${task.status}`}
                        style={{ width: `${task.status === 'completed' ? 100 : task.progress}%` }}
                      />
                    </div>

                    {task.error && (
                      <span className="jf-dl-item-error-msg">{task.error}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Informativo */}
          <div className="jf-dl-modal-footer">
            <span className="jf-dl-footer-stats">
              {completedTasks.length} completadas • {activeTasks.length} en curso
              {errorTasks.length > 0 ? ` • ${errorTasks.length} con error` : ''}
            </span>
            <button
              type="button"
              className="jf-btn jf-btn--primary jf-btn--sm"
              onClick={closeModal}
            >
              Entendido
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
