import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  DeviceMobile,
  DownloadSimple,
  Equalizer,
  Headphones,
  Monitor,
  MusicNotes,
  Radio,
  UsersThree,
  SpeakerHigh,
  SpeakerSlash,
  Eye,
  Drop,
  Sparkle,
  Disc,
  Play,
  Pause,
  Shuffle,
  SkipBack,
  SkipForward,
  Repeat,
  Lightning,
  ShieldCheck,
  CheckCircle,
  LinuxLogo,
  AppleLogo,
  WindowsLogo,
} from '@phosphor-icons/react';
import { APP_TAGLINE } from '../lib/constants';
import { useSettingsStore } from '../store/settings.store';

const RELEASES_URL = 'https://github.com/Leija05/jodify/releases';

interface BentoFeature {
  id: string;
  span?: 1 | 2;
  badge?: string;
  icon: any;
  title: string;
  description: string;
  highlight?: string;
  tags?: string[];
}

const BENTO_FEATURES: BentoFeature[] = [
  {
    id: 'hybrid-engine',
    span: 2,
    badge: 'Motor Híbrido 2.0',
    icon: MusicNotes,
    title: 'Catálogo Infinito de Música',
    description:
      'Buscá y reproducí cualquier canción del mundo impulsado por YouTube y tu biblioteca local en disco. Sin restricciones de región, sin anuncios y con emparejamiento automático de metadatos.',
    highlight: '+100M canciones disponibles al instante',
    tags: ['YouTube Music', 'Archivos Locales', 'MP3 / FLAC / AAC', 'Metadatos ID3'],
  },
  {
    id: 'live-jams',
    span: 1,
    badge: 'En Tiempo Real',
    icon: Radio,
    title: 'Salas Jam con Amigos',
    description:
      'Creá una sala y compartí el enlace. Toda la música suena al mismo milisegundo en los altavoces de tus amigos con chat de recomendaciones y cola colaborativa.',
    highlight: 'Sincronización WebSocket 0ms',
    tags: ['Salas privadas', 'Host compartido', 'Recomendaciones'],
  },
  {
    id: 'offline-downloads',
    span: 1,
    badge: 'Sin Internet',
    icon: DownloadSimple,
    title: 'Descargas & Modo Offline',
    description:
      'Descargá álbumes o canciones individuales directamente a tu dispositivo con 1 clic. Escuchá en el avión, en viajes o cuando no tengas señal sin gastar datos.',
    highlight: 'Audio original sin pérdida',
    tags: ['Descargas 1-Click', 'Gestor de memoria', 'Modo avión'],
  },
  {
    id: 'pro-equalizer',
    span: 1,
    badge: 'Audiofilia Pura',
    icon: Equalizer,
    title: 'Ecualizador Pro 10 Bandas',
    description:
      'Ajustá el espectro acústico con precisión milimétrica. Presets afinados para Bass Boost, Vocal, Club, Rock y perfiles personalizados para tus auriculares.',
    highlight: 'Visualizador FFT reactivo a 60 FPS',
    tags: ['10 Bandas', 'Presets en la nube', 'Filtros 32-bit'],
  },
  {
    id: 'pixel-companion',
    span: 1,
    badge: 'Mascota Virtual',
    icon: Sparkle,
    title: 'Pixel Companion Interactiva',
    description:
      'Un compañero retro pixel art que habita en tu pantalla, baila al compás del ritmo de tus temas favoritos y sube de nivel mientras más música escuchás.',
    highlight: 'Reacciona al ritmo en tiempo real',
    tags: ['Pixel Art', 'Niveles & Snacks', 'Modo silencioso'],
  },
  {
    id: 'social-discord',
    span: 2,
    badge: 'Social & Conectado',
    icon: UsersThree,
    title: 'Perfiles, Likes & Discord Rich Presence',
    description:
      'Mostrá en tu estado de Discord qué canción estás escuchando con portada y tiempo en vivo. Explorá los gustos de tus amigos, compartí tus playlists y descubrí nuevos artistas.',
    highlight: 'Integración nativa con Discord RPC',
    tags: ['Discord Status', 'Playlists públicas', 'Historial en vivo'],
  },
];

const PLATFORMS = [
  {
    name: 'Windows',
    icon: WindowsLogo,
    arch: 'Windows 10 & 11 (64-bit)',
    desc: 'Instalador nativo con acelerador de audio local y controles en la barra de tareas.',
    ext: '.exe / Portátil',
    url: `${RELEASES_URL}`,
    primary: true,
  },
  {
    name: 'macOS',
    icon: AppleLogo,
    arch: 'Apple Silicon & Intel',
    desc: 'Diseño pulido con controles multimedia de macOS, modo oscuro y consumo ultra bajo.',
    ext: '.dmg Universal',
    url: `${RELEASES_URL}`,
    primary: false,
  },
  {
    name: 'Linux',
    icon: LinuxLogo,
    arch: 'Ubuntu, Fedora, Arch',
    desc: 'Paquetes oficiales listos para ejecutar con soporte para Discord RPC y MPRIS.',
    ext: '.AppImage / .deb',
    url: `${RELEASES_URL}`,
    primary: false,
  },
  {
    name: 'Móvil / Web PWA',
    icon: DeviceMobile,
    arch: 'Android & iOS',
    desc: 'Instalá la Progressive Web App en tu smartphone con controles de pantalla bloqueada y Bluetooth.',
    ext: 'PWA Web App',
    url: '/login',
    primary: false,
  },
];

export function IntroPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Estado del difuminado de fondo (persistente en localStorage)
  const [videoBlur, setVideoBlur] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('jodify-video-blur');
      if (saved !== null) return saved === 'true';
      // Por defecto respetar si reduceBlur ya estaba activo
      return !useSettingsStore.getState().reduceBlur;
    } catch {
      return true;
    }
  });

  // Estado del reproductor interactivo de demostración
  const [demoPlaying, setDemoPlaying] = useState(false);

  // Alternar difuminado de video con sincronización de rendimiento
  const toggleVideoBlur = () => {
    setVideoBlur((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('jodify-video-blur', String(next));
      } catch {}
      // Si se desactiva el difuminado, activamos reduceBlur en settings para optimizar todo el motor
      useSettingsStore.getState().set({ reduceBlur: !next });
      return next;
    });
  };

  // Alternar audio de la promo
  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      if (!nextMuted) {
        videoRef.current.volume = 0.55;
        videoRef.current.play().catch(() => undefined);
      }
    }
  };

  // Alternar reproducción del mockup interactivo
  const toggleDemoPlay = () => {
    setDemoPlaying((prev) => !prev);
    // Si el usuario toca reproducir en el mockup, activar también audio del video
    if (videoRef.current && isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.volume = 0.55;
      videoRef.current.play().catch(() => undefined);
    }
  };

  // Limpieza total del elemento de video y audio al salir o navegar a login/app
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = 0.55;
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => undefined);
      });
    }

    return () => {
      if (video) {
        video.pause();
        video.muted = true;
        video.removeAttribute('src');
        video.load();
      }
    };
  }, []);

  return (
    <div className="jf-intro" data-testid="intro-screen">
      {/* Video de Promoción JodiFy de Fondo con Modo Nítido vs Modo Difuminado */}
      <div
        className={`jf-intro-video-container ${videoBlur ? 'is-blur-on' : 'is-blur-off'}`}
        aria-hidden="true"
      >
        <video
          ref={videoRef}
          className="jf-intro-video-bg"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          src={`${import.meta.env.BASE_URL}jodify-promo.mp4`}
        />
        <div className="jf-intro-video-overlay" />
      </div>

      {/* Barra de navegación flotante tipo cristal premium */}
      <header className="jf-intro-nav">
        <div className="jf-intro-nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="jf-intro-nav-logo">
            <img className="jf-intro-nav-logo-img" src={`${import.meta.env.BASE_URL}logo.png`} alt="JodiFy" />
          </span>
          <div className="jf-intro-nav-text">
            <span className="jf-intro-nav-name">
              Jodi<span>Fy</span>
            </span>
            <span className="jf-intro-nav-tag">v2.0</span>
          </div>
        </div>

        <nav className="jf-intro-nav-links" aria-label="Navegación principal">
          <a href="#inicio" className="jf-nav-link">Inicio</a>
          <a href="#funciones" className="jf-nav-link">Características</a>
          <a href="#descargas" className="jf-nav-link">Descargas</a>
          <a href="#comunidad" className="jf-nav-link">Comunidad</a>
        </nav>

        <div className="jf-intro-nav-actions">
          {/* Botón rápido para alternar difuminado */}
          <button
            type="button"
            className={`jf-intro-header-pill ${videoBlur ? 'is-blur-active' : 'is-crisp-active'}`}
            onClick={toggleVideoBlur}
            title={videoBlur ? 'Quitar difuminado (ver video nítido a 60 FPS)' : 'Activar difuminado (fondo artístico)'}
            aria-label="Alternar difuminado de video"
          >
            {videoBlur ? (
              <>
                <Drop size={14} weight="fill" />
                <span className="jf-pill-label">Difuminado: Sí</span>
              </>
            ) : (
              <>
                <Eye size={14} weight="bold" />
                <span className="jf-pill-label">Video Nítido ⚡</span>
              </>
            )}
          </button>

          {/* Botón CTA principal */}
          <button
            type="button"
            className="jf-btn jf-btn--primary jf-btn--sm jf-intro-enter-btn"
            onClick={() => navigate('/login')}
          >
            <span>Entrar a JodiFy</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </header>

      {/* Botones flotantes inferiores para control rápido (Audio + Difuminado) */}
      <aside className="jf-intro-floating-controls" aria-label="Controles de ambientación">
        <button
          type="button"
          className={`jf-intro-pill-btn ${videoBlur ? 'is-blur-on' : 'is-blur-off'}`}
          onClick={toggleVideoBlur}
          title={videoBlur ? 'Desactivar difuminado (video nítido y rápido)' : 'Activar difuminado profundo'}
          aria-label="Alternar difuminado de video"
        >
          {videoBlur ? (
            <>
              <Drop size={16} weight="fill" />
              <span>Difuminado: Activo</span>
            </>
          ) : (
            <>
              <Eye size={16} weight="bold" />
              <span>Video Nítido (60 FPS)</span>
            </>
          )}
        </button>

        <button
          type="button"
          className={`jf-intro-pill-btn ${isMuted ? 'is-muted' : 'is-audio-active'}`}
          onClick={toggleMute}
          title={isMuted ? 'Activar sonido del video' : 'Silenciar sonido'}
          aria-label={isMuted ? 'Activar sonido de la promo' : 'Silenciar sonido de la promo'}
        >
          {isMuted ? (
            <>
              <SpeakerSlash size={16} weight="bold" />
              <span>Sonido silenciado</span>
            </>
          ) : (
            <>
              <SpeakerHigh size={16} weight="fill" />
              <span className="jf-audio-waves" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span>Sonido activo</span>
            </>
          )}
        </button>
      </aside>

      <main className="jf-intro-main" id="inicio">
        {/* ============ SECCIÓN HERO PRINCIPAL ============ */}
        <section className="jf-intro-hero">
          <motion.div
            className="jf-intro-hero-content"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Pill Badge Destacado */}
            <div className="jf-intro-hero-badge">
              <span className="jf-badge-pulse-dot" aria-hidden="true" />
              <Sparkle size={13} weight="fill" />
              <span>JODIFY 2.0 • STREAMING LIBRE PARA AMIGOS</span>
            </div>

            {/* Título de impacto visual */}
            <h1 className="jf-intro-hero-title">
              Tu música favorita,
              <br />
              <span>sin límites ni interrupciones.</span>
            </h1>

            {/* Texto descriptivo claro y elegante */}
            <p className="jf-intro-hero-text">
              Una plataforma de streaming creada para compartir. Escuchá millones de canciones en alta fidelidad,
              transmití en salas Jam sincronizadas con amigos, descargá pistas para escuchar sin internet y disfrutá de un
              reproductor 100% libre de suscripciones.
            </p>

            {/* Acciones principales */}
            <div className="jf-intro-hero-actions">
              <button
                type="button"
                className="jf-btn jf-btn--primary jf-btn--lg jf-btn-glow"
                onClick={() => navigate('/login')}
                data-testid="intro-login-cta"
              >
                <span>Comenzar a escuchar gratis</span>
                <ArrowRight size={17} weight="bold" />
              </button>

              <a href="#descargas" className="jf-btn jf-btn--glass jf-btn--lg">
                <DownloadSimple size={17} weight="bold" />
                <span>Descargar app oficial</span>
              </a>
            </div>

            {/* Fila de beneficios rápidos */}
            <div className="jf-intro-stat-pills" aria-label="Ventajas principales">
              <div className="jf-stat-pill">
                <Lightning size={14} weight="fill" />
                <span>0 Anuncios molestos</span>
              </div>
              <div className="jf-stat-pill">
                <Headphones size={14} weight="fill" />
                <span>Audio Hi-Res 320k</span>
              </div>
              <div className="jf-stat-pill">
                <Radio size={14} weight="fill" />
                <span>Jams en tiempo real</span>
              </div>
              <div className="jf-stat-pill">
                <DownloadSimple size={14} weight="fill" />
                <span>Descargas offline</span>
              </div>
            </div>
          </motion.div>

          {/* ============ VISTA PREVIA INTERACTIVA DE LA APP ============ */}
          <motion.div
            className="jf-intro-showcase-wrap"
            id="preview"
            initial={{ opacity: 0, y: 36, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="jf-intro-player-window">
              {/* Barra superior estilo MacOS */}
              <div className="jf-player-window-header">
                <div className="jf-window-dots">
                  <span className="jf-dot jf-dot--red" />
                  <span className="jf-dot jf-dot--yellow" />
                  <span className="jf-dot jf-dot--green" />
                </div>
                <div className="jf-window-title">
                  <Disc size={13} weight="fill" />
                  <span>JodiFy Web Player — Reproduciendo ahora</span>
                </div>
                <div className="jf-window-status">
                  <span className="jf-status-live-dot" />
                  <span>En vivo</span>
                </div>
              </div>

              {/* Contenido del Mockup Interactivo */}
              <div className="jf-player-window-body">
                {/* Lado izquierdo: Tarjeta de Canción Principal */}
                <div className="jf-mockup-track-card">
                  <div className="jf-mockup-cover-wrap">
                    <img
                      src={`${import.meta.env.BASE_URL}logo.png`}
                      alt="LUNA Cover"
                      className={`jf-mockup-cover ${demoPlaying ? 'is-spinning' : ''}`}
                    />
                    <button
                      type="button"
                      className="jf-mockup-play-overlay"
                      onClick={toggleDemoPlay}
                      aria-label={demoPlaying ? 'Pausar demostración' : 'Reproducir demostración'}
                    >
                      {demoPlaying ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" />}
                    </button>
                  </div>

                  <div className="jf-mockup-track-meta">
                    <div className="jf-mockup-title-row">
                      <span className="jf-mockup-title">LUNA</span>
                      <span className="jf-mockup-quality-tag">FLAC</span>
                    </div>
                    <span className="jf-mockup-artist">Feid, ATL Jacob • FERXXOCALIPSIS</span>

                    {/* Espectro de audio animado interactivo */}
                    <div className={`jf-mockup-equalizer ${demoPlaying ? 'is-active' : ''}`} aria-hidden="true">
                      <span /><span /><span /><span /><span /><span /><span /><span />
                    </div>

                    {/* Barra de progreso interactiva simulada */}
                    <div className="jf-mockup-progress-wrap">
                      <div className="jf-mockup-progress-bar">
                        <div className="jf-mockup-progress-fill" style={{ width: demoPlaying ? '62%' : '45%' }} />
                      </div>
                      <div className="jf-mockup-progress-times">
                        <span>{demoPlaying ? '2:04' : '1:28'}</span>
                        <span>3:16</span>
                      </div>
                    </div>

                    {/* Controles del mini reproductor */}
                    <div className="jf-mockup-controls">
                      <button type="button" className="jf-mockup-ctrl-btn" title="Aleatorio">
                        <Shuffle size={14} />
                      </button>
                      <button type="button" className="jf-mockup-ctrl-btn" title="Anterior">
                        <SkipBack size={15} weight="fill" />
                      </button>
                      <button
                        type="button"
                        className="jf-mockup-play-main"
                        onClick={toggleDemoPlay}
                        title={demoPlaying ? 'Pausar' : 'Reproducir'}
                      >
                        {demoPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
                      </button>
                      <button type="button" className="jf-mockup-ctrl-btn" title="Siguiente">
                        <SkipForward size={15} weight="fill" />
                      </button>
                      <button type="button" className="jf-mockup-ctrl-btn" title="Repetir">
                        <Repeat size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lado derecho: Widget de Jam en vivo y Cola */}
                <div className="jf-mockup-sidebar">
                  <div className="jf-mockup-jam-box">
                    <div className="jf-jam-box-head">
                      <div className="jf-jam-title">
                        <Radio size={14} weight="fill" />
                        <span>Sala Jam Activa</span>
                      </div>
                      <span className="jf-jam-chip">0 ms lag</span>
                    </div>

                    <div className="jf-jam-users-row">
                      <div className="jf-jam-avatars">
                        <span className="jf-avatar jf-avatar--1">L</span>
                        <span className="jf-avatar jf-avatar--2">S</span>
                        <span className="jf-avatar jf-avatar--3">M</span>
                        <span className="jf-avatar jf-avatar--more">+4</span>
                      </div>
                      <span className="jf-jam-label">7 amigos escuchando</span>
                    </div>
                  </div>

                  <div className="jf-mockup-queue-box">
                    <span className="jf-queue-title">Siguiente en la cola</span>
                    <div className="jf-queue-items">
                      <div className="jf-queue-item is-next">
                        <span className="jf-queue-num">1</span>
                        <div className="jf-queue-info">
                          <span className="jf-queue-name">Goteo</span>
                          <span className="jf-queue-sub">DUKI</span>
                        </div>
                        <span className="jf-queue-time">2:44</span>
                      </div>

                      <div className="jf-queue-item">
                        <span className="jf-queue-num">2</span>
                        <div className="jf-queue-info">
                          <span className="jf-queue-name">MONACO</span>
                          <span className="jf-queue-sub">Bad Bunny</span>
                        </div>
                        <span className="jf-queue-time">4:27</span>
                      </div>

                      <div className="jf-queue-item">
                        <span className="jf-queue-num">3</span>
                        <div className="jf-queue-info">
                          <span className="jf-queue-name">Columbia</span>
                          <span className="jf-queue-sub">Quevedo</span>
                        </div>
                        <span className="jf-queue-time">3:06</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ============ SECCIÓN BENTO DE CARACTERÍSTICAS ============ */}
        <section className="jf-intro-features" id="funciones">
          <motion.div
            className="jf-intro-section-head"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="jf-section-eyebrow">
              <Sparkle size={13} weight="fill" />
              <span>INGENIERÍA AUDIÓFILA Y COLABORATIVA</span>
            </div>
            <h2 className="jf-intro-section-title">Diseñado para la mejor experiencia</h2>
            <p className="jf-intro-section-sub">
              Todo lo que necesitas para escuchar, descubrir y disfrutar con tus amigos en un solo lugar.
            </p>
          </motion.div>

          <div className="jf-intro-bento-grid">
            {BENTO_FEATURES.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.id}
                  className={`jf-bento-card ${item.span === 2 ? 'is-span-2' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="jf-bento-card-header">
                    <span className="jf-bento-icon-wrap">
                      <Icon size={22} weight="fill" />
                    </span>
                    {item.badge && <span className="jf-bento-badge">{item.badge}</span>}
                  </div>

                  <h3 className="jf-bento-title">{item.title}</h3>
                  <p className="jf-bento-desc">{item.description}</p>

                  {item.highlight && (
                    <div className="jf-bento-highlight">
                      <CheckCircle size={14} weight="fill" />
                      <span>{item.highlight}</span>
                    </div>
                  )}

                  {item.tags && item.tags.length > 0 && (
                    <div className="jf-bento-tags">
                      {item.tags.map((tag) => (
                        <span key={tag} className="jf-bento-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.article>
              );
            })}
          </div>
        </section>

        {/* ============ SECCIÓN DE DESCARGAS MULTIPLATAFORMA ============ */}
        <section className="jf-intro-downloads" id="descargas">
          <motion.div
            className="jf-intro-section-head"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="jf-section-eyebrow">
              <Monitor size={13} weight="fill" />
              <span>DISPONIBLE EN TODOS TUS DISPOSITIVOS</span>
            </div>
            <h2 className="jf-intro-section-title">Llevá JodiFy a donde vayas</h2>
            <p className="jf-intro-section-sub">
              Elegí tu sistema operativo o abrí la aplicación directamente en tu navegador web.
            </p>
          </motion.div>

          <div className="jf-intro-download-grid">
            {PLATFORMS.map((platform, i) => {
              const Icon = platform.icon;
              return (
                <motion.a
                  key={platform.name}
                  href={platform.url}
                  target={platform.url.startsWith('http') ? '_blank' : '_self'}
                  rel="noreferrer"
                  className={`jf-intro-download-card ${platform.primary ? 'is-featured' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -5 }}
                >
                  <div className="jf-download-card-top">
                    <span className="jf-download-platform-icon">
                      <Icon size={26} weight="fill" />
                    </span>
                    <span className="jf-download-ext-tag">{platform.ext}</span>
                  </div>

                  <h3 className="jf-download-name">{platform.name}</h3>
                  <span className="jf-download-arch">{platform.arch}</span>
                  <p className="jf-download-desc">{platform.desc}</p>

                  <div className="jf-download-cta-row">
                    <span className="jf-download-cta-text">
                      <DownloadSimple size={15} weight="bold" />
                      <span>{platform.primary ? 'Descargar instalador' : 'Obtener para ' + platform.name}</span>
                    </span>
                    <span className="jf-download-arrow">→</span>
                  </div>
                </motion.a>
              );
            })}
          </div>
        </section>

        {/* ============ SECCIÓN COMUNIDAD Y CTA FINAL ============ */}
        <section className="jf-intro-cta-section" id="comunidad">
          <motion.div
            className="jf-intro-cta-card"
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="jf-cta-ambient-glow" aria-hidden="true" />
            <div className="jf-cta-content">
              <span className="jf-cta-badge">
                <ShieldCheck size={14} weight="fill" />
                <span>100% LIBRE • SIN TARJETAS NI SUSCRIPCIONES</span>
              </span>

              <h2 className="jf-intro-cta-title">¿Listo para escuchar música de verdad?</h2>
              <p className="jf-intro-cta-text">
                Creá tu cuenta gratis en 10 segundos, explorá miles de canciones y sincronizá con tus amigos ahora mismo.
              </p>

              <div className="jf-cta-actions">
                <button
                  type="button"
                  className="jf-btn jf-btn--primary jf-btn--lg jf-btn-glow"
                  onClick={() => navigate('/login')}
                  data-testid="intro-footer-cta"
                >
                  <span>Entrar ahora a JodiFy</span>
                  <ArrowRight size={17} weight="bold" />
                </button>

                <a
                  href="https://discord.gg/invite"
                  target="_blank"
                  rel="noreferrer"
                  className="jf-btn jf-btn--glass jf-btn--lg"
                >
                  <span>Comunidad en Discord</span>
                  <ArrowRight size={15} />
                </a>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Pie de página elegante */}
      <footer className="jf-intro-footer">
        <div className="jf-footer-brand">
          <span className="jf-footer-logo">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="JodiFy" />
          </span>
          <span className="jf-footer-name">
            Jodi<span>Fy</span>
          </span>
        </div>
        <p className="jf-footer-tagline">{APP_TAGLINE}</p>
        <span className="jf-footer-copy">© 2026 JodiFy. Hecho para amigos, sin fines de lucro.</span>
      </footer>
    </div>
  );
}