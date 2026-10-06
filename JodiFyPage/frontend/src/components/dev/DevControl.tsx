import { useState } from 'react';
import { ArrowClockwise, Eraser, Power, ShieldWarning, Sparkle, Wrench } from '@phosphor-icons/react';
import { Button } from '../ui/Button';
import { devService } from '../../services/dev.service';
import { useToastStore } from '../../store/toast.store';
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
          </div>
        </div>

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
