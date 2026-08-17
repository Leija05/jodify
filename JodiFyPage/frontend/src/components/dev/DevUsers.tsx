import { useMemo, useState } from 'react';
import { MagnifyingGlass, Power, Users } from '@phosphor-icons/react';
import { Button } from '../ui/Button';
import { timeAgo } from './devBits';
import { devService } from '../../services/dev.service';
import { useToastStore } from '../../store/toast.store';
import type { DevUserRow } from '../../lib/types';

const ROLES: Array<{ value: 'user' | 'mod' | 'admin'; label: string }> = [
  { value: 'user', label: 'user' },
  { value: 'mod', label: 'mod' },
  { value: 'admin', label: 'admin' },
];

export function DevUsers({
  users,
  onChanged,
  loading,
}: {
  users: DevUserRow[];
  onChanged: () => void;
  loading: boolean;
}) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.username.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
  }, [users, query]);

  const changeRole = async (user: DevUserRow, role: 'user' | 'mod' | 'admin') => {
    if (user.role === role) return;
    setBusy(user.id);
    try {
      await devService.setRole(user.username, role);
      useToastStore.getState().show(`@${user.username} ahora es ${role}`, 'success');
      onChanged();
    } catch (err) {
      useToastStore.getState().show(err instanceof Error ? err.message : 'No se pudo cambiar el rol', 'error');
    } finally {
      setBusy(null);
    }
  };

  const offline = async (user: DevUserRow) => {
    setBusy(user.id);
    try {
      await devService.forceOffline(user.username);
      useToastStore.getState().show(`@${user.username} fuera de línea`, 'success');
      onChanged();
    } catch {
      useToastStore.getState().show('No se pudo forzar offline', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="jf-dev-panel">
      <div className="jf-dev-toolbar">
        <div className="jf-dev-search">
          <MagnifyingGlass size={15} />
          <input
            placeholder="Buscar por nombre o rol…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar usuarios"
          />
        </div>
        <span className="jf-dev-toolbar-count">{users.length} cuentas</span>
      </div>

      {loading ? (
        <div className="jf-dev-skeleton">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="jf-dev-skeleton-row jf-skeleton" />
          ))}
        </div>
      ) : (
        <div className="jf-dev-table-wrap">
          <table className="jf-dev-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Activo</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id}>
                <td>
                  <span className="jf-dev-user">
                    <span className={`jf-dev-user-dot ${user.is_online ? 'is-online' : ''}`} />
                    {user.username}
                    {user.role === 'dev' && <span className="jf-dev-user-dev">DEV</span>}
                  </span>
                </td>
                <td>
                  {user.role === 'dev' ? (
                    <span className="jf-role-badge jf-role-badge--dev">dev</span>
                  ) : (
                    <select
                      className="jf-select jf-select--sm"
                      value={user.role}
                      disabled={busy === user.id}
                      onChange={(e) => void changeRole(user, e.target.value as 'user' | 'mod' | 'admin')}
                      aria-label={`Rol de ${user.username}`}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td>
                  <span className={`jf-dev-state ${user.is_online ? 'is-online' : ''}`}>
                    {user.is_online ? 'en línea' : 'offline'}
                  </span>
                </td>
                <td className="jf-dev-table-muted">{timeAgo(user.last_seen)}</td>
                <td>
                  <div className="jf-dev-row-actions">
                    {user.role !== 'dev' && user.is_online === 1 && (
                      <Button variant="ghost" size="sm" onClick={() => void offline(user)} disabled={busy === user.id}>
                        <Power size={13} />
                        Offline
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="jf-dev-empty">
            <Users size={22} />
            <strong>{users.length === 0 ? 'No hay cuentas todavía' : 'Sin resultados'}</strong>
            <span>{users.length === 0 ? 'Las cuentas aparecen acá cuando alguien se registra.' : 'Probá con otro nombre.'}</span>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
