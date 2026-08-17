import { useEffect, useRef, useState } from 'react';
import { Broadcast, Pause, Play, TerminalWindow, Trash } from '@phosphor-icons/react';
import { Button } from '../ui/Button';
import { logsService } from '../../services/social.service';
import { devService } from '../../services/dev.service';
import type { DevLogEvent } from '../../lib/types';

const MAX_LINES = 250;

const TYPE_COLORS: Record<string, string> = {
  log: '',
  'token.created': 'is-token',
  'token.revoked': 'is-token',
  'token.redeemed': 'is-token',
  'role.changed': 'is-role',
  maintenance: 'is-warning',
  'user.offline': 'is-user',
  'dev.access': 'is-dev',
};

type Filter = 'all' | 'log' | 'token' | 'role' | 'maintenance' | 'dev' | 'user';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Todo' },
  { id: 'log', label: 'Logs' },
  { id: 'token', label: 'Tokens' },
  { id: 'role', label: 'Roles' },
  { id: 'maintenance', label: 'Mantenimiento' },
  { id: 'dev', label: 'Dev' },
  { id: 'user', label: 'Usuarios' },
];

function matchFilter(event: DevLogEvent, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'log') return event.type === 'log';
  if (filter === 'token') return event.type?.startsWith('token.') ?? false;
  if (filter === 'role') return event.type === 'role.changed';
  if (filter === 'maintenance') return event.type === 'maintenance';
  if (filter === 'dev') return event.type === 'dev.access';
  if (filter === 'user') return event.type === 'user.offline';
  return true;
}

export function DevConsole({ live, onLiveChange }: { live: boolean; onLiveChange: (v: boolean) => void }) {
  const [events, setEvents] = useState<DevLogEvent[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const append = (event: DevLogEvent) => {
    setEvents((prev) => {
      const next = [...prev, event];
      return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
    });
  };

  useEffect(() => {
    setLoading(true);
    logsService
      .fetch(60)
      .then((logs) => {
        setEvents(
          logs.map((log) => ({
            type: 'log',
            event_type: log.event_type,
            message: log.message,
            admin_user: log.admin_user,
            ts: log.created_at,
          })),
        );
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!live) return;
    const unsubscribe = devService.subscribeStream(append);
    return unsubscribe;
  }, [live]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  const filtered = filter === 'all' ? events : events.filter((e) => matchFilter(e, filter));
  const visible = filter === 'all' ? events : filtered;

  const purge = async () => {
    if (!window.confirm('¿Borrar todos los logs del servidor?')) return;
    try {
      await devService.purgeLogs();
      setEvents([]);
    } catch {
      /* sin acceso */
    }
  };

  return (
    <div className="jf-dev-panel">
      <div className="jf-dev-toolbar">
        <div className="jf-dev-filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`jf-dev-filter ${filter === f.id ? 'is-active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="jf-dev-toolbar-actions">
          {live && <span className="jf-dev-live"><span className="jf-pulse-dot" /> en vivo</span>}
          <Button variant="glass" size="sm" onClick={() => onLiveChange(!live)}>
            {live ? <Pause size={13} /> : <Play size={13} />}
            {live ? 'Pausar' : 'Reanudar'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void purge()}>
            <Trash size={13} />
          </Button>
        </div>
      </div>

      <div className="jf-dev-terminal" ref={scrollRef}>
        {loading ? (
          <p className="jf-dev-terminal-empty">Conectando…</p>
        ) : visible.length === 0 ? (
          <p className="jf-dev-terminal-empty">
            <TerminalWindow size={18} />
            {live ? 'A la espera de eventos. La actividad del servidor aparece acá en vivo.' : 'Consola pausada.'}
          </p>
        ) : (
          visible.map((event, index) => (
            <div key={`${event.ts}-${index}`} className={`jf-dev-line ${TYPE_COLORS[event.type] ?? ''}`}>
              <span className="jf-dev-line-time">{event.ts ? new Date(event.ts).toLocaleTimeString('es-AR') : '--:--:--'}</span>
              <span className="jf-dev-line-arrow">›</span>
              <span className="jf-dev-line-msg">{event.message}</span>
              {event.admin_user && <span className="jf-dev-line-user">@{event.admin_user}</span>}
            </div>
          ))
        )}
      </div>
      <div className="jf-dev-terminal-foot">
        <Broadcast size={12} />
        {visible.length} líneas · stream SSE con autenticación
      </div>
    </div>
  );
}
