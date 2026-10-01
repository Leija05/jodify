import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Trash, Warning, Question, Info, X } from '@phosphor-icons/react';
import { Button } from './Button';
import { useConfirmStore } from '../../store/confirm.store';

export function ConfirmDialog() {
  const item = useConfirmStore((s) => s.item);
  const resolve = useConfirmStore((s) => s.resolve);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        resolve(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        resolve(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, resolve]);

  const tone = item?.tone ?? 'primary';

  const renderIcon = () => {
    if (item?.icon === 'trash' || tone === 'danger') {
      return <Trash size={22} weight="fill" />;
    }
    if (item?.icon === 'warning' || tone === 'warning') {
      return <Warning size={22} weight="fill" />;
    }
    if (item?.icon === 'info') {
      return <Info size={22} weight="fill" />;
    }
    return <Question size={22} weight="fill" />;
  };

  const getTagLabel = () => {
    if (tone === 'danger') return 'Atención';
    if (tone === 'warning') return 'Aviso';
    return 'Confirmar';
  };

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="jf-modal-backdrop jf-confirm-backdrop"
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
            className={`jf-confirm-card is-${tone}`}
            role="alertdialog"
            aria-modal="true"
            aria-label={item.title}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Cabecera con Badge de Categoría y Botón Cerrar */}
            <div className="jf-confirm-header">
              <span className={`jf-confirm-tag is-${tone}`}>
                {getTagLabel()}
              </span>
              <button
                type="button"
                className="jf-confirm-close-btn"
                onClick={() => resolve(false)}
                title="Cerrar (Esc)"
              >
                <X size={15} weight="bold" />
              </button>
            </div>

            {/* Contenido principal con Icono flotante */}
            <div className="jf-confirm-body">
              <div className={`jf-confirm-icon is-${tone}`}>
                {renderIcon()}
              </div>
              <div className="jf-confirm-content">
                <h3 className="jf-confirm-title">{item.title}</h3>
                {item.message && <p className="jf-confirm-message">{item.message}</p>}
              </div>
            </div>

            {/* Acciones y Atajos de teclado */}
            <div className="jf-confirm-footer">
              <div className="jf-confirm-hints">
                <span>Esc</span> cancelar · <span>↵</span> confirmar
              </div>
              <div className="jf-confirm-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resolve(false)}
                  className="jf-confirm-btn-cancel"
                >
                  {item.cancelLabel ?? 'Cancelar'}
                </Button>
                <Button
                  variant={tone === 'danger' ? 'danger' : 'primary'}
                  size="sm"
                  autoFocus
                  onClick={() => resolve(true)}
                  className={`jf-confirm-btn-action is-${tone}`}
                >
                  {item.confirmLabel ?? (tone === 'danger' ? 'Eliminar' : 'Aceptar')}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}