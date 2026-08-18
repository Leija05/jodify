import { useEffect, useState } from 'react';
import { Fingerprint, Keyhole, Prohibit, ShieldCheck, UserPlus } from '@phosphor-icons/react';
import { Button } from '../ui/Button';
import { CopyableToken, timeAgo } from './devBits';
import { devService } from '../../services/dev.service';
import { useToastStore } from '../../store/toast.store';
import type { DevKeyRow, DevState, DevToken } from '../../lib/types';

const ROLE_LABEL: Record<string, string> = { admin: 'Administrador', mod: 'Moderador' };

function TokenCard({ token, onRevoke }: { token: DevToken; onRevoke: (t: DevToken) => void }) {
  const [revealed, setRevealed] = useState(false);
  const canShow = token.status === 'active' && Boolean(token.token);
  return (
    <div className={`jf-dev-token is-${token.status}`}>
      <div className="jf-dev-token-main">
        <div className="jf-dev-token-top">
          <span className={`jf-role-badge jf-role-badge--${token.role}`}>{ROLE_LABEL[token.role] ?? token.role}</span>
          <span className={`jf-dev-token-status is-${token.status}`}>
            {token.status === 'active' ? 'activo' : token.status === 'revoked' ? 'revocado' : token.status === 'expired' ? 'expirado' : 'agotado'}
          </span>
        </div>
        {token.label && <p className="jf-dev-token-label">{token.label}</p>}
        <div className="jf-dev-token-code">
          {canShow && revealed ? (
            <CopyableToken token={token.token ?? ''} />
          ) : (
            <span className="jf-dev-token-mono jf-dev-token-mono--masked">
              {canShow ? '••••-••••-••••-••••' : token.status === 'active' ? 'revocado al recargar' : 'consumido'}
            </span>
          )}
          {canShow && (
            <button className="jf-dev-token-reveal" onClick={() => setRevealed((v) => !v)} aria-label={revealed ? 'Ocultar código' : 'Mostrar código'}>
              {revealed ? 'ocultar' : 'ver'}
            </button>
          )}
        </div>
        <div className="jf-dev-token-meta">
          <span>usos {token.uses}/{token.max_uses}</span>
          <span>vence {token.expires_at ? timeAgo(token.expires_at) : 'nunca'}</span>
          <span>creado {timeAgo(token.created_at)}</span>
          {token.redeemed_by && token.redeemed_by.length > 0 && (
            <span className="jf-dev-token-redeemed">
              usado por @{token.redeemed_by[token.redeemed_by.length - 1]?.username}
            </span>
          )}
        </div>
      </div>
      {token.status === 'active' && (
        <button className="jf-dev-token-revoke" onClick={() => onRevoke(token)} aria-label="Revocar token">
          <Prohibit size={15} />
        </button>
      )}
    </div>
  );
}

export function DevAccess({
  tokens,
  onChanged,
  state,
}: {
  tokens: DevToken[];
  onChanged: () => void;
  state: DevState | null;
}) {
  const [role, setRole] = useState<'admin' | 'mod'>('admin');
  const [label, setLabel] = useState('');
  const [expiresDays, setExpiresDays] = useState('7');
  const [maxUses, setMaxUses] = useState('1');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devKeys, setDevKeys] = useState<DevKeyRow[]>([]);
  const [keyLabel, setKeyLabel] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKey, setNewKey] = useState<(DevKeyRow & { token: string }) | null>(null);

  const loadKeys = async () => {
    try {
      setDevKeys(await devService.listDevKeys());
    } catch {
      /* el panel dev sin claves no debe romperse */
    }
  };

  useEffect(() => {
    void loadKeys();
  }, []);

  const createKey = async () => {
    setCreatingKey(true);
    try {
      const created = await devService.createDevKey(keyLabel);
      setNewKey(created);
      setKeyLabel('');
      void loadKeys();
    } catch (err) {
      useToastStore.getState().show(err instanceof Error ? err.message : 'No se pudo crear la clave', 'error');
    } finally {
      setCreatingKey(false);
    }
  };

  const revokeKey = async (key: DevKeyRow) => {
    if (!window.confirm(`¿Revocar la clave dev${key.label ? ` «${key.label}»` : ''}?`)) return;
    try {
      await devService.revokeDevKey(key.id);
      useToastStore.getState().show('Clave dev revocada', 'success');
      void loadKeys();
    } catch {
      useToastStore.getState().show('No se pudo revocar', 'error');
    }
  };

  const create = async () => {
    setError(null);
    const days = expiresDays.trim() === '' ? null : Number(expiresDays);
    const uses = Math.max(1, Number(maxUses) || 1);
    if (days != null && (Number.isNaN(days) || days < 1 || days > 365)) {
      setError('La expiración debe estar entre 1 y 365 días (o vacía para no expirar).');
      return;
    }
    setCreating(true);
    try {
      await devService.createToken({ role, label, expires_in_days: days, max_uses: uses });
      useToastStore.getState().show(`${ROLE_LABEL[role]} con código creado. Copialo antes de cerrar.`, 'success');
      setLabel('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el token');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (token: DevToken) => {
    if (!window.confirm(`¿Revocar el código de ${ROLE_LABEL[token.role] ?? token.role}${token.label ? ` «${token.label}»` : ''}?`)) return;
    try {
      await devService.revokeToken(token.id);
      useToastStore.getState().show('Código revocado', 'success');
      onChanged();
    } catch {
      useToastStore.getState().show('No se pudo revocar', 'error');
    }
  };

  return (
    <div className="jf-dev-panel">
      <div className="jf-dev-cols">
        <div className="jf-dev-card">
          <div className="jf-dev-card-head">
            <span className="jf-dev-card-title">
              <Keyhole size={15} /> Nuevo código de acceso
            </span>
            <span className="jf-dev-card-sub">quien lo canjee crea su cuenta con ese rol</span>
          </div>

          <div className="jf-dev-form">
            <label className="jf-dev-field">
              <span className="jf-dev-field-label">Rol</span>
              <div className="jf-dev-seg">
                {(['admin', 'mod'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`jf-dev-seg-btn ${role === r ? 'is-active' : ''}`}
                    onClick={() => setRole(r)}
                  >
                    {r === 'admin' ? <ShieldCheck size={13} /> : <UserPlus size={13} />}
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
            </label>

            <label className="jf-dev-field">
              <span className="jf-dev-field-label">Etiqueta (opcional)</span>
              <input
                className="jf-input"
                placeholder="Ej: moderador de amigos, admin de LaLeija"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={60}
              />
            </label>

            <div className="jf-dev-form-row">
              <label className="jf-dev-field">
                <span className="jf-dev-field-label">Expira en (días)</span>
                <input
                  className="jf-input jf-input--mono"
                  type="number"
                  min={1}
                  max={365}
                  placeholder="7"
                  value={expiresDays}
                  onChange={(e) => setExpiresDays(e.target.value)}
                />
              </label>
              <label className="jf-dev-field">
                <span className="jf-dev-field-label">Usos máximos</span>
                <input
                  className="jf-input jf-input--mono"
                  type="number"
                  min={1}
                  max={100}
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                />
              </label>
            </div>

            {error && <p className="jf-dev-form-error">{error}</p>}

            <Button variant="primary" size="sm" onClick={() => void create()} disabled={creating}>
              <Fingerprint size={14} />
              {creating ? 'Generando…' : 'Generar código'}
            </Button>
          </div>
        </div>

        <div className="jf-dev-card">
          <div className="jf-dev-card-head">
            <span className="jf-dev-card-title">
              <Fingerprint size={15} /> Clave maestra del dev
            </span>
            <span className="jf-dev-card-sub">generada desde tu PC y validada contra la DB</span>
          </div>
          <div className="jf-dev-keycard">
            <span className={`jf-dev-keycard-dot ${state?.dev_mode ? 'is-on' : ''}`} />
            <div>
              <strong>{state?.dev_mode ? 'Modo dev activo' : 'Modo dev apagado'}</strong>
              <span>
                cuenta <span className="jf-dev-keycard-mono">@{state?.dev_username ?? 'dev'}</span> · la clave entra
                por el login con Ctrl+Alt+D
              </span>
            </div>
          </div>
          <p className="jf-dev-hint">
            Generala en tu PC con <span className="jf-dev-keycard-mono">python tools/generate_dev_key.py</span>{' '}
            dentro de <span className="jf-dev-keycard-mono">jodify-backend</span>, o creala acá abajo. Queda guardada
            hasheada en la colección <span className="jf-dev-keycard-mono">dev_keys</span>.
          </p>
        </div>
      </div>

      <div className="jf-dev-section-head">
        <h3 className="jf-dev-section-title">Códigos generados</h3>
        <span className="jf-dev-section-meta">{tokens.length} total</span>
      </div>

      {tokens.length === 0 ? (
        <div className="jf-dev-empty">
          <Keyhole size={22} />
          <strong>Ningún código todavía</strong>
          <span>Generá el primero para darle acceso a alguien de confianza.</span>
        </div>
      ) : (
        <div className="jf-dev-tokens">
          {tokens.map((token) => (
            <TokenCard key={token.id} token={token} onRevoke={revoke} />
          ))}
        </div>
      )}

      <div className="jf-dev-section-head">
        <h3 className="jf-dev-section-title">Claves dev</h3>
        <span className="jf-dev-section-meta">{devKeys.length} total</span>
      </div>

      <div className="jf-dev-card">
        <div className="jf-dev-form">
          <label className="jf-dev-field">
            <span className="jf-dev-field-label">Etiqueta (opcional)</span>
            <input
              className="jf-input"
              placeholder="Ej: notebook de Leija"
              value={keyLabel}
              onChange={(e) => setKeyLabel(e.target.value)}
              maxLength={80}
            />
          </label>
          <Button variant="primary" size="sm" onClick={() => void createKey()} disabled={creatingKey}>
            <Keyhole size={14} />
            {creatingKey ? 'Generando…' : 'Generar clave dev'}
          </Button>
        </div>
        {newKey && (
          <div className="jf-dev-token is-active" style={{ marginTop: 12 }}>
            <div className="jf-dev-token-main">
              <div className="jf-dev-token-top">
                <span className="jf-role-badge jf-role-badge--dev">dev</span>
                <span className="jf-dev-token-status is-active">recién creada</span>
              </div>
              {newKey.label && <p className="jf-dev-token-label">{newKey.label}</p>}
              <div className="jf-dev-token-code">
                <CopyableToken token={newKey.token} />
              </div>
              <p className="jf-dev-hint">Copiala ahora: no se vuelve a mostrar en claro.</p>
            </div>
          </div>
        )}
      </div>

      {devKeys.length > 0 && (
        <div className="jf-dev-tokens">
          {devKeys.map((key) => (
            <div key={key.id} className={`jf-dev-token is-${key.revoked ? 'revoked' : 'active'}`}>
              <div className="jf-dev-token-main">
                <div className="jf-dev-token-top">
                  <span className="jf-role-badge jf-role-badge--dev">dev</span>
                  <span className={`jf-dev-token-status is-${key.revoked ? 'revoked' : 'active'}`}>
                    {key.revoked ? 'revocada' : 'activa'}
                  </span>
                </div>
                {key.label && <p className="jf-dev-token-label">{key.label}</p>}
                <div className="jf-dev-token-meta">
                  <span>creada {timeAgo(key.created_at)}</span>
                  {key.last_used_at && <span>último uso {timeAgo(key.last_used_at)}</span>}
                  {key.created_by && <span>por {key.created_by}</span>}
                </div>
              </div>
              {!key.revoked && (
                <button
                  className="jf-dev-token-revoke"
                  onClick={() => void revokeKey(key)}
                  aria-label="Revocar clave dev"
                >
                  <Prohibit size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
