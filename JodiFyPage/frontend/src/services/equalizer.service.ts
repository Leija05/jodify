import { EQ_BANDS, EQ_MAX, EQ_MIN } from '../lib/constants';
import { clamp } from '../lib/utils';

interface EqChain {
  context: AudioContext | null;
  source: MediaElementAudioSourceNode | null;
  preampNode: GainNode | null;
  bassFilter: BiquadFilterNode | null;
  filters: BiquadFilterNode[];
  clarityFilter: BiquadFilterNode | null;
  analyser: AnalyserNode | null;
  initialized: boolean;
  enabled: boolean;
  preamp: number;
  bassBoost: number;
  clarity: number;
  bandGains: number[];
}

const chain: EqChain = {
  context: null,
  source: null,
  preampNode: null,
  bassFilter: null,
  filters: [],
  clarityFilter: null,
  analyser: null,
  initialized: false,
  enabled: true,
  preamp: 0,
  bassBoost: 0,
  clarity: 0,
  bandGains: Array(EQ_BANDS.length).fill(0),
};

function applySettings(): void {
  if (!chain.context) return;
  const t = chain.context.currentTime;
  const timeConstant = 0.015;

  if (!chain.enabled) {
    // Modo BYPASS: respuesta plana sin distorsión ni procesamiento
    for (const filter of chain.filters) {
      filter.gain.setTargetAtTime(0, t, timeConstant);
    }
    if (chain.preampNode) {
      chain.preampNode.gain.setTargetAtTime(1.0, t, timeConstant);
    }
    if (chain.bassFilter) {
      chain.bassFilter.gain.setTargetAtTime(0, t, timeConstant);
    }
    if (chain.clarityFilter) {
      chain.clarityFilter.gain.setTargetAtTime(0, t, timeConstant);
    }
    return;
  }

  // Modo ACTIVO: aplicar 10 bandas + master preamp + bass boost + clarity
  chain.filters.forEach((filter, i) => {
    const gain = clamp(chain.bandGains[i] ?? 0, EQ_MIN, EQ_MAX);
    filter.gain.setTargetAtTime(gain, t, timeConstant);
  });

  if (chain.preampNode) {
    const preampDb = clamp(chain.preamp, -12, 12);
    const preampLinear = Math.pow(10, preampDb / 20);
    chain.preampNode.gain.setTargetAtTime(preampLinear, t, timeConstant);
  }

  if (chain.bassFilter) {
    // Bass Boost sub-grave dinámico en 80 Hz (hasta +10 dB)
    const boostDb = (clamp(chain.bassBoost, 0, 100) / 100) * 10;
    chain.bassFilter.gain.setTargetAtTime(boostDb, t, timeConstant);
  }

  if (chain.clarityFilter) {
    // Air/Clarity en 10 kHz+ (hasta +8 dB)
    const clarityDb = (clamp(chain.clarity, 0, 100) / 100) * 8;
    chain.clarityFilter.gain.setTargetAtTime(clarityDb, t, timeConstant);
  }
}

function ensureChain(): void {
  if (chain.initialized) return;
  const audio = document.querySelector('audio#jodify-audio') as HTMLAudioElement | null;
  if (!audio) return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new Ctx();
    const source = context.createMediaElementSource(audio);

    const analyser = context.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.82;

    const preampNode = context.createGain();
    preampNode.gain.value = 1.0;

    const bassFilter = context.createBiquadFilter();
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 80;
    bassFilter.gain.value = 0;

    const filters: BiquadFilterNode[] = EQ_BANDS.map((freq, i) => {
      const filter = context.createBiquadFilter();
      filter.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.15;
      filter.gain.value = 0;
      return filter;
    });

    const clarityFilter = context.createBiquadFilter();
    clarityFilter.type = 'highshelf';
    clarityFilter.frequency.value = 10000;
    clarityFilter.gain.value = 0;

    // Conectar la cadena de audio
    source.connect(preampNode);
    preampNode.connect(bassFilter);
    bassFilter.connect(filters[0]);
    for (let i = 0; i < filters.length - 1; i++) {
      filters[i].connect(filters[i + 1]);
    }
    filters[filters.length - 1].connect(clarityFilter);
    clarityFilter.connect(analyser);
    analyser.connect(context.destination);

    context.onstatechange = () => {
      if (context.state === 'suspended') {
        if (audio && !audio.paused) {
          context.resume().catch(() => undefined);
        }
      }
    };

    if (typeof document !== 'undefined' && !(window as unknown as { __jodifyAudioBgBound?: boolean }).__jodifyAudioBgBound) {
      (window as unknown as { __jodifyAudioBgBound?: boolean }).__jodifyAudioBgBound = true;
      document.addEventListener('visibilitychange', () => {
        if (chain.context && chain.context.state === 'suspended') {
          const el = document.querySelector('audio#jodify-audio') as HTMLAudioElement | null;
          if (el && !el.paused) {
            chain.context.resume().catch(() => undefined);
          }
        }
      });
      window.addEventListener('blur', () => {
        if (chain.context && chain.context.state === 'suspended') {
          const el = document.querySelector('audio#jodify-audio') as HTMLAudioElement | null;
          if (el && !el.paused) {
            chain.context.resume().catch(() => undefined);
          }
        }
      });
    }

    chain.context = context;
    chain.source = source;
    chain.preampNode = preampNode;
    chain.bassFilter = bassFilter;
    chain.filters = filters;
    chain.clarityFilter = clarityFilter;
    chain.analyser = analyser;
  } catch {
    chain.context = null;
    chain.analyser = null;
  } finally {
    chain.initialized = true;
    applySettings();
  }
}

export const equalizerApi = {
  ensure(): void {
    ensureChain();
  },

  getAnalyser(): AnalyserNode | null {
    ensureChain();
    return chain.analyser;
  },

  isEnabled(): boolean {
    return chain.enabled;
  },

  setEnabled(enabled: boolean): void {
    ensureChain();
    chain.enabled = enabled;
    applySettings();
  },

  setPreamp(db: number): void {
    ensureChain();
    chain.preamp = db;
    applySettings();
  },

  setBassBoost(percent: number): void {
    ensureChain();
    chain.bassBoost = percent;
    applySettings();
  },

  setClarity(percent: number): void {
    ensureChain();
    chain.clarity = percent;
    applySettings();
  },

  setBandGain(index: number, gain: number): void {
    ensureChain();
    chain.bandGains[index] = gain;
    applySettings();
  },

  setBandGains(values: number[]): void {
    ensureChain();
    chain.bandGains = [...values];
    applySettings();
  },

  syncAll(opts: {
    enabled?: boolean;
    bandGains?: number[];
    preamp?: number;
    bassBoost?: number;
    clarity?: number;
  }): void {
    ensureChain();
    if (opts.enabled !== undefined) chain.enabled = opts.enabled;
    if (opts.bandGains !== undefined) chain.bandGains = [...opts.bandGains];
    if (opts.preamp !== undefined) chain.preamp = opts.preamp;
    if (opts.bassBoost !== undefined) chain.bassBoost = opts.bassBoost;
    if (opts.clarity !== undefined) chain.clarity = opts.clarity;
    applySettings();
  },

  reset(): void {
    ensureChain();
    chain.bandGains = Array(EQ_BANDS.length).fill(0);
    chain.bassBoost = 0;
    chain.clarity = 0;
    chain.preamp = 0;
    applySettings();
  },

  resume(): void {
    if (chain.context && chain.context.state === 'suspended') {
      chain.context.resume().catch(() => undefined);
    }
  },
};
