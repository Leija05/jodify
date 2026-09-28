import { useState } from 'react';
import {
  FloppyDisk,
  ArrowClockwise,
  WaveSine,
  Sparkle,
  Play,
  Pause,
  Trash,
  SpeakerHigh,
  SlidersHorizontal,
  MusicNotes,
  Check,
} from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { EQ_BANDS } from '../../lib/constants';
import { useEqStore } from '../../store/eq.store';
import { useSettingsStore } from '../../store/settings.store';
import { useToastStore } from '../../store/toast.store';
import { usePlayerStore } from '../../store/player.store';
import { useLibraryStore } from '../../store/library.store';
import { EqualizerVisualizer } from './EqualizerVisualizer';

const BAND_METADATA = [
  { freq: 60, label: '60', tag: 'Sub', desc: 'Sub-graves y bombos profundos' },
  { freq: 170, label: '170', tag: 'Bajo', desc: 'Línea de bajo y pegada' },
  { freq: 310, label: '310', tag: 'Calidez', desc: 'Calidez y cuerpo armónico' },
  { freq: 600, label: '600', tag: 'Cuerpo', desc: 'Resonancia de instrumentos' },
  { freq: 1000, label: '1k', tag: 'Medios', desc: 'Voces y claridad principal' },
  { freq: 3000, label: '3k', tag: 'Presencia', desc: 'Ataque vocal y guitarras' },
  { freq: 6000, label: '6k', tag: 'Definición', desc: 'Definición y percusión' },
  { freq: 12000, label: '12k', tag: 'Brillo', desc: 'Brillo y platillos' },
  { freq: 14000, label: '14k', tag: 'Detalle', desc: 'Apertura y micro-detalle' },
  { freq: 16000, label: '16k', tag: 'Aire', desc: 'Extensión y atmósfera' },
];

interface PresetItem {
  id: string;
  name: string;
  category: 'music' | 'focus';
}

const FACTORY_PRESETS: PresetItem[] = [
  { id: 'flat', name: 'Flat (Estudio)', category: 'focus' },
  { id: 'bass', name: 'Bass Boost', category: 'focus' },
  { id: 'treble', name: 'Treble Crisp', category: 'focus' },
  { id: 'vocal', name: 'Vocal Boost', category: 'focus' },
  { id: 'podcast', name: 'Podcast / Voz', category: 'focus' },
  { id: 'night', name: 'Modo Nocturno', category: 'focus' },
  { id: 'rock', name: 'Rock', category: 'music' },
  { id: 'electronic', name: 'Electrónica', category: 'music' },
  { id: 'pop', name: 'Pop', category: 'music' },
  { id: 'hiphop', name: 'Hip-Hop / 808', category: 'music' },
  { id: 'dance', name: 'Dance / Club', category: 'music' },
  { id: 'jazz', name: 'Jazz Acústico', category: 'music' },
  { id: 'classical', name: 'Clásica', category: 'music' },
  { id: 'acoustic', name: 'Acústico', category: 'music' },
];

export function EqualizerModal() {
  const eq = useEqStore();
  const customPresets = useSettingsStore((s) => s.customEqPresets);
  const [presetName, setPresetName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'music' | 'focus' | 'custom'>('all');
  const [activeBandIndex, setActiveBandIndex] = useState<number | null>(null);

  // Reproductor para probar en vivo
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const playSong = usePlayerStore((s) => s.playSong);
  const librarySongs = useLibraryStore((s) => s.songs);

  const savePreset = () => {
    const clean = presetName.trim();
    if (!clean) return;
    const isFactory = FACTORY_PRESETS.some((p) => p.id.toLowerCase() === clean.toLowerCase() || p.name.toLowerCase() === clean.toLowerCase());
    if (isFactory) {
      useToastStore.getState().show('No puedes sobrescribir un perfil predeterminado de fábrica', 'warning');
      return;
    }
    const ok = eq.saveCustom(clean);
    if (ok) {
      setPresetName('');
      useToastStore.getState().show(`Preset "${clean}" guardado`, 'success');
      setSelectedCategory('custom');
    }
  };

  const removePreset = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    eq.removeCustom(name);
    useToastStore.getState().show(`Preset "${name}" eliminado`, 'info');
  };

  const filteredPresets = () => {
    if (selectedCategory === 'custom') {
      return Object.keys(customPresets).map((name) => ({ id: name, name, category: 'custom' as const }));
    }
    if (selectedCategory === 'all') {
      const customs = Object.keys(customPresets).map((name) => ({ id: name, name, category: 'custom' as const }));
      return [...FACTORY_PRESETS, ...customs];
    }
    return FACTORY_PRESETS.filter((p) => p.category === selectedCategory);
  };

  const resetBand = (index: number) => {
    eq.setValue(index, 0);
  };

  return (
    <Modal name="equalizer" title="Ecualizador de Estudio 64-bit" width={820} className="jf-eq-modal">
      <div className="jf-eq">
        {/* Header / Barra de Estado DSP */}
        <div className="jf-eq-header-bar">
          <div className="jf-eq-status-chip">
            <span className={`jf-eq-led ${eq.enabled ? 'is-active' : 'is-bypass'}`} />
            <div className="jf-eq-status-texts">
              <span className="jf-eq-status-title">
                {eq.enabled ? 'DSP 64-BIT ACTIVO' : 'BYPASS DIRECTO (PLANO)'}
              </span>
              <span className="jf-eq-status-sub">
                {eq.enabled ? 'Filtros biquad activos y ecualización paramétrica' : 'Sin procesamiento de señal aplicado'}
              </span>
            </div>
          </div>

          <div className="jf-eq-header-actions">
            <button
              className={`jf-eq-bypass-btn ${!eq.enabled ? 'is-bypass' : 'is-active'}`}
              onClick={eq.toggleEnabled}
              title={eq.enabled ? 'Desactivar ecualizador (Bypass)' : 'Activar ecualizador'}
            >
              {eq.enabled ? (
                <>
                  <Check size={14} weight="bold" /> Procesador Activo
                </>
              ) : (
                'Bypass (Sonido Original)'
              )}
            </button>
          </div>
        </div>

        {/* Visualizador de Curva de Frecuencia y Espectro en Vivo */}
        <div className="jf-eq-viz-section">
          <EqualizerVisualizer
            values={eq.values}
            enabled={eq.enabled}
            preamp={eq.preamp}
            bassBoost={eq.bassBoost}
            clarity={eq.clarity}
            onBandSelect={(idx) => setActiveBandIndex(idx)}
          />
        </div>

        {/* Potenciadores DSP Maestros: Bass Boost, Claridad y Preamp */}
        <div className="jf-eq-dsp-grid">
          {/* 1. Bass Boost */}
          <div className="jf-eq-dsp-card jf-eq-dsp-bass">
            <div className="jf-eq-dsp-top">
              <div className="jf-eq-dsp-icon">
                <SpeakerHigh size={16} />
              </div>
              <div className="jf-eq-dsp-info">
                <span className="jf-eq-dsp-label">Bass Boost</span>
                <span className="jf-eq-dsp-desc">Sub-graves 80Hz</span>
              </div>
              <span className="jf-eq-dsp-val">{eq.bassBoost}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={eq.bassBoost}
              onChange={(e) => eq.setBassBoost(Number(e.target.value))}
              aria-label="Potenciador de Bajos"
              disabled={!eq.enabled}
            />
          </div>

          {/* 2. Claridad & Aire */}
          <div className="jf-eq-dsp-card jf-eq-dsp-clarity">
            <div className="jf-eq-dsp-top">
              <div className="jf-eq-dsp-icon">
                <Sparkle size={16} />
              </div>
              <div className="jf-eq-dsp-info">
                <span className="jf-eq-dsp-label">Claridad & Aire</span>
                <span className="jf-eq-dsp-desc">Presencia 10kHz+</span>
              </div>
              <span className="jf-eq-dsp-val">{eq.clarity}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={eq.clarity}
              onChange={(e) => eq.setClarity(Number(e.target.value))}
              aria-label="Claridad de Agudos"
              disabled={!eq.enabled}
            />
          </div>

          {/* 3. Preamp Master */}
          <div className="jf-eq-dsp-card jf-eq-dsp-preamp">
            <div className="jf-eq-dsp-top">
              <div className="jf-eq-dsp-icon">
                <SlidersHorizontal size={16} />
              </div>
              <div className="jf-eq-dsp-info">
                <span className="jf-eq-dsp-label">Preamp Master</span>
                <span className="jf-eq-dsp-desc">Ganancia general</span>
              </div>
              <span className={`jf-eq-dsp-val ${eq.preamp > 4 ? 'is-warning' : ''}`}>
                {eq.preamp > 0 ? `+${eq.preamp.toFixed(1)}` : eq.preamp.toFixed(1)} dB
              </span>
            </div>
            <Slider
              min={-12}
              max={12}
              step={0.5}
              value={eq.preamp}
              onChange={(e) => eq.setPreamp(Number(e.target.value))}
              aria-label="Preamp Master"
              disabled={!eq.enabled}
            />
          </div>
        </div>

        {/* Rack de 10 Bandas Gráficas con Faders de Precisión */}
        <div className={`jf-eq-rack ${!eq.enabled ? 'is-disabled' : ''}`} role="group" aria-label="Bandas del ecualizador">
          {EQ_BANDS.map((freq, i) => {
            const meta = BAND_METADATA[i];
            const gain = eq.values[i] ?? 0;
            const isHighlight = activeBandIndex === i;

            return (
              <div
                className={`jf-eq-band-col ${isHighlight ? 'is-highlighted' : ''}`}
                key={freq}
                title={meta.desc}
              >
                {/* Badge de Ganancia (Click para reiniciar a 0dB) */}
                <button
                  type="button"
                  className={`jf-eq-gain-badge ${gain > 0 ? 'is-pos' : gain < 0 ? 'is-neg' : 'is-zero'}`}
                  onClick={() => resetBand(i)}
                  title="Click para restablecer a 0.0 dB"
                >
                  {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
                </button>

                {/* Fader Vertical */}
                <div className="jf-eq-fader-track">
                  <div className="jf-eq-zero-line" />
                  <Slider
                    vertical
                    min={-12}
                    max={12}
                    step={0.5}
                    value={gain}
                    onChange={(e) => eq.setValue(i, Number(e.target.value))}
                    aria-label={`Banda ${freq} Hz (${meta.tag})`}
                    data-testid={`eq-band-${freq}`}
                    disabled={!eq.enabled}
                  />
                </div>

                {/* Frecuencia y Rol Acústico */}
                <div className="jf-eq-freq-tag">
                  <span className="jf-eq-freq-num">{meta.label}</span>
                  <span className="jf-eq-freq-role">{meta.tag}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Perfiles de Sonido & Presets */}
        <div className="jf-eq-presets-panel">
          <div className="jf-eq-presets-header">
            <div className="jf-eq-category-tabs">
              <button
                className={`jf-eq-cat-tab ${selectedCategory === 'all' ? 'is-active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                Todos
              </button>
              <button
                className={`jf-eq-cat-tab ${selectedCategory === 'music' ? 'is-active' : ''}`}
                onClick={() => setSelectedCategory('music')}
              >
                Géneros
              </button>
              <button
                className={`jf-eq-cat-tab ${selectedCategory === 'focus' ? 'is-active' : ''}`}
                onClick={() => setSelectedCategory('focus')}
              >
                Enfoque
              </button>
              <button
                className={`jf-eq-cat-tab ${selectedCategory === 'custom' ? 'is-active' : ''}`}
                onClick={() => setSelectedCategory('custom')}
              >
                Mis Presets ({Object.keys(customPresets).length})
              </button>
            </div>

            {/* Herramientas Rápidas */}
            <div className="jf-eq-quick-tools">
              <Button variant="glass" size="sm" onClick={eq.smooth} disabled={!eq.enabled} title="Suavizar picos abruptos">
                <WaveSine size={14} /> Suavizar
              </Button>
              <Button variant="glass" size="sm" onClick={eq.vibe} disabled={!eq.enabled} title="Curva audiófila V-Shape">
                <Sparkle size={14} /> Vibe
              </Button>
              <Button variant="ghost" size="sm" onClick={eq.reset} title="Restablecer todo a 0 dB plano">
                <ArrowClockwise size={14} /> Reset
              </Button>
            </div>
          </div>

          {/* Chips de Presets */}
          <div className="jf-eq-preset-chips">
            {filteredPresets().map((preset) => {
              const isActive = eq.activePreset.toLowerCase() === preset.id.toLowerCase();
              const isCustom = preset.category === 'custom';

              return (
                <div
                  key={preset.id}
                  className={`jf-eq-preset-chip ${isActive ? 'is-active' : ''} ${isCustom ? 'is-custom' : ''}`}
                  onClick={() => eq.applyPreset(preset.id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="jf-eq-chip-name">{preset.name}</span>
                  {isCustom && (
                    <button
                      type="button"
                      className="jf-eq-chip-del"
                      onClick={(e) => removePreset(preset.id, e)}
                      title={`Eliminar preset ${preset.name}`}
                    >
                      <Trash size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Guardar Preset Personalizado */}
          <div className="jf-eq-save-row">
            <input
              className="jf-input jf-eq-save-input"
              placeholder="Nombre para guardar curva actual…"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') savePreset();
              }}
              aria-label="Nombre del preset"
            />
            <Button variant="primary" size="sm" onClick={savePreset} disabled={!presetName.trim()}>
              <FloppyDisk size={14} /> Guardar Preset
            </Button>
          </div>
        </div>

        {/* Live Audio Monitor Strip (Escucha y prueba en vivo) */}
        <div className="jf-eq-monitor-bar">
          <div className="jf-eq-monitor-left">
            <div className="jf-eq-monitor-art">
              {currentSong?.cover_url ? (
                <img src={currentSong.cover_url} alt={currentSong.name} />
              ) : (
                <MusicNotes size={18} className="jf-eq-art-fallback" />
              )}
            </div>
            <div className="jf-eq-monitor-info">
              <span className="jf-eq-monitor-title" title={currentSong ? currentSong.name : 'Sin canción'}>
                {currentSong ? currentSong.name : 'Monitoreo de Audio'}
              </span>
              <span className="jf-eq-monitor-artist">
                {currentSong
                  ? `${currentSong.artist || 'Artista desconocido'} · ${isPlaying ? 'Reproduciendo en vivo' : 'En pausa'}`
                  : 'Reproduce una canción para escuchar la ecualización en tiempo real'}
              </span>
            </div>
          </div>

          <div className="jf-eq-monitor-right">
            {/* Medidor VU en vivo */}
            {isPlaying && (
              <div className="jf-eq-mini-vu" title="Señal estéreo">
                <span className="jf-eq-vu-bar bar-1" />
                <span className="jf-eq-vu-bar bar-2" />
                <span className="jf-eq-vu-bar bar-3" />
                <span className="jf-eq-vu-bar bar-4" />
              </div>
            )}

            <button
              className="jf-eq-monitor-play-btn"
              onClick={() => {
                if (currentSong) {
                  togglePlay();
                } else if (librarySongs.length > 0 && librarySongs[0]) {
                  playSong(librarySongs[0], librarySongs);
                }
              }}
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
