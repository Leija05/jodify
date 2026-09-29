import { useState } from 'react';
import { Play, Pause, Sparkle, Disc, Trash, ArrowsClockwise } from '@phosphor-icons/react';
import type { Song } from '../../lib/types';
import { SongCover } from '../ui/SongCover';
import { useSongCoverGradient } from '../../lib/colorExtractor';

interface AnthemCardProps {
  song: Song;
  isPlaying?: boolean;
  onPlay: () => void;
  isOwnProfile?: boolean;
  onChangeAnthem?: () => void;
  onRemoveAnthem?: () => void;
  titlePrefix?: string;
}

export function AnthemCard({
  song,
  isPlaying = false,
  onPlay,
  isOwnProfile = false,
  onChangeAnthem,
  onRemoveAnthem,
  titlePrefix,
}: AnthemCardProps) {
  const gradient = useSongCoverGradient(song);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="jf-showcase-anthem-card"
      style={gradient.cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Resplandor ambiental de fondo */}
      <div
        className="jf-anthem-ambient-glow"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${gradient.glowColor} 0%, transparent 70%)`,
        }}
        aria-hidden="true"
      />

      <div className="jf-showcase-card-header" style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkle size={14} weight="fill" style={{ color: '#ffd700' }} />
          <span style={{ fontWeight: 600 }}>{titlePrefix || 'Himno Personal Insignia'}</span>
        </div>
        {isPlaying && (
          <div className="jf-anthem-eq-indicator" aria-label="Reproduciendo">
            <span style={{ background: gradient.primary }} />
            <span style={{ background: gradient.primary }} />
            <span style={{ background: gradient.primary }} />
          </div>
        )}
      </div>

      <div className="jf-showcase-anthem-body" style={{ position: 'relative', zIndex: 2 }}>
        {/* Carátula + Disco de Vinilo animado */}
        <div className="jf-anthem-cover-container">
          <div className={`jf-anthem-vinyl ${isPlaying ? 'is-spinning' : hovered ? 'is-peeking' : ''}`}>
            <Disc size={44} weight="duotone" style={{ color: '#0f172a' }} />
            <span className="jf-anthem-vinyl-center" style={{ background: gradient.primary }} />
          </div>
          <div className="jf-anthem-cover-wrap">
            <SongCover song={song} alt={song.name} className="jf-showcase-anthem-cover" />
            <button
              type="button"
              className="jf-anthem-play-overlay-btn"
              onClick={onPlay}
              title={isPlaying ? 'Pausar himno' : 'Reproducir himno'}
              aria-label={isPlaying ? 'Pausar himno' : 'Reproducir himno'}
            >
              {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
            </button>
          </div>
        </div>

        {/* Metadatos de la canción */}
        <div className="jf-showcase-anthem-meta">
          <h4 className="jf-showcase-song-title" title={song.name}>
            {song.name}
          </h4>
          <p className="jf-showcase-song-artist">
            {song.added_by ? `Aportada por ${song.added_by}` : 'JodiFy Oficial'}
          </p>
          <div className="jf-anthem-palette-pills">
            <span
              className="jf-anthem-color-dot"
              style={{ background: gradient.primary }}
              title="Tono cromático principal extraído de la portada"
            />
            <span
              className="jf-anthem-color-dot"
              style={{ background: gradient.secondary }}
              title="Tono secundario"
            />
            <span className="jf-anthem-vibe-pill">Armonía de portada</span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="jf-anthem-actions">
          <button
            type="button"
            className="jf-showcase-play-btn"
            onClick={onPlay}
            title={isPlaying ? 'Pausar himno' : 'Reproducir himno'}
            style={{
              background: gradient.primary,
              boxShadow: `0 4px 14px -2px ${gradient.glowColor}`,
            }}
          >
            {isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
          </button>

          {isOwnProfile && onChangeAnthem && (
            <button
              type="button"
              className="jf-anthem-icon-btn"
              onClick={onChangeAnthem}
              title="Cambiar himno personal"
            >
              <ArrowsClockwise size={15} />
            </button>
          )}

          {isOwnProfile && onRemoveAnthem && (
            <button
              type="button"
              className="jf-anthem-icon-btn jf-anthem-icon-btn--danger"
              onClick={onRemoveAnthem}
              title="Quitar himno"
            >
              <Trash size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
