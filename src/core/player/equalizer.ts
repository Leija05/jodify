export interface EqualizerBand {
    id: string;
    frequency: number;
    gain: number;
    q?: number;
    type?: BiquadFilterType;
}

export interface EqualizerPreset {
    name: string;
    gains: Record<string, number>;
}

export interface EqualizerOptions {
    bands?: EqualizerBand[];
    preampGain?: number;
}

const DEFAULT_BANDS: EqualizerBand[] = [
    { id: '32', frequency: 32, gain: 0 },
    { id: '64', frequency: 64, gain: 0 },
    { id: '125', frequency: 125, gain: 0 },
    { id: '250', frequency: 250, gain: 0 },
    { id: '500', frequency: 500, gain: 0 },
    { id: '1k', frequency: 1000, gain: 0 },
    { id: '2k', frequency: 2000, gain: 0 },
    { id: '4k', frequency: 4000, gain: 0 },
    { id: '8k', frequency: 8000, gain: 0 },
    { id: '16k', frequency: 16000, gain: 0 }
];

const clampGain = (gain: number): number => Math.min(12, Math.max(-12, gain));

export class EqualizerEngine {
    readonly context: AudioContext;
    readonly input: GainNode;
    readonly output: GainNode;

    private preamp: GainNode;
    private filters: Map<string, BiquadFilterNode>;

    constructor(context: AudioContext, options: EqualizerOptions = {}) {
        this.context = context;
        this.input = context.createGain();
        this.output = context.createGain();
        this.preamp = context.createGain();
        this.filters = new Map();

        const bands = options.bands ?? DEFAULT_BANDS;
        this.preamp.gain.value = this.toLinearGain(options.preampGain ?? 0);

        this.input.connect(this.preamp);
        let previousNode: AudioNode = this.preamp;

        for (const band of bands) {
            const filter = context.createBiquadFilter();
            filter.type = band.type ?? 'peaking';
            filter.frequency.value = band.frequency;
            filter.gain.value = clampGain(band.gain);
            filter.Q.value = band.q ?? 1;
            previousNode.connect(filter);
            previousNode = filter;
            this.filters.set(band.id, filter);
        }

        previousNode.connect(this.output);
    }

    connect(destination: AudioNode): void {
        this.output.connect(destination);
    }

    disconnect(): void {
        this.output.disconnect();
    }

    setBandGain(bandId: string, gain: number): void {
        const filter = this.filters.get(bandId);
        if (!filter) return;
        filter.gain.value = clampGain(gain);
    }

    setPreset(preset: EqualizerPreset): void {
        for (const [bandId, gain] of Object.entries(preset.gains)) {
            this.setBandGain(bandId, gain);
        }
    }

    setPreampGain(gainDb: number): void {
        this.preamp.gain.value = this.toLinearGain(gainDb);
    }

    getBandGains(): Record<string, number> {
        const result: Record<string, number> = {};
        for (const [bandId, filter] of this.filters.entries()) {
            result[bandId] = filter.gain.value;
        }
        return result;
    }

    private toLinearGain(db: number): number {
        return Math.pow(10, db / 20);
    }
}

export const equalizerPresets: Record<string, EqualizerPreset> = {
    flat: {
        name: 'Flat',
        gains: {}
    },
    bassBoost: {
        name: 'Bass Boost',
        gains: {
            '32': 6,
            '64': 5,
            '125': 3,
            '250': 1,
            '500': 0,
            '1k': -1,
            '2k': -2,
            '4k': -1,
            '8k': 1,
            '16k': 2
        }
    },
    vocalBoost: {
        name: 'Vocal Boost',
        gains: {
            '32': -2,
            '64': -1,
            '125': 0,
            '250': 2,
            '500': 3,
            '1k': 4,
            '2k': 3,
            '4k': 1,
            '8k': -1,
            '16k': -2
        }
    },
    electronic: {
        name: 'Electronic',
        gains: {
            '32': 4,
            '64': 3,
            '125': 1,
            '250': -1,
            '500': -2,
            '1k': 0,
            '2k': 2,
            '4k': 3,
            '8k': 4,
            '16k': 3
        }
    }
};

export const createMediaElementEqualizer = (
    context: AudioContext,
    mediaElement: HTMLMediaElement,
    options?: EqualizerOptions
): EqualizerEngine => {
    const source = context.createMediaElementSource(mediaElement);
    const engine = new EqualizerEngine(context, options);
    source.connect(engine.input);
    engine.connect(context.destination);
    return engine;
};
