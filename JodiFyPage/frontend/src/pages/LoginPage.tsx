import { useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { Eye, EyeSlash, MusicNotes } from '@phosphor-icons/react';
import { useSession } from '../context/SessionContext';
import { GUEST_HINT } from '../lib/constants';

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export function LoginPage() {
  const { login } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSession, setKeepSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const ok = await login(username, password, keepSession);
    if (!ok) setError('Usuario o contraseña incorrectos');
    setBusy(false);
  };

  return (
    <div className="jf-login" data-testid="login-screen">
      <div className="jf-login-ambient" aria-hidden="true">
        <span className="jf-ambient-blob jf-ambient-blob--a" />
        <span className="jf-ambient-blob jf-ambient-blob--b" />
        <span className="jf-ambient-blob jf-ambient-blob--c" />
      </div>
      <div className="jf-login-glow" aria-hidden="true" />

      <div className="jf-login-shell">
        <motion.div
          className="jf-login-card"
          initial={{ opacity: 0, y: 26, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div className="jf-login-logo" variants={item}>
              <motion.div
                className="jf-login-logo-icon"
                whileHover={{ rotate: 8, scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              >
                <MusicNotes size={30} weight="fill" />
              </motion.div>
              <h1 className="jf-login-brand">
                Jodi<span>Fy</span>
              </h1>
              <p className="jf-login-tagline">Free Music For Friends</p>
            </motion.div>

            <form className="jf-login-form" onSubmit={submit}>
              <motion.div className="jf-input-group" variants={item}>
                <input
                  className="jf-input jf-input--lg"
                  placeholder="Usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  aria-label="Usuario"
                  data-testid="login-username"
                />
              </motion.div>
              <motion.div className="jf-input-group" variants={item}>
                <input
                  className="jf-input jf-input--lg"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-label="Contraseña"
                  data-testid="login-password"
                />
                <button
                  type="button"
                  className="jf-password-toggle"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeSlash size={17} /> : <Eye size={17} />}
                </button>
              </motion.div>

              <motion.label
                className="jf-remember"
                variants={item}
                role="switch"
                aria-checked={keepSession}
                onClick={() => setKeepSession((v) => !v)}
              >
                <span className={`jf-toggle ${keepSession ? 'is-on' : ''}`}>
                  <span className="jf-toggle-knob" />
                </span>
                Mantener sesión
              </motion.label>

              <AnimatePresence>
                {error && (
                  <motion.p
                    className="jf-login-error"
                    variants={item}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                className="jf-btn jf-btn--primary jf-btn--lg jf-login-submit"
                disabled={busy}
                variants={item}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                data-testid="login-submit"
              >
                <span className="jf-btn-shine" aria-hidden="true" />
                {busy ? 'Entrando…' : 'Entrar'}
              </motion.button>
            </form>

            <motion.p className="jf-login-hint" variants={item}>
              Invitado: <strong>{GUEST_HINT}</strong>
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
