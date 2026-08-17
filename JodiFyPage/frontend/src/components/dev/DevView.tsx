import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Gauge,
  Keyhole,
  Power,
  TerminalWindow,
  Users,
  WarningOctagon,
  X,
} from '@phosphor-icons/react';
import { useUiStore } from '../../store/ui.store';
import { useSession } from '../../context/SessionContext';
import { devService } from '../../services/dev.service';
import { useToastStore } from '../../store/toast.store';
import { DevGeneral } from './DevGeneral';
import { DevAccess } from './DevAccess';
import { DevUsers } from './DevUsers';
import { DevConsole } from './DevConsole';
import { DevControl } from './DevControl';
import type { DevOverview, DevState, DevToken, DevUserRow } from '../../lib/types';

type Panel = 'general' | 'access' | 'users' | 'console' | 'control';

const PANELS: Array<{ id: Panel; label: string; icon: typeof Gauge }> = [
  { id: 'general', label: 'General', icon: Gauge },
  { id: 'access', label: 'Acceso', icon: Keyhole },
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'console', label: 'Consola', icon: TerminalWindow },
  { id: 'control', label: 'Control', icon: Power },
];

export function DevView() {
  const ui = useUiStore();
  const { session } = useSession();
  const open = ui.modal === 'devCenter';

  const [panel, setPanel] = useState<Panel>('general');
  const [state, setState] = useState<DevState | null>(null);
  const [overview, setOverview] = useState<DevOverview | null>(null);
  const [plays, setPlays] = useState<Array<{ date: string; count: number }>>([]);
  const [tokens, setTokens] = useState<DevToken[]>([]);
  const [devUsers, setDevUsers] = useState<DevUserRow[]>([]);
  const [live, setLive] = useState(false);

  const reloadTokens = useCallback(() => {
    devService.listTokens().then(setTokens).catch(() => undefined);
  }, []);

  const reloadUsers = useCallback(() => {
    devService.listUsers().then(setDevUsers).catch(() => undefined);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [st, ov, pl, tk, us] = await Promise.all([
        devService.state(),
        devService.overview(),
        devService.plays(14),
        devService.listTokens(),
        devService.listUsers(),
      ]);
      setState(st);
      setOverview(ov);
      setPlays(pl);
      setTokens(tk);
      setDevUsers(us);
    } catch {
      useToastStore.getState().show('No se pudo cargar el panel dev', 'error');
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadAll();
  }, [open, loadAll]);

  useEffect(() => {
    if (!open || panel !== 'general') return;
    const timer = setInterval(() => {
      devService
        .overview()
        .then(setOverview)
        .catch(() => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [open, panel]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ui.close('devCenter');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, ui]);

  if (!open) return null;

  const maintenance = overview?.maintenance?.enabled ?? state?.maintenance?.enabled ?? false;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jf-devview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          data-testid="dev-view"
        >
          <motion.aside
            className="jf-devview-rail"
            initial={{ x: -28, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="jf-devview-brand">
              <span className="jf-devview-brand-mark">
                <TerminalWindow size={18} weight="fill" />
              </span>
              <div className="jf-devview-brand-copy">
                <strong>JodiFy Dev</strong>
                <span>panel de control</span>
              </div>
            </div>

            <nav className="jf-devview-nav" aria-label="Secciones dev">
              {PANELS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`jf-devview-nav-btn ${panel === id ? 'is-active' : ''}`}
                  onClick={() => setPanel(id)}
                  aria-current={panel === id ? 'page' : undefined}
                >
                  <Icon size={15} weight={panel === id ? 'fill' : 'regular'} />
                  {label}
                </button>
              ))}
            </nav>

            <div className="jf-devview-rail-foot">
              <div className="jf-devview-session">
                <span className="jf-devview-session-dot" />
                <span className="jf-devview-session-name">@{session?.username ?? 'dev'}</span>
                <span className="jf-role-badge jf-role-badge--dev">dev</span>
              </div>
              <button className="jf-devview-close" onClick={() => ui.close('devCenter')} aria-label="Cerrar panel dev">
                <X size={16} />
                Cerrar
              </button>
            </div>
          </motion.aside>

          <div className="jf-devview-main">
            <motion.header
              className="jf-devview-topbar"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            >
              <div>
                <h2 className="jf-devview-title">{PANELS.find((p) => p.id === panel)?.label}</h2>
                <p className="jf-devview-sub">Sesión de desarrollo · {session?.username}</p>
              </div>
              <div className="jf-devview-top-actions">
                {live && (
                  <span className="jf-devview-live">
                    <span className="jf-pulse-dot" /> stream activo
                  </span>
                )}
                {maintenance && (
                  <span className="jf-devview-maintenance">
                    <WarningOctagon size={13} weight="fill" /> mantenimiento activo
                  </span>
                )}
              </div>
            </motion.header>

            <motion.div
              className="jf-devview-content"
              key={panel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {panel === 'general' && <DevGeneral overview={overview} plays={plays} />}
              {panel === 'access' && <DevAccess tokens={tokens} onChanged={reloadTokens} state={state} />}
              {panel === 'users' && <DevUsers users={devUsers} onChanged={reloadUsers} loading={devUsers.length === 0 && !overview} />}
              {panel === 'console' && <DevConsole live={live} onLiveChange={setLive} />}
              {panel === 'control' && <DevControl state={state} onChanged={loadAll} />}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
