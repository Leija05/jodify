import { useState, useEffect, useRef } from 'react';
import {
  ArrowClockwise,
  Eraser,
  Power,
  ShieldWarning,
  Sparkle,
  Trash,
  Wrench,
  Cookie,
  CheckCircle,
  WarningCircle,
  Broadcast,
  SpeakerHigh,
  MusicNotes,
  Lightning,
  ArrowSquareOut,
  CircleNotch,
} from '@phosphor-icons/react';
import { Button } from '../ui/Button';
import { devService } from '../../services/dev.service';
import { API_BASE } from '../../lib/api';
import { useToastStore } from '../../store/toast.store';
import { useUiStore } from '../../store/ui.store';
import { confirmDialog } from '../../store/confirm.store';
import type { DevState } from '../../lib/types';

export function DevControl({ state, onChanged }: { state: DevState | null; onChanged: () => void }) {
  const maintenance = state?.maintenance?.enabled ?? false;
  const [message, setMessage] = useState(state?.maintenance?.message ?? '');
  const [toggling, setToggling] = useState(false);
  const [purging, setPurging] = useState(false);
  const [repairingCovers, setRepairingCovers] = useState(false);

  const toggle = async () => {
    setToggling(true);
    try {
      await devService.setMaintenance(!maintenance, message);
      useToastStore.getState().show(
        maintenance ? 'Mantenimiento desactivado' : 'Mantenimiento activado: el login queda bloqueado',
        maintenance ? 'info' : 'warning',
      );
      onChanged();
    } catch {
      useToastStore.getState().show('No se pudo cambiar el estado', 'error');
    } finally {
      setToggling(false);
    }
  };

  const purge = async () => {
    const ok = await confirmDialog({
      title: '¿Borrar todos los logs del servidor?',
      message: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Borrar',
      tone: 'danger',
    });
    if (!ok) return;
    setPurging(true);
    try {
      await devService.purgeLogs();
      useToastStore.getState().show('Logs purgados', 'success');
      onChanged();
    } catch {
      useToastStore.getState().show('No se pudo purgar', 'error');
    } finally {
      setPurging(false);
    }
  };

  const repairCovers = async () => {
    const ok = await confirmDialog({
      title: '¿Restaurar carátulas de playlists?',
      message:
        'Se buscarán en la biblioteca canciones que compartan la misma foto de una playlist y se restaurará la carátula original de su álbum en HD.',
      confirmLabel: 'Restaurar carátulas',
      tone: 'primary',
    });
    if (!ok) return;

    setRepairingCovers(true);
    try {
      const res = await devService.repairPlaylistCovers();
      if (res.repaired_count > 0) {
        useToastStore
          .getState()
          .show(`✅ ¡Éxito! Se restauraron las carátulas originales de ${res.repaired_count} canciones.`, 'success', 4500);
      } else {
        useToastStore
          .getState()
          .show('Todas las canciones ya tienen sus carátulas originales correctas.', 'info', 3000);
      }
      onChanged();
    } catch {
      useToastStore.getState().show('Error al restaurar las carátulas', 'error');
    } finally {
      setRepairingCovers(false);
    }
  };

  return (
    <div className="jf-dev-panel">
      <div className="jf-dev-cols">
        <div className="jf-dev-card jf-dev-card--danger">
          <div className="jf-dev-card-head">
            <span className="jf-dev-card-title">
              <Wrench size={15} /> Modo mantenimiento
            </span>
            <span className="jf-dev-card-sub">bloquea el login de usuarios hasta que lo apagues</span>
          </div>
          <div className="jf-dev-form">
            <label className="jf-dev-field">
              <span className="jf-dev-field-label">Mensaje para quien intente entrar</span>
              <input
                className="jf-input"
                placeholder="Ej: Volvemos en unos minutos 🎧"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
              />
            </label>
            <div className="jf-dev-maintenance-row">
              <span className={`jf-dev-switch ${maintenance ? 'is-on' : ''}`} aria-hidden="true">
                <span className="jf-dev-switch-knob" />
              </span>
              <div>
                <strong>{maintenance ? 'Mantenimiento activo' : 'Servicio normal'}</strong>
                <span className="jf-dev-card-sub">
                  {maintenance
                    ? 'Los usuarios no pueden iniciar sesión; el acceso dev sigue funcionando.'
                    : 'Todo el mundo puede entrar con normalidad.'}
                </span>
              </div>
              <Button variant={maintenance ? 'danger' : 'primary'} size="sm" onClick={() => void toggle()} disabled={toggling}>
                <Power size={13} />
                {toggling ? 'Cambiando…' : maintenance ? 'Apagar' : 'Activar'}
              </Button>
            </div>
          </div>
        </div>

        <div className="jf-dev-card">
          <div className="jf-dev-card-head">
            <span className="jf-dev-card-title">
              <Sparkle size={15} /> Mantenimiento de Biblioteca
            </span>
            <span className="jf-dev-card-sub">reparación de metadatos y carátulas</span>
          </div>
          <div className="jf-dev-form">
            <div className="jf-dev-risky" style={{ borderColor: 'rgba(0, 240, 255, 0.2)' }}>
              <div>
                <strong>Restaurar carátulas de playlists</strong>
                <span className="jf-dev-card-sub">
                  Busca canciones con la foto repetida de una playlist y restaura su carátula original de álbum en HD.
                </span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void repairCovers()}
                disabled={repairingCovers}
              >
                <ArrowClockwise size={13} className={repairingCovers ? 'animate-spin' : ''} />
                {repairingCovers ? 'Reparando…' : 'Reparar carátulas'}
              </Button>
            </div>

            <div className="jf-dev-risky" style={{ borderColor: 'rgba(239, 68, 68, 0.25)', marginTop: '8px' }}>
              <div>
                <strong>Eliminar canciones en lote</strong>
                <span className="jf-dev-card-sub">
                  Selecciona y elimina múltiples canciones de la biblioteca con un solo clic.
                </span>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => useUiStore.getState().open('deleteSongs')}
              >
                <Trash size={13} />
                Eliminar música
              </Button>
            </div>
          </div>
        </div>

        <DevCookiesCard />

        <div className="jf-dev-card">
          <div className="jf-dev-card-head">
            <span className="jf-dev-card-title">
              <ShieldWarning size={15} /> Zona de riesgo
            </span>
            <span className="jf-dev-card-sub">acciones irreversibles</span>
          </div>
          <div className="jf-dev-form">
            <div className="jf-dev-risky">
              <div>
                <strong>Purgar logs del servidor</strong>
                <span className="jf-dev-card-sub">borra el historial de system_logs por completo</span>
              </div>
              <Button variant="danger" size="sm" onClick={() => void purge()} disabled={purging}>
                <Eraser size={13} />
                {purging ? 'Borrando…' : 'Purgar'}
              </Button>
            </div>
            <p className="jf-dev-hint">
              La clave maestra y los códigos de acceso viven en el backend: la clave en <span className="jf-dev-keycard-mono">DEV_KEY</span> del .env, y
              los códigos se generan desde el panel Acceso. Nunca los compartas en público.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const TEST_PRESETS = [
  { name: 'The Strokes - Someday', url: 'https://www.youtube.com/watch?v=knU9gRUWCno' },
  { name: 'Joji - Slow Dancing', url: 'https://www.youtube.com/watch?v=LUXu4aTnK7E' },
  { name: 'José José - El Triste', url: 'https://www.youtube.com/watch?v=E20G25SCAEg' },
  { name: 'Rick Astley - Never Gonna Give You Up', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
];

function DevCookiesCard() {
  const [diag, setDiag] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTimer, setTestTimer] = useState(0);
  const [testUrl, setTestUrl] = useState(TEST_PRESETS[0].url);
  const [testResult, setTestResult] = useState<any>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [pastedCookies, setPastedCookies] = useState('');
  const [saving, setSaving] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await devService.getCookiesStatus();
      if (res.ok) {
        setDiag(res.diagnostics);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
  }, []);

  // Live timer while testing
  useEffect(() => {
    let interval: any = null;
    if (testing) {
      setTestTimer(0);
      const start = Date.now();
      interval = setInterval(() => {
        setTestTimer(Number(((Date.now() - start) / 1000).toFixed(1)));
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [testing]);

  const handleTest = async (overrideUrl?: string) => {
    const targetUrl = overrideUrl || testUrl;
    setTesting(true);
    setTestResult(null);
    setIsPlayingAudio(false);
    try {
      const res = await devService.testCookies(targetUrl);
      setTestResult(res);
      if (res.ok) {
        useToastStore
          .getState()
          .show(`✅ Stream extraído con éxito en ${res.elapsed_seconds}s`, 'success', 3500);
      } else {
        useToastStore
          .getState()
          .show(`❌ Prueba falló: ${res.error || 'Error de extracción'}`, 'error', 4500);
      }
    } catch (e: any) {
      setTestResult({ ok: false, error: e?.message || 'Error de conexión con el backend' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!pastedCookies.trim()) return;
    setSaving(true);
    try {
      const res = await devService.saveCookies(pastedCookies.trim());
      if (res.ok) {
        useToastStore
          .getState()
          .show(`✅ ${res.result?.count ?? 0} cookies validadas y guardadas en MongoDB Atlas`, 'success', 4000);
        setPastedCookies('');
        setShowInput(false);
        setDiag(res.diagnostics);
      }
    } catch (e: any) {
      useToastStore.getState().show(`Error: ${e?.message || 'Formato de cookies inválido'}`, 'error', 4000);
    } finally {
      setSaving(false);
    }
  };

  const hasCookies = diag?.has_cookies;

  // Stream preview URL for HTML5 audio
  const directStreamSrc = testResult?.ok
    ? `${API_BASE}/links/stream?url=${encodeURIComponent(testResult.audio_url || testResult.stream_url || testUrl)}`
    : '';

  return (
    <div
      className={`jf-dev-card ${testing ? 'jf-dev-radar-testing' : ''}`}
      style={{
        borderLeft: hasCookies ? '3px solid #10b981' : '3px solid #f59e0b',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="jf-dev-card-head">
        <span className="jf-dev-card-title">
          <Cookie size={16} /> Motor de Streaming y Cookies de YouTube
        </span>
        <span className="jf-dev-card-sub">garantiza streaming continuo en web y móvil (Android/iOS)</span>
      </div>

      <div className="jf-dev-form">
        {/* State banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {hasCookies ? (
                <>
                  <CheckCircle size={18} color="#10b981" weight="fill" />
                  <strong style={{ color: '#10b981', fontSize: '13px' }}>
                    Cookies Activas en MongoDB Atlas ({diag?.cookie_count ?? 0})
                  </strong>
                </>
              ) : (
                <>
                  <WarningCircle size={18} color="#f59e0b" weight="fill" />
                  <strong style={{ color: '#f59e0b', fontSize: '13px' }}>Modo Resiliente Sin Cookies</strong>
                </>
              )}
            </div>
            <span className="jf-dev-card-sub" style={{ display: 'block', marginTop: '3px' }}>
              {diag?.status || 'Consultando estado del servicio…'}
            </span>
            {hasCookies && diag?.domains && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '3px' }}>
                Dominios autenticados: {diag.domains.join(', ')}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void fetchStatus()}
              disabled={loading || testing}
              title="Actualizar estado de cookies"
            >
              <ArrowClockwise size={13} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleTest()}
              disabled={testing}
            >
              <Broadcast size={14} className={testing ? 'animate-spin' : ''} />
              {testing ? `Probando (${testTimer}s)…` : 'Probar stream'}
            </Button>
          </div>
        </div>

        {/* Live Visual Testing Section */}
        <div
          style={{
            padding: '14px',
            borderRadius: '10px',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SpeakerHigh size={15} color="var(--accent)" /> Laboratorio de Prueba en Vivo (Audio Stream)
            </span>
            {testing && (
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#60a5fa',
                  background: 'rgba(96, 165, 250, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CircleNotch size={11} className="animate-spin" /> {testTimer}s
              </span>
            )}
          </div>

          {/* Preset Buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {TEST_PRESETS.map((p) => {
              const isSelected = testUrl === p.url;
              return (
                <button
                  key={p.url}
                  type="button"
                  disabled={testing}
                  onClick={() => {
                    setTestUrl(p.url);
                    void handleTest(p.url);
                  }}
                  style={{
                    fontSize: '11px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: isSelected ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: testing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <MusicNotes size={11} style={{ marginRight: '4px', display: 'inline' }} />
                  {p.name}
                </button>
              );
            })}
          </div>

          {/* Custom URL Input */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="jf-input"
              style={{ fontSize: '12px', height: '34px', flex: 1 }}
              placeholder="Pega un enlace de YouTube o ID para probar..."
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              disabled={testing}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleTest()}
              disabled={testing || !testUrl.trim()}
            >
              <Lightning size={13} />
              Probar URL
            </Button>
          </div>

          {/* Live Progress Representation while Testing */}
          {testing && (
            <div
              style={{
                marginTop: '4px',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CircleNotch size={18} color="#818cf8" className="animate-spin" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#c7d2fe' }}>
                    {testTimer < 1.2
                      ? '1/3 Conectando con MongoDB y cargando cookies Netscape…'
                      : testTimer < 2.8
                      ? '2/3 Negociando autenticación con YouTube (evasión bot-check)…'
                      : '3/3 Extrayendo y descifrando flujo Opus/AAC directo…'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Simulando petición de streaming de la app móvil JodiFyMovil
                  </div>
                </div>
              </div>
              <div
                style={{
                  height: '4px',
                  borderRadius: '2px',
                  background: 'rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(95, testTimer * 30 + 10)}%`,
                    background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* Test Result Display with Live Audio Player */}
          {!testing && testResult && (
            <div
              style={{
                marginTop: '4px',
                padding: '12px 14px',
                borderRadius: '8px',
                background: testResult.ok ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: testResult.ok ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {testResult.ok ? (
                    <CheckCircle size={18} color="#10b981" weight="fill" />
                  ) : (
                    <WarningCircle size={18} color="#ef4444" weight="fill" />
                  )}
                  <div>
                    <strong style={{ fontSize: '12.5px', color: testResult.ok ? '#10b981' : '#ef4444' }}>
                      {testResult.ok ? '¡Extracción en Vivo Exitosa!' : 'Fallo en la Extracción'}
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                      ({testResult.elapsed_seconds}s)
                    </span>
                  </div>
                </div>

                {testResult.ok && testResult.video_id && (
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: 'var(--accent)',
                      background: 'rgba(0, 240, 255, 0.1)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    ID: {testResult.video_id}
                  </span>
                )}
              </div>

              {testResult.ok ? (
                <>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {testResult.message || 'Stream de audio obtenido correctamente. Puedes reproducirlo a continuación:'}
                  </div>

                  {/* Built-in Audio Player with Wave Visualizer */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <div className="jf-dev-wave" title={isPlayingAudio ? 'Reproduciendo audio' : 'Listo para reproducir'}>
                      <span style={{ animationPlayState: isPlayingAudio ? 'running' : 'paused' }} />
                      <span style={{ animationPlayState: isPlayingAudio ? 'running' : 'paused' }} />
                      <span style={{ animationPlayState: isPlayingAudio ? 'running' : 'paused' }} />
                      <span style={{ animationPlayState: isPlayingAudio ? 'running' : 'paused' }} />
                      <span style={{ animationPlayState: isPlayingAudio ? 'running' : 'paused' }} />
                    </div>

                    <audio
                      ref={audioRef}
                      controls
                      src={directStreamSrc}
                      style={{ flex: 1, height: '34px', outline: 'none' }}
                      onPlay={() => setIsPlayingAudio(true)}
                      onPause={() => setIsPlayingAudio(false)}
                      onEnded={() => setIsPlayingAudio(false)}
                    />

                    <a
                      href={directStreamSrc}
                      target="_blank"
                      rel="noreferrer"
                      className="jf-btn-ghost"
                      style={{
                        fontSize: '11px',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        textDecoration: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.05)',
                      }}
                      title="Abrir endpoint /api/links/stream en nueva pestaña"
                    >
                      <ArrowSquareOut size={13} />
                      Stream Directo
                    </a>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '11.5px', color: '#fca5a5' }}>
                  {testResult.error || 'No se pudo resolver el enlace de audio.'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cookie Importer Drawer */}
        <div>
          <button
            type="button"
            className="jf-btn-ghost"
            style={{
              fontSize: '12px',
              color: 'var(--accent)',
              padding: '4px 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
            onClick={() => setShowInput(!showInput)}
          >
            {showInput ? '▲ Ocultar importador de cookies' : '▼ Pegar / Actualizar cookies (Netscape .txt, JSON o Cabecera)'}
          </button>
        </div>

        {showInput && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <textarea
              className="jf-input"
              rows={5}
              placeholder="Pega aquí el contenido: Netscape cookies.txt (# Netscape HTTP Cookie File...), JSON de Cookie-Editor ([{...}]), o cabecera Cookie: name=val;..."
              value={pastedCookies}
              onChange={(e) => setPastedCookies(e.target.value)}
              style={{ fontSize: '11px', fontFamily: 'monospace' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPastedCookies('');
                  setShowInput(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleSave()}
                disabled={saving || !pastedCookies.trim()}
              >
                <Cookie size={13} />
                {saving ? 'Guardando en Atlas…' : 'Guardar y Validar en MongoDB'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

