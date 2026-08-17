import { useEffect, useState } from 'react';
import { DiscordLogo, LinkSimple, LinkBreak, ShieldCheck } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import { useSession } from '../../context/SessionContext';
import { useUiStore } from '../../store/ui.store';
import { useToastStore } from '../../store/toast.store';
import { usersService } from '../../services/users.service';
import { fetchLanyardProfile } from '../../services/social.service';
import { presenceLabel } from '../../lib/status';
import type { DiscordProfile } from '../../lib/types';

const ease = [0.16, 1, 0.3, 1] as const;

export function DiscordModal() {
  const { session } = useSession();
  const ui = useUiStore();
  const toast = useToastStore();
  const [userId, setUserId] = useState('');
  const [preview, setPreview] = useState<DiscordProfile | null>(null);
  const [current, setCurrent] = useState<DiscordProfile | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ui.modal !== 'discord' || !session) return;
    void (async () => {
      const profile = await usersService.fetchProfile(session.username).catch(() => null);
      if (!profile?.discord_id) {
        setCurrent(null);
        return;
      }
      setCurrent(await fetchLanyardProfile(profile.discord_id));
    })();
  }, [ui.modal, session]);

  const previewDiscord = async (id: string) => {
    const clean = id.trim();
    if (clean.length < 17) {
      setPreview(null);
      setError(null);
      return;
    }
    const profile = await fetchLanyardProfile(clean);
    setPreview(profile);
    setError(profile ? null : 'No se pudo encontrar ese usuario de Discord');
  };

  const confirm = async () => {
    if (!session) return;
    if (userId.trim().length < 17) {
      setError('El ID de Discord debe tener al menos 17 dígitos');
      return;
    }
    setLoading(true);
    try {
      await usersService.setDiscordId(session.username, userId.trim());
      toast.show('Discord vinculado correctamente', 'success');
      ui.open('profile');
    } catch {
      setError('No se pudo guardar la vinculación');
    } finally {
      setLoading(false);
    }
  };

  const unlink = async () => {
    if (!session) return;
    setLoading(true);
    await usersService.setDiscordId(session.username, null).catch(() => undefined);
    setLoading(false);
    toast.show('Discord desvinculado', 'info');
    ui.open('profile');
  };

  return (
    <Modal name="discord" title="Vincular Discord" width={440}>
      <div className="jf-discord-container">
        <p className="jf-discord-help">
          Vincula tu Discord para que los demás vean tu <strong>presencia en vivo</strong> (avatar, estado y actividad) dentro de JodiFy.
        </p>

        {current === undefined ? (
          <div className="jf-discord-loading"><Spinner size={18} /></div>
        ) : current ? (
          <div className="jf-discord-current">
            <Avatar username={current.display_name ?? current.user_name} src={current.avatar_url} presence={current.presence} size={52} />
            <div className="jf-discord-current-meta">
              <p className="jf-discord-name">{current.display_name}</p>
              <p className="jf-discord-tag">@{current.user_name} · {presenceLabel(current.presence)}</p>
            </div>
            <span className="jf-discord-linked-badge"><ShieldCheck size={13} weight="fill" /> Vinculado</span>
          </div>
        ) : null}

        <div className="jf-discord-input">
          <DiscordLogo size={18} weight="fill" />
          <input
            className="jf-input-reset"
            placeholder="Pega tu ID de Discord (17+ dígitos)"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setError(null);
              void previewDiscord(e.target.value);
            }}
            aria-label="ID de Discord"
          />
        </div>
        {error && <p className="jf-form-error">{error}</p>}

        {preview && (
          <motion.div
            className="jf-discord-preview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            <Avatar username={preview.display_name ?? preview.user_name} src={preview.avatar_url} presence={preview.presence} size={48} />
            <div className="jf-discord-preview-meta">
              <p className="jf-discord-name">{preview.display_name}</p>
              <p className="jf-discord-tag">@{preview.user_name} · {presenceLabel(preview.presence)}</p>
            </div>
          </motion.div>
        )}

        <div className="jf-discord-actions">
          <Button variant="ghost" size="sm" onClick={() => ui.close('discord')}>
            Cancelar
          </Button>
          {current ? (
            <Button variant="danger" size="sm" disabled={loading} onClick={() => void unlink()}>
              <LinkBreak size={15} /> {loading ? 'Desvinculando…' : 'Desvincular'}
            </Button>
          ) : null}
          <Button variant="primary" size="sm" disabled={loading} onClick={() => void confirm()}>
            <LinkSimple size={15} /> {loading ? 'Guardando…' : 'Vincular'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
