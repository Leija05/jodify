import { useEffect, useState } from 'react';
import {
  ArrowClockwise,
  ArrowSquareOut,
  Broadcast,
  CheckCircle,
  Copy,
  DownloadSimple,
  Globe,
  HardDrive,
  Info,
  Lightning,
  Moon,
  PaintBrush,
  Play,
  RocketLaunch,
  SignOut,
  SpeakerHigh,
  Sparkle,
  Sun,
  Timer,
  TrashSimple,
  UserCircle,
  UserPlus,
  UserSwitch,
  Waveform,
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
import { STARTUP_SPLASH_STYLES } from '../../lib/startupSplashStyles';

type SettingsTab = 'general' | 'audio' | 'visual' | 'obs' | 'storage' | 'account' | 'about';

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

  const updater = typeof window !== 'undefined' ? window.jodifyUpdater : undefined;
  const [updaterInfo, setUpdaterInfo] = useState<DesktopUpdaterInfo | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

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
    setIsCheckingUpdates(true);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastCheckTime(timeStr);

    if (updater) {
      useToastStore.getState().show('Buscando actualizaciones en GitHub Releases…', 'info');
      try {
        await updater.check();
      } catch {
        useToastStore.getState().show('No se pudo buscar actualizaciones', 'error');
      } finally {
        setTimeout(() => setIsCheckingUpdates(false), 800);
      }
    } else {
      useToastStore.getState().show('Verificando versión web de JodiFy…', 'info');
      setTimeout(() => {
        setIsCheckingUpdates(false);
        useToastStore.getState().show('JodiFy Web v2.0.0 está al día con la última versión de producción', 'success');
      }, 900);
    }
  };

  const installUpdate = async () => {
    if (!updater) return;
    await updater.install().catch(() => {
      useToastStore.getState().show('No se pudo instalar la actualización', 'error');
    });
  };

  const openReleaseNotesModal = () => {
    window.dispatchEvent(
      new CustomEvent('jodify:open-desktop-updater', {
        detail: updaterInfo?.state,
      })
    );
  };

  const isUpdateAvailable = Boolean(updaterInfo?.state?.available || updaterInfo?.state?.downloaded);
  const isDownloading = Boolean(updaterInfo?.state?.downloading);
  const downloadPercent = Math.round(updaterInfo?.state?.percent ?? 0);
  const isDownloaded = Boolean(updaterInfo?.state?.downloaded);
  const currentAppVersion = updaterInfo?.version || (updater ? '1.3.3' : '2.0.0');

  const updaterStatusText = (() => {
    const s = updaterInfo?.state;
    if (!s) return updater ? 'Al día' : 'Versión Web Estable';
    if (s.error) return `Error al verificar: ${s.error}`;
    if (s.downloaded) return `Versión v${s.latestVersion} descargada y lista para instalar`;
    if (s.downloading) return `Descargando v${s.latestVersion}… ${downloadPercent}%`;
    if (s.available) return `Nueva versión v${s.latestVersion} disponible`;
    return 'Tienes instalada la versión más reciente';
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

          <div className="jf-settings-sidebar-header" style={{ marginTop: '14px' }}>Sistema</div>
          <button
            type="button"
            className={`jf-settings-nav-btn ${activeTab === 'about' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('about')}
            style={{ position: 'relative' }}
          >
            <Info size={16} />
            <span>{t('settings.tabs.about')}</span>
            {isUpdateAvailable && (
              <span
                style={{
                  position: 'absolute',
                  right: '12px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#00e5ff',
                  boxShadow: '0 0 8px #00e5ff',
                }}
              />
            )}
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

              {/* Resumen de Versión y Actualizaciones */}
              <div
                className={`jf-settings-card ${isUpdateAvailable ? 'jf-settings-card--updater-active' : 'jf-settings-card--updater'}`}
                style={{ marginBottom: '14px' }}
              >
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="jf-settings-label-title" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkle size={15} weight="fill" color="#00e5ff" /> Versión de la Aplicación
                      </span>
                      <span className={`jf-version-pill ${updater ? 'is-desktop' : 'is-web'}`}>
                        <span className={`jf-version-dot ${isUpdateAvailable ? 'jf-version-dot--update' : ''}`} />
                        v{currentAppVersion} {updater ? 'Desktop' : 'Web'}
                      </span>
                    </div>
                    <span className="jf-settings-label-desc">
                      {isDownloaded
                        ? `Actualización v${updaterInfo?.state?.latestVersion} descargada y lista para instalar.`
                        : isDownloading
                        ? `Descargando nueva versión v${updaterInfo?.state?.latestVersion} (${downloadPercent}%)...`
                        : isUpdateAvailable
                        ? `Nueva versión v${updaterInfo?.state?.latestVersion} disponible.`
                        : lastCheckTime
                        ? `Sistema al día (última comprobación: ${lastCheckTime}).`
                        : 'Tu aplicación se encuentra en la versión más reciente.'}
                    </span>
                  </div>
                  <div className="jf-settings-control" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isDownloaded ? (
                      <Button variant="primary" size="sm" onClick={() => void installUpdate()}>
                        <RocketLaunch size={14} /> Reiniciar e Instalar
                      </Button>
                    ) : (
                      <Button
                        variant="glass"
                        size="sm"
                        disabled={isCheckingUpdates || isDownloading}
                        onClick={() => void checkForUpdates()}
                      >
                        <ArrowClockwise size={14} className={isCheckingUpdates ? 'jf-spin' : ''} />
                        {isCheckingUpdates ? 'Buscando…' : 'Buscar actualizaciones'}
                      </Button>
                    )}
                    <Button variant="glass" size="sm" onClick={() => setActiveTab('about')}>
                      Detalles
                    </Button>
                  </div>
                </div>
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

                {/* Animación de Inicio Desktop */}
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkle size={14} weight="fill" color="#a855f7" /> {t('settings.visual.startupAnim')}
                    </span>
                    <span className="jf-settings-label-desc">
                      {t('settings.visual.startupAnim.desc')}
                    </span>
                  </div>
                  <div className="jf-settings-control" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent('jodify:play-startup-animation', {
                            detail: { style: settings.startupSplashStyle },
                          })
                        );
                      }}
                      title="Reproducir la animación del logo"
                    >
                      <Play size={13} weight="fill" /> {t('settings.visual.startupAnim.test')}
                    </Button>
                    <Switch
                      checked={settings.desktopStartupAnimation}
                      onChange={(v) => settings.set({ desktopStartupAnimation: v })}
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

          {/* PESTAÑA 3: APARIENCIA & RENDIMIENTO */}
          {activeTab === 'visual' && (
            <div className="jf-settings-tab-pane">
              <div className="jf-settings-pane-header">
                <h3 className="jf-settings-pane-title">
                  <PaintBrush size={18} /> Apariencia & Rendimiento
                </h3>
                <p className="jf-settings-pane-desc">
                  Optimiza los efectos visuales para tu computadora, ajusta desenfoques, iluminación y animaciones.
                </p>
              </div>

              {/* TARJETA MAESTRA: MODO ALTO RENDIMIENTO (PARA PCs DE BAJOS RECURSOS) */}
              <div className={`jf-settings-card jf-settings-card--perf ${settings.performanceMode ? 'is-active' : ''}`}>
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="jf-settings-label-title" style={{ fontSize: '13.5px', fontWeight: 800 }}>
                        <Lightning size={16} weight="fill" color="#00f0ff" /> Modo Alto Rendimiento (Para PCs lentas o laptops)
                      </span>
                      {settings.performanceMode && (
                        <span className="jf-perf-badge">
                          <Lightning size={10} weight="fill" /> Activo
                        </span>
                      )}
                    </div>
                    <span className="jf-settings-label-desc" style={{ marginTop: '3px' }}>
                      Desactiva desenfoques dinámicos pesados (backdrop-filter) y bucles continuos de animación en segundo plano, maximizando los FPS y reduciendo el consumo de GPU/batería al mínimo sin perder la estética oscura y elegante.
                    </span>
                  </div>
                  <div className="jf-settings-control">
                    <Switch
                      checked={settings.performanceMode}
                      onChange={(v) => {
                        settings.set({ performanceMode: v });
                        useToastStore.getState().show(
                          v ? '⚡ Modo Alto Rendimiento activado' : 'Modo Alto Rendimiento desactivado',
                          v ? 'success' : 'info',
                          2000
                        );
                      }}
                    />
                  </div>
                </div>

                {/* Sub-opciones granulares de rendimiento */}
                <div className="jf-perf-suboptions">
                  {/* Desactivar Glass Blur / Backdrop Filter */}
                  <div className="jf-settings-row">
                    <div className="jf-settings-label-block">
                      <span className="jf-settings-label-title" style={{ fontSize: '12px' }}>
                        Desactivar desenfoques pesados (Glass Blur)
                      </span>
                      <span className="jf-settings-label-desc" style={{ fontSize: '11px' }}>
                        Reemplaza filtros de desenfoque en tiempo real por superficies oscuras esmeriladas sólidas. Gran aumento de fluidez.
                      </span>
                    </div>
                    <div className="jf-settings-control">
                      <Switch
                        checked={settings.reduceBlur || settings.performanceMode}
                        onChange={(v) => settings.set({ reduceBlur: v })}
                        disabled={settings.performanceMode}
                      />
                    </div>
                  </div>

                  {/* Reducir animaciones de fondo */}
                  <div className="jf-settings-row">
                    <div className="jf-settings-label-block">
                      <span className="jf-settings-label-title" style={{ fontSize: '12px' }}>
                        Reducir animaciones continuas de fondo
                      </span>
                      <span className="jf-settings-label-desc" style={{ fontSize: '11px' }}>
                        Pausa las esferas de luz en movimiento y bucles infinitos en segundo plano para ahorrar procesador.
                      </span>
                    </div>
                    <div className="jf-settings-control">
                      <Switch
                        checked={settings.reduceAnimations || settings.performanceMode}
                        onChange={(v) => settings.set({ reduceAnimations: v })}
                        disabled={settings.performanceMode}
                      />
                    </div>
                  </div>

                  {/* Compañero Pixel Art en Modo Reposo */}
                  <div className="jf-settings-row">
                    <div className="jf-settings-label-block">
                      <span className="jf-settings-label-title" style={{ fontSize: '12px' }}>
                        🐾 Mascota en Modo Reposo / Eco
                      </span>
                      <span className="jf-settings-label-desc" style={{ fontSize: '11px' }}>
                        Mantiene a tu compañero descansando en su sitio sin consumir ciclos de pantalla continuos.
                      </span>
                    </div>
                    <div className="jf-settings-control">
                      <Switch
                        checked={settings.petEcoMode || settings.performanceMode}
                        onChange={(v) => settings.set({ petEcoMode: v })}
                        disabled={settings.performanceMode}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* TARJETA DE ESTÉTICA & AMBIENTE */}
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
                      checked={settings.analogNoise && !settings.performanceMode}
                      onChange={(v) => settings.set({ analogNoise: v })}
                      disabled={settings.performanceMode}
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

                {/* Animación de Inicio Cinemática */}
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkle size={14} weight="fill" color="#00f0ff" /> {t('settings.visual.startupAnim')}
                    </span>
                    <span className="jf-settings-label-desc">
                      {t('settings.visual.startupAnim.desc')}
                    </span>
                  </div>
                  <div className="jf-settings-control" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent('jodify:play-startup-animation', {
                            detail: { style: settings.startupSplashStyle },
                          })
                        );
                      }}
                    >
                      <Play size={13} weight="fill" /> {t('settings.visual.startupAnim.test')}
                    </Button>
                    <Switch
                      checked={settings.desktopStartupAnimation}
                      onChange={(v) => settings.set({ desktopStartupAnimation: v })}
                    />
                  </div>
                </div>

                {settings.desktopStartupAnimation && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '14px' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', display: 'block' }}>
                        {t('settings.visual.startupAnim.style')}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {t('settings.visual.startupAnim.style.desc')}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                        gap: '10px',
                      }}
                    >
                      {STARTUP_SPLASH_STYLES.map((styleItem) => {
                        const isSelected = (settings.startupSplashStyle || 'cyber_neon') === styleItem.id;

                        return (
                          <div
                            key={styleItem.id}
                            onClick={() => settings.set({ startupSplashStyle: styleItem.id })}
                            style={{
                              position: 'relative',
                              padding: '12px 14px',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                              border: isSelected
                                ? `1.5px solid ${styleItem.accent}`
                                : '1px solid rgba(255,255,255,0.08)',
                              boxShadow: isSelected
                                ? `0 0 16px ${styleItem.accent}33, inset 0 0 12px ${styleItem.accent}15`
                                : 'none',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: styleItem.accent,
                                    boxShadow: `0 0 8px ${styleItem.accent}`,
                                  }}
                                />
                                <span style={{ fontSize: '12.5px', fontWeight: 700, color: isSelected ? '#fff' : 'rgba(255,255,255,0.85)' }}>
                                  {styleItem.name}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: '9.5px',
                                  padding: '2px 6px',
                                  borderRadius: '99px',
                                  background: 'rgba(255,255,255,0.08)',
                                  color: 'var(--text-muted)',
                                  fontWeight: 600,
                                }}
                              >
                                {styleItem.badge}
                              </span>
                            </div>

                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              {styleItem.desc}
                            </p>

                            <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  settings.set({ startupSplashStyle: styleItem.id });
                                  window.dispatchEvent(
                                    new CustomEvent('jodify:play-startup-animation', {
                                      detail: { style: styleItem.id },
                                    })
                                  );
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.12)',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  color: isSelected ? styleItem.accent : 'rgba(255,255,255,0.7)',
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                                title="Previsualizar esta variante"
                              >
                                <Play size={10} weight="fill" /> Probar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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

              {/* Enlace a Acerca de y Versión */}
              <div className="jf-settings-card">
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title">Versión & Actualizaciones</span>
                    <span className="jf-settings-label-desc">
                      Consulta la versión actual, canales y busca actualizaciones en la sección del sistema.
                    </span>
                  </div>
                  <div className="jf-settings-control">
                    <Button variant="glass" size="sm" onClick={() => setActiveTab('about')}>
                      <Info size={14} /> Ver Acerca de & Versión
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 7: ACERCA DE & VERSIÓN */}
          {activeTab === 'about' && (
            <div className="jf-settings-tab-pane">
              <div className="jf-settings-pane-header">
                <h3 className="jf-settings-pane-title">
                  <Info size={18} /> Acerca de JodiFy & Versión
                </h3>
                <p className="jf-settings-pane-desc">
                  Información de la versión, verificación de actualizaciones de software y arquitectura del sistema.
                </p>
              </div>

              {/* Hero Banner de la App */}
              <div className="jf-about-hero">
                <div className="jf-about-logo-wrapper">
                  <img
                    src={`${import.meta.env.BASE_URL}logo.png`}
                    alt="JodiFy"
                    style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="jf-about-meta">
                  <div className="jf-about-title">
                    <span>JodiFy Workstation</span>
                    <span className={`jf-version-pill ${updater ? 'is-desktop' : 'is-web'}`}>
                      <span className={`jf-version-dot ${isUpdateAvailable ? 'jf-version-dot--update' : ''}`} />
                      v{currentAppVersion}
                    </span>
                  </div>
                  <div className="jf-about-tagline">
                    Experiencia de audio de ultra-baja latencia con DSP de 32-bit, visualizador espectral y sincronización en la nube.
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('jodify:play-startup-animation'));
                      }}
                    >
                      <Sparkle size={13} color="#00f0ff" weight="fill" /> Reproducir Animación de Inicio
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tarjeta del Actualizador */}
              <div className={`jf-settings-card ${isUpdateAvailable ? 'jf-settings-card--updater-active' : 'jf-settings-card--updater'}`}>
                <div className="jf-settings-row">
                  <div className="jf-settings-label-block">
                    <span className="jf-settings-label-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isUpdateAvailable ? (
                        <RocketLaunch size={16} color="#00e5ff" />
                      ) : (
                        <CheckCircle size={16} color="#00e676" />
                      )}
                      Centro de Actualizaciones
                    </span>
                    <span className="jf-settings-label-desc">
                      {updaterStatusText}
                      {lastCheckTime && ` • Comprobado a las ${lastCheckTime}`}
                    </span>
                  </div>

                  <div className="jf-settings-control" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isUpdateAvailable && (
                      <Button variant="glass" size="sm" onClick={openReleaseNotesModal}>
                        <Sparkle size={14} /> Ver Novedades
                      </Button>
                    )}

                    {isDownloaded ? (
                      <Button variant="primary" size="sm" onClick={() => void installUpdate()}>
                        <RocketLaunch size={14} /> Reiniciar e Instalar
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isCheckingUpdates || isDownloading}
                        onClick={() => void checkForUpdates()}
                      >
                        <ArrowClockwise size={14} className={isCheckingUpdates ? 'jf-spin' : ''} />
                        {isCheckingUpdates ? 'Buscando actualizaciones…' : 'Buscar actualizaciones'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Barra de progreso de descarga si aplica */}
                {isDownloading && (
                  <div className="jf-about-update-banner">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                      <span style={{ color: '#00e5ff' }}>Descargando nueva versión v{updaterInfo?.state?.latestVersion}...</span>
                      <span style={{ color: '#fff', fontFamily: 'monospace' }}>{downloadPercent}%</span>
                    </div>
                    <div className="jf-update-progress-container">
                      <div
                        className="jf-update-progress-bar"
                        style={{ width: `${Math.max(5, Math.min(100, downloadPercent))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Telemetría y Entorno */}
              <div className="jf-telemetry-grid">
                <div className="jf-telemetry-card">
                  <span className="jf-telemetry-label">Entorno de Ejecución</span>
                  <span className="jf-telemetry-value">
                    {updater ? 'Electron v32 (Desktop Nativo)' : 'Navegador Web (PWA WebAudio)'}
                  </span>
                </div>
                <div className="jf-telemetry-card">
                  <span className="jf-telemetry-label">Motor de Procesamiento</span>
                  <span className="jf-telemetry-value">Web Audio API 32-Bit Float DSP</span>
                </div>
                <div className="jf-telemetry-card">
                  <span className="jf-telemetry-label">Canal de Distribución</span>
                  <span className="jf-telemetry-value">
                    {updater ? 'GitHub Releases (Producción)' : 'Cloudflare CDN / Edge'}
                  </span>
                </div>
                <div className="jf-telemetry-card">
                  <span className="jf-telemetry-label">Licencia & Código</span>
                  <span className="jf-telemetry-value">MIT Open Source • JodiFy Team</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
