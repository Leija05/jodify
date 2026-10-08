import { useState, useEffect } from 'react';
import { ArrowClockwise, Eraser, Power, ShieldWarning, Sparkle, Trash, Wrench, Cookie, CheckCircle, WarningCircle, Broadcast } from '@phosphor-icons/react';
import { Button } from '../ui/Button';
import { devService } from '../../services/dev.service';
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

function DevCookiesCard() {
  const [diag, setDiag] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [pastedCookies, setPastedCookies] = useState('');
  const [saving, setSaving] = useState(false);
  const [showInput, setShowInput] = useState(false);

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

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await devService.testCookies();
      setTestResult(res);
      if (res.ok) {
        useToastStore.getState().show(`✅ Extracción de audio exitosa en ${res.elapsed_seconds}s`, 'success', 3000);
      } else {
        useToastStore.getState().show(`❌ Prueba falló: ${res.error || 'Error'}`, 'error', 4000);
      }
    } catch (e: any) {
      setTestResult({ ok: false, error: e?.message || 'Error de red' });
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
        useToastStore.getState().show(`✅ ${res.result?.count ?? 0} cookies validadas y guardadas en MongoDB`, 'success', 4000);
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

  return (
    <div className="jf-dev-card" style={{ borderLeft: hasCookies ? '3px solid #10b981' : '3px solid #f59e0b' }}>
      <div className="jf-dev-card-head">
        <span className="jf-dev-card-title">
          <Cookie size={16} /> Motor de Streaming y Cookies de YouTube
        </span>
        <span className="jf-dev-card-sub">garantiza streaming continuo en web y móvil</span>
      </div>
      <div className="jf-dev-form">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {hasCookies ? (
                <>
                  <CheckCircle size={16} color="#10b981" weight="fill" />
                  <strong style={{ color: '#10b981' }}>Cookies Activas ({diag?.cookie_count ?? 0})</strong>
                </>
              ) : (
                <>
                  <WarningCircle size={16} color="#f59e0b" weight="fill" />
                  <strong style={{ color: '#f59e0b' }}>Modo Resiliente Sin Cookies</strong>
                </>
              )}
            </div>
            <span className="jf-dev-card-sub" style={{ display: 'block', marginTop: '2px' }}>
              {diag?.status || 'Comprobando estado del backend…'}
            </span>
            {hasCookies && diag?.domains && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                Dominios: {diag.domains.join(', ')}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button variant="ghost" size="sm" onClick={() => void fetchStatus()} disabled={loading} title="Actualizar estado">
              <ArrowClockwise size={13} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button variant="primary" size="sm" onClick={() => void handleTest()} disabled={testing}>
              <Broadcast size={13} className={testing ? 'animate-spin' : ''} />
              {testing ? 'Probando…' : 'Probar stream'}
            </Button>
          </div>
        </div>

        {testResult && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '12px', background: testResult.ok ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: testResult.ok ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
            <strong>{testResult.ok ? '✅ Extracción en vivo OK' : '⚠️ Fallo en prueba'}</strong> ({testResult.elapsed_seconds}s)
            <div style={{ marginTop: '2px', color: 'var(--text-muted)' }}>{testResult.message || testResult.error}</div>
          </div>
        )}

        <div>
          <button
            type="button"
            className="jf-btn-ghost"
            style={{ fontSize: '12px', color: 'var(--accent)', padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => setShowInput(!showInput)}
          >
            {showInput ? '▲ Ocultar importador de cookies' : '▼ Pegar / Actualizar cookies (JSON, Netscape .txt o Cabecera)'}
          </button>
        </div>

        {showInput && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <textarea
              className="jf-input"
              rows={4}
              placeholder='Pega aquí el contenido: JSON de Cookie-Editor ([{...}]), Netscape cookies.txt, o Header (name=val;...)'
              value={pastedCookies}
              onChange={(e) => setPastedCookies(e.target.value)}
              style={{ fontSize: '11px', fontFamily: 'monospace' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="ghost" size="sm" onClick={() => { setPastedCookies(''); setShowInput(false); }}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={() => void handleSave()} disabled={saving || !pastedCookies.trim()}>
                <Cookie size={13} />
                {saving ? 'Guardando…' : 'Guardar y Validar en MongoDB'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

