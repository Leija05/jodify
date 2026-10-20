import { useState } from 'react';
import {
  RocketLaunch,
  Sparkle,
  ShieldCheck,
  Lightning,
  ArrowDown,
  Cpu,
  CaretDown,
  CaretUp,
  MusicNotes,
  DeviceMobile,
  Desktop,
  CheckCircle,
} from '@phosphor-icons/react';
import { extractDesktopUpdateHighlights } from '../lib/updateNotesParser';

const EQ_BARS = [0, 1, 2, 3, 4, 5, 6, 7];

export function UpdatePreviewPage() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialPlatform = (params?.get('platform') as 'desktop' | 'mobile') || 'desktop';
  const initialMode = (params?.get('mode') as 'available' | 'downloading' | 'ready') || 'available';

  const [platform, setPlatform] = useState<'desktop' | 'mobile'>(initialPlatform);
  const [mode, setMode] = useState<'available' | 'downloading' | 'ready'>(initialMode);
  const [notesType, setNotesType] = useState<'custom' | 'generic'>('custom');
  const [showAllNotes, setShowAllNotes] = useState(false);

  const customNotes = `
feat: DJ Scratching & Audio FX Lab - Audio 8D envolvente, filtro vinilo Lo-Fi y scratch táctil
perf: Motor yt-dlp & Caché Ultra Rápido - Streaming sin latencia y respuesta instantánea al cambiar pistas
fix: Cola Interactiva & Atajos Globales - Reorganización fluida de canciones y persistencia
feat: Ecualizador Paramétrico 10 Bandas - Curvas precisas y presets de audio de estudio
  `.trim();

  const activeNotes = notesType === 'custom' ? customNotes : 'Mejoras generales y correcciones de errores.';

  const parsedDesktop = extractDesktopUpdateHighlights(activeNotes, '2.5.0');
  const desktopHighlights = showAllNotes ? parsedDesktop.allHighlights : parsedDesktop.highlights;

  const percent = mode === 'downloading' ? 68 : mode === 'ready' ? 100 : 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#06050b',
        color: '#fff',
        fontFamily: 'var(--font-body, system-ui, sans-serif)',
        padding: '24px 16px 60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        overflowY: 'auto',
      }}
    >
      {/* Barra de control superior */}
      <div
        style={{
          width: 'min(900px, 96vw)',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '18px',
          padding: '14px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #7F00FF, #00E5FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkle size={20} weight="fill" color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
              JodiFy Update Showroom
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
              Demostración en vivo del nuevo diseño y Novedades Automáticas
            </div>
          </div>
        </div>

        {/* Selector de plataforma */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.4)',
            padding: '4px',
            borderRadius: '99px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <button
            onClick={() => setPlatform('desktop')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '99px',
              border: 'none',
              background: platform === 'desktop' ? 'linear-gradient(135deg, #7F00FF, #00E5FF)' : 'transparent',
              color: platform === 'desktop' ? '#fff' : 'rgba(255,255,255,0.6)',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Desktop size={15} weight="bold" />
            JodiFy Desktop
          </button>
          <button
            onClick={() => setPlatform('mobile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '99px',
              border: 'none',
              background: platform === 'mobile' ? 'linear-gradient(135deg, #7F00FF, #00E5FF)' : 'transparent',
              color: platform === 'mobile' ? '#fff' : 'rgba(255,255,255,0.6)',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <DeviceMobile size={15} weight="bold" />
            JodiFy Móvil
          </button>
        </div>

        {/* Selector de estado */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setMode('available')}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: mode === 'available' ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.1)',
              background: mode === 'available' ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.04)',
              color: mode === 'available' ? '#00e5ff' : 'rgba(255,255,255,0.7)',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Disponible
          </button>
          <button
            onClick={() => setMode('downloading')}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: mode === 'downloading' ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.1)',
              background: mode === 'downloading' ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.04)',
              color: mode === 'downloading' ? '#00e5ff' : 'rgba(255,255,255,0.7)',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Descargando (68%)
          </button>
          <button
            onClick={() => setMode('ready')}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: mode === 'ready' ? '1px solid #00e676' : '1px solid rgba(255,255,255,0.1)',
              background: mode === 'ready' ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.04)',
              color: mode === 'ready' ? '#00e676' : 'rgba(255,255,255,0.7)',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Lista para instalar
          </button>
          <button
            onClick={() => setNotesType(notesType === 'custom' ? 'generic' : 'custom')}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(179,136,255,0.4)',
              background: 'rgba(179,136,255,0.12)',
              color: '#b388ff',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {notesType === 'custom' ? 'Notas Automáticas (vía Changelog)' : 'Fallback Inteligente (Genericas)'}
          </button>
        </div>
      </div>

      {/* RENDERIZADO SEGÚN PLATAFORMA */}
      {platform === 'desktop' ? (
        /* VISTA DESKTOP */
        <div style={{ width: 'min(540px, 94vw)', position: 'relative' }}>
          <div className="jf-update-modal-shell" style={{ width: '100%', margin: '0 auto' }}>
            <div className="jf-update-card">
              <div className="jf-update-aura" aria-hidden="true" />
              <div className="jf-update-neon-ring" aria-hidden="true" />
              <div className="jf-update-grid-pattern" aria-hidden="true" />

              {/* Hero */}
              <div className="jf-update-hero">
                <div className="jf-update-mark-wrapper">
                  <div
                    className={`jf-update-mark-glow ${mode === 'ready' ? 'is-ready' : mode === 'downloading' ? 'is-downloading' : ''}`}
                    aria-hidden="true"
                  />
                  <div className="jf-update-mark">
                    {mode === 'ready' ? (
                      <RocketLaunch size={36} weight="fill" />
                    ) : mode === 'downloading' ? (
                      <ArrowDown size={32} weight="bold" className="jf-bounce" />
                    ) : (
                      <Sparkle size={34} weight="fill" />
                    )}
                  </div>
                </div>

                <div className="jf-update-eq" aria-hidden="true">
                  {EQ_BARS.map((i) => (
                    <span
                      key={i}
                      className={`jf-update-eq-bar ${mode === 'downloading' || mode === 'ready' ? 'jf-update-eq-bar--live' : ''}`}
                      style={{ animationDelay: `${i * 0.07}s` }}
                    />
                  ))}
                </div>

                <div className="jf-update-header-text">
                  <div className="jf-update-status-pill">
                    <span className={`jf-update-status-dot ${mode === 'ready' ? 'is-ready' : 'is-active'}`} />
                    <span className="jf-update-status-label">
                      {mode === 'ready'
                        ? 'INSTALADOR LISTO'
                        : mode === 'downloading'
                        ? `DESCARGANDO PAQUETE · ${percent}%`
                        : 'NUEVA VERSIÓN DISPONIBLE'}
                    </span>
                  </div>

                  <h2 className="jf-update-title">JodiFy Desktop</h2>
                  <p className="jf-update-subtitle">
                    {mode === 'ready'
                      ? 'La actualización se descargó exitosamente y está lista para aplicarse.'
                      : mode === 'downloading'
                      ? 'Obteniendo los archivos del sistema y componentes de audio en segundo plano…'
                      : 'Descubre las mejoras de rendimiento y funciones diseñadas para tu escritorio.'}
                  </p>
                </div>

                <div className="jf-update-versions">
                  <div className="jf-version-box jf-version-box--old">
                    <span className="jf-version-label">Instalada</span>
                    <span className="jf-version-number">v2.4.2</span>
                  </div>

                  <div className="jf-update-version-arrow" aria-hidden="true">
                    <Lightning size={16} weight="fill" />
                  </div>

                  <div className="jf-version-box jf-version-box--new">
                    <span className="jf-version-label">Disponible</span>
                    <span className="jf-version-number">v2.5.0</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="jf-update-body">
                <div className="jf-update-highlights-section">
                  <div className="jf-update-section-header">
                    <div className="jf-update-section-title-wrap">
                      <Sparkle size={15} weight="fill" className="jf-section-icon" />
                      <h3 className="jf-update-section-title">Novedades de actualización</h3>
                    </div>
                    <span className="jf-update-count-badge">
                      {parsedDesktop.totalCount} mejoras clave
                    </span>
                  </div>

                  <div className="jf-update-highlights">
                    {desktopHighlights.map((item) => (
                      <div
                        key={item.id}
                        className={`jf-highlight-item jf-highlight--${item.badgeTone}`}
                      >
                        <div className={`jf-highlight-icon jf-hi-${item.badgeTone}`}>
                          {item.badgeTone === 'amber' ? (
                            <Lightning size={16} weight="fill" />
                          ) : item.badgeTone === 'green' ? (
                            <ShieldCheck size={16} weight="fill" />
                          ) : item.badgeTone === 'purple' ? (
                            <MusicNotes size={16} weight="fill" />
                          ) : (
                            <Sparkle size={16} weight="fill" />
                          )}
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
                      </div>
                    ))}
                  </div>

                  {parsedDesktop.hasMore && (
                    <button
                      className="jf-update-expand-btn"
                      onClick={() => setShowAllNotes(!showAllNotes)}
                      type="button"
                    >
                      <span>
                        {showAllNotes
                          ? 'Mostrar solo lo principal'
                          : `Ver todas las mejoras (+${parsedDesktop.totalCount - 3})`}
                      </span>
                      {showAllNotes ? (
                        <CaretUp size={13} weight="bold" />
                      ) : (
                        <CaretDown size={13} weight="bold" />
                      )}
                    </button>
                  )}
                </div>

                {mode === 'downloading' && (
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
                        style={{ width: `${percent}%` }}
                      >
                        <div className="jf-update-progress-shine" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="jf-update-actions">
                  {mode === 'ready' ? (
                    <>
                      <button className="jf-update-btn jf-update-btn--primary is-ready-pulse">
                        <span className="jf-btn-label">Instalar y Reiniciar Ahora</span>
                        <span className="jf-btn-nested-icon">
                          <RocketLaunch size={16} weight="fill" />
                        </span>
                      </button>
                      <button className="jf-update-btn jf-update-btn--ghost">
                        Hacerlo después
                      </button>
                    </>
                  ) : mode === 'downloading' ? (
                    <>
                      <button className="jf-update-btn jf-update-btn--primary" disabled>
                        <span className="jf-btn-label">Descargando en segundo plano…</span>
                        <span className="jf-btn-nested-icon">
                          <ArrowDown size={16} weight="bold" className="jf-spin-slow" />
                        </span>
                      </button>
                      <button className="jf-update-btn jf-update-btn--ghost">
                        Hacerlo después
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="jf-update-btn jf-update-btn--primary">
                        <span className="jf-btn-label">Descargar Actualización</span>
                        <span className="jf-btn-nested-icon">
                          <ArrowDown size={16} weight="bold" />
                        </span>
                      </button>
                      <button className="jf-update-btn jf-update-btn--ghost">
                        Posponer
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VISTA MÓVIL (En marco de teléfono) */
        <div
          style={{
            width: '390px',
            borderRadius: '40px',
            border: '8px solid #222030',
            background: '#040308',
            padding: '4px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 50px rgba(127,0,255,0.3)',
            position: 'relative',
          }}
        >
          {/* Dynamic Island / Notch */}
          <div
            style={{
              width: '110px',
              height: '24px',
              background: '#000',
              borderRadius: '20px',
              margin: '6px auto 14px',
            }}
          />

          {/* Modal Container Mobile */}
          <div
            style={{
              borderRadius: '28px',
              padding: '2px',
              background:
                mode === 'ready'
                  ? 'linear-gradient(145deg, rgba(0,230,118,0.55), rgba(0,229,255,0.35))'
                  : 'linear-gradient(145deg, rgba(127,0,255,0.55), rgba(0,229,255,0.4))',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                borderRadius: '26px',
                background: 'linear-gradient(180deg, #151028 0%, #0b0818 60%, #05040a 100%)',
                padding: '20px 18px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Header Icon & Rings */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background:
                      mode === 'ready'
                        ? 'linear-gradient(135deg, #00E676, #00B0FF)'
                        : 'linear-gradient(135deg, #7F00FF, #00E5FF)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 28px rgba(0,229,255,0.4)',
                  }}
                >
                  {mode === 'ready' ? (
                    <CheckCircle size={32} weight="fill" color="#fff" />
                  ) : mode === 'downloading' ? (
                    <ArrowDown size={28} weight="bold" color="#fff" className="jf-bounce" />
                  ) : (
                    <Sparkle size={30} weight="fill" color="#fff" />
                  )}
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 10px',
                    borderRadius: '99px',
                    background: 'rgba(0, 229, 255, 0.1)',
                    border: '1px solid rgba(0, 229, 255, 0.3)',
                    fontSize: '9.5px',
                    fontWeight: 800,
                    color: '#00E5FF',
                    letterSpacing: '0.08em',
                  }}
                >
                  <RocketLaunch size={11} weight="fill" />
                  {mode === 'ready'
                    ? 'PAQUETE VERIFICADO'
                    : mode === 'downloading'
                    ? 'DESCARGA EN CURSO'
                    : 'ACTUALIZACIÓN OFICIAL JODIFY'}
                </div>

                <h3
                  style={{
                    margin: '2px 0 0',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#fff',
                    textAlign: 'center',
                  }}
                >
                  {mode === 'downloading'
                    ? 'Descargando Actualización…'
                    : mode === 'ready'
                    ? '¡Descarga Completa!'
                    : 'Nueva Versión Móvil'}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '11.5px',
                    color: 'rgba(255,255,255,0.65)',
                    textAlign: 'center',
                    lineHeight: 1.4,
                  }}
                >
                  {mode === 'ready'
                    ? 'Instalador de Android listo para aplicar las mejoras sin perder tus descargas ni datos.'
                    : mode === 'downloading'
                    ? 'Transfiriendo paquete APK oficial desde el servidor de alta velocidad.'
                    : 'Una versión optimizada de JodiFy Móvil está lista para instalar.'}
                </p>

                {/* Cápsula de versión móvil */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    margin: '6px 0 10px',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '8.5px', fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>
                      INSTALADA
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through' }}>
                      v1.0.1
                    </div>
                  </div>

                  <div style={{ color: '#00E5FF' }}>
                    <Lightning size={14} weight="fill" />
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#00E5FF', letterSpacing: '0.1em' }}>
                      NUEVA
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#00E5FF' }}>
                      v1.0.3
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(0,229,255,0.12)',
                      padding: '3px 8px',
                      borderRadius: '99px',
                      border: '1px solid rgba(0,229,255,0.3)',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#00E5FF',
                    }}
                  >
                    42.8 MB
                  </div>
                </div>
              </div>

              {/* Novedades Móvil Bento */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.025)',
                  borderRadius: '16px',
                  padding: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  marginBottom: '14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#E0E7FF', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.8px' }}>
                    <Sparkle size={13} weight="fill" color="#00E5FF" />
                    NOVEDADES DE ACTUALIZACIÓN
                  </div>
                  <span
                    style={{
                      background: 'rgba(0,229,255,0.12)',
                      padding: '2px 7px',
                      borderRadius: '99px',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      color: '#00E5FF',
                      border: '1px solid rgba(0,229,255,0.28)',
                    }}
                  >
                    3 mejoras
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '9px',
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderLeft: '3px solid #00E5FF',
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        background: 'rgba(0, 229, 255, 0.12)',
                        border: '1px solid rgba(0, 229, 255, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '1px',
                      }}
                    >
                      <Sparkle size={14} color="#00E5FF" weight="fill" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                          Reproducción en Pantalla Bloqueada
                        </span>
                        <span
                          style={{
                            fontSize: '8px',
                            fontWeight: 800,
                            padding: '1.5px 5px',
                            borderRadius: '99px',
                            background: 'rgba(0,229,255,0.15)',
                            color: '#00E5FF',
                            border: '1px solid rgba(0,229,255,0.3)',
                          }}
                        >
                          NOVEDAD
                        </span>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: '10.5px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                        Controles multimedia fluidos y carátula interactiva en la pantalla de bloqueo y barra de notificaciones.
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '9px',
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderLeft: '3px solid #B388FF',
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        background: 'rgba(179, 136, 255, 0.14)',
                        border: '1px solid rgba(179, 136, 255, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '1px',
                      }}
                    >
                      <MusicNotes size={14} color="#B388FF" weight="fill" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                          Surround 3D & Bass Boost Refinado
                        </span>
                        <span
                          style={{
                            fontSize: '8px',
                            fontWeight: 800,
                            padding: '1.5px 5px',
                            borderRadius: '99px',
                            background: 'rgba(179,136,255,0.15)',
                            color: '#B388FF',
                            border: '1px solid rgba(179,136,255,0.3)',
                          }}
                        >
                          AUDIO HQ
                        </span>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: '10.5px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                        Procesamiento de audio adaptado para auriculares Bluetooth con ecualización de 10 bandas.
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '9px',
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderLeft: '3px solid #FFD700',
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        background: 'rgba(255, 215, 0, 0.12)',
                        border: '1px solid rgba(255, 215, 0, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '1px',
                      }}
                    >
                      <Lightning size={14} color="#FFD700" weight="fill" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                          Modo Ahorro de Datos & Batería
                        </span>
                        <span
                          style={{
                            fontSize: '8px',
                            fontWeight: 800,
                            padding: '1.5px 5px',
                            borderRadius: '99px',
                            background: 'rgba(255,215,0,0.15)',
                            color: '#FFD700',
                            border: '1px solid rgba(255,215,0,0.3)',
                          }}
                        >
                          OPTIMIZACIÓN
                        </span>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: '10.5px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                        Consumo optimizado de red y buffer adaptativo para sesiones prolongadas de música.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón CTA Mobile con Button-in-Button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '99px',
                    border: 'none',
                    background:
                      mode === 'ready'
                        ? 'linear-gradient(135deg, #00E676, #00B0FF)'
                        : 'linear-gradient(135deg, #7F00FF, #00E5FF)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 8px 0 16px',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(0,229,255,0.4)',
                  }}
                >
                  <span>
                    {mode === 'ready'
                      ? 'Instalar Actualización Ahora'
                      : mode === 'downloading'
                      ? 'Descargando APK oficial…'
                      : 'Descargar e Instalar'}
                  </span>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {mode === 'ready' ? (
                      <CheckCircle size={18} weight="fill" color="#fff" />
                    ) : (
                      <ArrowDown size={17} weight="bold" color="#fff" />
                    )}
                  </div>
                </button>
                <div style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                  Recordarme más tarde
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
