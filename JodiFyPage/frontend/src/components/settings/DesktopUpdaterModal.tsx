import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowClockwise,
  X,
  RocketLaunch,
  Sparkle,
  ShieldCheck,
  Lightning,
  Cpu,
} from '@phosphor-icons/react';
import type { DesktopUpdaterState } from '../../types/electron';

const EQ_BARS = [0, 1, 2, 3, 4, 5, 6];

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
          transition={{ duration: 0.25 }}
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
            initial={{ opacity: 0, scale: 0.92, y: 26 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Auras y luces de fondo dinámicas */}
            <div className="jf-update-aura" aria-hidden="true" />
            <div className="jf-update-neon-ring" aria-hidden="true" />

            <button
              className="jf-update-close"
              onClick={close}
              aria-label="Cerrar"
              title="Hacerlo después"
            >
              <X size={17} weight="bold" />
            </button>

            <div className="jf-update-hero">
              {/* Emblema holográfico animado */}
              <div className="jf-update-mark-wrapper">
                <div className="jf-update-mark-glow" aria-hidden="true" />
                <motion.div
                  className="jf-update-mark"
                  animate={ready ? { rotate: [0, -5, 5, 0] } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {ready ? (
                    <RocketLaunch size={34} weight="fill" />
                  ) : downloading ? (
                    <ArrowDown size={30} weight="bold" className="jf-bounce" />
                  ) : (
                    <Sparkle size={32} weight="fill" />
                  )}
                </motion.div>
              </div>

              {/* Ecualizador dinámico en miniatura */}
              <div className="jf-update-eq" aria-hidden="true">
                {EQ_BARS.map((i) => (
                  <span
                    key={i}
                    className={`jf-update-eq-bar ${
                      downloading || ready ? 'jf-update-eq-bar--live' : ''
                    }`}
                    style={{ animationDelay: `${i * 0.08}s` }}
                  />
                ))}
              </div>

              <div className="jf-update-header-text">
                <div className="jf-update-status-pill">
                  <span className={`jf-update-status-dot ${ready ? 'is-ready' : 'is-active'}`} />
                  <span className="jf-update-status-label">
                    {ready
                      ? 'Actualización Lista para Instalar'
                      : downloading
                      ? `Descargando Nueva Versión (${percent}%)`
                      : 'Nueva Versión Oficial Disponible'}
                  </span>
                </div>

                <h2 className="jf-update-title">JodiFy Desktop Update</h2>
              </div>

              {/* Comparador de versiones con chips estilo Neón */}
              <div className="jf-update-versions">
                <div className="jf-version-box jf-version-box--old">
                  <span className="jf-version-label">Instalada</span>
                  <span className="jf-version-number">
                    {currentVersion ? `v${currentVersion}` : 'v…'}
                  </span>
                </div>

                <div className="jf-update-version-arrow" aria-hidden="true">
                  <Lightning size={16} weight="fill" />
                </div>

                <div className="jf-version-box jf-version-box--new">
                  <span className="jf-version-label">Disponible</span>
                  <span className="jf-version-number">{latest ? `v${latest}` : 'v…'}</span>
                </div>
              </div>
            </div>

            <div className="jf-update-body">
              {/* Tarjetas de aspectos destacados de la actualización */}
              <div className="jf-update-highlights">
                <div className="jf-highlight-item">
                  <div className="jf-highlight-icon jf-hi-cyan">
                    <Lightning size={16} weight="bold" />
                  </div>
                  <div>
                    <h4 className="jf-highlight-title">Audio en 2do Plano Continuo</h4>
                    <p className="jf-highlight-desc">
                      Reproducción ininterrumpida al minimizar la app o cambiar de ventana.
                    </p>
                  </div>
                </div>

                <div className="jf-highlight-item">
                  <div className="jf-highlight-icon jf-hi-purple">
                    <Sparkle size={16} weight="fill" />
                  </div>
                  <div>
                    <h4 className="jf-highlight-title">DJ Scratching & Audio FX Lab</h4>
                    <p className="jf-highlight-desc">
                      Audio 8D envolvente, filtro vinilo Lo-Fi, sub-bass 320k y scratch táctil.
                    </p>
                  </div>
                </div>

                <div className="jf-highlight-item">
                  <div className="jf-highlight-icon jf-hi-green">
                    <ShieldCheck size={16} weight="bold" />
                  </div>
                  <div>
                    <h4 className="jf-highlight-title">Buscador y Cola Interactiva</h4>
                    <p className="jf-highlight-desc">
                      Arrastra y reordena la cola con un clic y explora enlaces sin bloqueos.
                    </p>
                  </div>
                </div>
              </div>

              {/* Registro de cambios del desarrollador si está disponible */}
              {notes && (
                <div className="jf-update-notes">
                  <div className="jf-update-notes-head">
                    <Cpu size={14} weight="bold" />
                    <span>Notas de la versión</span>
                  </div>
                  <div className="jf-update-notes-text">{notes}</div>
                </div>
              )}

              {error && <p className="jf-update-error">{error}</p>}

              {/* Barra de progreso de descarga futurista */}
              {downloading && (
                <div className="jf-update-progress-block">
                  <div className="jf-update-progress-labels">
                    <span className="jf-progress-status-text">Descargando archivos…</span>
                    <span className="jf-update-percent">{percent}%</span>
                  </div>
                  <div className="jf-update-progress-track">
                    <div
                      className="jf-update-progress-fill"
                      style={{ width: `${Math.max(percent, 5)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Botones de acción principales */}
              <div className="jf-update-actions">
                {ready || downloading ? (
                  <>
                    <button
                      className={`jf-update-btn jf-update-btn--primary ${ready ? 'is-ready-pulse' : ''}`}
                      onClick={install}
                      disabled={!ready}
                    >
                      {ready ? (
                        <>
                          <RocketLaunch size={18} weight="fill" />
                          Instalar y Reiniciar Ahora
                        </>
                      ) : (
                        <>
                          <ArrowDown size={18} weight="bold" />
                          Descargando en segundo plano…
                        </>
                      )}
                    </button>
                    <button className="jf-update-btn jf-update-btn--ghost" onClick={close}>
                      Hacerlo después
                    </button>
                  </>
                ) : error ? (
                  <>
                    <button
                      className="jf-update-btn jf-update-btn--primary"
                      onClick={checkAgain}
                    >
                      <ArrowClockwise size={17} weight="bold" /> Reintentar comprobación
                    </button>
                    <button className="jf-update-btn jf-update-btn--ghost" onClick={close}>
                      Cerrar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="jf-update-btn jf-update-btn--primary"
                      onClick={checkAgain}
                    >
                      <ArrowDown size={17} weight="bold" /> Descargar Actualización
                    </button>
                    <button className="jf-update-btn jf-update-btn--ghost" onClick={close}>
                      Posponer
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}