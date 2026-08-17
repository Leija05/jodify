import { useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { Eye, EyeSlash, Key, MusicNotes, Terminal, User } from '@phosphor-icons/react';
import { useSession } from '../context/SessionContext';
import { GUEST_HINT } from '../lib/constants';

type AccessMode = 'account' | 'token' | 'dev';

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const MODES: Array<{ id: AccessMode; label: string; icon: typeof User }> = [
  { id: 'account', label: 'Cuenta', icon: User },
  { id: 'token', label: 'Código', icon: Key },
  { id: 'dev', label: 'Dev', icon: Terminal },
];

export function LoginPage() {
  const { login, devLogin, redeem } = useSession();
  const [mode, setMode] = useState<AccessMode>('account');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [devKey, setDevKey] = useState('');
  const [redeemToken, setRedeemToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSession, setKeepSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    let ok = false;
    if (mode === 'account') {
      ok = await login(username, password, keepSession);
      if (!ok) setError('Usuario o contraseña incorrectos');
    } else if (mode === 'token') {
      const result = await redeem(redeemToken, username, password);
      ok = result.ok;
      if (!ok) setError(result.error ?? 'No se pudo canjear el código');
    } else {
      const result = await devLogin(devKey);
      ok = result.ok;
      if (!ok) setError(result.error ?? 'No se pudo entrar al modo dev');
    }
    setBusy(false);
  };

  const switchMode = (next: AccessMode) => {
    setMode(next);
    setError(null);
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

            <motion.div className="jf-login-modes" variants={item} role="tablist" aria-label="Método de acceso">
              {MODES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  className={`jf-login-mode ${mode === id ? 'is-active' : ''}`}
                  onClick={() => switchMode(id)}
                >
                  <Icon size={14} weight={mode === id ? 'fill' : 'regular'} />
                  {label}
                </button>
              ))}
            </motion.div>

            <form className="jf-login-form" onSubmit={submit}>
              {mode !== 'dev' && (
                <motion.div className="jf-input-group" variants={item} key="username">
                  <input
                    className="jf-input jf-input--lg"
                    placeholder="Usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus={mode === 'account' || mode === 'token'}
                    aria-label="Usuario"
                    data-testid="login-username"
                  />
                </motion.div>
              )}

              {mode === 'account' && (
                <motion.div className="jf-input-group" variants={item} key="password">
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
              )}

              {mode === 'token' && (
                <>
                  <motion.div className="jf-input-group" variants={item} key="token">
                    <input
                      className="jf-input jf-input--lg jf-input--mono"
                      placeholder="JDFY-XXXX-XXXX-XXXX-XXXX"
                      value={redeemToken}
                      onChange={(e) => setRedeemToken(e.target.value)}
                      autoFocus
                      aria-label="Código de acceso"
                      data-testid="redeem-token"
                    />
                  </motion.div>
                  <motion.div className="jf-input-group" variants={item} key="token-password">
                    <input
                      className="jf-input jf-input--lg"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Creá tu contraseña (mín. 4)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-label="Contraseña nueva"
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
                </>
              )}

              {mode === 'dev' && (
                <motion.div className="jf-input-group" variants={item} key="dev-key">
                  <input
                    className="jf-input jf-input--lg jf-input--mono"
                    type="password"
                    placeholder="Clave de desarrollo"
                    value={devKey}
                    onChange={(e) => setDevKey(e.target.value)}
                    autoFocus
                    aria-label="Clave de desarrollo"
                    data-testid="dev-key"
                  />
                </motion.div>
              )}

              {mode === 'account' && (
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
              )}

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
                {busy
                  ? mode === 'dev'
                    ? 'Entrando…'
                    : mode === 'token'
                      ? 'Canjeando…'
                      : 'Entrando…'
                  : mode === 'dev'
                    ? 'Entrar al modo dev'
                    : mode === 'token'
                      ? 'Canjear código'
                      : 'Entrar'}
              </motion.button>
            </form>

            <motion.p className="jf-login-hint" variants={item}>
              {mode === 'account' && (
                <>
                  Invitado: <strong>{GUEST_HINT}</strong>
                </>
              )}
              {mode === 'token' && <>¿Tenés un código de acceso? Creá tu cuenta con él.</>}
              {mode === 'dev' && <>Zona restringida. Solo el desarrollador.</>}
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
