import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, WarningCircle, Info, XCircle } from '@phosphor-icons/react';
import { useToastStore } from '../../store/toast.store';

const ICONS = {
  success: CheckCircle,
  warning: WarningCircle,
  error: XCircle,
  info: Info,
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="jf-toaster" aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] ?? Info;
          return (
            <motion.div
              key={toast.id}
              className={`jf-toast jf-toast--${toast.type}`}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.14 } }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => dismiss(toast.id)}
              role="status"
            >
              <Icon size={18} weight="bold" />
              <span>{toast.message}</span>
              <span className="jf-toast-bar" style={{ animationDuration: `${(toast.duration ?? 3200) / 1000}s` }} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
