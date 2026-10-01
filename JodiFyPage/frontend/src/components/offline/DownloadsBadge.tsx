import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SpinnerGap } from '@phosphor-icons/react';
import { useDownloadsStore } from '../../store/downloads.store';

export function DownloadsBadge() {
  const tasks = useDownloadsStore((s) => s.tasks);
  const isModalOpen = useDownloadsStore((s) => s.isModalOpen);
  const openModal = useDownloadsStore((s) => s.openModal);

  const activeTasks = useMemo(() => {
    return Object.values(tasks).filter((t) => t.status === 'downloading' || t.status === 'queued');
  }, [tasks]);

  const avgProgress = useMemo(() => {
    if (activeTasks.length === 0) return 0;
    const total = activeTasks.reduce((acc, t) => acc + t.progress, 0);
    return Math.round(total / activeTasks.length);
  }, [activeTasks]);

  // Si no hay descargas activas o si el modal ya está abierto, no mostrar el widget flotante
  if (activeTasks.length === 0 || isModalOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="jf-dl-floating-badge"
        initial={{ opacity: 0, y: 20, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.85 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={openModal}
        role="button"
        tabIndex={0}
        title="Descargas activas en curso. Haz clic para ver el progreso detallado."
      >
        <div className="jf-dl-badge-icon">
          <SpinnerGap size={18} weight="bold" className="jf-spin" />
        </div>
        <div className="jf-dl-badge-info">
          <span className="jf-dl-badge-title">
            Descargando {activeTasks.length} {activeTasks.length === 1 ? 'canción' : 'canciones'}
          </span>
          <span className="jf-dl-badge-percent">{avgProgress}% completado</span>
        </div>
        <div className="jf-dl-badge-mini-bar">
          <div className="jf-dl-badge-mini-fill" style={{ width: `${avgProgress}%` }} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
