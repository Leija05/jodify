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
} from '@phosphor-icons/react';
import { APP_TAGLINE } from '../lib/constants';

const RELEASES_URL = 'https://github.com/Leija05/jodify/releases';

const FEATURES = [
  {
    icon: MusicNotes,
    title: 'Biblioteca infinita',
    text: 'Escuchá y descubrí música subida por la comunidad, con portadas y artistas.',
  },
  {
    icon: Radio,
    title: 'Jams en tiempo real',
    text: 'Creá una sala con amigos, compartí la cola y controlá la reproducción juntos.',
  },
  {
    icon: Equalizer,
    title: 'Ecualizador de 10 bandas',
    text: 'Ajustá el sonido a tu gusto con presets listos y guardados en tu perfil.',
  },
  {
    icon: UsersThree,
    title: 'Comunidad activa',
    text: 'Mirá quién está escuchando qué, perfil de usuarios y estadísticas en vivo.',
  },
  {
    icon: DownloadSimple,
    title: 'Música offline',
    text: 'Descargá canciones para escucharlas sin conexión, donde sea que estés.',
  },
  {
    icon: Headphones,
    title: 'Modo foco',
    text: 'Interfaz limpia con visualizador, fondo dinámico y fundidos entre temas.',
  },
];

export function IntroPage() {
  const navigate = useNavigate();

  return (
    <div className="jf-intro" data-testid="intro-screen">
      <div className="jf-login-ambient" aria-hidden="true">
        <span className="jf-ambient-blob jf-ambient-blob--a" />
        <span className="jf-ambient-blob jf-ambient-blob--b" />
        <span className="jf-ambient-blob jf-ambient-blob--c" />
      </div>
      <div className="jf-login-glow" aria-hidden="true" />

      <header className="jf-intro-nav">
        <div className="jf-intro-nav-brand">
          <span className="jf-intro-nav-logo">
            <img className="jf-intro-nav-logo-img" src={`${import.meta.env.BASE_URL}logo.png`} alt="JodiFy" />
          </span>
          <span className="jf-intro-nav-name">
            Jodi<span>Fy</span>
          </span>
        </div>
        <button type="button" className="jf-btn jf-btn--glass jf-btn--sm" onClick={() => navigate('/login')}>
          Iniciar sesión
        </button>
      </header>

      <main className="jf-intro-main">
        <section className="jf-intro-hero">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="jf-intro-hero-title">
              Música gratis,
              <br />
              para <span>amigos</span>
            </h1>
            <p className="jf-intro-hero-text">
              JodiFy es una plataforma de música en streaming pensada para compartir. Nuestro objetivo: que escuches lo que
              amás sin suscripciones, jams con tus amigos, descargas offline y una comunidad que sube y descubre música
              todos los días.
            </p>
            <div className="jf-intro-hero-actions">
              <button
                type="button"
                className="jf-btn jf-btn--primary jf-btn--lg"
                onClick={() => navigate('/login')}
                data-testid="intro-login-cta"
              >
                Entrar a JodiFy <ArrowRight size={16} weight="bold" />
              </button>
              <a href={`${RELEASES_URL}`} target="_blank" rel="noreferrer" className="jf-btn jf-btn--glass jf-btn--lg">
                <DownloadSimple size={16} /> Descargar app
              </a>
            </div>
          </motion.div>
        </section>

        <section className="jf-intro-downloads" id="descargas">
          <motion.div
            className="jf-intro-section-head"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="jf-intro-section-title">Llevá JodiFy a todas partes</h2>
            <p className="jf-intro-section-sub">Elegí tu plataforma y descargá la app oficial</p>
          </motion.div>
          <div className="jf-intro-download-grid">
            <motion.a
              href={`${RELEASES_URL}`}
              target="_blank"
              rel="noreferrer"
              className="jf-intro-download-card"
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              data-testid="download-desktop"
            >
              <span className="jf-intro-download-icon jf-intro-download-icon--desktop">
                <Monitor size={26} weight="fill" />
              </span>
              <h3>App de escritorio</h3>
              <p>Windows, macOS y Linux. Escuchá música con la mejor calidad y sin límites.</p>
              <span className="jf-intro-download-cta">
                <DownloadSimple size={14} /> Descargar para escritorio
              </span>
            </motion.a>
            <motion.a
              href={`${RELEASES_URL}`}
              target="_blank"
              rel="noreferrer"
              className="jf-intro-download-card"
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              data-testid="download-mobile"
            >
              <span className="jf-intro-download-icon jf-intro-download-icon--mobile">
                <DeviceMobile size={26} weight="fill" />
              </span>
              <h3>App móvil</h3>
              <p>Android e iOS. Tu música favorita siempre en el bolsillo, con descargas offline.</p>
              <span className="jf-intro-download-cta">
                <DownloadSimple size={14} /> Descargar para móvil
              </span>
            </motion.a>
          </div>
        </section>

        <section className="jf-intro-features" id="informacion">
          <motion.div
            className="jf-intro-section-head"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="jf-intro-section-title">¿Qué es JodiFy?</h2>
            <p className="jf-intro-section-sub">Todo lo que podés hacer dentro de la aplicación</p>
          </motion.div>
          <div className="jf-intro-features-list">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <motion.article
                key={title}
                className="jf-intro-feature"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.07, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="jf-intro-feature-icon">
                  <Icon size={20} weight="fill" />
                </span>
                <div className="jf-intro-feature-body">
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="jf-intro-cta">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="jf-intro-cta-title">Listo para escuchar?</h2>
            <p className="jf-intro-cta-text">Creá tu cuenta gratis, canjeá un código de acceso o entrá como invitado.</p>
            <button type="button" className="jf-btn jf-btn--primary jf-btn--lg" onClick={() => navigate('/login')}>
              Ir al inicio de sesión <ArrowRight size={16} weight="bold" />
            </button>
          </motion.div>
        </section>
      </main>

      <footer className="jf-intro-footer">
        <span>
          Jodi<span>Fy</span>
        </span>
        <p>{APP_TAGLINE}</p>
      </footer>
    </div>
  );
}