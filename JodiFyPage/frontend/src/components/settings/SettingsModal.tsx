import { useEffect, useState } from 'react';
import {
  ArrowClockwise,
  ArrowSquareOut,
  Broadcast,
  Copy,
  DownloadSimple,
  Globe,
  HardDrive,
  Moon,
  PaintBrush,
  SignOut,
  SpeakerHigh,
  Sun,
  Timer,
  TrashSimple,
  UserCircle,
  UserPlus,
  UserSwitch,
  Waveform,
  Sparkle,
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
import { removeDownload } from '../../services/offline.service';
import { obsService } from '../../services/obs.service';
import { clearSavedToken, getSavedToken, maskToken } from '../../lib/token';
import { useT } from '../../lib/i18n';

type SettingsTab = 'general' | 'audio' | 'visual' | 'obs' | 'storage' | 'account';

export function SettingsModal() {
  const t = useT();
  const settings = useSettingsStore();
  const { session, login, logout } = useSession();
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
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
      useToastStore.getState().show(settings.language === 'en' ? 'Sleep timer cancelled' : 'Temporizador cancelado', 'info');
      return;
    }
    settings.setSleepTimer({ endAt: Date.now() + minutes * 60000, durationMinutes: minutes });
    useToastStore
      .getState()
      .show(
        settings.language === 'en' ? `Music will stop in ${minutes} min` : `Música se detendrá en ${minutes} min`,
        'success'
      );
  };

  const copyObsUrl = async () => {
    try {
      await navigator.clipboard.writeText(obsService.fullUrl(settings.obsTheme));
      useToastStore.getState().show(settings.language === 'en' ? 'Overlay URL copied to clipboard' : 'URL del overlay copiada', 'success');
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
    useToastStore.getState().show(t('settings.storage.cleared'), 'info');
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
    <Modal name="settings" title={t('settings.title')} width={780} className="jf-modal--settings">
      <div className="jf-settings-layout">
        {/* SIDEBAR DE CATEGORÍAS */}
        <div className="jf-settings-sidebar" role="tablist">
          <div className="jf-settings-sidebar-header">Preferencias</div>
          <button
            type="button"
            className={`jf-settings-nav-btn ${activeTab === 'general' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Globe size={16} />
            <span>{t('settings.tabs.general')}</span>
          </button>
          <button
            type="button"
            className={`jf-settings-nav-btn ${activeTab === 'audio' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('audio')}
          >
            <SpeakerHigh size={16} />
            <span>{t('settings.tabs.audio')}</span>
          </button>
          <button
            type="button"
            className={`jf-settings-nav-btn ${activeTab === 'visual' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('visual')}
          >
            <PaintBrush size={16} />
            <span>{t('settings.tabs.visual')}</span>
          </button>
          <button
            type="button"
            className={`jf-settings-nav-btn ${activeTab === 'obs' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('obs')}
          >
            <Broadcast size={16} />
            <span>{t('settings.tabs.obs')}</span>
          </button>
          <button
            type="button"
            className={`jf-settings-nav-btn ${activeTab === 'storage' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('storage')}
          >
            <HardDrive size={16} />
            <span>{t('settings.tabs.storage')}</span>
          </button>
          <button
            type="button"
            className={`jf-settings-nav-btn ${activeTab === 'account' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <UserCircle size={16} />
            <span>{t('settings.tabs.account')}</span>
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL SEGMENTADO */}
        <div className="jf-settings-content">
          {/* PESTAÑA 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="jf-settings-tab-pane">
              <div className="jf-settings-pane-header">
                <h3 className="jf-settings-pane-title">
                  <Globe size={18} /> Configuración General
                </h3>
                <p className="jf-settings-pane-desc">
                  Personaliza el idioma de la aplicación y la experiencia de reproducción continua.
                </p>
              </div>

              <div className="jf-settings-card">
                {/* Idioma */}
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">{t('settings.lang')}</span>
                    <span className="jf-settings-label-desc">{t('settings.lang.desc')}</span>
                  </div>
                  <div className="jf-settings-control">
                    <div className="jf-settings-lang-toggle">
                      <button
                        type="button"
                        className={`jf-lang-btn ${settings.language === 'es' ? 'is-active' : ''}`}
                        onClick={() => settings.setLanguage('es')}
                      >
                        Español (ES)
                      </button>
                      <button
                        type="button"
                        className={`jf-lang-btn ${settings.language === 'en' ? 'is-active' : ''}`}
                        onClick={() => settings.setLanguage('en')}
                      >
                        English (EN)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modo Enfoque */}
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">{t('settings.focus')}</span>
                    <span className="jf-settings-label-desc">{t('settings.focus.desc')}</span>
                  </div>
                  <div className="jf-settings-control">
                    <Switch
                      checked={settings.focusMode}
                      onChange={(v) => settings.set({ focusMode: v })}
                    />
                  </div>
                </div>

                {/* Smart Auto Radio (Innovación) */}
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">
                      <Sparkle size={14} weight="fill" color="#00f0ff" /> Radio Continua Inteligente (Smart Flow)
                    </span>
                    <span className="jf-settings-label-desc">
                      Si la lista o cola finaliza, JodiFy recomienda canciones similares para que la música nunca se detenga.
                    </span>
                  </div>
                  <div className="jf-settings-control">
                    <Switch
                      checked={settings.smartAutoRadio}
                      onChange={(v) => settings.set({ smartAutoRadio: v })}
                    />
                  </div>
                </div>
              </div>

              {/* Temporizador de apagado */}
              <div className="jf-settings-card">
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">
                      <Timer size={15} /> Temporizador de apagado (Sleep Timer)
                    </span>
                    <span className="jf-settings-label-desc">
                      Detiene automáticamente la reproducción al cabo de los minutos seleccionados.
                    </span>
                  </div>
                  <div className="jf-settings-control" style={{ gap: '8px', display: 'flex' }}>
                    <select
                      className="jf-select"
                      value={sleepMinutes}
                      onChange={(e) => setSleepMinutes(e.target.value)}
                    >
                      <option value="0">Desactivado</option>
                      <option value="15">15 minutos</option>
                      <option value="30">30 minutos</option>
                      <option value="45">45 minutos</option>
                      <option value="60">60 minutos (1 hora)</option>
                      <option value="90">90 minutos (1.5 h)</option>
                    </select>
                    <Button variant="primary" size="sm" onClick={applySleepTimer}>
                      Aplicar
                    </Button>
                  </div>
                </div>

                {settings.sleepTimer && (
                  <p className="jf-settings-timer-status" style={{ margin: 0, color: '#00f0ff', fontSize: '11.5px' }}>
                    ✓ Temporizador activo: {Math.max(0, Math.ceil((settings.sleepTimer.endAt - Date.now()) / 60000))} min restantes
                  </p>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA 2: AUDIO & DSP */}
          {activeTab === 'audio' && (
            <div className="jf-settings-tab-pane">
              <div className="jf-settings-pane-header">
                <h3 className="jf-settings-pane-title">
                  <SpeakerHigh size={18} /> Procesamiento de Audio & DSP Studio
                </h3>
                <p className="jf-settings-pane-desc">
                  Calidad de sonido acústica de estudio, transiciones suaves y fidelidad sonora.
                </p>
              </div>

              <div className="jf-settings-card">
                {/* Normalización de volumen */}
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">{t('settings.audio.norm')}</span>
                    <span className="jf-settings-label-desc">{t('settings.audio.norm.desc')}</span>
                  </div>
                  <div className="jf-settings-control">
                    <Switch
                      checked={settings.volumeNormalization}
                      onChange={(v) => {
                        settings.set({ volumeNormalization: v });
                        useToastStore.getState().show(
                          v ? 'Normalización de volumen activada' : 'Normalización desactivada',
                          'info',
                          1500
                        );
                      }}
                    />
                  </div>
                </div>

                {/* Calidad de Audio */}
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">{t('settings.audio.quality')}</span>
                    <span className="jf-settings-label-desc">
                      Ajusta la tasa de bits y el muestreo de transmisión de audio.
                    </span>
                  </div>
                  <div className="jf-settings-control">
                    <select
                      className="jf-select"
                      value={settings.audioQuality}
                      onChange={(e) => {
                        const val = e.target.value as 'auto' | 'high' | 'lossless';
                        settings.set({ audioQuality: val });
                        useToastStore.getState().show(`Calidad: ${val}`, 'info', 1200);
                      }}
                    >
                      <option value="lossless">{t('settings.audio.quality.lossless')}</option>
                      <option value="high">{t('settings.audio.quality.high')}</option>
                      <option value="auto">{t('settings.audio.quality.auto')}</option>
                    </select>
                  </div>
                </div>

                {/* Audio Espacial 3D (Innovación) */}
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">
                      <Waveform size={14} color="#a855f7" /> Escenario Acústico 3D (Spatial Soundstage)
                    </span>
                    <span className="jf-settings-label-desc">
                      Expande el campo estereofónico simulando la resonancia de una sala de conciertos acústica.
                    </span>
                  </div>
                  <div className="jf-settings-control">
                    <Switch
                      checked={settings.spatialAudio}
                      onChange={(v) => {
                        settings.set({ spatialAudio: v });
                        useToastStore.getState().show(
                          v ? 'Audio Espacial 3D Activado' : 'Audio Espacial Desactivado',
                          'info',
                          1500
                        );
                      }}
                    />
                  </div>
                </div>

                {/* Crossfade */}
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">{t('settings.audio.crossfade')}</span>
                    <span className="jf-settings-label-desc">{t('settings.audio.crossfade.desc')}</span>
                  </div>
                  <div className="jf-settings-control">
                    <Switch
                      checked={settings.fadeEnabled}
                      onChange={(v) => settings.set({ fadeEnabled: v })}
                    />
                  </div>
                </div>

                {settings.fadeEnabled && (
                  <div className="jf-settings-range" style={{ paddingTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>{t('settings.audio.duration')}</span>
                      <strong style={{ color: '#00f0ff', fontFamily: 'var(--font-mono)' }}>{settings.fadeDuration}s</strong>
                    </div>
                    <Slider
                      min={1}
                      max={12}
                      step={1}
                      value={settings.fadeDuration}
                      onChange={(e) => settings.set({ fadeDuration: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA 3: APARIENCIA & VISUALES */}
          {activeTab === 'visual' && (
            <div className="jf-settings-tab-pane">
              <div className="jf-settings-pane-header">
                <h3 className="jf-settings-pane-title">
                  <PaintBrush size={18} /> Apariencia & Efectos Visuales
                </h3>
                <p className="jf-settings-pane-desc">
                  Controla la iluminación reactiva, animaciones y texturas analógicas.
                </p>
              </div>

              <div className="jf-settings-card">
                {/* Modo Oscuro / Claro */}
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">{t('settings.theme')}</span>
                    <span className="jf-settings-label-desc">
                      {settings.theme === 'dark' ? t('settings.theme.dark') : t('settings.theme.light')}
                    </span>
                  </div>
                  <div className="jf-settings-control">
                    <Button variant="glass" size="sm" onClick={settings.toggleTheme}>
                      {settings.theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
                      <span>{settings.theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</span>
                    </Button>
                  </div>
                </div>

                {/* Fondo Dinámico Aurora */}
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">{t('settings.visual.dynamicBg')}</span>
                    <span className="jf-settings-label-desc">{t('settings.visual.dynamicBg.desc')}</span>
                  </div>
                  <div className="jf-settings-control">
                    <Switch
                      checked={!settings.disableDynamicBg}
                      onChange={(v) => settings.set({ disableDynamicBg: !v })}
                    />
                  </div>
                </div>

                {!settings.disableDynamicBg && (
                  <div className="jf-settings-range">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>{t('settings.visual.intensity')}</span>
                      <strong style={{ color: '#00f0ff', fontFamily: 'var(--font-mono)' }}>{settings.ambientIntensity}%</strong>
                    </div>
                    <Slider
                      min={20}
                      max={100}
                      step={5}
                      value={settings.ambientIntensity}
                      onChange={(e) => settings.set({ ambientIntensity: Number(e.target.value) })}
                    />
                  </div>
                )}

                {/* Grano analógico */}
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">{t('settings.visual.noise')}</span>
                    <span className="jf-settings-label-desc">{t('settings.visual.noise.desc')}</span>
                  </div>
                  <div className="jf-settings-control">
                    <Switch
                      checked={settings.analogNoise}
                      onChange={(v) => settings.set({ analogNoise: v })}
                    />
                  </div>
                </div>

                {/* Visualizador barra dock */}
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">{t('settings.visual.visualizer')}</span>
                    <span className="jf-settings-label-desc">{t('settings.visual.visualizer.desc')}</span>
                  </div>
                  <div className="jf-settings-control">
                    <Switch
                      checked={!settings.disableVisualizer}
                      onChange={(v) => settings.set({ disableVisualizer: !v })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 4: OVERLAY OBS */}
          {activeTab === 'obs' && (
            <div className="jf-settings-tab-pane">
              <div className="jf-settings-pane-header">
                <h3 className="jf-settings-pane-title">
                  <Broadcast size={18} /> Overlay para Streaming (OBS Studio / Twitch)
                </h3>
                <p className="jf-settings-pane-desc">{t('settings.obs.desc')}</p>
              </div>

              <div className="jf-settings-card">
                {/* Selector de Tema OBS */}
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">{t('settings.obs.theme')}</span>
                    <span className="jf-settings-label-desc">
                      Personaliza la apariencia estética del widget de transmisión.
                    </span>
                  </div>
                  <div className="jf-settings-control">
                    <select
                      className="jf-select"
                      value={settings.obsTheme}
                      onChange={(e) => {
                        const val = e.target.value as 'default' | 'neon' | 'glass' | 'minimal';
                        settings.set({ obsTheme: val });
                      }}
                    >
                      <option value="default">{t('settings.obs.theme.default')}</option>
                      <option value="neon">{t('settings.obs.theme.neon')}</option>
                      <option value="minimal">{t('settings.obs.theme.minimal')}</option>
                    </select>
                  </div>
                </div>

                {/* Caja de URL */}
                <div className="jf-settings-obs-url-box">
                  <span className="jf-settings-obs-tag">{t('settings.obs.url')}</span>
                  <code className="jf-settings-obs-code">{obsService.fullUrl(settings.obsTheme)}</code>
                  <div className="jf-settings-obs-actions">
                    <Button variant="primary" size="sm" onClick={() => void copyObsUrl()}>
                      <Copy size={14} /> {t('settings.obs.copy')}
                    </Button>
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => window.open(obsService.fullUrl(settings.obsTheme), '_blank')}
                    >
                      <ArrowSquareOut size={14} /> {t('settings.obs.open')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 5: ALMACENAMIENTO */}
          {activeTab === 'storage' && (
            <div className="jf-settings-tab-pane">
              <div className="jf-settings-pane-header">
                <h3 className="jf-settings-pane-title">
                  <HardDrive size={18} /> Almacenamiento & Modo Offline
                </h3>
                <p className="jf-settings-pane-desc">
                  Administra las canciones descargadas en la base de datos local IndexedDB.
                </p>
              </div>

              <div className="jf-settings-card">
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">Música Descargada Localmente</span>
                    <span className="jf-settings-label-desc">
                      Canciones almacenadas para reproducción sin conexión a internet.
                    </span>
                  </div>
                  <div className="jf-settings-control">
                    <span className="jf-settings-count">
                      <DownloadSimple size={14} />
                      <strong>{downloadedIds.length}</strong> {t('settings.storage.songs')}
                    </span>
                  </div>
                </div>

                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">Gestionar descargas</span>
                    <span className="jf-settings-label-desc">
                      Explora o reproduce tus canciones descargadas directamente.
                    </span>
                  </div>
                  <div className="jf-settings-control" style={{ gap: '8px', display: 'flex' }}>
                    <Button variant="glass" size="sm" onClick={goToDownloads}>
                      Ver Descargas
                    </Button>
                    <Button
                      variant={confirmClear ? 'danger' : 'outline'}
                      size="sm"
                      onClick={() => void clearDownloads()}
                    >
                      <TrashSimple size={14} />
                      <span>{confirmClear ? t('settings.storage.confirm') : t('settings.storage.clear')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 6: CUENTA & ACCESO */}
          {activeTab === 'account' && (
            <div className="jf-settings-tab-pane">
              <div className="jf-settings-pane-header">
                <h3 className="jf-settings-pane-title">
                  <UserCircle size={18} /> Cuenta & Credenciales
                </h3>
                <p className="jf-settings-pane-desc">
                  Información de usuario autenticado, tokens y administración.
                </p>
              </div>

              <div className="jf-settings-card">
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">Usuario Activo</span>
                    <span className="jf-settings-label-desc">
                      Sesión iniciada como <strong>@{session?.username ?? 'invitado'}</strong> ({session?.role ?? 'user'})
                    </span>
                  </div>
                  <div className="jf-settings-control">
                    <Button variant="danger" size="sm" onClick={() => void logout()}>
                      <SignOut size={14} /> Cerrar Sesión
                    </Button>
                  </div>
                </div>

                {savedToken && (
                  <div className="jf-settings-row">
                    <div className="jf-settings-label-block">
                      <span className="jf-settings-label-title">Token de Sesión Guardado</span>
                      <span className="jf-settings-label-desc" style={{ fontFamily: 'var(--font-mono)' }}>
                        {maskToken(savedToken)}
                      </span>
                    </div>
                    <div className="jf-settings-control">
                      <Button
                        variant={confirmTokenDelete ? 'danger' : 'glass'}
                        size="sm"
                        onClick={deleteSavedToken}
                      >
                        <TrashSimple size={13} />
                        <span>{confirmTokenDelete ? 'Confirmar borrado' : 'Eliminar token'}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cambiar de cuenta */}
              <div className="jf-settings-card">
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">Cambio Rápido de Cuenta</span>
                    <span className="jf-settings-label-desc">
                      Inicia sesión con otro usuario sin salir de la aplicación.
                    </span>
                  </div>
                  <div className="jf-settings-control">
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => setSwitchingUser(!switchingUser)}
                    >
                      <UserSwitch size={14} /> {switchingUser ? 'Cancelar' : 'Cambiar usuario'}
                    </Button>
                  </div>
                </div>

                {switchingUser && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="text"
                      className="jf-input"
                      placeholder="Usuario"
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="password"
                      className="jf-input"
                      placeholder="Contraseña"
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <Button variant="primary" size="sm" onClick={() => void quickLogin()}>
                      Entrar
                    </Button>
                  </div>
                )}
              </div>

              {/* Crear usuario (Admin) */}
              {session?.role === 'admin' && (
                <div className="jf-settings-card">
                  <div className="jf-settings-row">
                    <div className="jf-settings-label-block">
                      <span className="jf-settings-label-title">
                        <UserPlus size={14} /> Crear Nuevo Usuario (Admin)
                      </span>
                      <span className="jf-settings-label-desc">
                        Crea credenciales para amigos o familiares en el servidor.
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="jf-input"
                      placeholder="Nuevo usuario"
                      value={newAdminUser}
                      onChange={(e) => setNewAdminUser(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="password"
                      className="jf-input"
                      placeholder="Contraseña"
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={creatingUser}
                      onClick={() => void createAdminUser()}
                    >
                      Crear
                    </Button>
                  </div>
                </div>
              )}

              {/* Actualizador Desktop */}
              {updater && (
                <div className="jf-settings-card">
                  <div className="jf-settings-row">
                    <div className="jf-settings-label-block">
                      <span className="jf-settings-label-title">Actualizador de Escritorio</span>
                      <span className="jf-settings-label-desc">
                        Estado: <strong>{updaterStatus}</strong>
                      </span>
                    </div>
                    <div className="jf-settings-control">
                      {updaterInfo?.state?.downloaded ? (
                        <Button variant="primary" size="sm" onClick={() => void installUpdate()}>
                          Reiniciar e Instalar
                        </Button>
                      ) : (
                        <Button variant="glass" size="sm" onClick={() => void checkForUpdates()}>
                          <ArrowClockwise size={14} /> Buscar actualizaciones
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
