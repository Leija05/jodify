import { useMemo, useState } from 'react';
import { Sparkle, FloppyDisk, X } from '@phosphor-icons/react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { usersService } from '../../services/users.service';
import { devService } from '../../services/dev.service';
import { useToastStore } from '../../store/toast.store';
import { resolveAvatarSrc } from '../../lib/utils';
import type { DevUserRow, Role } from '../../lib/types';

interface DevUserStylesModalProps {
  user: DevUserRow;
  onClose: () => void;
  onSaved: () => void;
}

export const DEV_FRAMES = [
  { id: 'none', label: 'Sin marco', color: '#64748b' },
  { id: 'golden_crest', label: 'Corona Oro VIP', color: '#ffd700' },
  { id: 'cyber_glitch', label: 'Cyber Glitch', color: '#ffee00' },
  { id: 'neon_cyan', label: 'Neón Cian', color: '#00f0ff' },
  { id: 'fire_aura', label: 'Aura Fuego', color: '#ff5500' },
  { id: 'rainbow_prism', label: 'Prisma Tornasol', color: '#ec4899' },
  { id: 'cosmic_void', label: 'Vórtice Cósmico', color: '#c084fc' },
  { id: 'matrix_emerald', label: 'Matrix Esmeralda', color: '#00ff66' },
  { id: 'rgb_soundwave', label: 'Onda RGB', color: '#ff0077' },
] as const;

export const DEV_THEMES = [
  { id: 'aurora', label: 'Aurora Boreal', gradient: 'linear-gradient(135deg, #00f0ff, #7f00ff)' },
  { id: 'cyberpunk', label: 'Cyberpunk 2077', gradient: 'linear-gradient(135deg, #ffee00, #ff0077)' },
  { id: 'synthwave', label: 'Synthwave Neon', gradient: 'linear-gradient(135deg, #ff2a85, #00f0ff)' },
  { id: 'crimson', label: 'Blood Moon', gradient: 'linear-gradient(135deg, #ff0044, #88001b)' },
  { id: 'gold', label: 'Oro Supremo VIP', gradient: 'linear-gradient(135deg, #ffd700, #ff8800)' },
  { id: 'matrix', label: 'Matrix Emerald', gradient: 'linear-gradient(135deg, #00ff66, #00441b)' },
  { id: 'midnight', label: 'Obsidian Star', gradient: 'linear-gradient(135deg, #333344, #050505)' },
  { id: 'sunset', label: 'Sunset Chill', gradient: 'linear-gradient(135deg, #ff7700, #ff0077)' },
] as const;

export const DEV_EFFECTS = [
  { id: 'none', label: 'Sin efecto' },
  { id: 'neon_glow', label: 'Brillo Neón' },
  { id: 'matrix_rain', label: 'Lluvia Matrix' },
  { id: 'cyber_grid', label: 'Malla Cyber' },
  { id: 'fire_particles', label: 'Partículas de Fuego' },
  { id: 'rainbow_wave', label: 'Onda Arcoíris' },
  { id: 'cosmic_stars', label: 'Estrellas Cósmicas' },
] as const;

export const DEV_QUICK_PRESETS = [
  {
    name: '👑 Oro VIP Supremo',
    frame: 'golden_crest',
    theme: 'gold',
    effect: 'neon_glow',
    accent: '#ffd700',
    badge: '👑 VIP JodiFy',
    vibe: '⚡ A tope de ritmo',
  },
  {
    name: '⚡ Amigo Dev Cyber',
    frame: 'cyber_glitch',
    theme: 'cyberpunk',
    effect: 'cyber_grid',
    accent: '#ffee00',
    badge: '⚡ Amigo Dev',
    vibe: '🔥 Modo Bestia / Gym',
  },
  {
    name: '💎 Patrocinador Astral',
    frame: 'cosmic_void',
    theme: 'synthwave',
    effect: 'cosmic_stars',
    accent: '#c084fc',
    badge: '💎 Coleccionista Legendario',
    vibe: '🌌 Viaje Cósmico',
  },
  {
    name: '💻 Dev Matrix Hacker',
    frame: 'matrix_emerald',
    theme: 'matrix',
    effect: 'matrix_rain',
    accent: '#00ff66',
    badge: '💻 Dev Elite',
    vibe: '💻 En la zona de código',
  },
  {
    name: '🎧 Audiófilo Neón',
    frame: 'neon_cyan',
    theme: 'aurora',
    effect: 'neon_glow',
    accent: '#00f0ff',
    badge: '🎧 Audiófilo Hi-Fi',
    vibe: '🌙 Modo Chill & Relax',
  },
];

const ACCENT_PRESETS = [
  '#00f0ff', '#ff0077', '#ffd700', '#00ff66', '#ff5500', '#a855f7', '#ec4899', '#38bdf8', '#3b82f6',
];

export function DevUserStylesModal({ user, onClose, onSaved }: DevUserStylesModalProps) {
  const toast = useToastStore();
  const [displayName, setDisplayName] = useState(user.display_name || user.username);
  const [frame, setFrame] = useState(user.avatar_frame || 'none');
  const [theme, setTheme] = useState(user.theme || 'aurora');
  const [effect, setEffect] = useState(user.profile_effect || 'none');
  const [accent, setAccent] = useState(user.accent_color || '#00f0ff');
  const [badge, setBadge] = useState(user.custom_badge || '');
  const [vibe, setVibe] = useState(user.vibe || '');
  const [role, setRole] = useState<Role>(user.role || 'user');
  const [bgMode, setBgMode] = useState<'preset' | 'gradient' | 'anthem_cover'>(user.profile_bg_mode || 'preset');
  const [gradStart, setGradStart] = useState(user.custom_gradient_start || '#6366f1');
  const [gradEnd, setGradEnd] = useState(user.custom_gradient_end || '#ec4899');
  const [saving, setSaving] = useState(false);

  const applyPreset = (preset: typeof DEV_QUICK_PRESETS[number]) => {
    setFrame(preset.frame);
    setTheme(preset.theme);
    setEffect(preset.effect);
    setAccent(preset.accent);
    setBadge(preset.badge);
    setVibe(preset.vibe);
    toast.show(`Preset «${preset.name}» aplicado a la vista previa`, 'info', 1800);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update user profile styles
      await usersService.updateProfile(user.username, {
        display_name: displayName.trim() || null,
        avatar_frame: frame,
        theme: theme,
        profile_effect: effect,
        accent_color: accent,
        custom_badge: badge.trim() || null,
        vibe: vibe.trim() || null,
        profile_bg_mode: bgMode,
        custom_gradient_start: gradStart,
        custom_gradient_end: gradEnd,
      });

      // 2. If role changed and is not 'dev'
      if (role !== user.role && (role === 'admin' || role === 'mod' || role === 'user')) {
        await devService.setRole(user.username, role);
      }

      toast.show(`¡Estilos de @${user.username} guardados correctamente!`, 'success', 2500);
      onSaved();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Error al guardar estilos', 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentThemeGradient = useMemo(() => {
    const found = DEV_THEMES.find((t) => t.id === theme);
    return found ? found.gradient : 'linear-gradient(135deg, #00f0ff, #7f00ff)';
  }, [theme]);

  const frameClass = frame && frame !== 'none' ? `jf-avatar-frame--${frame}` : '';

  return (
    <div
      className="jf-modal-backdrop"
      style={{ zIndex: 1200 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="jf-modal-card"
        style={{ maxWidth: '680px', width: '94%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
            Personalizar Estilos VIP · @{user.username}
          </h3>
          <button
            type="button"
            className="jf-btn jf-btn--ghost jf-btn--sm"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{ padding: '4px', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="jf-dev-user-styles-modal" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
        
        {/* VISTA PREVIA EN VIVO */}
        <div
          className="jf-dev-styles-preview"
          style={{
            position: 'relative',
            borderRadius: '14px',
            overflow: 'hidden',
            padding: '20px',
            background: bgMode === 'gradient'
              ? `linear-gradient(135deg, ${gradStart}, ${gradEnd})`
              : currentThemeGradient,
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
              username={displayName || user.username}
              src={resolveAvatarSrc(user)}
              size={64}
              presence={user.is_online ? 'online' : 'offline'}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                {displayName || user.username}
              </span>
              <span style={{ fontSize: '12px', opacity: 0.75 }}>@{user.username}</span>
              <span className={`jf-role-badge jf-role-badge--${role}`}>
                {role}
              </span>
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
                  marginTop: '6px',
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

            <div style={{ marginTop: '8px', display: 'flex', gap: '12px', fontSize: '11px', opacity: 0.85 }}>
              <span>Efecto: <strong>{effect}</strong></span>
              <span>Color acento: <strong style={{ color: accent }}>{accent}</strong></span>
            </div>
          </div>
        </div>

        {/* PRESETS VIP RÁPIDOS */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px' }}>
            ⚡ Presets Rápidos para Amigos / VIP (1 Clic)
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

        {/* CONTROLES DE CONFIGURACIÓN */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          
          {/* Nombre a Mostrar */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>
              Nombre Visible / Apodo
            </label>
            <input
              className="jf-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej: Carlos El Rey"
              maxLength={32}
            />
          </div>

          {/* Rol del Usuario */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>
              Rol en el Sistema
            </label>
            <select
              className="jf-select"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="user">user (Normal)</option>
              <option value="mod">mod (Moderador)</option>
              <option value="admin">admin (Administrador)</option>
              <option value="dev">dev (Desarrollador)</option>
            </select>
          </div>

          {/* Insignia / Badge */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>
              Insignia Personalizada (Badge)
            </label>
            <input
              className="jf-input"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="Ej: 👑 VIP JodiFy, ⚡ Amigo Dev"
              maxLength={40}
            />
          </div>

          {/* Vibe / Estado */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>
              Estado de Ánimo / Vibe
            </label>
            <input
              className="jf-input"
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              placeholder="Ej: ⚡ A tope de ritmo"
              maxLength={50}
            />
          </div>
        </div>

        {/* MARCO DE AVATAR */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px' }}>
            🖼️ Marco de Avatar
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
            {DEV_FRAMES.map((f) => {
              const active = frame === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFrame(f.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: active ? 'rgba(0,240,255,0.12)' : 'rgba(255,255,255,0.03)',
                    border: active ? '1px solid #00f0ff' : '1px solid rgba(255,255,255,0.08)',
                    color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '99px',
                      background: f.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TEMA DE PERFIL */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px' }}>
            🎨 Tema de Perfil
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
            {DEV_THEMES.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: active ? 'rgba(0,240,255,0.12)' : 'rgba(255,255,255,0.03)',
                    border: active ? '1px solid #00f0ff' : '1px solid rgba(255,255,255,0.08)',
                    color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '4px',
                      background: t.gradient,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* EFECTO DE PERFIL Y COLOR ACENTO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          
          {/* Efecto de Fondo */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>
              Efecto de Fondo Activo
            </label>
            <select
              className="jf-select"
              value={effect}
              onChange={(e) => setEffect(e.target.value)}
            >
              {DEV_EFFECTS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          {/* Color de Acento */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>
              Color de Acento (Hex)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                className="jf-input jf-input--mono"
                style={{ width: '100px' }}
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                maxLength={7}
              />
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {ACCENT_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      background: color,
                      border: accent === color ? '2px solid #fff' : '1px solid rgba(0,0,0,0.5)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setAccent(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* MODO FONDO DE PERFIL & GRADIENTE */}
        <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
              Modo de Fondo del Perfil
            </span>
            <div className="jf-dev-seg">
              <button
                type="button"
                className={`jf-dev-seg-btn ${bgMode === 'preset' ? 'is-active' : ''}`}
                onClick={() => setBgMode('preset')}
              >
                Tema
              </button>
              <button
                type="button"
                className={`jf-dev-seg-btn ${bgMode === 'gradient' ? 'is-active' : ''}`}
                onClick={() => setBgMode('gradient')}
              >
                Gradiente Custom
              </button>
              <button
                type="button"
                className={`jf-dev-seg-btn ${bgMode === 'anthem_cover' ? 'is-active' : ''}`}
                onClick={() => setBgMode('anthem_cover')}
              >
                Carátula Himno
              </button>
            </div>
          </div>

          {bgMode === 'gradient' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Inicio:</span>
                <input
                  type="color"
                  value={gradStart}
                  onChange={(e) => setGradStart(e.target.value)}
                  style={{ width: '32px', height: '26px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                />
              </label>
              <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Fin:</span>
                <input
                  type="color"
                  value={gradEnd}
                  onChange={(e) => setGradEnd(e.target.value)}
                  style={{ width: '32px', height: '26px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                />
              </label>
              <div
                style={{
                  height: '24px',
                  flex: 1,
                  borderRadius: '6px',
                  background: `linear-gradient(90deg, ${gradStart}, ${gradEnd})`,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
            </div>
          )}
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            <FloppyDisk size={15} />
            {saving ? 'Guardando Estilos…' : 'Guardar y Aplicar Estilos'}
          </Button>
        </div>
      </div>
    </div>
  </div>
);
}
