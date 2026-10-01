import { AnimatePresence, motion } from 'motion/react';
import {
  CloudSlash,
  ArrowClockwise,
  SpinnerGap,
  CaretDown,
  ArrowsOutSimple,
  MusicNotes,
} from '@phosphor-icons/react';
import { useBackendStore } from '../../store/backend.store';
import { useLibraryStore } from '../../store/library.store';
import { useSession } from '../../context/SessionContext';

export function BackendStatusBanner() {
  const status = useBackendStore((s) => s.status);
  const isWaking = useBackendStore((s) => s.isWaking);
  const countdown = useBackendStore((s) => s.countdown);
  const retrying = useBackendStore((s) => s.retrying);
  const retryAttempts = useBackendStore((s) => s.retryAttempts);
  const dismissed = useBackendStore((s) => s.dismissed);
  const checkNow = useBackendStore((s) => s.checkNow);
  const setDismissed = useBackendStore((s) => s.setDismissed);
  const toggleDismissed = useBackendStore((s) => s.toggleDismissed);

  const { session } = useSession();
  const currentTab = useLibraryStore((s) => s.currentTab);
  const setCurrentTab = useLibraryStore((s) => s.setCurrentTab);

  if (status !== 'offline') {
    return null;
  }

  const handleOfflineMode = () => {
    setCurrentTab('downloads');
    setDismissed(true);
  };

  return (
    <AnimatePresence initial={false}>
      {dismissed ? (
        <motion.div
          key="pill"
          className="jf-backend-pill"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          role="status"
          aria-live="polite"
        >
          <div className="jf-backend-pill-pulse" />
          <span className="jf-backend-pill-text">
            {isWaking ? 'Servidor iniciando…' : 'Backend inactivo'} ·{' '}
            {retrying ? 'Comprobando…' : `Reintento en ${countdown}s`}
          </span>

          <button
            type="button"
            className="jf-backend-pill-btn"
            onClick={() => void checkNow(true)}
            disabled={retrying}
            title="Reintentar conexión ahora"
          >
            <ArrowClockwise size={13} className={retrying ? 'jf-spin' : ''} />
            <span>Reintentar</span>
          </button>

          <button
            type="button"
            className="jf-backend-pill-expand"
            onClick={toggleDismissed}
            title="Expandir información"
            aria-label="Expandir aviso de servidor"
          >
            <ArrowsOutSimple size={13} />
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="card"
          className="jf-backend-banner"
          initial={{ opacity: 0, y: -24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          role="alert"
          aria-live="assertive"
        >
          <div className="jf-backend-banner-glow" />

          {/* Icono de radar / desconexión */}
          <div className="jf-backend-banner-icon-wrap">
            <CloudSlash size={24} weight="duotone" className="jf-backend-banner-icon" />
            <span className="jf-backend-radar-ring" />
          </div>

          {/* Información */}
          <div className="jf-backend-banner-content">
            <div className="jf-backend-banner-heading">
              <h4 className="jf-backend-banner-title">
                {isWaking ? 'Iniciando servidor de JodiFy' : 'Servidor backend no disponible'}
              </h4>
              <span className="jf-backend-badge">
                {retrying ? (
                  <>
                    <SpinnerGap size={12} className="jf-spin" />
                    <span>Comprobando enlace…</span>
                  </>
                ) : (
                  <>
                    <span className="jf-backend-badge-dot" />
                    <span>Reconectando en {countdown}s</span>
                  </>
                )}
              </span>
            </div>

            <p className="jf-backend-banner-desc">
              {isWaking
                ? 'El backend gratuito en Render está saliendo del modo reposo (cold-start). Reconectará automáticamente sin reiniciar la app.'
                : 'No se puede establecer conexión con el backend. La app reconectará en tiempo real en cuanto el servicio esté encendido.'}
              {retryAttempts > 1 && (
                <span className="jf-backend-attempts"> (Intento #{retryAttempts})</span>
              )}
            </p>

            {/* Botones de acción */}
            <div className="jf-backend-banner-actions">
              <button
                type="button"
                className="jf-btn jf-btn--primary jf-btn--sm jf-backend-btn-retry"
                onClick={() => void checkNow(true)}
                disabled={retrying}
              >
                <ArrowClockwise size={15} className={retrying ? 'jf-spin' : ''} />
                <span>{retrying ? 'Comprobando…' : 'Reintentar ahora'}</span>
              </button>

              {session && currentTab !== 'downloads' && (
                <button
                  type="button"
                  className="jf-btn jf-btn--glass jf-btn--sm"
                  onClick={handleOfflineMode}
                  title="Escuchar canciones descargadas en este equipo"
                >
                  <MusicNotes size={15} />
                  <span>Modo offline</span>
                </button>
              )}

              <button
                type="button"
                className="jf-backend-banner-minimize"
                onClick={toggleDismissed}
                title="Minimizar aviso"
                aria-label="Minimizar aviso"
              >
                <CaretDown size={16} />
                <span>Minimizar</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
