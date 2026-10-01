import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkle } from '@phosphor-icons/react';

export interface ProfileEntranceAnimationProps {
  animationType?: string | null;
  animation?: string | null;
  username?: string;
  onComplete?: () => void;
  loop?: boolean;
}

export function ProfileEntranceAnimation({
  animationType: propType,
  animation,
  username,
  onComplete,
  loop = false,
}: ProfileEntranceAnimationProps) {
  const animationType = propType || animation;
  const [active, setActive] = useState(true);

  useEffect(() => {
    setActive(true);
    if (loop) return;
    const timer = setTimeout(() => {
      setActive(false);
      if (onComplete) onComplete();
    }, 2800);
    return () => clearTimeout(timer);
  }, [animationType, username, onComplete, loop]);

  if (!animationType || animationType === 'none' || !active) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className={`jf-profile-entrance jf-entrance--${animationType}`} aria-hidden="true">
        {/* 1. Pulso Cósmico Astral */}
        {animationType === 'astral-pulse' && (
          <div className="jf-entrance-inner jf-astral-stage">
            <motion.div
              className="jf-astral-ring jf-astral-ring--1"
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 1.8, 3.2], opacity: [0, 0.8, 0] }}
              transition={{
                duration: 2.2,
                ease: 'easeOut',
                repeat: loop ? Infinity : 0,
                repeatDelay: loop ? 0.4 : 0,
              }}
            />
            <motion.div
              className="jf-astral-ring jf-astral-ring--2"
              initial={{ scale: 0.1, opacity: 0 }}
              animate={{ scale: [0.1, 1.5, 2.8], opacity: [0, 0.7, 0] }}
              transition={{
                duration: 2.2,
                delay: 0.3,
                ease: 'easeOut',
                repeat: loop ? Infinity : 0,
                repeatDelay: loop ? 0.4 : 0,
              }}
            />
            <motion.div
              className="jf-astral-burst"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.4, 1.6], opacity: [0, 0.9, 0] }}
              transition={{
                duration: 1.8,
                ease: [0.16, 1, 0.3, 1],
                repeat: loop ? Infinity : 0,
                repeatDelay: loop ? 0.6 : 0,
              }}
            />
            {Array.from({ length: 16 }).map((_, i) => (
              <span
                key={i}
                className="jf-astral-star"
                style={{
                  top: `${15 + Math.random() * 70}%`,
                  left: `${10 + Math.random() * 80}%`,
                  animationDelay: `${Math.random() * 0.8}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* 2. Cyber Matrix Glitch */}
        {animationType === 'cyber-glitch' && (
          <div className="jf-entrance-inner jf-cyber-stage">
            <div className="jf-cyber-scanlines" />
            <motion.div
              className="jf-cyber-slice jf-cyber-slice--cyan"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: [ -60, 40, -10, 0 ], opacity: [ 0, 0.9, 0.7, 0 ] }}
              transition={{
                duration: 1.4,
                ease: 'linear',
                repeat: loop ? Infinity : 0,
                repeatDelay: loop ? 0.9 : 0,
              }}
            />
            <motion.div
              className="jf-cyber-slice jf-cyber-slice--magenta"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: [ 60, -40, 10, 0 ], opacity: [ 0, 0.9, 0.7, 0 ] }}
              transition={{
                duration: 1.4,
                delay: 0.08,
                ease: 'linear',
                repeat: loop ? Infinity : 0,
                repeatDelay: loop ? 0.9 : 0,
              }}
            />
            <div className="jf-cyber-grid-flash" />
          </div>
        )}

        {/* 3. Atardecer Synthwave */}
        {animationType === 'synthwave-horizon' && (
          <div className="jf-entrance-inner jf-synth-stage">
            <motion.div
              className="jf-synth-sun"
              initial={{ y: 80, scale: 0.6, opacity: 0 }}
              animate={{
                y: loop ? [0, -8, 0] : [80, 0, -10],
                scale: loop ? [1, 1.05, 1] : [0.6, 1.1, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: loop ? 3.4 : 1.6,
                ease: 'easeInOut',
                repeat: loop ? Infinity : 0,
              }}
            />
            <div className="jf-synth-grid-floor" />
            <div className="jf-synth-flare" />
          </div>
        )}

        {/* 4. Ondas de Espectro Neón */}
        {animationType === 'neon-equalizer' && (
          <div className="jf-entrance-inner jf-equalizer-stage">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.span
                key={i}
                className="jf-eq-ray"
                initial={{ scaleY: 0.1, opacity: 0 }}
                animate={{
                  scaleY: [0.15, Math.random() * 0.85 + 0.25, Math.random() * 0.45 + 0.15],
                  opacity: loop ? [0.35, 0.9, 0.35] : [0, 0.85, 0],
                }}
                transition={{
                  duration: loop ? 0.7 + (i % 6) * 0.14 : 1.4,
                  delay: i * 0.02,
                  ease: 'easeInOut',
                  repeat: loop ? Infinity : 0,
                  repeatType: 'reverse',
                }}
              />
            ))}
          </div>
        )}

        {/* 5. Brisa Sakura Neón */}
        {animationType === 'sakura-drift' && (
          <div className="jf-entrance-inner jf-sakura-stage">
            {Array.from({ length: 22 }).map((_, i) => (
              <span
                key={i}
                className="jf-sakura-petal"
                style={{
                  left: `${(i * 4.6) + Math.random() * 4}%`,
                  animationDuration: `${1.8 + (i % 4) * 0.35}s`,
                  animationDelay: `${(i % 6) * 0.18}s`,
                }}
              />
            ))}
            <div className="jf-sakura-ambient-glow" />
          </div>
        )}

        {/* 6. Supernova Real Oro VIP */}
        {animationType === 'supernova-gold' && (
          <div className="jf-entrance-inner jf-gold-stage">
            <motion.div
              className="jf-gold-core"
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: loop ? [1.8, 2.5, 1.8] : [0, 2.2, 3],
                opacity: loop ? [0.55, 0.95, 0.55] : [0, 1, 0],
              }}
              transition={{
                duration: loop ? 2.6 : 1.8,
                ease: 'easeInOut',
                repeat: loop ? Infinity : 0,
              }}
            />
            <motion.div
              className="jf-gold-rays"
              initial={{ rotate: 0, opacity: 0 }}
              animate={{
                rotate: 360,
                opacity: loop ? [0.45, 0.8, 0.45] : [0, 0.9, 0],
              }}
              transition={{
                duration: loop ? 14 : 2,
                ease: loop ? 'linear' : 'easeOut',
                repeat: loop ? Infinity : 0,
              }}
            />
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="jf-gold-spark"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${15 + Math.random() * 70}%`,
                  animationDelay: `${Math.random() * 0.6}s`,
                }}
              >
                ✨
              </span>
            ))}
          </div>
        )}

        {/* 7. Fuego Abisal Violeta */}
        {animationType === 'abyssal-flame' && (
          <div className="jf-entrance-inner jf-abyss-stage">
            <div className="jf-abyss-ground-fire" />
            {Array.from({ length: 16 }).map((_, i) => (
              <span
                key={i}
                className="jf-abyss-ember"
                style={{
                  left: `${8 + i * 5.5}%`,
                  animationDuration: `${1.4 + Math.random() * 0.8}s`,
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Insignia / Marca JodiFy Pulse */}
        <div className="jf-entrance-badge-pill">
          <Sparkle size={13} weight="fill" />
          <span>JodiFy Pulse · {animationType.replace('-', ' ').toUpperCase()}</span>
        </div>
      </div>
    </AnimatePresence>
  );
}
