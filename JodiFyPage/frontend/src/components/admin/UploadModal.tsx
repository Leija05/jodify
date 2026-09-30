import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Warning,
  XCircle,
  MusicNotes,
  ArrowClockwise,
  Minus,
  Sparkle,
  Trash,
  Database,
  CloudArrowUp,
  X,
} from '@phosphor-icons/react';
import { useUploadStore } from '../../store/upload.store';
import { useUiStore } from '../../store/ui.store';
import { useSession } from '../../context/SessionContext';

export function UploadModal() {
  const ui = useUiStore();
  const { session } = useSession();
  const { tasks, isUploading, isModalOpen, openModal, closeModal, clearCompleted, retryTask, enqueueFiles } =
    useUploadStore();

  const payload = ui.modalPayload as { items?: Array<{ file: File }> } | undefined;

  // Si ui.open('upload', { items }) fue invocado desde PlaylistPanel u otro sitio
  useEffect(() => {
    if (ui.modal === 'upload') {
      if (payload?.items && payload.items.length > 0) {
        const files = payload.items.map((i) => i.file).filter(Boolean);
        enqueueFiles(files, session?.username ?? '');
      } else {
        openModal();
      }
      ui.close('upload');
    }
  }, [ui.modal, payload, enqueueFiles, openModal, ui, session]);

  if (!isModalOpen) return null;

  const total = tasks.length;
  const successCount = tasks.filter((t) => t.status === 'success').length;
  const errorCount = tasks.filter((t) => t.status === 'error' || t.status === 'duplicate').length;
  const inProgressCount = tasks.filter(
    (t) => t.status === 'uploading' || t.status === 'extracting' || t.status === 'pending',
  ).length;

  const overallPercent = total > 0 ? Math.round((successCount / total) * 100) : 0;

  return (
    <div className="jf-modal-backdrop" onClick={closeModal}>
      <motion.div
        className="jf-modal jf-upload-modal"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(580px, 94vw)' }}
      >
        {/* Encabezado con estado e insignia */}
        <div className="jf-modal-header jf-upload-modal-header">
          <div className="jf-upload-title-box">
            <div className="jf-upload-icon-badge">
              <Database size={20} weight="fill" />
            </div>
            <div>
              <h2 className="jf-modal-title">Subida a la Base de Datos</h2>
              <p className="jf-upload-subtitle">
                {isUploading
                  ? `Guardando canciones en MongoDB GridFS (${inProgressCount} restante${inProgressCount === 1 ? '' : 's'})`
                  : total === 0
                    ? 'No hay canciones en cola'
                    : 'Todas las operaciones han finalizado'}
              </p>
            </div>
          </div>

          <div className="jf-upload-header-controls">
            <button
              type="button"
              className="jf-upload-header-btn"
              onClick={closeModal}
              title="Minimizar (la subida continuará en segundo plano)"
            >
              <Minus size={18} weight="bold" />
            </button>
            <button
              type="button"
              className="jf-upload-header-btn jf-upload-header-btn--close"
              onClick={closeModal}
              title="Cerrar ventana"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        {/* Resumen de métricas y barra general */}
        <div className="jf-upload-overview">
          <div className="jf-upload-metrics">
            <div className="jf-upload-metric jf-upload-metric--total">
              <span className="jf-upload-metric-label">Total</span>
              <span className="jf-upload-metric-val">{total}</span>
            </div>
            <div className="jf-upload-metric jf-upload-metric--in-progress">
              <span className="jf-upload-metric-label">En proceso</span>
              <span className="jf-upload-metric-val">
                {isUploading && <span className="jf-upload-pulse-dot" />}
                {inProgressCount}
              </span>
            </div>
            <div className="jf-upload-metric jf-upload-metric--success">
              <span className="jf-upload-metric-label">Guardadas</span>
              <span className="jf-upload-metric-val">✓ {successCount}</span>
            </div>
            {errorCount > 0 && (
              <div className="jf-upload-metric jf-upload-metric--error">
                <span className="jf-upload-metric-label">Incidencias</span>
                <span className="jf-upload-metric-val">✕ {errorCount}</span>
              </div>
            )}
          </div>

          {total > 0 && (
            <div className="jf-upload-overall-bar">
              <div className="jf-upload-bar-info">
                <span>Progreso total ({overallPercent}%)</span>
                <span>
                  {successCount} de {total} completadas
                </span>
              </div>
              <div className="jf-upload-track">
                <motion.div
                  className="jf-upload-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Lista de canciones con detalles, animación y carátula */}
        <div className="jf-upload-body">
          {tasks.length === 0 ? (
            <div className="jf-upload-empty">
              <CloudArrowUp size={44} weight="duotone" className="jf-upload-empty-icon" />
              <p className="jf-upload-empty-text">Arrastra canciones o selecciónalas para subirlas a la base de datos.</p>
            </div>
          ) : (
            <ul className="jf-upload-list">
              <AnimatePresence initial={false}>
                {tasks.map((task) => (
                  <motion.li
                    key={task.id}
                    className={`jf-upload-item jf-upload-item--${task.status}`}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Portada extraída o placeholder */}
                    <div className="jf-upload-cover-wrap">
                      {task.coverUrl ? (
                        <img className="jf-upload-cover" src={task.coverUrl} alt="" />
                      ) : (
                        <div className="jf-upload-cover jf-upload-cover--placeholder">
                          <MusicNotes size={20} weight="duotone" />
                        </div>
                      )}
                      {task.status === 'uploading' && (
                        <div className="jf-upload-cover-overlay">
                          <span className="jf-upload-cover-pulse" />
                        </div>
                      )}
                    </div>

                    {/* Información y progreso de la canción */}
                    <div className="jf-upload-info">
                      <div className="jf-upload-info-head">
                        <span className="jf-upload-name" title={task.name}>
                          {task.name}
                        </span>
                        {task.status === 'success' && (
                          <span className="jf-upload-badge jf-upload-badge--success">
                            <Check size={12} weight="bold" /> Guardado
                          </span>
                        )}
                        {task.status === 'uploading' && (
                          <span className="jf-upload-badge jf-upload-badge--uploading">
                            <Sparkle size={12} weight="fill" className="jf-spin" /> Subiendo…
                          </span>
                        )}
                        {task.status === 'extracting' && (
                          <span className="jf-upload-badge jf-upload-badge--extracting">Leyendo ID3…</span>
                        )}
                        {task.status === 'duplicate' && (
                          <span className="jf-upload-badge jf-upload-badge--duplicate">
                            <Warning size={12} weight="bold" /> Duplicada
                          </span>
                        )}
                        {task.status === 'error' && (
                          <span className="jf-upload-badge jf-upload-badge--error">
                            <XCircle size={12} weight="bold" /> Error
                          </span>
                        )}
                      </div>

                      <div className="jf-upload-meta-row">
                        {task.artist && <span className="jf-upload-artist">{task.artist}</span>}
                        {task.album && <span className="jf-upload-album"> · {task.album}</span>}
                      </div>

                      {/* Progreso fluido */}
                      {(task.status === 'uploading' || task.status === 'extracting' || task.status === 'pending') && (
                        <div className="jf-upload-item-track">
                          <div
                            className="jf-upload-item-bar"
                            style={{ width: `${Math.max(8, task.progress)}%` }}
                          />
                        </div>
                      )}

                      {/* Errores con opción de reintentar */}
                      {(task.status === 'error' || task.status === 'duplicate') && (
                        <div className="jf-upload-error-detail">
                          <span>{task.error}</span>
                          {task.status === 'error' && (
                            <button
                              type="button"
                              className="jf-upload-retry-btn"
                              onClick={() => retryTask(task.id, session?.username ?? '')}
                              title="Reintentar subida"
                            >
                              <ArrowClockwise size={13} weight="bold" /> Reintentar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {/* Pie de modal */}
        <div className="jf-modal-footer jf-upload-modal-footer">
          <div className="jf-upload-footer-left">
            {successCount > 0 && (
              <button
                type="button"
                className="jf-upload-clear-btn"
                onClick={clearCompleted}
                title="Quitar las canciones ya subidas de la lista"
              >
                <Trash size={14} /> Limpiar completadas
              </button>
            )}
          </div>

          <div className="jf-upload-footer-actions">
            <button
              type="button"
              className="jf-btn jf-btn--secondary"
              onClick={closeModal}
              title="Continuar escuchando música mientras se sube"
            >
              {isUploading ? 'Minimizar a segundo plano' : 'Cerrar'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
