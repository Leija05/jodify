import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkle } from '@phosphor-icons/react';
import { useSession } from '../../context/SessionContext';
import { PixelPet } from './PixelPet';
import { useUiStore } from '../../store/ui.store';

export function PetCompanionWidget() {
  const { session } = useSession();
  const ui = useUiStore();
  const [minimized, setMinimized] = useState(false);

  const petType = session?.pet_type;
  const petVariant = session?.pet_variant;
  const petName = session?.pet_name;

  // Si el usuario no tiene mascota equipada o no ha iniciado sesión, no mostrar widget
  if (!session || !petType || petType === 'none') {
    return null;
  }

  return (
    <div className={`jf-pet-widget-container ${minimized ? 'is-minimized' : ''}`}>
      <AnimatePresence>
        {!minimized ? (
          <motion.div
            className="jf-pet-widget-card"
            initial={{ opacity: 0, y: 20, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          >
            {/* Botón para minimizar / ocultar temporalmente */}
            <button
              type="button"
              className="jf-pet-widget-close"
              onClick={() => setMinimized(true)}
              aria-label="Minimizar mascota"
              title="Ocultar compañero"
            >
              <X size={12} weight="bold" />
            </button>

            {/* Mascota Pixel Art interactiva */}
            <div className="jf-pet-widget-avatar">
              <PixelPet
                petType={petType}
                variant={petVariant}
                petName={petName}
                size={58}
                interactive={true}
              />
            </div>

            <div className="jf-pet-widget-info" onClick={() => ui.open('profile')}>
              <p className="jf-pet-widget-title">
                {petName || (petType === 'cat' ? 'Michi' : petType === 'dog' ? 'Perrito' : petType)}
              </p>
              <p className="jf-pet-widget-sub">Compañero JodiFy</p>
            </div>
          </motion.div>
        ) : (
          <motion.button
            type="button"
            className="jf-pet-widget-minimized-btn"
            onClick={() => setMinimized(false)}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            title="Llamar a mi mascota"
          >
            <Sparkle size={14} weight="fill" />
            <span>🐾</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
