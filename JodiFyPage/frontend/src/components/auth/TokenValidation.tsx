import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, Key, ShieldCheck, WarningCircle, X } from '@phosphor-icons/react';
import { devService, type DevAccessResult } from '../../services/dev.service';
import type { Role } from '../../lib/types';

type Phase = 'connecting' | 'sending' | 'verifying' | 'done' | 'error';

interface Step {
  id: Phase;
  label: string;
}

const STEPS: Step[] = [
  { id: 'connecting', label: 'Conectando con el servidor…' },
  { id: 'sending', label: 'Enviando token…' },
  { id: 'verifying', label: 'Verificando credenciales…' },
];

interface TokenValidationProps {
  token: string;
  save: boolean;
  onCancel: () => void;
  onSuccess: (result: DevAccessResult, save: boolean) => void;
}

export function TokenValidation({ token, save, onCancel, onSuccess }: TokenValidationProps) {
  const [phase, setPhase] = useState<Phase>('connecting');
  const [result, setResult] = useState<DevAccessResult | null>(null);
  const [error, setError] = useState('');
  const finishedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const advance = (next: Phase, ms: number) =>
      timers.push(
        setTimeout(() => {
          if (!cancelled) setPhase(next);
        }, ms),
      );

    advance('sending', 450);
    advance('verifying', 950);

    devService
      .accessWithKey(token)
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        setPhase('done');
        timers.push(
          setTimeout(() => {
            if (!cancelled && !finishedRef.current) {
              finishedRef.current = true;
              onSuccess(res, save);
            }
          }, 1600),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No se pudo validar el token');
        setPhase('error');
      });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [token, save, onSuccess]);

  const role = (result?.role ?? '') as Role;
  const isAdmin = role === 'admin';
  const roleLabel = isAdmin ? 'Token de admin validado' : role === 'dev' ? 'Token dev validado' : `Token ${role} validado`;

  return (
    <div className="jf-token-validate" data-testid="token-validate">
      <div className="jf-token-validate-head">
        <span className="jf-token-validate-icon">
          <ShieldCheck size={20} />
        </span>
        <div>
          <h3 className="jf-token-validate-title">Validando token</h3>
          <p className="jf-token-validate-sub">Verificación en tiempo real</p>
        </div>
      </div>

      <ul className="jf-token-steps">
        {STEPS.map(({ id, label }) => {
          const idx = STEPS.findIndex((s) => s.id === id);
          const phaseIdx = phase === 'done' || phase === 'error' ? STEPS.length : STEPS.findIndex((s) => s.id === phase);
          const state = phaseIdx > idx ? 'done' : phaseIdx === idx ? 'active' : 'pending';
          return (
            <li key={id} className={`jf-token-step jf-token-step--${state}`} data-testid={`token-step-${id}`}>
              <span className="jf-token-step-dot">
                {state === 'done' ? <CheckCircle size={13} weight="fill" /> : state === 'active' ? <span className="jf-token-spinner" /> : null}
              </span>
              <span className="jf-token-step-label">{label}</span>
            </li>
          );
        })}
      </ul>

      <AnimatePresence mode="wait">
        {phase === 'done' && result && (
          <motion.div
            key="done"
            className="jf-token-result jf-token-result--ok"
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            data-testid="token-result-ok"
          >
            <span className="jf-token-result-icon">
              <CheckCircle size={26} weight="fill" />
            </span>
            <p className="jf-token-result-title">{roleLabel}</p>
            <p className="jf-token-result-sub">
              {isAdmin ? 'Tenés permisos de administrador' : 'Tenés permisos de desarrollo'}
            </p>
            <span className={`jf-role-badge jf-role-badge--${role}`}>{role}</span>
          </motion.div>
        )}

        {phase === 'error' && (
          <motion.div
            key="error"
            className="jf-token-result jf-token-result--error"
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            data-testid="token-result-error"
          >
            <span className="jf-token-result-icon">
              <WarningCircle size={26} weight="fill" />
            </span>
            <p className="jf-token-result-title">Token inválido</p>
            <p className="jf-token-result-sub">{error}</p>
            <button type="button" className="jf-btn jf-btn--glass jf-btn--sm" onClick={onCancel}>
              Reintentar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {phase !== 'done' && phase !== 'error' && (
        <button type="button" className="jf-token-cancel" onClick={onCancel}>
          <X size={13} /> Cancelar
        </button>
      )}

      <p className="jf-token-mono">
        <Key size={12} />
        <span>{token}</span>
        {save && <span className="jf-token-saved-chip">guardado</span>}
      </p>
    </div>
  );
}