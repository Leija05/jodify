import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowClockwise, Check, X } from '@phosphor-icons/react';
import type { DesktopUpdaterState } from '../../types/electron';

const EQ_BARS = [0, 1, 2, 3, 4];

export function DesktopUpdaterModal() {
  const updater = window.jodifyUpdater;
  const [open, setOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');
  const [state, setState] = useState<DesktopUpdaterState | null>(null);
  const promptedRef = useRef(false);

  useEffect(() => {
    if (!updater) return;
    const unsubscribe = updater.onEvent((payload) => {
      if (payload.type !== 'state' || !payload.state) return;
      setState(payload.state);
      if (!promptedRef.current && (payload.state.available || payload.state.downloaded)) {
        promptedRef.current = true;
        setOpen(true);
      }
    });
    void updater
      .getState()
      .then((info) => {
        setCurrentVersion(info.version);
        setState(info.state);
        if (!promptedRef.current && (info.state.available || info.state.downloaded)) {
          promptedRef.current = true;
          setOpen(true);
        }
      })
      .catch(() => undefined);
    return unsubscribe;
  }, [updater]);

  if (!updater) return null;

  const close = () => setOpen(false);
  const install = () => void updater.install();
  const checkAgain = () => void updater.check();

  const downloading = !!state?.available && !!state?.downloading && !state?.downloaded;
  const ready = !!state?.downloaded;
  const error = state?.error ?? null;
  const latest = state?.latestVersion ?? '';
  const percent = state?.percent ?? 0;
  const notes = state?.notes?.trim() ?? '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jf-update-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          role="presentation"
        >
          <motion.div
            className="jf-update-card"
            role="dialog"
            aria-modal="true"
            aria-label="Actualización de JodiFy"
            initial={{ opacity: 0, scale: 0.94, y: 22 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="jf-update-aura" aria-hidden="true" />
            <button className="jf-update-close" onClick={close} aria-label="Cerrar" title="Hacerlo después">
              <X size={17} weight="bold" />
            </button>

            <div className="jf-update-hero">
              <div className="jf-update-mark">
                <div className="jf-update-mark-glow" aria-hidden="true" />
                {ready ? (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                  >
                    <Check size={30} weight="bold" />
                  </motion.div>
                ) : (
                  <ArrowDown size={28} weight="bold" />
                )}
              </div>

              <div className="jf-update-eq" aria-hidden="true">
                {EQ_BARS.map((i) => (
                  <span
                    key={i}
                    className={`jf-update-eq-bar ${downloading ? 'jf-update-eq-bar--live' : ''}`}
                    style={{ animationDelay: `${i * 0.09}s` }}
                  />
                ))}
              </div>

              <p className="jf-update-eyebrow">{ready ? 'Actualización lista' : 'Nueva versión disponible'}</p>

              <div className="jf-update-versions">
                <span className="jf-update-chip jf-update-chip--old">{currentVersion ? `v${currentVersion}` : 'v…'}</span>
                <span className="jf-update-arrow" aria-hidden="true">
                  →
                </span>
                <span className="jf-update-chip jf-update-chip--new">{latest ? `v${latest}` : 'v…'}</span>
              </div>
            </div>

            <div className="jf-update-body">
              {notes ? (
                <div className="jf-update-notes">
                  <p className="jf-update-notes-title">Qué hay de nuevo</p>
                  <p className="jf-update-notes-text">{notes}</p>
                </div>
              ) : (
                <p className="jf-update-notes-text jf-update-notes-text--center">
                  {ready
                    ? 'La actualización ya se descargó. Reiniciá e instalá en un momento, sin salir de la app.'
                    : 'La nueva versión se está descargando en segundo plano. Podés seguir usando JodiFy.'}
                </p>
              )}

              {error && <p className="jf-update-error">{error}</p>}

              {downloading && (
                <div className="jf-update-progress">
                  <div className="jf-update-progress-track">
                    <div className="jf-update-progress-fill" style={{ width: `${Math.max(percent, 4)}%` }} />
                  </div>
                  <span className="jf-update-percent">{percent}%</span>
                </div>
              )}

              <div className="jf-update-actions">
                {ready || downloading ? (
                  <>
                    <button className="jf-update-btn jf-update-btn--primary" onClick={install} disabled={!ready}>
                      <ArrowDown size={16} weight="bold" />
                      {ready ? 'Instalar y reiniciar' : 'Descargando…'}
                    </button>
                    <button className="jf-update-btn jf-update-btn--ghost" onClick={close}>
                      Después
                    </button>
                  </>
                ) : error ? (
                  <>
                    <button className="jf-update-btn jf-update-btn--primary" onClick={checkAgain}>
                      <ArrowClockwise size={16} weight="bold" /> Reintentar
                    </button>
                    <button className="jf-update-btn jf-update-btn--ghost" onClick={close}>
                      Cerrar
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}