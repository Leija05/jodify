import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkle, Minus, Play, Pause, Gear } from '@phosphor-icons/react';
import { useSession } from '../../context/SessionContext';
import { PixelPet } from './PixelPet';
import { useUiStore } from '../../store/ui.store';
import { usePlayerStore } from '../../store/player.store';

export function PetCompanionWidget() {
  const { session } = useSession();
  const ui = useUiStore();
  const isMusicPlaying = usePlayerStore((s) => s.isPlaying);

  // Estado de minimizado persistido en el almacenamiento local
  const [minimized, setMinimized] = useState(() => {
    try {
      return localStorage.getItem('jf_pet_minimized') === 'true';
    } catch {
      return false;
    }
  });

  const toggleMinimize = (val: boolean) => {
    setMinimized(val);
    try {
      localStorage.setItem('jf_pet_minimized', String(val));
    } catch {}
  };

  const petType = session?.pet_type;
  const petVariant = session?.pet_variant;
  const petName = session?.pet_name;

  const petDisplayName = useMemo(() => {
    if (petName) return petName;
    if (petType === 'cat') return 'Michi';
    if (petType === 'dog') return 'Perrito';
    if (petType === 'capybara') return 'Capibara';
    if (petType === 'magikarp') return 'Magikarp';
    if (petType === 'ghost') return 'Fantasmita';
    if (petType === 'dragon') return 'Dragoncito';
    return 'Compañero';
  }, [petName, petType]);

  // Posición actual de la mascota en pantalla
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 500, y: 350 };
    return {
      x: Math.max(40, window.innerWidth - 160),
      y: Math.max(80, window.innerHeight - 200),
    };
  });

  const [isWalking, setIsWalking] = useState(false);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [isStay, setIsStay] = useState(false); // Pausa de deambulación si el usuario quiere que se quede quieto
  const [walkDuration, setWalkDuration] = useState(3.5);
  const [thought, setThought] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const wanderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const arrivalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const thoughtTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Límites seguros en pantalla
  const getBounds = useCallback(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const h = typeof window !== 'undefined' ? window.innerHeight : 700;
    return {
      minX: 28,
      maxX: Math.max(80, w - 84),
      minY: 64, // debajo de la barra de título / cabecera
      maxY: Math.max(120, h - 135), // encima del reproductor inferior
    };
  }, []);

  // Pensamientos aleatorios de la mascota
  const popThought = useCallback((custom?: string) => {
    if (thoughtTimeoutRef.current) clearTimeout(thoughtTimeoutRef.current);
    const phrases = [
      '🐾 Explorando...',
      '♪ Vibing',
      '✨ ¡Buen ritmo!',
      '❤️ Paseando',
      '🍃 Chill...',
      '🐾 ¡Aventuras!',
      '🎵 ¡Me gusta este tema!',
      '✨ JodiFy vibes',
    ];
    setThought(custom || phrases[Math.floor(Math.random() * phrases.length)]);
    thoughtTimeoutRef.current = setTimeout(() => {
      setThought(null);
    }, 2800);
  }, []);

  // Bucle autónomo de movimiento por toda la pantalla a su voluntad
  useEffect(() => {
    if (!session || !petType || petType === 'none' || minimized || isStay) {
      setIsWalking(false);
      return;
    }

    const scheduleNextWander = () => {
      // Descansa entre 4 y 8.5 segundos antes de elegir nuevo destino
      const idleTime = Math.random() * 4500 + 4000;
      wanderTimeoutRef.current = setTimeout(() => {
        const bounds = getBounds();

        // Destino aleatorio dentro de los límites visibles de la aplicación
        const targetX = Math.round(bounds.minX + Math.random() * (bounds.maxX - bounds.minX));
        const targetY = Math.round(bounds.minY + Math.random() * (bounds.maxY - bounds.minY));

        setPosition((current) => {
          const dx = targetX - current.x;
          const dy = targetY - current.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 40) {
            scheduleNextWander();
            return current;
          }

          // Orientación hacia el sentido de marcha
          setFacing(dx < 0 ? -1 : 1);

          // Duración proporcional a la distancia recorrida
          const duration = Math.max(2.4, Math.min(6.5, dist / 85));
          setWalkDuration(duration);
          setIsWalking(true);

          if (arrivalTimeoutRef.current) clearTimeout(arrivalTimeoutRef.current);
          arrivalTimeoutRef.current = setTimeout(() => {
            setIsWalking(false);
            // 35% de probabilidad de mostrar una frase o pensamiento alegre al llegar
            if (Math.random() < 0.35) {
              popThought();
            }
            scheduleNextWander();
          }, duration * 1000);

          return { x: targetX, y: targetY };
        });
      }, idleTime);
    };

    scheduleNextWander();

    return () => {
      if (wanderTimeoutRef.current) clearTimeout(wanderTimeoutRef.current);
      if (arrivalTimeoutRef.current) clearTimeout(arrivalTimeoutRef.current);
      if (thoughtTimeoutRef.current) clearTimeout(thoughtTimeoutRef.current);
    };
  }, [session, petType, minimized, isStay, getBounds, popThought]);

  // Mantener mascota dentro de la ventana al cambiar tamaño
  useEffect(() => {
    const handleResize = () => {
      const bounds = getBounds();
      setPosition((curr) => ({
        x: Math.max(bounds.minX, Math.min(bounds.maxX, curr.x)),
        y: Math.max(bounds.minY, Math.min(bounds.maxY, curr.y)),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getBounds]);

  // Abrir / restaurar mascota desde el botón minimizado
  const handleOpenPet = () => {
    toggleMinimize(false);
    setTimeout(() => {
      popThought('¡Hola! ✨🐾');
    }, 450);
  };

  // Si el usuario no tiene mascota o no está logueado, no renderizar
  if (!session || !petType || petType === 'none') {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {!minimized ? (
          <motion.div
            key="roaming-pet"
            className={`jf-pet-roamer ${isWalking ? 'is-walking' : ''}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              x: position.x,
              y: position.y,
              opacity: 1,
              scale: 1,
            }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{
              x: { duration: isWalking ? walkDuration : 0.4, ease: 'easeInOut' },
              y: { duration: isWalking ? walkDuration : 0.4, ease: 'easeInOut' },
              opacity: { duration: 0.25 },
              scale: { duration: 0.25 },
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Sombra de apoyo en suelo */}
            <div className="jf-pet-roam-shadow" />

            {/* Bocadillo de pensamiento flotante autónomo */}
            <AnimatePresence>
              {thought && (
                <motion.div
                  key="pet-thought"
                  className="jf-pet-roam-thought"
                  initial={{ opacity: 0, y: 6, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                >
                  {thought}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Menú HUD flotante al pasar el cursor */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  key="pet-hud"
                  className="jf-pet-roam-hud"
                  initial={{ opacity: 0, y: 4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                >
                  <span className="jf-pet-roam-name">🐾 {petDisplayName}</span>
                  <div className="jf-pet-roam-actions">
                    <button
                      type="button"
                      className="jf-pet-roam-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsStay((prev) => !prev);
                      }}
                      title={isStay ? 'Reanudar paseo libre' : 'Quedarse aquí'}
                    >
                      {isStay ? <Play size={11} weight="fill" /> : <Pause size={11} weight="fill" />}
                    </button>
                    <button
                      type="button"
                      className="jf-pet-roam-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        ui.open('profile');
                      }}
                      title="Configurar mascota en Perfil"
                    >
                      <Gear size={11} />
                    </button>
                    <button
                      type="button"
                      className="jf-pet-roam-btn jf-pet-roam-btn--close"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMinimize(true);
                      }}
                      title="Minimizar mascota"
                    >
                      <Minus size={11} weight="bold" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mascota Pixel Art interactiva con paso de paseo y orientación */}
            <PixelPet
              petType={petType}
              variant={petVariant}
              petName={petName}
              size={56}
              interactive={true}
              isWalking={isWalking}
              facing={facing}
              isMusicPlaying={isMusicPlaying}
            />
          </motion.div>
        ) : (
          /* Botón minimizado en la esquina inferior para volver a abrirla */
          <motion.button
            key="minimized-btn"
            type="button"
            className="jf-pet-widget-minimized-btn"
            onClick={handleOpenPet}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.92 }}
            title="Llamar a mi mascota / Abrir compañero"
          >
            <Sparkle size={15} weight="fill" />
            <span>🐾</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
