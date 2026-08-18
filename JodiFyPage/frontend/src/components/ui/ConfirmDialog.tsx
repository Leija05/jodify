import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { WarningCircle } from '@phosphor-icons/react';
import { Button } from './Button';
import { useConfirmStore } from '../../store/confirm.store';

export function ConfirmDialog() {
  const item = useConfirmStore((s) => s.item);
  const resolve = useConfirmStore((s) => s.resolve);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolve(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, resolve]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="jf-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) resolve(false);
          }}
          data-testid="confirm-dialog"
        >
          <motion.div
            className="jf-confirm-card"
            role="alertdialog"
            aria-modal="true"
            aria-label={item.title}
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={`jf-confirm-icon is-${item.tone ?? 'primary'}`}>
              <WarningCircle size={22} weight="fill" />
            </div>
            <div className="jf-confirm-content">
              <h3 className="jf-confirm-title">{item.title}</h3>
              {item.message && <p className="jf-confirm-message">{item.message}</p>}
              <div className="jf-confirm-actions">
                <Button variant="ghost" size="sm" onClick={() => resolve(false)}>
                  {item.cancelLabel ?? 'Cancelar'}
                </Button>
                <Button
                  variant={item.tone === 'danger' ? 'danger' : 'primary'}
                  size="sm"
                  autoFocus
                  onClick={() => resolve(true)}
                >
                  {item.confirmLabel ?? 'Confirmar'}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}