import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from '@phosphor-icons/react';
import { useUiStore, type ModalName } from '../../store/ui.store';

interface ModalProps {
  name: ModalName;
  title?: string;
  children: ReactNode;
  width?: number;
  className?: string;
  onClose?: () => void;
}

export function Modal({ name, title, children, width = 520, className, onClose }: ModalProps) {
  const modal = useUiStore((s) => s.modal);
  const close = useUiStore((s) => s.close);
  const open = modal === name;

  const handleClose = () => {
    if (onClose) onClose();
    close(name);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jf-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          data-testid={`modal-${name}`}
        >
          <motion.div
            className={`jf-modal-card ${className ?? ''}`}
            style={{ maxWidth: width }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          >
            {title !== undefined && (
              <header className="jf-modal-header">
                <h2 className="jf-modal-title">{title}</h2>
                <button className="jf-modal-close" aria-label="Cerrar" onClick={handleClose}>
                  <X size={18} />
                </button>
              </header>
            )}
            <div className="jf-modal-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
