import { useMemo, useState } from 'react';
import {
  FloppyDisk,
  PencilSimple,
  Sparkle,
  Trash,
  User,
  X,
  Eye,
  EyeSlash,
  DiscordLogo,
  ShieldCheck,
  PaintBrush,
} from '@phosphor-icons/react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { devService } from '../../services/dev.service';
import { useToastStore } from '../../store/toast.store';
import { confirmDialog } from '../../store/confirm.store';
import { resolveAvatarSrc } from '../../lib/utils';
import {
  DEV_EFFECTS,
  DEV_FRAMES,
  DEV_QUICK_PRESETS,
  DEV_THEMES,
} from './DevUserStylesModal';
import type { DevUserRow, Role } from '../../lib/types';

interface DevEditUserModalProps {
  user: DevUserRow;
  onClose: () => void;
  onSaved: () => void;
}

const ROLES: Array<{ value: Role; label: string }> = [
  { value: 'user', label: 'user' },
  { value: 'mod', label: 'mod' },
  { value: 'admin', label: 'admin' },
];

const ACCENT_PRESETS = [
  '#00f0ff', '#ff0077', '#ffd700', '#00ff66', '#ff5500', '#a855f7', '#ec4899', '#38bdf8', '#3b82f6',
];

export function DevEditUserModal({ user, onClose, onSaved }: DevEditUserModalProps) {
  const toast = useToastStore();
  const [activeTab, setActiveTab] = useState<'account' | 'styles'>('account');

  // Account / Profile Fields
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>(user.role || 'user');
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
  const [discordId, setDiscordId] = useState(user.discord_id || '');

  // VIP / Styles Fields
  const [frame, setFrame] = useState(user.avatar_frame || 'none');
  const [theme, setTheme] = useState(user.theme || 'aurora');
  const [effect, setEffect] = useState(user.profile_effect || 'none');
  const [accent, setAccent] = useState(user.accent_color || '#00f0ff');
  const [badge, setBadge] = useState(user.custom_badge || '');
  const [vibe, setVibe] = useState(user.vibe || '');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentThemeGradient = useMemo(() => {
    const found = DEV_THEMES.find((t) => t.id === theme);
    return found ? found.gradient : 'linear-gradient(135deg, #00f0ff, #7f00ff)';
  }, [theme]);

  const frameClass = frame && frame !== 'none' ? `jf-avatar-frame--${frame}` : '';

  const applyPreset = (preset: (typeof DEV_QUICK_PRESETS)[number]) => {
    setFrame(preset.frame);
    setTheme(preset.theme);
    setEffect(preset.effect);
    setAccent(preset.accent);
    setBadge(preset.badge);
    setVibe(preset.vibe);
    toast.show(`Preset «${preset.name}» aplicado`, 'info', 1800);
  };

  const handleSave = async () => {
    setErrorMsg(null);
    const cleanUsername = username.trim();
    if (cleanUsername.length < 2) {
      setErrorMsg('El nombre de usuario debe tener al menos 2 caracteres.');
      return;
    }
    if (newPassword && newPassword.length < 4) {
      setErrorMsg('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    setSaving(true);
    try {
      await devService.updateUser(user.username, {
        new_username: cleanUsername !== user.username ? cleanUsername : undefined,
        password: newPassword.trim() || undefined,
        role: user.role === 'dev' ? undefined : role,
        display_name: displayName.trim() || null,
        bio: bio.trim() || '',
        avatar_url: avatarUrl.trim() || null,
        avatar_source: avatarUrl.trim() ? 'custom' : (user.avatar_source ?? 'custom'),
        discord_id: discordId.trim() || null,
        avatar_frame: frame,
        theme,
        profile_effect: effect,
        accent_color: accent,
        custom_badge: badge.trim() || null,
        vibe: vibe.trim() || null,
      });

      toast.show(`¡Datos de @${cleanUsername} guardados correctamente!`, 'success', 2500);
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar los datos';
      setErrorMsg(msg);
      toast.show(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (user.role === 'dev') return;
    const ok = await confirmDialog({
      title: `¿Eliminar usuario @${user.username}?`,
      message: `Esta acción borrará permanentemente la cuenta de ${user.display_name || user.username}, incluyendo sus canciones favoritas, historial de reproducción y datos asociados. No se puede revertir.`,
      confirmLabel: 'Eliminar definitivamente',
      cancelLabel: 'Cancelar',
      tone: 'danger',
      icon: 'trash',
    });

    if (!ok) return;

    setDeleting(true);
    try {
      await devService.deleteUser(user.username);
      toast.show(`Cuenta @${user.username} eliminada`, 'success');
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo eliminar el usuario';
      toast.show(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Preview user row for avatar display
  const previewUser: DevUserRow = {
    ...user,
    username: username || user.username,
    display_name: displayName || null,
    avatar_url: avatarUrl.trim() || null,
    avatar_frame: frame,
  };

  return (
    <div
      className="jf-modal-backdrop"
      style={{ zIndex: 1200 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving && !deleting) onClose();
      }}
    >
      <div
        className="jf-modal-card"
        style={{
          maxWidth: '720px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(var(--primary-rgb), 0.15)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PencilSimple size={18} weight="bold" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                Modificar Usuario · @{user.username}
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                ID: {user.id} · Creado: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="jf-modal-close"
            onClick={onClose}
            aria-label="Cerrar modal"
            disabled={saving || deleting}
          >
            <X size={16} />
          </button>
        </div>

        {/* Banner de Previsualización Interactiva */}
        <div style={{ padding: '16px 20px 0' }}>
          <div
            style={{
              borderRadius: '12px',
              overflow: 'hidden',
              padding: '16px 20px',
              background: currentThemeGradient,
              border: `1px solid ${accent}40`,
              boxShadow: `0 8px 30px ${accent}25`,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              color: '#fff',
            }}
          >
            <div
              className={`jf-avatar-frame-wrap ${frameClass}`}
              style={{ padding: '3px', flexShrink: 0 }}
            >
              <Avatar
                username={displayName || username}
                src={resolveAvatarSrc(previewUser)}
                size={58}
                presence={user.is_online ? 'online' : 'offline'}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '17px', fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                  {displayName || username}
                </span>
                <span style={{ fontSize: '12px', opacity: 0.8 }}>@{username}</span>
                <span className={`jf-role-badge jf-role-badge--${role}`}>{role}</span>
                {badge && (
                  <span
                    className="jf-profile-custom-badge"
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      background: 'rgba(0,0,0,0.4)',
                      backdropFilter: 'blur(8px)',
                      border: `1px solid ${accent}`,
                      borderRadius: '99px',
                      fontWeight: 700,
                    }}
                  >
                    {badge}
                  </span>
                )}
              </div>

              {vibe && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '5px',
                    fontSize: '11px',
                    padding: '2px 8px',
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '6px',
                    color: '#fff',
                  }}
                >
                  <Sparkle size={11} weight="fill" style={{ color: accent }} />
                  <span>{vibe}</span>
                </div>
              )}

              {bio && (
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: '11.5px',
                    opacity: 0.88,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navegación por Pestañas */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px 20px 0',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'account' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'account' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.16s ease',
            }}
          >
            <User size={15} />
            Cuenta y Perfil
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('styles')}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'styles' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'styles' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.16s ease',
            }}
          >
            <PaintBrush size={15} />
            Estilos y VIP
          </button>
        </div>

        {/* Error banner si existe */}
        {errorMsg && (
          <div style={{ margin: '12px 20px 0' }} className="jf-dev-auth-error">
            {errorMsg}
          </div>
        )}

        {/* Cuerpo del formulario con scroll independiente */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeTab === 'account' ? (
            <>
              {/* Grid 2 columnas: Handle y Nombre visible */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Nombre de usuario (Handle)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      @
                    </span>
                    <input
                      className="jf-dev-input"
                      style={{ paddingLeft: '26px' }}
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="usuario"
                      disabled={user.role === 'dev'}
                    />
                  </div>
                  {user.role === 'dev' && (
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      La cuenta dev principal no puede renombrarse.
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Nombre para mostrar
                  </label>
                  <input
                    className="jf-dev-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej. Lucas Leija"
                  />
                </div>
              </div>

              {/* Grid 2 columnas: Rol y Contraseña */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Rol de la cuenta
                  </label>
                  {user.role === 'dev' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'rgba(var(--accent-rgb), 0.1)', borderRadius: 'var(--radius-md)' }}>
                      <ShieldCheck size={16} color="var(--accent)" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>Desarrollador (Bloqueado)</span>
                    </div>
                  ) : (
                    <select
                      className="jf-select"
                      style={{ width: '100%', padding: '8px 12px' }}
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Nueva Contraseña <span style={{ opacity: 0.6, fontWeight: 400 }}>(opcional)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="jf-dev-input"
                      style={{ paddingRight: '36px' }}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Dejar vacío para no cambiar"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Si se define, se reemplaza la clave del usuario inmediatamente.
                  </span>
                </div>
              </div>

              {/* Avatar URL */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  URL de Imagen de Avatar <span style={{ opacity: 0.6, fontWeight: 400 }}>(HTTPS)</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="jf-dev-input"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://ejemplo.com/avatar.jpg"
                  />
                  {avatarUrl && (
                    <Button variant="ghost" size="sm" onClick={() => setAvatarUrl('')}>
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>

              {/* Discord ID */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <DiscordLogo size={14} color="#5865F2" />
                    ID de Usuario de Discord
                  </span>
                </label>
                <input
                  className="jf-dev-input"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value.trim())}
                  placeholder="Ej. 742111812975394867"
                />
              </div>

              {/* Biografía */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Biografía del perfil
                  </label>
                  <span style={{ fontSize: '11px', color: bio.length > 150 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {bio.length}/160
                  </span>
                </div>
                <textarea
                  className="jf-dev-input"
                  rows={3}
                  maxLength={160}
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Escribe una breve descripción o biografía para el usuario…"
                />
              </div>
            </>
          ) : (
            <>
              {/* Pestaña: Estilos y VIP */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px' }}>
                  ⚡ Presets Rápidos VIP (1 Clic)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {DEV_QUICK_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      className="jf-btn jf-btn--ghost jf-btn--sm"
                      style={{
                        fontSize: '11px',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      onClick={() => applyPreset(p)}
                    >
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Insignia y Vibe */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Insignia Personalizada (Badge)
                  </label>
                  <input
                    className="jf-dev-input"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="👑 VIP JodiFy, ⚡ Staff, etc."
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Estado de Ánimo / Vibe
                  </label>
                  <input
                    className="jf-dev-input"
                    value={vibe}
                    onChange={(e) => setVibe(e.target.value)}
                    placeholder="🔥 Modo Bestia, 🎧 Hi-Fi, etc."
                  />
                </div>
              </div>

              {/* Marcos de Avatar */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Marco de Avatar VIP
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                  {DEV_FRAMES.map((f) => {
                    const isSelected = frame === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFrame(f.id)}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: isSelected ? '1px solid #00f0ff' : '1px solid rgba(255,255,255,0.1)',
                          background: isSelected ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          textAlign: 'left',
                          fontSize: '11px',
                          color: isSelected ? '#00f0ff' : '#ddd',
                        }}
                      >
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: f.color,
                            boxShadow: `0 0 6px ${f.color}`,
                          }}
                        />
                        <span>{f.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Temas Visuales */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Tema de Perfil
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                  {DEV_THEMES.map((t) => {
                    const isSelected = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id)}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: isSelected ? '1px solid #00f0ff' : '1px solid rgba(255,255,255,0.1)',
                          background: isSelected ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          textAlign: 'left',
                          fontSize: '11px',
                          color: isSelected ? '#00f0ff' : '#ddd',
                        }}
                      >
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '4px',
                            background: t.gradient,
                          }}
                        />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Efectos y Color de acento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Efecto de Fondo
                  </label>
                  <select
                    className="jf-select"
                    style={{ width: '100%', padding: '8px 12px' }}
                    value={effect}
                    onChange={(e) => setEffect(e.target.value)}
                  >
                    {DEV_EFFECTS.map((eff) => (
                      <option key={eff.id} value={eff.id}>
                        {eff.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Color de Acento
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {ACCENT_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAccent(c)}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: c,
                          border: accent === c ? '2px solid #fff' : '1px solid transparent',
                          cursor: 'pointer',
                          boxShadow: accent === c ? `0 0 8px ${c}` : 'none',
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={accent}
                      onChange={(e) => setAccent(e.target.value)}
                      style={{
                        width: '24px',
                        height: '24px',
                        padding: 0,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                      }}
                      title="Elegir color personalizado"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer con Acciones */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div>
            {user.role !== 'dev' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleDelete()}
                disabled={saving || deleting}
                style={{ color: 'var(--error, #ef4444)', borderColor: 'rgba(239, 68, 68, 0.25)' }}
                title="Eliminar usuario permanentemente"
              >
                <Trash size={14} />
                {deleting ? 'Eliminando…' : 'Eliminar usuario'}
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={saving || deleting}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving || deleting}
            >
              <FloppyDisk size={14} />
              {saving ? 'Guardando…' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
