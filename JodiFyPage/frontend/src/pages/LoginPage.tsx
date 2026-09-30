import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { ArrowLeft, CheckCircle, Eye, EyeSlash, ShieldCheck, Sparkle } from '@phosphor-icons/react';
import { useSession } from '../context/SessionContext';
import { GUEST_HINT } from '../lib/constants';
import { hasSavedToken } from '../lib/token';
import { useToastStore } from '../store/toast.store';
import { TokenValidation } from '../components/auth/TokenValidation';
import { usersService } from '../services/users.service';
import type { DevAccessResult } from '../services/dev.service';

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export function LoginPage() {
  const { session, applyUserSession, savedTokenLogin, applyDevAccess } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSession, setKeepSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [tokenPanel, setTokenPanel] = useState(false);
  const [token, setToken] = useState('');
  const [saveTokenPermanent, setSaveTokenPermanent] = useState(false);
  const [validating, setValidating] = useState(false);
  const [savedBusy, setSavedBusy] = useState(false);

  // Estado de éxito para la animación de login
  const [loginSuccess, setLoginSuccess] = useState<{ username: string; role?: string } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setTokenPanel((v) => !v);
        setValidating(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await usersService.login(username, password);
      if (!result) {
        setError('Usuario o contraseña incorrectos');
        setBusy(false);
        return;
      }
      setLoginSuccess({ username: result.username, role: result.role });
      setTimeout(() => {
        applyUserSession(result, keepSession);
      }, 1050);
    } catch {
      setError('No se pudo conectar con el servidor');
      setBusy(false);
    }
  };

  const handleTokenSuccess = (result: DevAccessResult, save: boolean) => {
    setLoginSuccess({ username: result.username, role: result.role });
    setTimeout(() => {
      applyDevAccess(result, save);
      useToastStore
        .getState()
        .show(result.role === 'admin' ? 'Token de admin validado' : 'Token dev validado', 'success');
    }, 1050);
  };

  const handleSavedLogin = async () => {
    setSavedBusy(true);
    const result = await savedTokenLogin();
    setSavedBusy(false);
    if (!result.ok) {
      useToastStore.getState().show(result.error ?? 'El token guardado no es válido', 'error');
    }
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
          className={`jf-login-card ${loginSuccess ? 'is-success' : ''}`}
          initial={{ opacity: 0, y: 26, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <AnimatePresence mode="wait">
            {loginSuccess ? (
              <motion.div
                key="login-success-card"
                className="jf-login-success-view"
                initial={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.08, filter: 'blur(12px)' }}
                transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <div className="jf-login-success-icon-wrap">
                  <span className="jf-success-pulse-ring" />
                  <span className="jf-success-pulse-ring delay-1" />
                  <div className="jf-success-icon-core">
                    <CheckCircle size={44} weight="fill" className="jf-success-check" />
                  </div>
                </div>

                <div className="jf-login-success-texts">
                  <div className="jf-login-success-badge">
                    <Sparkle size={12} weight="fill" />
                    <span>Acceso concedido</span>
                  </div>
                  <h2 className="jf-login-success-title">¡Bienvenido a JodiFy!</h2>
                  <p className="jf-login-success-user">@{loginSuccess.username}</p>
                </div>

                <div className="jf-login-success-bars">
                  <span className="bar-1" />
                  <span className="bar-2" />
                  <span className="bar-3" />
                  <span className="bar-4" />
                  <span className="bar-5" />
                </div>
                <p className="jf-login-success-sub">Preparando tu experiencia auditiva…</p>
              </motion.div>
            ) : !tokenPanel ? (
              <motion.div key="standard-login" variants={stagger} initial="hidden" animate="show">
                <motion.div className="jf-login-logo" variants={item}>
                  <motion.div
                    className="jf-login-logo-icon"
                    whileHover={{ rotate: 8, scale: 1.08 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  >
                    <img className="jf-login-logo-img" src={`${import.meta.env.BASE_URL}logo.png`} alt="JodiFy" />
                  </motion.div>
                  <h1 className="jf-login-brand">
                    Jodi<span>Fy</span>
                  </h1>
                  <p className="jf-login-tagline">Free Music For Friends</p>
                </motion.div>

                {hasSavedToken() && (
                  <motion.button
                    type="button"
                    className="jf-saved-token-login"
                    variants={item}
                    disabled={savedBusy}
                    onClick={() => void handleSavedLogin()}
                    data-testid="saved-token-login"
                  >
                    <ShieldCheck size={14} weight="fill" />
                    {savedBusy ? 'Validando token guardado…' : 'Entrar con token guardado'}
                  </motion.button>
                )}

                <form className="jf-login-form" onSubmit={submit}>
                  <motion.div className="jf-input-group" variants={item}>
                    <input
                      className="jf-input jf-input--lg"
                      placeholder="Usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      autoFocus
                      aria-label="Nombre de usuario"
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
                      required
                      autoComplete="current-password"
                      aria-label="Contraseña"
                      data-testid="login-password"
                    />
                    <button
                      type="button"
                      className="jf-password-toggle"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </motion.div>

                  <motion.label
                    className="jf-remember"
                    role="switch"
                    aria-checked={keepSession}
                    onClick={() => setKeepSession((v) => !v)}
                    variants={item}
                  >
                    <span className={`jf-toggle ${keepSession ? 'is-on' : ''}`}>
                      <span className="jf-toggle-knob" />
                    </span>
                    Mantener sesión iniciada
                  </motion.label>

                  {error && (
                    <motion.p
                      className="jf-login-error"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      data-testid="login-error"
                    >
                      {error}
                    </motion.p>
                  )}

                  <motion.button
                    type="submit"
                    className="jf-btn jf-btn--primary jf-btn--lg jf-login-submit"
                    disabled={busy || !username.trim() || !password}
                    variants={item}
                    data-testid="login-submit"
                  >
                    <span className="jf-btn-shine" aria-hidden="true" />
                    {busy ? 'Iniciando sesión…' : 'Entrar'}
                  </motion.button>
                </form>

                <motion.p className="jf-login-hint" variants={item}>
                  ¿Invitado? Probá <strong>{GUEST_HINT}</strong>
                </motion.p>
              </motion.div>
            ) : validating ? (
              <motion.div key="token-validating" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <TokenValidation token={token} save={saveTokenPermanent} onCancel={() => setValidating(false)} onSuccess={handleTokenSuccess} />
              </motion.div>
            ) : (
              <motion.div key="token-entry" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="jf-token-entry">
                  <button type="button" className="jf-token-back" onClick={() => setTokenPanel(false)}>
                    <ArrowLeft size={13} /> Volver
                  </button>
                  <div className="jf-token-entry-head">
                    <span className="jf-token-entry-icon">
                      <ShieldCheck size={20} />
                    </span>
                    <div>
                      <h3 className="jf-token-validate-title">Acceso por token</h3>
                      <p className="jf-token-validate-sub">Token de desarrollo o administrador</p>
                    </div>
                  </div>
                  <div className="jf-input-group">
                    <input
                      className="jf-input jf-input--lg jf-input--mono"
                      type="password"
                      placeholder="Ingresá el token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      autoFocus
                      aria-label="Token de desarrollo"
                      data-testid="dev-token-input"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && token.trim()) setValidating(true);
                      }}
                    />
                  </div>
                  <label
                    className="jf-remember"
                    role="switch"
                    aria-checked={saveTokenPermanent}
                    onClick={() => setSaveTokenPermanent((v) => !v)}
                  >
                    <span className={`jf-toggle ${saveTokenPermanent ? 'is-on' : ''}`}>
                      <span className="jf-toggle-knob" />
                    </span>
                    Guardar token permanentemente
                  </label>
                  <button
                    type="button"
                    className="jf-btn jf-btn--primary jf-btn--lg jf-login-submit"
                    disabled={!token.trim()}
                    onClick={() => setValidating(true)}
                    data-testid="dev-token-validate"
                  >
                    <span className="jf-btn-shine" aria-hidden="true" />
                    Validar token
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}