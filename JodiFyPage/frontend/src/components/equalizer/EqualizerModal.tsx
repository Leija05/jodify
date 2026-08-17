import { useState } from 'react';
import { FloppyDisk, ArrowClockwise, WaveSine, Sparkle } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { EQ_BANDS } from '../../lib/constants';
import { useEqStore } from '../../store/eq.store';
import { useSettingsStore } from '../../store/settings.store';
import { useToastStore } from '../../store/toast.store';

const PRESETS = ['flat', 'bass', 'treble', 'vocal', 'rock', 'electronic', 'podcast', 'dance', 'classical', 'night'];

export function EqualizerModal() {
  const eq = useEqStore();
  const customPresets = useSettingsStore((s) => s.customEqPresets);
  const [presetName, setPresetName] = useState('');

  const savePreset = () => {
    if (!presetName.trim()) return;
    if (PRESETS.includes(presetName.toLowerCase().trim())) {
      useToastStore.getState().show('No puedes sobrescribir un preset por defecto', 'warning');
      return;
    }
    eq.saveCustom(presetName);
    setPresetName('');
    useToastStore.getState().show('Preset guardado', 'success');
  };

  const allPresets = [...PRESETS, ...Object.keys(customPresets)];

  return (
    <Modal name="equalizer" title="Ecualizador" width={680}>
      <div className="jf-eq">
        <div className="jf-eq-presets">
          {allPresets.map((preset) => (
            <button
              key={preset}
              className={`jf-eq-preset ${eq.activePreset === preset ? 'is-active' : ''}`}
              onClick={() => eq.applyPreset(preset)}
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="jf-eq-sliders" role="group" aria-label="Bandas del ecualizador">
          {EQ_BANDS.map((freq, i) => (
            <div className="jf-eq-band" key={freq} data-gain={eq.values[i]?.toFixed(1) ?? '0.0'}>
              <span className="jf-eq-gain">{eq.values[i] != null && eq.values[i] > 0 ? `+${eq.values[i].toFixed(1)}` : (eq.values[i] ?? 0).toFixed(1)}</span>
              <Slider
                vertical
                min={-12}
                max={12}
                step={0.5}
                value={eq.values[i] ?? 0}
                onChange={(e) => eq.setValue(i, Number(e.target.value))}
                aria-label={`Banda ${freq} Hz`}
                data-testid={`eq-band-${freq}`}
              />
              <span className="jf-eq-freq">{freq >= 1000 ? `${freq / 1000}k` : freq}</span>
            </div>
          ))}
        </div>

        <div className="jf-eq-actions">
          <Button variant="glass" size="sm" onClick={eq.smooth}>
            <WaveSine size={15} /> Suavizar
          </Button>
          <Button variant="glass" size="sm" onClick={eq.vibe}>
            <Sparkle size={15} /> Vibe
          </Button>
          <Button variant="ghost" size="sm" onClick={eq.reset}>
            <ArrowClockwise size={15} /> Reset
          </Button>
          <div className="jf-eq-save">
            <input
              className="jf-input jf-eq-save-input"
              placeholder="Nombre del preset"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') savePreset();
              }}
              aria-label="Nombre del preset"
            />
            <Button variant="primary" size="sm" onClick={savePreset} disabled={!presetName.trim()}>
              <FloppyDisk size={14} /> Guardar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
