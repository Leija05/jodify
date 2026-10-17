import { useEffect, useMemo, useRef, useState } from 'react';
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
  CaretDown,
  CaretUp,
  MusicNotes,
} from '@phosphor-icons/react';
import type { DesktopUpdaterState } from '../../types/electron';
import {
  extractDesktopUpdateHighlights,
  type UpdateHighlightItem,
} from '../../lib/updateNotesParser';

const EQ_BARS = [0, 1, 2, 3, 4, 5, 6, 7];

export function DesktopUpdaterModal() {
  const updater = typeof window !== 'undefined' ? window.jodifyUpdater : undefined;
  const [open, setOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');
  const [state, setState] = useState<DesktopUpdaterState | null>(null);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const promptedRef = useRef(false);

  useEffect(() => {
    // Escucha de evento manual o dev para inspección y testing
    const handleManualOpen = (e: Event) => {
      const customEvent = e as CustomEvent<DesktopUpdaterState | undefined>;
      if (customEvent.detail) {
        setState(customEvent.detail);
      }
      setOpen(true);
    };

    window.addEventListener('jodify:open-desktop-updater', handleManualOpen);

    if (!updater) {
      return () => {
        window.removeEventListener('jodify:open-desktop-updater', handleManualOpen);
      };
    }

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

    return () => {
      unsubscribe?.();
      window.removeEventListener('jodify:open-desktop-updater', handleManualOpen);
    };
  }, [updater]);

  const close = () => setOpen(false);
  const install = () => void updater?.install();
  const checkAgain = () => void updater?.check();

  const downloading = !!state?.available && !!state?.downloading && !state?.downloaded;
  const ready = !!state?.downloaded;
  const error = state?.error ?? null;
  const latest = state?.latestVersion ?? '';
  const percent = state?.percent ?? 0;
  const notes = state?.notes?.trim() ?? '';

  // Extracción automática y categorización de novedades
  const parsedData = useMemo(() => {
    return extractDesktopUpdateHighlights(notes, latest);
  }, [notes, latest]);

  const displayedItems = showAllNotes ? parsedData.allHighlights : parsedData.highlights;

  const renderHighlightIcon = (item: UpdateHighlightItem) => {
    switch (item.badgeTone) {
      case 'amber':
        return <Lightning size={16} weight="fill" />;
      case 'green':
        return <ShieldCheck size={16} weight="fill" />;
      case 'purple':
        return <MusicNotes size={16} weight="fill" />;
      case 'cyan':
      default:
        return <Sparkle size={16} weight="fill" />;
    }
  };

  // Solo renderizar si estamos en entorno Electron o si fue abierto manualmente
  if (!updater && !open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jf-update-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !downloading) close();
          }}
          role="presentation"
        >
          {/* Double-Bezel Hardware Wrapper */}
          <motion.div
            className="jf-update-modal-shell"
            role="dialog"
            aria-modal="true"
            aria-label="Actualización de JodiFy Desktop"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="jf-update-card">
              {/* Luces y auras de fondo dinámicas */}
              <div className="jf-update-aura" aria-hidden="true" />
              <div className="jf-update-neon-ring" aria-hidden="true" />
              <div className="jf-update-grid-pattern" aria-hidden="true" />

              {!downloading && (
                <button
                  className="jf-update-close"
                  onClick={close}
                  aria-label="Cerrar"
                  title="Hacerlo después"
                >
                  <X size={15} weight="bold" />
                </button>
              )}

              {/* Cabecera Hero con holograma musical */}
              <div className="jf-update-hero">
                <div className="jf-update-mark-wrapper">
                  <div
                    className={`jf-update-mark-glow ${ready ? 'is-ready' : downloading ? 'is-downloading' : ''}`}
                    aria-hidden="true"
                  />
                  <motion.div
                    className="jf-update-mark"
                    animate={ready ? { rotate: [0, -4, 4, 0] } : {}}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {ready ? (
                      <RocketLaunch size={36} weight="fill" />
                    ) : downloading ? (
                      <ArrowDown size={32} weight="bold" className="jf-bounce" />
                    ) : (
                      <Sparkle size={34} weight="fill" />
                    )}
                  </motion.div>
                </div>

                {/* Ecualizador dinámico en vivo */}
                <div className="jf-update-eq" aria-hidden="true">
                  {EQ_BARS.map((i) => (
                    <span
                      key={i}
                      className={`jf-update-eq-bar ${
                        downloading || ready ? 'jf-update-eq-bar--live' : ''
                      }`}
                      style={{ animationDelay: `${i * 0.07}s` }}
                    />
                  ))}
                </div>

                <div className="jf-update-header-text">
                  <div className="jf-update-status-pill">
                    <span className={`jf-update-status-dot ${ready ? 'is-ready' : 'is-active'}`} />
                    <span className="jf-update-status-label">
                      {ready
                        ? 'INSTALADOR LISTO'
                        : downloading
                        ? `DESCARGANDO PAQUETE · ${percent}%`
                        : 'NUEVA VERSIÓN DISPONIBLE'}
                    </span>
                  </div>

                  <h2 className="jf-update-title">JodiFy Desktop</h2>
                  <p className="jf-update-subtitle">
                    {ready
                      ? 'La actualización se descargó exitosamente y está lista para aplicarse.'
                      : downloading
                      ? 'Obteniendo los archivos del sistema y componentes de audio en segundo plano…'
                      : 'Descubre las mejoras de rendimiento y funciones diseñadas para tu escritorio.'}
                  </p>
                </div>

                {/* Cápsula de salto de versión estilizada */}
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

              {/* Cuerpo del modal con Novedades Automáticas */}
              <div className="jf-update-body">
                {/* Sección de Novedades Automáticas */}
                <div className="jf-update-highlights-section">
                  <div className="jf-update-section-header">
                    <div className="jf-update-section-title-wrap">
                      <Sparkle size={15} weight="fill" className="jf-section-icon" />
                      <h3 className="jf-update-section-title">Novedades de actualización</h3>
                    </div>
                    <span className="jf-update-count-badge">
                      {parsedData.totalCount} mejoras clave
                    </span>
                  </div>

                  {/* Lista de características filtradas automáticamente */}
                  <div className="jf-update-highlights">
                    {displayedItems.map((item) => (
                      <motion.div
                        key={item.id}
                        className={`jf-highlight-item jf-highlight--${item.badgeTone}`}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className={`jf-highlight-icon jf-hi-${item.badgeTone}`}>
                          {renderHighlightIcon(item)}
                        </div>
                        <div className="jf-highlight-content">
                          <div className="jf-highlight-top">
                            <h4 className="jf-highlight-title">{item.title}</h4>
                            <span className={`jf-highlight-tag jf-tag--${item.badgeTone}`}>
                              {item.tag}
                            </span>
                          </div>
                          <p className="jf-highlight-desc">{item.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Botón para expandir más mejoras si hay más de 3 */}
                  {parsedData.hasMore && (
                    <button
                      className="jf-update-expand-btn"
                      onClick={() => setShowAllNotes(!showAllNotes)}
                      type="button"
                    >
                      <span>
                        {showAllNotes
                          ? 'Mostrar solo lo principal'
                          : `Ver todas las mejoras (+${parsedData.totalCount - 3})`}
                      </span>
                      {showAllNotes ? (
                        <CaretUp size={13} weight="bold" />
                      ) : (
                        <CaretDown size={13} weight="bold" />
                      )}
                    </button>
                  )}
                </div>

                {error && (
                  <div className="jf-update-error-box">
                    <X size={16} weight="bold" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Barra de progreso interactiva con telemetría */}
                {downloading && (
                  <div className="jf-update-progress-block">
                    <div className="jf-update-progress-labels">
                      <span className="jf-progress-status-text">
                        <Cpu size={14} weight="bold" style={{ display: 'inline', marginRight: 5 }} />
                        Descargando binarios de actualización…
                      </span>
                      <span className="jf-update-percent">{percent}%</span>
                    </div>
                    <div className="jf-update-progress-track">
                      <div
                        className="jf-update-progress-fill"
                        style={{ width: `${Math.max(percent, 6)}%` }}
                      >
                        <div className="jf-update-progress-shine" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Botones de acción principales con diseño Button-in-Button */}
                <div className="jf-update-actions">
                  {ready || downloading ? (
                    <>
                      <button
                        className={`jf-update-btn jf-update-btn--primary ${ready ? 'is-ready-pulse' : ''}`}
                        onClick={install}
                        disabled={!ready}
                      >
                        <span className="jf-btn-label">
                          {ready ? 'Instalar y Reiniciar Ahora' : 'Descargando en segundo plano…'}
                        </span>
                        <span className="jf-btn-nested-icon">
                          {ready ? (
                            <RocketLaunch size={16} weight="fill" />
                          ) : (
                            <ArrowDown size={16} weight="bold" className="jf-spin-slow" />
                          )}
                        </span>
                      </button>
                      <button
                        className="jf-update-btn jf-update-btn--ghost"
                        onClick={close}
                      >
                        Hacerlo después
                      </button>
                    </>
                  ) : error ? (
                    <>
                      <button
                        className="jf-update-btn jf-update-btn--primary"
                        onClick={checkAgain}
                      >
                        <span className="jf-btn-label">Reintentar comprobación</span>
                        <span className="jf-btn-nested-icon">
                          <ArrowClockwise size={15} weight="bold" />
                        </span>
                      </button>
                      <button
                        className="jf-update-btn jf-update-btn--ghost"
                        onClick={close}
                      >
                        Cerrar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="jf-update-btn jf-update-btn--primary"
                        onClick={checkAgain}
                      >
                        <span className="jf-btn-label">Descargar Actualización</span>
                        <span className="jf-btn-nested-icon">
                          <ArrowDown size={16} weight="bold" />
                        </span>
                      </button>
                      <button
                        className="jf-update-btn jf-update-btn--ghost"
                        onClick={close}
                      >
                        Posponer
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}