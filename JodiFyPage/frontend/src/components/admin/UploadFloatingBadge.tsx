import { AnimatePresence, motion } from 'motion/react';
import { CloudArrowUp, CheckCircle, SpinnerGap, ArrowSquareOut, X } from '@phosphor-icons/react';
import { useUploadStore } from '../../store/upload.store';

export function UploadFloatingBadge() {
  const { tasks, isUploading, isModalOpen, hasFinishedNotice, openModal, dismissNotice } = useUploadStore();

  const total = tasks.length;
  if (total === 0 || isModalOpen) return null;

  const completed = tasks.filter((t) => t.status === 'success').length;
  const currentTask = tasks.find((t) => t.status === 'uploading' || t.status === 'extracting' || t.status === 'pending');
  const overallPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Si no está subiendo y tampoco hay aviso de fin, no mostrar
  if (!isUploading && !hasFinishedNotice) return null;

  return (
    <AnimatePresence>
      <motion.aside
        className="jf-upload-dock-badge"
        initial={{ opacity: 0, y: 30, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={openModal}
        role="button"
        tabIndex={0}
        aria-label="Abrir detalles de subida de canciones"
      >
        <div className="jf-upload-dock-glow" />
        <div className="jf-upload-dock-icon">
          {isUploading ? (
            <div className="jf-upload-dock-spinner-wrap">
              <SpinnerGap size={24} weight="bold" className="jf-spin" />
              <CloudArrowUp size={14} weight="fill" className="jf-upload-dock-cloud-center" />
            </div>
          ) : (
            <CheckCircle size={26} weight="fill" className="is-success-icon" />
          )}
        </div>

        <div className="jf-upload-dock-content">
          <div className="jf-upload-dock-row">
            <span className="jf-upload-dock-title">
              {isUploading ? 'Subiendo a la base de datos…' : '¡Canciones guardadas en DB!'}
            </span>
            <span className="jf-upload-dock-counter">
              {completed}/{total} {isUploading && `(${overallPercent}%)`}
            </span>
          </div>

          <p className="jf-upload-dock-subtitle">
            {isUploading
              ? currentTask
                ? currentTask.name
                : 'Procesando archivos…'
              : `${completed} canción(es) agregada(s) con éxito`}
          </p>

          {isUploading && (
            <div className="jf-upload-dock-progress-track">
              <div
                className="jf-upload-dock-progress-bar"
                style={{ width: `${Math.max(5, overallPercent)}%` }}
              />
            </div>
          )}
        </div>

        <div className="jf-upload-dock-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="jf-upload-dock-btn"
            onClick={openModal}
            title="Ver ventana detallada de subida"
          >
            <ArrowSquareOut size={16} weight="bold" />
          </button>
          {!isUploading && hasFinishedNotice && (
            <button
              type="button"
              className="jf-upload-dock-btn"
              onClick={dismissNotice}
              title="Cerrar notificación"
            >
              <X size={15} weight="bold" />
            </button>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
