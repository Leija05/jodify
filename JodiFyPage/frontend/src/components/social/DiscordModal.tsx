import { useEffect, useState } from 'react';
import { DiscordLogo, LinkSimple, LinkBreak, ShieldCheck, Check, Sparkle } from '@phosphor-icons/react';
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
  const [celebrationAccount, setCelebrationAccount] = useState<DiscordProfile | null>(null);

  useEffect(() => {
    if (ui.modal !== 'discord' || !session) return;
    setCelebrationAccount(null);
    void (async () => {
      const profile = await usersService.fetchProfile(session.username).catch(() => null);
      if (!profile?.discord_id) {
        setCurrent(null);
        return;
      }
      setUserId(profile.discord_id);
      const lanyard = await fetchLanyardProfile(profile.discord_id);
      setCurrent(
        lanyard || {
          discord_id: profile.discord_id,
          display_name: profile.display_name || session.username,
          user_name: `ID: ${profile.discord_id}`,
        },
      );
    })();
  }, [ui.modal, session]);

  const previewDiscord = async (id: string) => {
    const clean = id.trim();
    if (!clean) {
      setPreview(null);
      setError(null);
      return;
    }
    if (clean.length < 17 || !/^\d+$/.test(clean)) {
      setPreview(null);
      setError('El ID de Discord consta de 17 a 19 dígitos numéricos.');
      return;
    }
    setError(null);
    const profile = await fetchLanyardProfile(clean);
    setPreview(
      profile || {
        discord_id: clean,
        display_name: session?.display_name || session?.username || 'Usuario Discord',
        user_name: `ID: ${clean}`,
      },
    );
  };

  const confirm = async () => {
    if (!session) return;
    const cleanId = userId.trim();
    if (cleanId.length < 17 || !/^\d+$/.test(cleanId)) {
      setError('El ID de Discord debe contener entre 17 y 19 dígitos numéricos');
      return;
    }
    setLoading(true);
    try {
      await usersService.setDiscordId(session.username, cleanId);
      const linked = preview || (await fetchLanyardProfile(cleanId)) || {
        discord_id: cleanId,
        display_name: session.display_name || session.username,
        user_name: `ID: ${cleanId}`,
      };
      setCelebrationAccount(linked);
      toast.show('¡ID de Discord guardado en la base de datos!', 'success', 3000);
    } catch {
      setError('No se pudo guardar la vinculación en la base de datos');
    } finally {
      setLoading(false);
    }
  };

  const finishCelebration = () => {
    setCelebrationAccount(null);
    ui.open('profile');
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
    <Modal name="discord" title={celebrationAccount ? "¡Discord Aceptado!" : "Vincular Discord"} width={460}>
      {celebrationAccount ? (
        <motion.div
          className="jf-discord-celebration"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease }}
        >
          <div className="jf-discord-celebration-badge-wrap">
            <div className="jf-discord-celebration-pulse" />
            <div className="jf-discord-celebration-icon">
              <DiscordLogo size={42} weight="fill" />
              <div className="jf-discord-celebration-check">
                <Check size={16} weight="bold" />
              </div>
            </div>
          </div>

          <h3 className="jf-discord-celebration-title">¡Código de Discord Aceptado!</h3>
          <p className="jf-discord-celebration-desc">
            Tu cuenta fue verificada y vinculada a <strong>JodiFy</strong> con éxito. Ahora tu perfil mostrará tu actividad, juegos, estado y avatar en tiempo real.
          </p>

          <div className="jf-discord-celebration-card">
            <Avatar
              username={celebrationAccount.display_name ?? celebrationAccount.user_name}
              src={celebrationAccount.avatar_url}
              presence={celebrationAccount.presence ?? 'online'}
              size={56}
            />
            <div className="jf-discord-celebration-card-meta">
              <p className="jf-discord-celebration-card-name">{celebrationAccount.display_name}</p>
              <p className="jf-discord-celebration-card-tag">
                @{celebrationAccount.user_name} · {presenceLabel(celebrationAccount.presence ?? 'online')}
              </p>
            </div>
            <span className="jf-discord-linked-badge" style={{ margin: 0 }}>
              <ShieldCheck size={14} weight="fill" /> Verificado
            </span>
          </div>

          <div className="jf-discord-actions" style={{ width: '100%', justifyContent: 'center' }}>
            <Button variant="primary" size="md" onClick={finishCelebration}>
              <Sparkle size={16} weight="fill" /> Ir a Personalizar Mi Perfil
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="jf-discord-container">
          <p className="jf-discord-help">
            Vincula tu Discord para que los demás vean tu <strong>presencia en vivo</strong> (avatar, estado, juegos y actividad) dentro de JodiFy.
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
      )}
    </Modal>
  );
}
