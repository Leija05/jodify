import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkle } from '@phosphor-icons/react';

export interface ProfileEntranceAnimationProps {
  animationType?: string | null;
  animation?: string | null;
  username?: string;
  onComplete?: () => void;
}

export function ProfileEntranceAnimation({
  animationType: propType,
  animation,
  username,
  onComplete,
}: ProfileEntranceAnimationProps) {
  const animationType = propType || animation;
  const [active, setActive] = useState(true);

  useEffect(() => {
    setActive(true);
    const timer = setTimeout(() => {
      setActive(false);
      if (onComplete) onComplete();
    }, 2800);
    return () => clearTimeout(timer);
  }, [animationType, username, onComplete]);

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
              transition={{ duration: 1.8, ease: 'easeOut' }}
            />
            <motion.div
              className="jf-astral-ring jf-astral-ring--2"
              initial={{ scale: 0.1, opacity: 0 }}
              animate={{ scale: [0.1, 1.5, 2.8], opacity: [0, 0.7, 0] }}
              transition={{ duration: 1.8, delay: 0.2, ease: 'easeOut' }}
            />
            <motion.div
              className="jf-astral-burst"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.4, 1.6], opacity: [0, 0.9, 0] }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
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
              transition={{ duration: 1.2, ease: 'linear' }}
            />
            <motion.div
              className="jf-cyber-slice jf-cyber-slice--magenta"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: [ 60, -40, 10, 0 ], opacity: [ 0, 0.9, 0.7, 0 ] }}
              transition={{ duration: 1.2, delay: 0.05, ease: 'linear' }}
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
              animate={{ y: [80, 0, -10], scale: [0.6, 1.1, 1], opacity: [0, 1, 0.8] }}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
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
                  scaleY: [0.1, Math.random() * 0.9 + 0.3, Math.random() * 0.4 + 0.1],
                  opacity: [0, 0.85, 0],
                }}
                transition={{
                  duration: 1.4,
                  delay: i * 0.03,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}

        {/* 5. Brisa Sakura Neón */}
        {animationType === 'sakura-drift' && (
          <div className="jf-entrance-inner jf-sakura-stage">
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                className="jf-sakura-petal"
                style={{
                  left: `${(i * 5) + Math.random() * 4}%`,
                  animationDuration: `${1.6 + (i % 4) * 0.3}s`,
                  animationDelay: `${(i % 5) * 0.15}s`,
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
              animate={{ scale: [0, 2.2, 3], opacity: [0, 1, 0] }}
              transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.div
              className="jf-gold-rays"
              initial={{ rotate: 0, opacity: 0 }}
              animate={{ rotate: 90, opacity: [0, 0.9, 0] }}
              transition={{ duration: 2, ease: 'easeOut' }}
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
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="jf-abyss-ember"
                style={{
                  left: `${10 + i * 6}%`,
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
