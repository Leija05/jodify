import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayerStore } from '../../store/player.store';

export interface PixelPetProps {
  petType?: string | null;
  type?: string | null;
  variant?: string | null;
  petName?: string | null;
  customName?: string | null;
  size?: number;
  scale?: number;
  interactive?: boolean;
  floating?: boolean;
  showBadge?: boolean;
  className?: string;
  isMusicPlaying?: boolean;
  isWalking?: boolean;
  isSleeping?: boolean;
  facing?: number;
  onClick?: () => void;
}

export function PixelPet({
  petType,
  type,
  variant = 'orange',
  petName,
  customName,
  size,
  scale,
  interactive = true,
  floating = false,
  showBadge = false,
  className = '',
  isMusicPlaying: propIsPlaying,
  isWalking = false,
  isSleeping = false,
  facing = 1,
  onClick,
}: PixelPetProps) {
  const storeIsMusicPlaying = usePlayerStore((s) => s.isPlaying);
  const isMusicPlaying = propIsPlaying !== undefined ? propIsPlaying : storeIsMusicPlaying;

  const [bounce, setBounce] = useState(false);
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [dialogue, setDialogue] = useState<string | null>(null);

  const activeType = petType || type || 'cat';
  const activeVariant = variant || (activeType === 'magikarp' ? 'classic' : 'orange');
  const activeName = petName || customName;
  const activeSize = size || (scale ? Math.round(scale * 24) : 54);

  // Sonidos / diálogos adorables según la especie
  const triggerReaction = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBounce(true);
    setTimeout(() => setBounce(false), 600);

    const newHeart = { id: Date.now(), x: (Math.random() - 0.5) * 28, y: -20 };
    setHearts((prev) => [...prev.slice(-3), newHeart]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1200);

    const phrases: Record<string, string[]> = {
      cat: ['¡Miau! ♪', '¡Prrr! ♥', '¡Nya! 🐾', '¡Vibing! 🎧'],
      dog: ['¡Guau! ♫', '¡Woof! ✨', '¡Amo este beat! ♥', '¡Cola feliz! ⚡'],
      axolotl: ['¡Glu glu! 🫧', '¡Bioluminiscencia! ⚡', '¡Sonrisa acuática! ♥', '¡Nadando al ritmo! 🌊'],
      magikarp: ['¡Splash! 💦', '¡Magikarp usó Splash! 🌊', '¡Boing! ⚡', '¡Shiny! ✨'],
      frog: ['¡Ribbit! 🌿', '¡Croac lo-fi! ☕', '¡Saltito rítmico! 🎶', '¡Champiñón beat! 🍄'],
      capybara: ['Chill... ☕', 'Paz interior 🌿', 'Buen tema... 🧘', 'Total relax ✨'],
      penguin: ['¡Noot noot! ❄️', '¡Deslizando en hielo! 🐧', '¡Suban los graves! 🎧', '¡Waddle beat! 🌊'],
      ghost: ['¡Booo! 👻', '¡Spooky beat! 🎧', '¡8-Bit vibes! 🕹️', '¡Flotando! 🌌'],
      fox: ['¡Yip yip! 🦊', '¡Fuego sónico! 🔥', '¡Cola esponjosa! ✨', '¡Ritmo astuto! 🎧'],
      robot: ['BEEP BOOP! ⚡', 'SYSTEM: 100% GROOVE 🤖', 'PROCESSING AUDIO... 🎧', 'DROP THE BASS! 💥'],
      dragon: ['¡Raaawr! 🔥', '¡Fuego sónico! 🐲', '¡Bajos pesados! ⚡', '¡Chispitas! ✨'],
    };

    const list = phrases[activeType] || ['¡Yay! ♪'];
    const chosen = list[Math.floor(Math.random() * list.length)];
    setDialogue(chosen);
    setTimeout(() => setDialogue(null), 1800);

    if (onClick) onClick();
  };

  if (!activeType || activeType === 'none') {
    return null;
  }

  return (
    <div
      className={`jf-pixel-pet-wrap ${floating ? 'is-floating' : ''} ${className}`}
      style={{ width: activeSize, height: activeSize }}
      onClick={interactive ? triggerReaction : onClick}
      title={activeName ? `${activeName} (${activeType})` : `Mascota JodiFy: ${activeType}`}
      role="button"
      tabIndex={interactive ? 0 : -1}
    >
      {/* Burbuja de diálogo / reacción interactiva */}
      <AnimatePresence>
        {dialogue && (
          <motion.div
            className="jf-pet-dialogue-bubble"
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: -18, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            {dialogue}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Partículas de corazones / notas al interactuar */}
      {hearts.map((h) => (
        <span
          key={h.id}
          className="jf-pet-heart-particle"
          style={{ transform: `translate(${h.x}px, ${h.y}px)` }}
        >
          ♥
        </span>
      ))}

      {/* Indicador de música activa o estado de siesta */}
      {isMusicPlaying && !isSleeping && (
        <span className="jf-pet-music-note" aria-hidden="true">
          ♪
        </span>
      )}

      {isSleeping && (
        <span className="jf-pet-sleep-snore" aria-hidden="true" title="Zzz... Durmiendo una siesta">
          z z Z
        </span>
      )}

      {/* Renderizado Pixel Art SVG de Alta Fidelidad */}
      <div
        className={`jf-pixel-pet-inner ${bounce ? 'is-bouncing' : ''} ${
          isSleeping ? 'is-sleeping' : isWalking ? 'is-walking' : isMusicPlaying ? 'is-dancing' : 'is-idle'
        }`}
        style={{
          transform: facing === -1 ? 'scaleX(-1)' : 'scaleX(1)',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <PixelPetSvg type={activeType} variant={activeVariant} isPlaying={isMusicPlaying && !isSleeping} />
      </div>

      {showBadge && (
        <div className="jf-pet-tag-pill">
          <span className="jf-pet-tag-name">{activeName || activeType}</span>
        </div>
      )}
    </div>
  );
}

// Componente de Dibujo Pixel Art mediante SVG de cuadrícula precisa
function PixelPetSvg({
  type,
  variant,
  isPlaying,
}: {
  type: string;
  variant: string;
  isPlaying: boolean;
}) {
  switch (type) {
    case 'dog':
      return <PixelDog variant={variant} isPlaying={isPlaying} />;
    case 'axolotl':
      return <PixelAxolotl variant={variant} isPlaying={isPlaying} />;
    case 'magikarp':
      return <PixelMagikarp variant={variant} isPlaying={isPlaying} />;
    case 'frog':
      return <PixelFrog variant={variant} isPlaying={isPlaying} />;
    case 'capybara':
      return <PixelCapybara variant={variant} isPlaying={isPlaying} />;
    case 'penguin':
      return <PixelPenguin variant={variant} isPlaying={isPlaying} />;
    case 'ghost':
      return <PixelGhost variant={variant} isPlaying={isPlaying} />;
    case 'fox':
      return <PixelFox variant={variant} isPlaying={isPlaying} />;
    case 'robot':
      return <PixelRobot variant={variant} isPlaying={isPlaying} />;
    case 'dragon':
      return <PixelDragon variant={variant} isPlaying={isPlaying} />;
    case 'cat':
    default:
      return <PixelCat variant={variant} isPlaying={isPlaying} />;
  }
}

// 1. Gato Pixel Art
function PixelCat({ variant, isPlaying }: { variant: string; isPlaying: boolean }) {
  // Paletas según variante
  let main = '#f97316'; // orange
  let shadow = '#ea580c';
  let belly = '#fef08a';
  let eye = '#10b981';
  let ear = '#fb7185';

  if (variant === 'black') {
    main = '#18181b';
    shadow = '#09090b';
    belly = '#27272a';
    eye = '#facc15';
    ear = '#f472b6';
  } else if (variant === 'white') {
    main = '#ffffff';
    shadow = '#e2e8f0';
    belly = '#f1f5f9';
    eye = '#38bdf8'; // Ojos celestes
    ear = '#fbcfe8';
  } else if (variant === 'siamese') {
    main = '#fde68a';
    shadow = '#b45309';
    belly = '#fef3c7';
    eye = '#2563eb';
    ear = '#78350f';
  } else if (variant === 'calico') {
    main = '#f97316';
    shadow = '#18181b';
    belly = '#ffffff';
    eye = '#fbbf24';
    ear = '#fb7185';
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      className="jf-svg-pet"
    >
      {/* Orejas */}
      <rect x="5" y="4" width="3" height="3" fill={shadow} />
      <rect x="6" y="5" width="2" height="2" fill={ear} />
      <rect x="16" y="4" width="3" height="3" fill={shadow} />
      <rect x="16" y="5" width="2" height="2" fill={ear} />

      {/* Cabeza */}
      <rect x="6" y="7" width="12" height="7" fill={main} />
      <rect x="5" y="8" width="14" height="5" fill={main} />

      {/* Ojos */}
      {isPlaying ? (
        <>
          {/* Ojitos felices cerrados en arco ^^ */}
          <rect x="7" y="9" width="3" height="1" fill="#0f172a" />
          <rect x="7" y="10" width="1" height="1" fill="#0f172a" />
          <rect x="9" y="10" width="1" height="1" fill="#0f172a" />
          <rect x="14" y="9" width="3" height="1" fill="#0f172a" />
          <rect x="14" y="10" width="1" height="1" fill="#0f172a" />
          <rect x="16" y="10" width="1" height="1" fill="#0f172a" />
        </>
      ) : (
        <>
          {/* Ojos grandes con brillo */}
          <rect x="7" y="9" width="3" height="3" fill={eye} />
          <rect x="8" y="9" width="1" height="1" fill="#ffffff" />
          <rect x="14" y="9" width="3" height="3" fill={eye} />
          <rect x="15" y="9" width="1" height="1" fill="#ffffff" />
        </>
      )}

      {/* Nariz & Bigotes */}
      <rect x="11" y="11" width="2" height="1" fill={ear} />
      <rect x="4" y="11" width="2" height="1" fill="#475569" />
      <rect x="18" y="11" width="2" height="1" fill="#475569" />
      <rect x="4" y="13" width="2" height="1" fill="#475569" />
      <rect x="18" y="13" width="2" height="1" fill="#475569" />

      {/* Cuerpo */}
      <rect x="7" y="14" width="10" height="7" fill={main} />
      <rect x="9" y="15" width="6" height="5" fill={belly} />

      {/* Patitas */}
      <rect x="7" y="21" width="3" height="2" fill={shadow} />
      <rect x="14" y="21" width="3" height="2" fill={shadow} />

      {/* Cola alegre */}
      <rect x="17" y="16" width="3" height="2" fill={shadow} />
      <rect x="19" y="14" width="2" height="3" fill={shadow} />
      <rect x="20" y="12" width="2" height="3" fill={main} />
    </svg>
  );
}

// 2. Perro Pixel Art
function PixelDog({ variant, isPlaying }: { variant: string; isPlaying: boolean }) {
  let main = '#f59e0b'; // shiba
  let shadow = '#d97706';
  let faceWhite = '#fef3c7';
  let nose = '#18181b';
  let tongue = '#f43f5e';

  if (variant === 'corgi') {
    main = '#ea580c';
    shadow = '#c2410c';
    faceWhite = '#ffffff';
  } else if (variant === 'husky') {
    main = '#334155';
    shadow = '#1e293b';
    faceWhite = '#ffffff';
  } else if (variant === 'dalmatian') {
    main = '#f8fafc';
    shadow = '#0f172a';
    faceWhite = '#ffffff';
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      className="jf-svg-pet"
    >
      {/* Orejas triangulares */}
      <rect x="5" y="4" width="3" height="4" fill={shadow} />
      <rect x="16" y="4" width="3" height="4" fill={shadow} />

      {/* Cabeza */}
      <rect x="6" y="7" width="12" height="7" fill={main} />
      <rect x="5" y="8" width="14" height="6" fill={main} />
      <rect x="8" y="10" width="8" height="4" fill={faceWhite} />

      {/* Ojos */}
      {isPlaying ? (
        <>
          <rect x="7" y="9" width="3" height="1" fill="#0f172a" />
          <rect x="14" y="9" width="3" height="1" fill="#0f172a" />
        </>
      ) : (
        <>
          <rect x="7" y="9" width="2" height="2" fill="#0f172a" />
          <rect x="8" y="9" width="1" height="1" fill="#ffffff" />
          <rect x="15" y="9" width="2" height="2" fill="#0f172a" />
          <rect x="16" y="9" width="1" height="1" fill="#ffffff" />
        </>
      )}

      {/* Hociquito y lengua sonriente */}
      <rect x="11" y="11" width="2" height="2" fill={nose} />
      <rect x="11" y="13" width="2" height="2" fill={tongue} />

      {/* Manchas si es dálmata */}
      {variant === 'dalmatian' && (
        <>
          <rect x="7" y="8" width="2" height="1" fill="#0f172a" />
          <rect x="15" y="15" width="2" height="2" fill="#0f172a" />
          <rect x="8" y="18" width="2" height="2" fill="#0f172a" />
        </>
      )}

      {/* Cuerpo */}
      <rect x="7" y="14" width="10" height="7" fill={main} />
      <rect x="9" y="15" width="6" height="5" fill={faceWhite} />

      {/* Patitas */}
      <rect x="7" y="21" width="3" height="2" fill={faceWhite} />
      <rect x="14" y="21" width="3" height="2" fill={faceWhite} />

      {/* Cola feliz */}
      <rect x="17" y="16" width="3" height="2" fill={shadow} />
      <rect x="19" y="14" width="2" height="3" fill={shadow} />
      <rect x="20" y="13" width="2" height="2" fill={faceWhite} />
    </svg>
  );
}

// 3. Magikarp Pixel Art
function PixelMagikarp({ variant, isPlaying }: { variant: string; isPlaying: boolean }) {
  const isGold = variant === 'golden';
  const body = isGold ? '#fbbf24' : '#ef4444';
  const bodyShadow = isGold ? '#d97706' : '#b91c1c';
  const crown = isGold ? '#f8fafc' : '#facc15';
  const whisker = isGold ? '#ffffff' : '#fbbf24';
  const eye = '#ffffff';

  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      className="jf-svg-pet"
    >
      {/* Corona / Aleta dorsal */}
      <rect x="9" y="3" width="3" height="3" fill={crown} />
      <rect x="13" y="2" width="3" height="4" fill={crown} />
      <rect x="17" y="4" width="2" height="3" fill={crown} />

      {/* Cuerpo pez */}
      <rect x="5" y="7" width="14" height="10" fill={body} />
      <rect x="4" y="8" width="16" height="8" fill={body} />
      <rect x="7" y="17" width="10" height="2" fill={bodyShadow} />

      {/* Ojo grande salton */}
      <rect x="6" y="8" width="5" height="5" fill={eye} />
      <rect x="8" y="9" width="3" height="3" fill="#0f172a" />
      <rect x="8" y="9" width="1" height="1" fill="#ffffff" />

      {/* Boca abierta carpa */}
      <rect x="3" y="11" width="2" height="3" fill="#f43f5e" />
      <rect x="4" y="12" width="1" height="2" fill="#881337" />

      {/* Bigote largo icónico */}
      <rect x="7" y="13" width="2" height="2" fill={whisker} />
      <rect x="5" y="15" width="3" height="2" fill={whisker} />
      <rect x="3" y="17" width="3" height="2" fill={whisker} />
      <rect x="2" y="19" width="2" height="3" fill={whisker} />

      {/* Escama blanca de costado */}
      <rect x="12" y="10" width="3" height="3" fill="#ffffff" />
      <rect x="13" y="11" width="1" height="1" fill={bodyShadow} />

      {/* Cola de pez */}
      <rect x="19" y="9" width="3" height="6" fill={crown} />
      <rect x="21" y="8" width="2" height="8" fill={crown} />

      {/* Efecto de salpicadura de agua al reproducir música */}
      {isPlaying && (
        <>
          <rect x="1" y="7" width="2" height="2" fill="#38bdf8" />
          <rect x="21" y="18" width="2" height="2" fill="#38bdf8" />
          <rect x="18" y="21" width="2" height="2" fill="#38bdf8" />
        </>
      )}
    </svg>
  );
}

// 4. Capibara Zen
function PixelCapybara({ variant, isPlaying }: { variant: string; isPlaying: boolean }) {
  const main = variant === 'zen' ? '#b45309' : '#92400e';
  const shadow = variant === 'zen' ? '#854d0e' : '#78350f';
  const snout = '#451a03';
  const orange = '#ea580c';
  const leaf = '#22c55e';

  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      className="jf-svg-pet"
    >
      {/* Mandarina en la cabeza (Chill Icon) */}
      <rect x="10" y="3" width="4" height="3" fill={orange} />
      <rect x="11" y="2" width="2" height="1" fill={leaf} />

      {/* Cabeza ancha */}
      <rect x="6" y="6" width="12" height="8" fill={main} />
      <rect x="5" y="7" width="14" height="6" fill={main} />

      {/* Orejita redonda */}
      <rect x="15" y="6" width="3" height="2" fill={shadow} />

      {/* Ojo zen cerrado en línea recta */}
      <rect x="8" y="9" width="3" height="1" fill="#0f172a" />
      <rect x="9" y="10" width="1" height="1" fill="#0f172a" />

      {/* Hocico cuadrado */}
      <rect x="5" y="10" width="4" height="4" fill={snout} />
      <rect x="6" y="11" width="2" height="1" fill="#0f172a" />

      {/* Cuerpo robusto */}
      <rect x="8" y="12" width="12" height="9" fill={main} />
      <rect x="9" y="13" width="10" height="7" fill={shadow} />

      {/* Patitas cortas */}
      <rect x="8" y="21" width="3" height="2" fill={snout} />
      <rect x="15" y="21" width="3" height="2" fill={snout} />

      {/* Vapor de agua / relax cuando hay música */}
      {isPlaying && (
        <>
          <rect x="15" y="2" width="1" height="2" fill="#94a3b8" opacity="0.6" />
          <rect x="17" y="1" width="1" height="2" fill="#94a3b8" opacity="0.4" />
        </>
      )}
    </svg>
  );
}

// 5. Fantasmita 8-Bit Boo
function PixelGhost({ variant, isPlaying }: { variant: string; isPlaying: boolean }) {
  const isNeon = variant === 'neon';
  const body = isNeon ? '#c084fc' : '#e0f2fe';
  const shadow = isNeon ? '#7e22ce' : '#38bdf8';
  const blush = '#f472b6';

  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      className="jf-svg-pet"
    >
      {/* Auriculares gamer */}
      <rect x="5" y="5" width="14" height="2" fill="#0f172a" />
      <rect x="4" y="6" width="2" height="5" fill="#f43f5e" />
      <rect x="18" y="6" width="2" height="5" fill="#f43f5e" />

      {/* Cuerpo flotante */}
      <rect x="6" y="6" width="12" height="13" fill={body} />
      <rect x="5" y="7" width="14" height="11" fill={body} />

      {/* Ojos */}
      {isPlaying ? (
        <>
          <rect x="8" y="10" width="3" height="1" fill="#0f172a" />
          <rect x="13" y="10" width="3" height="1" fill="#0f172a" />
        </>
      ) : (
        <>
          <rect x="8" y="9" width="2" height="3" fill="#0f172a" />
          <rect x="9" y="9" width="1" height="1" fill="#ffffff" />
          <rect x="14" y="9" width="2" height="3" fill="#0f172a" />
          <rect x="15" y="9" width="1" height="1" fill="#ffffff" />
        </>
      )}

      {/* Mejillas sonrojadas */}
      <rect x="6" y="12" width="2" height="1" fill={blush} />
      <rect x="16" y="12" width="2" height="1" fill={blush} />

      {/* Boquita */}
      <rect x="11" y="12" width="2" height="1" fill="#0f172a" />

      {/* Cola espectral con picos */}
      <rect x="5" y="18" width="3" height="3" fill={shadow} />
      <rect x="9" y="17" width="2" height="3" fill={shadow} />
      <rect x="13" y="18" width="2" height="3" fill={shadow} />
      <rect x="16" y="17" width="3" height="3" fill={shadow} />
    </svg>
  );
}

// 6. Dragoncito Chibi
function PixelDragon({ variant, isPlaying }: { variant: string; isPlaying: boolean }) {
  const isAstral = variant === 'astral';
  const body = isAstral ? '#818cf8' : '#e11d48';
  const shadow = isAstral ? '#4338ca' : '#9f1239';
  const belly = isAstral ? '#c7d2fe' : '#fecdd3';
  const horn = '#facc15';

  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      className="jf-svg-pet"
    >
      {/* Cuernos dorados */}
      <rect x="6" y="3" width="2" height="3" fill={horn} />
      <rect x="16" y="3" width="2" height="3" fill={horn} />

      {/* Cabeza */}
      <rect x="6" y="6" width="12" height="7" fill={body} />
      <rect x="5" y="7" width="14" height="5" fill={body} />

      {/* Ojos dorados reptilianos */}
      <rect x="7" y="8" width="3" height="3" fill={horn} />
      <rect x="8" y="8" width="1" height="3" fill="#0f172a" />
      <rect x="14" y="8" width="3" height="3" fill={horn} />
      <rect x="15" y="8" width="1" height="3" fill="#0f172a" />

      {/* Alitas de murciélago */}
      <rect x="3" y="11" width="3" height="4" fill={shadow} />
      <rect x="18" y="11" width="3" height="4" fill={shadow} />

      {/* Cuerpo y pecho */}
      <rect x="7" y="13" width="10" height="8" fill={body} />
      <rect x="9" y="14" width="6" height="5" fill={belly} />

      {/* Patitas */}
      <rect x="7" y="21" width="3" height="2" fill={shadow} />
      <rect x="14" y="21" width="3" height="2" fill={shadow} />

      {/* Chispa de fuego si hay música */}
      {isPlaying && (
        <>
          <rect x="11" y="11" width="2" height="2" fill="#f97316" />
          <rect x="12" y="10" width="1" height="1" fill="#facc15" />
        </>
      )}
    </svg>
  );
}

// 7. Ajolote Mágico Pixel Art
function PixelAxolotl({ variant, isPlaying }: { variant: string; isPlaying: boolean }) {
  let body = '#f472b6';
  let gills = '#fb7185';
  let belly = '#fbcfe8';
  let eyes = '#0f172a';
  let sparkles = '#ffffff';

  if (variant === 'neon_cyan') {
    body = '#06b6d4';
    gills = '#22d3ee';
    belly = '#a5f3fc';
    eyes = '#083344';
    sparkles = '#cffafe';
  } else if (variant === 'abyssal') {
    body = '#4c1d95';
    gills = '#eab308';
    belly = '#7c3aed';
    eyes = '#facc15';
    sparkles = '#fde047';
  }

  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" shapeRendering="crispEdges" className="jf-svg-pet">
      {/* Branquias externas - Izquierda */}
      <rect x="2" y="6" width="3" height="2" fill={gills} />
      <rect x="1" y="8" width="4" height="2" fill={gills} />
      <rect x="2" y="10" width="3" height="2" fill={gills} />

      {/* Branquias externas - Derecha */}
      <rect x="19" y="6" width="3" height="2" fill={gills} />
      <rect x="19" y="8" width="4" height="2" fill={gills} />
      <rect x="19" y="10" width="3" height="2" fill={gills} />

      {/* Cabeza ancha y amigable */}
      <rect x="5" y="7" width="14" height="7" fill={body} />
      <rect x="6" y="6" width="12" height="9" fill={body} />

      {/* Ojos y mejillas sonrojadas */}
      {isPlaying ? (
        <>
          <rect x="7" y="9" width="3" height="1" fill={eyes} />
          <rect x="14" y="9" width="3" height="1" fill={eyes} />
        </>
      ) : (
        <>
          <rect x="7" y="9" width="2" height="2" fill={eyes} />
          <rect x="8" y="9" width="1" height="1" fill={sparkles} />
          <rect x="15" y="9" width="2" height="2" fill={eyes} />
          <rect x="16" y="9" width="1" height="1" fill={sparkles} />
        </>
      )}
      <rect x="6" y="11" width="2" height="1" fill={gills} />
      <rect x="16" y="11" width="2" height="1" fill={gills} />

      {/* Sonrisa chibi */}
      <rect x="10" y="11" width="4" height="1" fill={eyes} />
      <rect x="11" y="12" width="2" height="1" fill={eyes} />

      {/* Cuerpo y panza suave */}
      <rect x="7" y="14" width="10" height="6" fill={body} />
      <rect x="9" y="14" width="6" height="5" fill={belly} />

      {/* Patitas delanteras */}
      <rect x="5" y="17" width="2" height="3" fill={body} />
      <rect x="17" y="17" width="2" height="3" fill={body} />

      {/* Cola ondulante con aleta transparente */}
      <rect x="11" y="20" width="2" height="3" fill={gills} opacity="0.9" />
      <rect x="10" y="21" width="4" height="2" fill={gills} opacity="0.75" />

      {/* Burbujitas bioluminiscentes cuando suena música */}
      {isPlaying && (
        <>
          <rect x="3" y="3" width="1" height="1" fill={sparkles} />
          <rect x="20" y="4" width="2" height="2" fill={gills} />
          <rect x="2" y="14" width="1" height="1" fill={gills} />
        </>
      )}
    </svg>
  );
}

// 8. Ranita Lo-Fi Pixel Art
function PixelFrog({ variant, isPlaying }: { variant: string; isPlaying: boolean }) {
  let body = '#10b981';
  let shadow = '#059669';
  let belly = '#a7f3d0';
  let eyes = '#0f172a';
  let leaf = '#22c55e';

  if (variant === 'poison_dart') {
    body = '#3b82f6';
    shadow = '#1d4ed8';
    belly = '#1e293b';
    eyes = '#facc15';
    leaf = '#06b6d4';
  } else if (variant === 'golden_frog') {
    body = '#fbbf24';
    shadow = '#d97706';
    belly = '#fef08a';
    eyes = '#0f172a';
    leaf = '#f59e0b';
  }

  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" shapeRendering="crispEdges" className="jf-svg-pet">
      {/* Hojita Lo-Fi en la coronilla */}
      <rect x="11" y="2" width="2" height="3" fill={leaf} />
      <rect x="10" y="3" width="4" height="2" fill={leaf} />

      {/* Ojos saltones de sapito en la parte superior */}
      <rect x="5" y="5" width="4" height="4" fill={body} />
      <rect x="15" y="5" width="4" height="4" fill={body} />
      <rect x="6" y="6" width="2" height="2" fill={eyes} />
      <rect x="7" y="6" width="1" height="1" fill="#ffffff" />
      <rect x="16" y="6" width="2" height="2" fill={eyes} />
      <rect x="17" y="6" width="1" height="1" fill="#ffffff" />

      {/* Cabeza ancha */}
      <rect x="4" y="8" width="16" height="6" fill={body} />
      <rect x="5" y="9" width="14" height="5" fill={body} />

      {/* Gran boca sonriente de ranita */}
      {isPlaying ? (
        <>
          <rect x="8" y="11" width="8" height="2" fill="#0f172a" />
          <rect x="9" y="12" width="6" height="2" fill="#f43f5e" />
        </>
      ) : (
        <rect x="8" y="11" width="8" height="1" fill="#064e3b" />
      )}

      {/* Mejillitas rubor */}
      <rect x="5" y="11" width="2" height="1" fill="#f472b6" />
      <rect x="17" y="11" width="2" height="1" fill="#f472b6" />

      {/* Cuerpo y vientre claro */}
      <rect x="6" y="14" width="12" height="6" fill={body} />
      <rect x="8" y="14" width="8" height="5" fill={belly} />

      {/* Patitas traseras dobladas (posición de anfibio) */}
      <rect x="3" y="16" width="3" height="4" fill={shadow} />
      <rect x="18" y="16" width="3" height="4" fill={shadow} />
      <rect x="2" y="20" width="4" height="2" fill={body} />
      <rect x="18" y="20" width="4" height="2" fill={body} />

      {/* Patitas delanteras */}
      <rect x="8" y="19" width="2" height="3" fill={body} />
      <rect x="14" y="19" width="2" height="3" fill={body} />
    </svg>
  );
}

// 9. Pingüinito DJ Pixel Art
function PixelPenguin({ variant, isPlaying }: { variant: string; isPlaying: boolean }) {
  let coat = '#0f172a';
  let belly = '#ffffff';
  let beak = '#f97316';
  let phoneArch = '#6366f1';
  let phoneCushion = '#f43f5e';
  let eye = '#0f172a';

  if (variant === 'gentoo') {
    coat = '#1e293b';
    belly = '#fef3c7';
    beak = '#eab308';
    phoneArch = '#ffd700';
    phoneCushion = '#f59e0b';
  } else if (variant === 'cyber_penguin') {
    coat = '#0284c7';
    belly = '#e0f2fe';
    beak = '#00f0ff';
    phoneArch = '#38bdf8';
    phoneCushion = '#a855f7';
    eye = '#00f0ff';
  }

  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" shapeRendering="crispEdges" className="jf-svg-pet">
      {/* Auriculares DJ sobre la cabeza */}
      <rect x="7" y="3" width="10" height="2" fill={phoneArch} />
      <rect x="4" y="5" width="3" height="5" fill={phoneCushion} />
      <rect x="17" y="5" width="3" height="5" fill={phoneCushion} />

      {/* Cabeza redonda */}
      <rect x="6" y="5" width="12" height="8" fill={coat} />
      <rect x="7" y="6" width="10" height="7" fill={coat} />

      {/* Ojos redondos */}
      {isPlaying ? (
        <>
          <rect x="8" y="7" width="2" height="1" fill={eye} />
          <rect x="14" y="7" width="2" height="1" fill={eye} />
        </>
      ) : (
        <>
          <rect x="8" y="7" width="2" height="2" fill="#ffffff" />
          <rect x="9" y="7" width="1" height="2" fill={eye} />
          <rect x="14" y="7" width="2" height="2" fill="#ffffff" />
          <rect x="14" y="7" width="1" height="2" fill={eye} />
        </>
      )}

      {/* Pico triangular */}
      <rect x="11" y="9" width="2" height="2" fill={beak} />
      <rect x="10" y="10" width="4" height="1" fill={beak} />

      {/* Cuerpo tuxedo */}
      <rect x="6" y="13" width="12" height="8" fill={coat} />
      <rect x="8" y="13" width="8" height="7" fill={belly} />

      {/* Alitas / Aletas que se mueven con el ritmo */}
      {isPlaying ? (
        <>
          <rect x="3" y="12" width="3" height="4" fill={coat} />
          <rect x="18" y="12" width="3" height="4" fill={coat} />
        </>
      ) : (
        <>
          <rect x="4" y="14" width="2" height="5" fill={coat} />
          <rect x="18" y="14" width="2" height="5" fill={coat} />
        </>
      )}

      {/* Patitas anaranjadas */}
      <rect x="8" y="21" width="3" height="2" fill={beak} />
      <rect x="13" y="21" width="3" height="2" fill={beak} />
    </svg>
  );
}

// 10. Zorrito Kitsune Pixel Art
function PixelFox({ variant, isPlaying }: { variant: string; isPlaying: boolean }) {
  let main = '#f97316';
  let shadow = '#ea580c';
  let white = '#ffffff';
  let eye = '#10b981';
  let nose = '#18181b';

  if (variant === 'arctic') {
    main = '#f1f5f9';
    shadow = '#cbd5e1';
    white = '#ffffff';
    eye = '#0284c7';
    nose = '#0f172a';
  } else if (variant === 'spirit') {
    main = '#c084fc';
    shadow = '#9333ea';
    white = '#f3e8ff';
    eye = '#facc15';
    nose = '#581c87';
  }

  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" shapeRendering="crispEdges" className="jf-svg-pet">
      {/* Orejas puntiagudas con puntas oscuras */}
      <rect x="4" y="3" width="4" height="4" fill={shadow} />
      <rect x="5" y="4" width="2" height="2" fill={white} />
      <rect x="16" y="3" width="4" height="4" fill={shadow} />
      <rect x="17" y="4" width="2" height="2" fill={white} />

      {/* Cabeza astuta */}
      <rect x="5" y="7" width="14" height="6" fill={main} />
      <rect x="4" y="8" width="16" height="5" fill={main} />

      {/* Mejillas blancas de zorro */}
      <rect x="4" y="10" width="3" height="3" fill={white} />
      <rect x="17" y="10" width="3" height="3" fill={white} />

      {/* Ojos gatunos / zorrunos */}
      {isPlaying ? (
        <>
          <rect x="7" y="9" width="3" height="1" fill="#0f172a" />
          <rect x="14" y="9" width="3" height="1" fill="#0f172a" />
        </>
      ) : (
        <>
          <rect x="7" y="8" width="2" height="2" fill={eye} />
          <rect x="8" y="8" width="1" height="1" fill="#ffffff" />
          <rect x="15" y="8" width="2" height="2" fill={eye} />
          <rect x="16" y="8" width="1" height="1" fill="#ffffff" />
        </>
      )}

      {/* Hociquito y nariz */}
      <rect x="11" y="11" width="2" height="2" fill={nose} />
      <rect x="10" y="12" width="4" height="2" fill={white} />

      {/* Pecho y cuerpo */}
      <rect x="7" y="13" width="10" height="8" fill={main} />
      <rect x="9" y="14" width="6" height="5" fill={white} />

      {/* Patitas */}
      <rect x="7" y="21" width="3" height="2" fill={shadow} />
      <rect x="14" y="21" width="3" height="2" fill={shadow} />

      {/* Gran cola esponjosa con punta blanca */}
      <rect x="17" y="14" width="4" height="4" fill={main} />
      <rect x="19" y="12" width="3" height="4" fill={main} />
      <rect x="20" y="10" width="3" height="3" fill={white} />
    </svg>
  );
}

// 11. CyberBot 808 Pixel Art
function PixelRobot({ variant, isPlaying }: { variant: string; isPlaying: boolean }) {
  let body = '#64748b';
  let screen = '#0f172a';
  let matrix = '#38bdf8';
  let accent = '#f43f5e';
  let bolts = '#94a3b8';

  if (variant === 'neon_matrix') {
    body = '#1e293b';
    screen = '#022c22';
    matrix = '#22c55e';
    accent = '#10b981';
    bolts = '#334155';
  } else if (variant === 'golden_mech') {
    body = '#eab308';
    screen = '#451a03';
    matrix = '#fef08a';
    accent = '#f97316';
    bolts = '#fef08a';
  }

  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" shapeRendering="crispEdges" className="jf-svg-pet">
      {/* Antena con luz parpadeante */}
      <rect x="11" y="2" width="2" height="3" fill={bolts} />
      <rect x="10" y="1" width="4" height="2" fill={isPlaying ? accent : '#94a3b8'} />

      {/* Cabeza Monitor CRT */}
      <rect x="5" y="5" width="14" height="8" fill={body} />
      <rect x="6" y="6" width="12" height="6" fill={screen} />

      {/* Expresión en pantalla digital de matriz */}
      {isPlaying ? (
        <>
          {/* Ojos ecualizador musical animado */}
          <rect x="8" y="8" width="3" height="1" fill={matrix} />
          <rect x="8" y="7" width="1" height="1" fill={matrix} />
          <rect x="10" y="7" width="1" height="1" fill={matrix} />
          <rect x="13" y="8" width="3" height="1" fill={matrix} />
          <rect x="13" y="7" width="1" height="1" fill={matrix} />
          <rect x="15" y="7" width="1" height="1" fill={matrix} />
          <rect x="10" y="10" width="4" height="1" fill={matrix} />
        </>
      ) : (
        <>
          {/* Ojos digitales [ • • ] */}
          <rect x="8" y="8" width="2" height="2" fill={matrix} />
          <rect x="14" y="8" width="2" height="2" fill={matrix} />
          <rect x="10" y="10" width="4" height="1" fill={matrix} />
        </>
      )}

      {/* Tornillitos laterales */}
      <rect x="4" y="8" width="1" height="2" fill={bolts} />
      <rect x="19" y="8" width="1" height="2" fill={bolts} />

      {/* Cuello / Junta metálica */}
      <rect x="10" y="13" width="4" height="1" fill={bolts} />

      {/* Chasis / Cuerpo */}
      <rect x="6" y="14" width="12" height="7" fill={body} />

      {/* Ecualizador LED en el pecho */}
      <rect x="8" y="16" width="2" height="3" fill={isPlaying ? accent : bolts} />
      <rect x="11" y="15" width="2" height="4" fill={isPlaying ? matrix : bolts} />
      <rect x="14" y="17" width="2" height="2" fill={isPlaying ? accent : bolts} />

      {/* Pies mecánicos */}
      <rect x="6" y="21" width="4" height="2" fill={bolts} />
      <rect x="14" y="21" width="4" height="2" fill={bolts} />
    </svg>
  );
}

