import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Playlist, Plus, X, MusicNotes, Sparkle } from '@phosphor-icons/react';
import { useUiStore } from '../../store/ui.store';
import { usePlaylistsStore } from '../../store/playlists.store';
import { useSession } from '../../context/SessionContext';
import type { Song } from '../../lib/types';
import { resolveMediaUrl } from '../../lib/utils';

const COLOR_PRESETS = [
  'linear-gradient(135deg, #7f00ff 0%, #00f0ff 100%)',
  'linear-gradient(135deg, #ff0080 0%, #7f00ff 100%)',
  'linear-gradient(135deg, #00f0ff 0%, #00ff88 100%)',
  'linear-gradient(135deg, #ff5e62 0%, #ff9966 100%)',
  'linear-gradient(135deg, #4158d0 0%, #c850c0 46%, #ffcc70 100%)',
  'linear-gradient(135deg, #130cb7 0%, #52e5e7 100%)',
];

export function CreatePlaylistModal() {
  const ui = useUiStore();
  const { session } = useSession();
  const { createPlaylist } = usePlaylistsStore();

  const payload = ui.modalPayload as { song?: Song } | undefined;
  const song = payload?.song;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);

  useEffect(() => {
    if (ui.modal === 'createPlaylist') {
      if (song) {
        setName(`Playlist · ${song.name}`);
        setDescription(`Inspirada en ${song.name} de ${song.artist || 'JodiFy'}`);
      } else {
        setName('');
        setDescription('');
      }
      setSelectedColor(COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);
    }
  }, [ui.modal, song]);

  if (ui.modal !== 'createPlaylist') return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createPlaylist(
      name.trim(),
      song ? String(song.id) : undefined,
      session?.username ?? 'Usuario',
      description.trim(),
      selectedColor,
    );
    ui.close('createPlaylist');
  };

  return (
    <div className="jf-modal-backdrop" onClick={() => ui.close('createPlaylist')}>
      <motion.div
        className="jf-modal jf-playlist-modal"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(480px, 94vw)' }}
      >
        <div className="jf-modal-header">
          <div className="jf-modal-header-icon">
            <Playlist size={20} weight="fill" />
          </div>
          <div>
            <h2 className="jf-modal-title">Crear nueva playlist</h2>
            <p className="jf-modal-subtitle">Organiza tus canciones favoritas en colecciones únicas</p>
          </div>
          <button
            type="button"
            className="jf-modal-close"
            onClick={() => ui.close('createPlaylist')}
            aria-label="Cerrar"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="jf-playlist-modal-form">
          {/* Vista previa de tarjeta con el estilo de portada */}
          <div className="jf-playlist-preview-card" style={{ background: selectedColor }}>
            <div className="jf-playlist-preview-pattern" />
            <div className="jf-playlist-preview-content">
              {song?.cover_url ? (
                <img
                  className="jf-playlist-preview-thumb"
                  src={resolveMediaUrl(song.cover_url)}
                  alt=""
                />
              ) : (
                <div className="jf-playlist-preview-icon">
                  <MusicNotes size={28} weight="duotone" />
                </div>
              )}
              <div className="jf-playlist-preview-meta">
                <span className="jf-playlist-preview-badge">Nueva Colección</span>
                <h3 className="jf-playlist-preview-title">{name || 'Mi Playlist'}</h3>
                {song && (
                  <p className="jf-playlist-preview-song">
                    1 canción incluida: <strong>{song.name}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Selector de color de portada */}
          <div className="jf-form-field">
            <label className="jf-form-label">Estilo y degradado de portada</label>
            <div className="jf-color-swatches">
              {COLOR_PRESETS.map((grad, i) => (
                <button
                  key={i}
                  type="button"
                  className={`jf-color-swatch ${selectedColor === grad ? 'is-selected' : ''}`}
                  style={{ background: grad }}
                  onClick={() => setSelectedColor(grad)}
                  aria-label={`Color preset ${i + 1}`}
                >
                  {selectedColor === grad && <Sparkle size={12} weight="fill" />}
                </button>
              ))}
            </div>
          </div>

          <div className="jf-form-field">
            <label htmlFor="pl-name" className="jf-form-label">
              Nombre de la playlist
            </label>
            <input
              id="pl-name"
              type="text"
              className="jf-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Noches de Neón, Cyberpunk Vibes…"
              autoFocus
              maxLength={60}
              required
            />
          </div>

          <div className="jf-form-field">
            <label htmlFor="pl-desc" className="jf-form-label">
              Descripción (opcional)
            </label>
            <textarea
              id="pl-desc"
              className="jf-input jf-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Añade una descripción o nota sobre esta playlist"
              rows={2}
              maxLength={150}
            />
          </div>

          <div className="jf-modal-footer">
            <button
              type="button"
              className="jf-btn jf-btn--secondary"
              onClick={() => ui.close('createPlaylist')}
            >
              Cancelar
            </button>
            <button type="submit" className="jf-btn jf-btn--primary" disabled={!name.trim()}>
              <Plus size={16} weight="bold" /> Crear playlist
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
