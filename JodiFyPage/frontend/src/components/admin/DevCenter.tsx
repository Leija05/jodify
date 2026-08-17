import { useEffect, useState } from 'react';
import {
  UserPlus,
  Users,
  Terminal,
  ChartBar,
  MusicNotes,
  DownloadSimple,
  Trophy,
  ArrowClockwise,
} from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useSession, useIsDev } from '../../context/SessionContext';
import { useUiStore } from '../../store/ui.store';
import { useLibraryStore } from '../../store/library.store';
import { usersService } from '../../services/users.service';
import { songsService } from '../../services/songs.service';
import { logsService } from '../../services/social.service';
import { useToastStore } from '../../store/toast.store';
import type { Role, UserAccess } from '../../lib/types';

type Panel = 'home' | 'register' | 'manage' | 'logs';

interface TopSong {
  song_id: string;
  song_name: string;
  count: number;
}

export function DevCenter() {
  const { session } = useSession();
  const isDev = useIsDev();
  const ui = useUiStore();
  const songCount = useLibraryStore((s) => s.songs.length);
  const [panel, setPanel] = useState<Panel>('home');
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [topSongs, setTopSongs] = useState<TopSong[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<Array<{ id: number | string; event_type: string; message: string; admin_user?: string; created_at: string }>>([]);
  const [logQuery, setLogQuery] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<Role>('user');
  const [regMessage, setRegMessage] = useState('');

  const loadUsers = async () => {
    try {
      setUsers(await usersService.listUsers());
    } catch {
      useToastStore.getState().show('No se pudieron cargar los usuarios', 'error');
    }
  };

  const loadLogs = async () => {
    try {
      setLogs(await logsService.fetch(50));
    } catch {
      useToastStore.getState().show('No se pudieron cargar los logs', 'error');
    }
  };

  const loadTopSongs = async () => {
    try {
      setTopSongs(await songsService.fetchTopSongs());
    } catch {
      /* sin ranking todavía */
    }
  };

  useEffect(() => {
    if (ui.modal !== 'devCenter') return;
    if (panel === 'home') {
      void loadUsers();
      void loadTopSongs();
    }
    if (panel === 'manage') void loadUsers();
    if (panel === 'logs') void loadLogs();
  }, [ui.modal, panel]);

  const registerUser = async () => {
    setRegMessage('');
    if (!regUsername.trim() || regPassword.length < 4) {
      setRegMessage('Usuario y contraseña de al menos 4 caracteres');
      return;
    }
    try {
      await usersService.register(regUsername, regPassword, regRole);
      setRegMessage('Usuario registrado ✓');
      setRegUsername('');
      setRegPassword('');
      void logsService.add('register', `Usuario registrado: ${regUsername} (${regRole})`, session?.username);
    } catch (error) {
      setRegMessage(`Error: ${error instanceof Error ? error.message : 'desconocido'}`);
    }
  };

  const deleteUser = async (user: UserAccess) => {
    if (user.role === 'dev') {
      useToastStore.getState().show('No puedes borrar un usuario dev', 'warning');
      return;
    }
    if (!window.confirm(`¿Borrar a ${user.username}?`)) return;
    try {
      await usersService.deleteUser(user.id);
      void logsService.add('delete_user', `Usuario borrado: ${user.username}`, session?.username);
      await loadUsers();
      useToastStore.getState().show(`Usuario ${user.username} borrado`, 'success');
    } catch {
      useToastStore.getState().show('No se pudo borrar el usuario', 'error');
    }
  };

  const syncSongs = async () => {
    setSyncing(true);
    try {
      const { created } = await songsService.syncSeedSongs();
      const songs = await songsService.fetchAll();
      useLibraryStore.getState().setSongs(songs);
      useToastStore.getState().show(
        created > 0 ? `${created} ${created === 1 ? 'canción' : 'canciones'} sincronizada${created === 1 ? '' : 's'}` : 'Biblioteca al día',
        created > 0 ? 'success' : 'info',
      );
      void logsService.add('sync', `Sincronización desde seed_audio: ${created} nueva(s)`, session?.username);
    } catch {
      useToastStore.getState().show('No se pudo sincronizar', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const filteredLogs = logs.filter((log) => !logQuery || log.message.toLowerCase().includes(logQuery.toLowerCase()) || (log.admin_user ?? '').toLowerCase().includes(logQuery.toLowerCase()));
  const maxCount = topSongs.reduce((m, s) => Math.max(m, s.count), 0);

  return (
    <Modal name="devCenter" title="Centro de desarrollo" width={680}>
      {!isDev ? (
        <p className="jf-dev-denied">Solo el rol dev puede acceder.</p>
      ) : (
        <div className="jf-dev">
          <div className="jf-dev-nav" role="tablist">
            {([
              { id: 'home', label: 'Inicio', icon: ChartBar },
              { id: 'register', label: 'Registrar', icon: UserPlus },
              { id: 'manage', label: 'Usuarios', icon: Users },
              { id: 'logs', label: 'Logs', icon: Terminal },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`jf-dev-nav-btn ${panel === id ? 'is-active' : ''}`}
                onClick={() => setPanel(id)}
                role="tab"
                aria-selected={panel === id}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {panel === 'home' && (
            <div className="jf-dev-panel">
              <div className="jf-dash-stats">
                <div className="jf-dash-stat">
                  <span className="jf-dash-stat-icon">
                    <MusicNotes size={16} />
                  </span>
                  <div>
                    <strong>{songCount}</strong>
                    <span>canciones</span>
                  </div>
                </div>
                <div className="jf-dash-stat">
                  <span className="jf-dash-stat-icon">
                    <Users size={16} />
                  </span>
                  <div>
                    <strong>{users.length}</strong>
                    <span>usuarios</span>
                  </div>
                </div>
              </div>

              <div className="jf-dash-sync">
                <div>
                  <p className="jf-settings-timer-title">Sincronizar biblioteca</p>
                  <p className="jf-dash-sync-sub">Importa audio nuevo pendiente en jodify-backend/seed_audio/</p>
                </div>
                <Button variant="primary" size="sm" onClick={() => void syncSongs()} disabled={syncing}>
                  <ArrowClockwise size={14} className={syncing ? 'jf-spin' : ''} />
                  {syncing ? 'Sincronizando…' : 'Fetch songs'}
                </Button>
              </div>

              <div className="jf-wall">
                <div className="jf-wall-head">
                  <span className="jf-wall-title">
                    <Trophy size={15} /> Wall of Fame
                  </span>
                  <span className="jf-wall-sub">View SoundWaves</span>
                </div>
                {topSongs.length === 0 ? (
                  <p className="jf-wall-empty">Aún no hay reproducciones registradas. Dale play a algo.</p>
                ) : (
                  <ol className="jf-wall-list">
                    {topSongs.map((song, index) => (
                      <li key={`${song.song_id}-${index}`} className="jf-wall-row">
                        <span className={`jf-wall-rank ${index < 3 ? 'jf-wall-rank-top' : ''}`}>{index + 1}</span>
                        <span className="jf-wall-name">{song.song_name}</span>
                        <span className="jf-wall-bar" aria-hidden="true">
                          <span style={{ width: `${Math.max(8, Math.round((song.count / maxCount) * 100))}%` }} />
                        </span>
                        <span className="jf-wall-count">{song.count}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}

          {panel === 'register' && (
            <div className="jf-dev-panel">
              <div className="jf-form-row">
                <input className="jf-input" placeholder="Usuario" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} aria-label="Usuario" />
                <input className="jf-input" type="password" placeholder="Contraseña" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} aria-label="Contraseña" />
                <select className="jf-select" value={regRole} onChange={(e) => setRegRole(e.target.value as Role)} aria-label="Rol">
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  <option value="dev">dev</option>
                </select>
                <Button variant="primary" size="sm" onClick={() => void registerUser()}>
                  Registrar
                </Button>
              </div>
              {regMessage && <p className={`jf-form-message ${regMessage.startsWith('Error') ? 'is-error' : ''}`}>{regMessage}</p>}
              <div className="jf-developer-songs">
                <DownloadSimple size={15} /> Sube audio con el botón «+» de la biblioteca.
              </div>
            </div>
          )}

          {panel === 'manage' && (
            <div className="jf-dev-panel">
              <div className="jf-table-wrap">
                <table className="jf-users-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Rol</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.username}</td>
                        <td>
                          <span className={`jf-role-badge jf-role-badge--${user.role}`}>{user.role}</span>
                        </td>
                        <td>
                          <Button variant="danger" size="sm" onClick={() => void deleteUser(user)}>
                            Borrar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {panel === 'logs' && (
            <div className="jf-dev-panel">
              <div className="jf-logs-toolbar">
                <input className="jf-input" placeholder="Filtrar logs…" value={logQuery} onChange={(e) => setLogQuery(e.target.value)} aria-label="Filtrar logs" />
                <Button variant="glass" size="sm" onClick={() => void loadLogs()}>
                  Recargar
                </Button>
              </div>
              <div className="jf-terminal">
                {filteredLogs.map((log) => (
                  <div key={log.id} className={`jf-log-line jf-log-line--${log.event_type}`}>
                    <span className="jf-log-prefix">›</span>
                    <span className="jf-log-time">{new Date(log.created_at).toLocaleTimeString('es')}</span>
                    <span className="jf-log-msg">{log.message}</span>
                    {log.admin_user && <span className="jf-log-admin">@{log.admin_user}</span>}
                  </div>
                ))}
                {filteredLogs.length === 0 && <p className="jf-log-empty">Consola limpia.</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
