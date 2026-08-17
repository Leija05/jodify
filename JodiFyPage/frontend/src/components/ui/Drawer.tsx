import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from '@phosphor-icons/react';
import { useUiStore, type ModalName } from '../../store/ui.store';

interface DrawerProps {
  name: ModalName;
  title?: string;
  children: ReactNode;
  position?: 'right' | 'bottom';
  onClose?: () => void;
}

export function Drawer({ name, title, children, position = 'right', onClose }: DrawerProps) {
  const modal = useUiStore((s) => s.modal);
  const close = useUiStore((s) => s.close);
  const open = modal === name;

  const handleClose = () => {
    if (onClose) onClose();
    close(name);
  };

  const hidden = position === 'right' ? { x: '100%' } : { y: '100%' };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="jf-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />
          <motion.aside
            className={`jf-drawer jf-drawer--${position}`}
            initial={hidden}
            animate={{ x: 0, y: 0 }}
            exit={hidden}
            transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
            data-testid={`drawer-${name}`}
          >
            {title !== undefined && (
              <header className="jf-drawer-header">
                <h2 className="jf-drawer-title">{title}</h2>
                <button className="jf-modal-close" aria-label="Cerrar" onClick={handleClose}>
                  <X size={18} />
                </button>
              </header>
            )}
            <div className="jf-drawer-body">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
