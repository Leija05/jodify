import { EQ_BANDS, EQ_MAX, EQ_MIN } from '../lib/constants';
import { clamp } from '../lib/utils';

interface EqChain {
  context: AudioContext | null;
  filters: BiquadFilterNode[];
  source: MediaElementAudioSourceNode | null;
  analyser: AnalyserNode | null;
  initialized: boolean;
}

const chain: EqChain = {
  context: null,
  filters: [],
  source: null,
  analyser: null,
  initialized: false,
};

function ensureChain(): void {
  if (chain.initialized) return;
  const audio = document.querySelector('audio#jodify-audio') as HTMLAudioElement | null;
  if (!audio) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new Ctx();
    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.82;

    const filters: BiquadFilterNode[] = EQ_BANDS.map((freq, i) => {
      const filter = context.createBiquadFilter();
      filter.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1;
      filter.gain.value = 0;
      return filter;
    });

    source.connect(filters[0]);
    for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
    filters[filters.length - 1].connect(analyser);
    analyser.connect(context.destination);

    chain.context = context;
    chain.source = source;
    chain.analyser = analyser;
    chain.filters = filters;
  } catch {
    chain.context = null;
    chain.analyser = null;
  } finally {
    chain.initialized = true;
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

  setBandGain(index: number, gain: number): void {
    ensureChain();
    const filter = chain.filters[index];
    if (filter) filter.gain.value = clamp(gain, EQ_MIN, EQ_MAX);
  },

  setBandGains(values: number[]): void {
    ensureChain();
    values.forEach((gain, i) => this.setBandGain(i, gain));
  },

  resume(): void {
    if (chain.context && chain.context.state === 'suspended') {
      chain.context.resume().catch(() => undefined);
    }
  },
};
