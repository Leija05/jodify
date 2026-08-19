import { useEffect, useState } from 'react';
import {
  ArrowClockwise,
  ArrowSquareOut,
  Copy,
  DownloadSimple,
  Key as KeyIcon,
  SignOut,
  UserCircle,
  UserPlus,
  UserSwitch,
  TrashSimple,
  WifiSlash,
} from '@phosphor-icons/react';
import type { DesktopUpdaterInfo, DesktopUpdaterState } from '../../types/electron';
import { Modal } from '../ui/Modal';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { useSettingsStore } from '../../store/settings.store';
import { useToastStore } from '../../store/toast.store';
import { useLibraryStore } from '../../store/library.store';
import { useSession } from '../../context/SessionContext';
import { useOffline } from '../../hooks/useOffline';
import { removeDownload } from '../../services/offline.service';
import { obsService } from '../../services/obs.service';
import { clearSavedToken, getSavedToken, hasSavedToken, maskToken } from '../../lib/token';

export function SettingsModal() {
  const settings = useSettingsStore();
  const { session, login, logout } = useSession();
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const { isOffline } = useOffline();
  const [sleepMinutes, setSleepMinutes] = useState('0');
  const [switchingUser, setSwitchingUser] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmTokenDelete, setConfirmTokenDelete] = useState(false);
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  const updater = window.jodifyUpdater;
  const [updaterInfo, setUpdaterInfo] = useState<DesktopUpdaterInfo | null>(null);

  useEffect(() => {
    if (!updater) return;
    const unsubscribe = updater.onEvent((payload) => {
      if (payload.type === 'state' && payload.state) {
        setUpdaterInfo((prev) => (prev ? { ...prev, state: payload.state as DesktopUpdaterState } : prev));
      }
    });
    void updater
      .getState()
      .then(setUpdaterInfo)
      .catch(() => undefined);
    return unsubscribe;
  }, [updater]);

  const checkForUpdates = async () => {
    if (!updater) return;
    useToastStore.getState().show('Buscando actualizaciones…', 'info');
    await updater.check().catch(() => {
      useToastStore.getState().show('No se pudo buscar actualizaciones', 'error');
    });
  };

  const installUpdate = async () => {
    if (!updater) return;
    await updater.install().catch(() => {
      useToastStore.getState().show('No se pudo instalar la actualización', 'error');
    });
  };

  const updaterStatus = (() => {
    const s = updaterInfo?.state;
    if (!s) return null;
    if (s.error) return `Error: ${s.error}`;
    if (s.downloaded) return `Lista para instalar (v${s.latestVersion})`;
    if (s.downloading) return `Descargando v${s.latestVersion}… ${s.percent}%`;
    if (s.available) return `Disponible: v${s.latestVersion}`;
    return 'Actualizada';
  })();

  const createAdminUser = async () => {
    const username = newAdminUser.trim();
    if (username.length < 2 || newAdminPass.length < 4) {
      useToastStore.getState().show('Usuario (mín. 2) y contraseña (mín. 4) requeridos', 'warning');
      return;
    }
    setCreatingUser(true);
    try {
      const { usersService } = await import('../../services/users.service');
      await usersService.register(username, newAdminPass, 'user');
      useToastStore.getState().show(`Cuenta @${username} creada`, 'success');
      setNewAdminUser('');
      setNewAdminPass('');
    } catch (err) {
      useToastStore.getState().show(err instanceof Error ? err.message : 'No se pudo crear la cuenta', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  const applySleepTimer = () => {
    const minutes = Number(sleepMinutes);
    if (minutes <= 0) {
      settings.setSleepTimer(null);
      useToastStore.getState().show('Temporizador cancelado', 'info');
      return;
    }
    settings.setSleepTimer({ endAt: Date.now() + minutes * 60000, durationMinutes: minutes });
    useToastStore.getState().show(`Música se detendrá en ${minutes} min`, 'success');
  };

  const copyObsUrl = async () => {
    try {
      await navigator.clipboard.writeText(obsService.fullUrl());
      useToastStore.getState().show('URL del overlay copiada', 'success');
    } catch {
      useToastStore.getState().show('No se pudo copiar', 'error');
    }
  };

  const quickLogin = async () => {
    if (!loginName.trim() || !loginPass) {
      useToastStore.getState().show('Completa usuario y contraseña', 'warning');
      return;
    }
    const ok = await login(loginName, loginPass, true);
    setLoginName('');
    setLoginPass('');
    setSwitchingUser(false);
    if (ok) useToastStore.getState().show('Sesión iniciada', 'success');
  };

  const clearDownloads = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    const username = session?.username ?? null;
    for (const id of downloadedIds) {
      await removeDownload(id, username ?? '').catch(() => undefined);
    }
    setConfirmClear(false);
    useToastStore.getState().show('Descargas locales eliminadas', 'info');
  };

  const goToDownloads = () => {
    useLibraryStore.getState().setCurrentTab('downloads');
    useToastStore.getState().show('Abriendo tu música descargada', 'info');
  };

  const deleteSavedToken = () => {
    if (!confirmTokenDelete) {
      setConfirmTokenDelete(true);
      return;
    }
    clearSavedToken();
    setConfirmTokenDelete(false);
    useToastStore.getState().show('Token guardado eliminado', 'success');
  };

  const savedToken = getSavedToken();

  return (
    <Modal name="settings" title="Ajustes" width={460}>
      <div className="jf-settings">
        <div className="jf-settings-profile">
          {session ? (
            <>
              <div className="jf-settings-user">
                <span className="jf-settings-user-avatar">{session.username.slice(0, 2).toUpperCase()}</span>
                <div className="jf-settings-user-info">
                  <p className="jf-settings-user-name">{session.username}</p>
                  <span className={`jf-role-badge jf-role-badge--${session.role}`}>{session.role}</span>
                </div>
              </div>
              <div className="jf-settings-user-actions">
                <Button variant="glass" size="sm" onClick={() => setSwitchingUser((v) => !v)}>
                  <UserSwitch size={14} /> {switchingUser ? 'Cancelar' : 'Cambiar de cuenta'}
                </Button>
                <Button variant="danger" size="sm" onClick={() => void logout()}>
                  <SignOut size={14} /> Cerrar sesión
                </Button>
              </div>
            </>
          ) : (
            <div className="jf-settings-user">
              <span className="jf-settings-user-avatar jf-settings-user-avatar-guest">
                <UserCircle size={26} />
              </span>
              <div className="jf-settings-user-info">
                <p className="jf-settings-user-name">Invitado</p>
                <p className="jf-settings-user-sub">Inicia sesión para sincronizar</p>
              </div>
            </div>
          )}

          {(!session || switchingUser) && (
            <div className="jf-settings-auth">
              <div className="jf-settings-auth-row">
                <input
                  className="jf-settings-input"
                  placeholder="Usuario"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  autoComplete="username"
                  aria-label="Usuario"
                />
                <input
                  className="jf-settings-input"
                  placeholder="Contraseña"
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void quickLogin()}
                  autoComplete="current-password"
                  aria-label="Contraseña"
                />
              </div>
              <Button variant="primary" size="sm" className="jf-settings-auth-btn" onClick={() => void quickLogin()}>
                Entrar
              </Button>
            </div>
          )}
        </div>

        <div className="jf-settings-group">
          <Switch checked={!settings.disableVisualizer} onChange={(v) => settings.set({ disableVisualizer: !v })} label="Visualizador" description="Barras animadas en el reproductor" />
          <Switch checked={!settings.disableDynamicBg} onChange={(v) => settings.set({ disableDynamicBg: !v })} label="Fondo dinámico" description="Difumina la portada como fondo" />
          <Switch checked={settings.focusMode} onChange={(v) => settings.set({ focusMode: v })} label="Modo foco" description="Atenúa todo menos la portada" />
          <Switch checked={settings.fadeEnabled} onChange={(v) => settings.set({ fadeEnabled: v })} label="Fundidos" description="Crossfade entre canciones" />
        </div>

        <div className="jf-settings-range">
          <label htmlFor="fade-duration">
            Duración del fundido <strong>{settings.fadeDuration}s</strong>
          </label>
          <Slider
            id="fade-duration"
            min={2}
            max={12}
            step={1}
            value={settings.fadeDuration}
            onChange={(e) => settings.set({ fadeDuration: Number(e.target.value) })}
            aria-label="Duración del fundido"
          />
        </div>

        <div className="jf-settings-timer">
          <p className="jf-settings-timer-title">Temporizador de sueño</p>
          <div className="jf-settings-timer-row">
            <select
              className="jf-select"
              value={sleepMinutes}
              onChange={(e) => setSleepMinutes(e.target.value)}
              aria-label="Temporizador"
            >
              <option value="0">Desactivado</option>
              <option value="15">15 minutos</option>
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">1 hora</option>
              <option value="120">2 horas</option>
            </select>
            <Button variant="primary" size="sm" onClick={applySleepTimer}>
              Aplicar
            </Button>
          </div>
          {settings.sleepTimer && <p className="jf-settings-timer-status">Timer activo</p>}
        </div>

        <div className="jf-settings-timer">
          <p className="jf-settings-timer-title">Música local</p>
          <div className="jf-settings-timer-row">
            <span className="jf-settings-count">
              <DownloadSimple size={15} /> {downloadedIds.length} {downloadedIds.length === 1 ? 'descarga' : 'descargas'}
            </span>
            {isOffline && (
              <span className="jf-settings-offline">
                <WifiSlash size={13} /> Sin conexión
              </span>
            )}
          </div>
          <div className="jf-settings-timer-row jf-settings-gap">
            <Button variant="glass" size="sm" onClick={goToDownloads}>
              <DownloadSimple size={14} /> Ir a Descargas
            </Button>
            <Button variant="danger" size="sm" onClick={() => void clearDownloads()}>
              <TrashSimple size={14} /> {confirmClear ? '¿Confirmar borrado?' : 'Borrar descargas'}
            </Button>
          </div>
        </div>

        <div className="jf-settings-token">
          <p className="jf-settings-timer-title">Token de desarrollo</p>
          {hasSavedToken() && savedToken ? (
            <div className="jf-settings-timer-row">
              <span className="jf-settings-count jf-settings-count--mono">
                <KeyIcon size={14} /> {maskToken(savedToken)}
              </span>
              <Button variant="danger" size="sm" onClick={deleteSavedToken}>
                <TrashSimple size={14} /> {confirmTokenDelete ? '¿Confirmar borrado?' : 'Borrar token'}
              </Button>
            </div>
          ) : (
            <div className="jf-settings-timer-row">
              <span className="jf-settings-count">
                <KeyIcon size={14} /> No hay token guardado en este dispositivo
              </span>
            </div>
          )}
          <p className="jf-settings-token-hint">
            El token guardado permite entrar con permisos de dev o admin desde la pantalla de inicio de sesión.
          </p>
        </div>

        {session?.role === 'admin' && (
          <div className="jf-settings-token">
            <p className="jf-settings-timer-title">Crear cuenta</p>
            <div className="jf-settings-timer-row">
              <input
                className="jf-input"
                placeholder="usuario"
                value={newAdminUser}
                onChange={(e) => setNewAdminUser(e.target.value)}
                aria-label="Nuevo usuario"
              />
              <input
                className="jf-input"
                type="password"
                placeholder="contraseña"
                value={newAdminPass}
                onChange={(e) => setNewAdminPass(e.target.value)}
                aria-label="Contraseña del nuevo usuario"
              />
              <Button variant="glass" size="sm" onClick={() => void createAdminUser()} disabled={creatingUser}>
                <UserPlus size={14} /> {creatingUser ? 'Creando…' : 'Crear (user)'}
              </Button>
            </div>
            <p className="jf-settings-token-hint">
              Como admin solo podés crear cuentas de usuario; el dev puede asignar roles superiores.
            </p>
          </div>
        )}

        {updater && (
          <div className="jf-settings-token">
            <p className="jf-settings-timer-title">Actualizaciones</p>
            <div className="jf-settings-timer-row">
              <span className="jf-settings-count">
                Versión actual: <strong>{updaterInfo?.version ?? '…'}</strong>
              </span>
              {updaterStatus && <span className="jf-settings-count">{updaterStatus}</span>}
            </div>
            <div className="jf-settings-timer-row jf-settings-gap">
              <Button variant="glass" size="sm" onClick={() => void checkForUpdates()}>
                <ArrowClockwise size={14} /> Buscar actualizaciones
              </Button>
              {(updaterInfo?.state.downloaded || updaterInfo?.state.available) && (
                <Button variant="primary" size="sm" onClick={() => void installUpdate()}>
                  <DownloadSimple size={14} /> Instalar actualización
                </Button>
              )}
            </div>
            <p className="jf-settings-token-hint">
              Si hay una actualización descargada, se instala desde aquí sin abrir el navegador.
            </p>
          </div>
        )}

        <div className="jf-settings-obs">
          <p className="jf-settings-timer-title">Overlay para OBS</p>
          <div className="jf-settings-timer-row">
            <Button variant="glass" size="sm" onClick={() => void copyObsUrl()}>
              <Copy size={14} /> Copiar URL
            </Button>
            <Button variant="glass" size="sm" onClick={() => window.open(obsService.fullUrl(), '_blank')}>
              <ArrowSquareOut size={14} /> Abrir overlay
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
