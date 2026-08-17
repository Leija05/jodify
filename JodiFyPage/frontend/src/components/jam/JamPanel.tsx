import { useState } from 'react';
import { motion } from 'motion/react';
import { UsersThree, Copy, Check, Play, X, ClockCounterClockwise } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Switch } from '../ui/Switch';
import { EmptyState } from '../ui/EmptyState';
import { useUiStore } from '../../store/ui.store';
import { useJamStore } from '../../store/jam.store';
import { useSession } from '../../context/SessionContext';
import { jamService, generateJamCode } from '../../services/jam.service';
import { useToastStore } from '../../store/toast.store';

export function JamPanel() {
  const ui = useUiStore();
  const { session } = useSession();
  const jam = useJamStore();
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const username = session?.username ?? 'Invitado';

  const createJam = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const { code, sessionId } = await jamService.createSession(username);
      jam.start(code, true, sessionId);
      await jamService.upsertMember(username, sessionId, true);
      jamService.connect(code, username, true, sessionId);
      jam.broadcastConfig();
      useToastStore.getState().show(`Jam ${code} creada`, 'success');
    } catch (error) {
      useToastStore.getState().show(error instanceof Error ? error.message : 'No se pudo crear la Jam', 'error');
    } finally {
      setBusy(false);
    }
  };

  const joinJam = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      useToastStore.getState().show('Ingresa un código de 4 caracteres', 'warning');
      return;
    }
    setBusy(true);
    try {
      const sessionRecord = await jamService.fetchActiveSession(code);
      if (!sessionRecord) {
        useToastStore.getState().show('Código de Jam inválido o inactivo', 'warning');
        return;
      }
      jam.start(code, false, sessionRecord.id);
      await jamService.upsertMember(username, sessionRecord.id, false);
      jamService.connect(code, username, false, sessionRecord.id);
      useToastStore.getState().show(`Unido a la Jam ${code}`, 'success');
    } catch {
      useToastStore.getState().show('No se pudo unir a la Jam', 'error');
    } finally {
      setBusy(false);
    }
  };

  const stopJam = async () => {
    if (!jam.sessionId) return;
    if (jam.isHost) {
      await jamService.closeSession(jam.sessionId).catch(() => undefined);
    } else {
      await jamService.markMemberInactive(username, jam.sessionId).catch(() => undefined);
    }
    jamService.disconnect();
    jam.stop();
    useToastStore.getState().show(jam.isHost ? 'Jam finalizada' : 'Saliste de la Jam', 'info');
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(jam.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      useToastStore.getState().show(jam.code, 'info');
    }
  };

  const togglePermission = (key: keyof JamPermissions) => {
    jam.setPermissions({ ...jam.permissions, [key]: !jam.permissions[key] });
    jam.broadcastConfig();
  };

  return (
    <Modal name="jam" title="Jam" width={480}>
      {!jam.active ? (
        <div className="jf-jam-create">
          <div className="jf-jam-hero">
            <UsersThree size={40} weight="light" />
            <h3>Escuchen juntos</h3>
            <p>Crea una Jam para sincronizar la reproducción con tus amigos en tiempo real.</p>
          </div>
          <Button variant="primary" onClick={() => void createJam()} disabled={busy || !session}>
            Iniciar Jam
          </Button>
          <div className="jf-jam-divider">
            <span>o únete con un código</span>
          </div>
          <div className="jf-jam-join">
            <input
              className="jf-input jf-jam-input"
              placeholder="CÓDIGO"
              maxLength={4}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void joinJam();
              }}
              aria-label="Código de Jam"
            />
            <Button variant="glass" onClick={() => void joinJam()} disabled={busy}>
              Unirse
            </Button>
          </div>
          {!session && <p className="jf-jam-note">Sin sesión entrarás como «Invitado».</p>}
          <Button variant="ghost" size="sm" className="jf-jam-history-link" onClick={() => ui.open('jamHistory')}>
            <ClockCounterClockwise size={14} /> Historial de Jams
          </Button>
        </div>
      ) : (
        <div className="jf-jam-active">
          <div className="jf-jam-code-row">
            <motion.div
              className="jf-jam-code"
              animate={{ boxShadow: ['0 0 0 0 rgba(0,240,255,0.35)', '0 0 0 10px rgba(0,240,255,0)'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            >
              {jam.code}
            </motion.div>
            <Button variant="glass" size="sm" onClick={() => void copyCode()}>
              {copied ? <Check size={15} weight="bold" /> : <Copy size={15} />} {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <p className="jf-jam-status">
            <span className={`jf-jam-status-dot ${jam.isHost ? 'is-host' : ''}`} />
            {jam.isHost ? 'Eres el host · todos escuchan lo mismo' : 'Conectado a la Jam'}
          </p>

          <div className="jf-jam-users">
            {jam.users.length === 0 ? (
              <EmptyState icon={UsersThree} title="Esperando miembros" description="Comparte el código para invitar." />
            ) : (
              jam.users.map((user) => (
                <div key={user.username} className="jf-jam-user">
                  <Avatar username={user.username} size={36} presence="online" />
                  <span className="jf-jam-user-name">{user.username}</span>
                  {user.isHost && <span className="jf-jam-host-badge">Host</span>}
                </div>
              ))
            )}
          </div>

          {jam.isHost && (
            <div className="jf-jam-permissions">
              <p className="jf-jam-permissions-title">Permisos</p>
              <Switch
                checked={jam.permissions.allowQueueAdd}
                onChange={() => togglePermission('allowQueueAdd')}
                label="Miembros agregan a la cola"
              />
              <Switch
                checked={jam.permissions.allowQueueRemove}
                onChange={() => togglePermission('allowQueueRemove')}
                label="Miembros quitan de la cola"
              />
              <Switch
                checked={jam.permissions.allowPlaybackControl}
                onChange={() => togglePermission('allowPlaybackControl')}
                label="Miembros controlan reproducción"
              />
            </div>
          )}

          {!jam.isHost && (
            <Button variant="glass" size="sm" onClick={() => ui.open('jamRecommend')}>
              <Play size={14} weight="fill" /> Recomendar canción al host
            </Button>
          )}

          <Button variant="danger" size="sm" onClick={() => void stopJam()} className="jf-jam-leave">
            <X size={15} /> {jam.isHost ? 'Finalizar Jam' : 'Salir de la Jam'}
          </Button>
        </div>
      )}
    </Modal>
  );
}

interface JamPermissions {
  allowQueueAdd: boolean;
  allowQueueRemove: boolean;
  allowPlaybackControl: boolean;
}

void generateJamCode;
