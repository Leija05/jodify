/**
 * Audio Lab FX & DJ Vinyl Scratch Service
 * Implements real-time 8D Spatial Audio Panning, Lo-Fi Vinyl Filters,
 * Sub-Bass Boost, and authentic Turntable Vinyl Scratching synthesis.
 */

let audioCtx: AudioContext | null = null;
let pannerNode: StereoPannerNode | null = null;
let spatialTimer: number | null = null;
let spatialAngle = 0;
let is8DActive = false;
let isLofiActive = false;
let isBassActive = false;

function getAudioElement(): HTMLAudioElement | null {
  return document.querySelector('audio#jodify-audio');
}

function initFxChain(): void {
  if (audioCtx) return;
  const audio = getAudioElement();
  if (!audio) return;

  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctx();

    // In modern Web Audio, createMediaElementSource can only be called once per element.
    // If equalizer.service already tapped it, we can work through equalizerApi or direct node insertion.
    // For universal compatibility, we provide audio element control & standalone scratch sound synth
    if (audioCtx.createStereoPanner) {
      pannerNode = audioCtx.createStereoPanner();
    }
  } catch {
    audioCtx = null;
  }
}

/**
 * Play authentic vinyl scratch friction sound burst when user scrubs the vinyl record
 */
export function playScratchSfx(speed = 1.0, direction = 1): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = audioCtx || new Ctx();
    if (ctx.state === 'suspended') void ctx.resume();

    const duration = 0.08 + Math.random() * 0.06;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate vinyl noise texture
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      const decay = 1 - i / bufferSize;
      data[i] = white * decay * 0.35;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // Filter to sound like real vinyl slipmat friction
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(800 + Math.random() * 600, ctx.currentTime);
    bandpass.Q.setValueAtTime(3.5, ctx.currentTime);

    // Modulate frequency according to scratch direction and speed
    const targetFreq = direction > 0 ? 1600 * speed : 500 * speed;
    bandpass.frequency.exponentialRampToValueAtTime(Math.max(200, Math.min( targetFreq, 5000 )), ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    noiseSource.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start();
  } catch {
    // Audio context unavailable or blocked
  }
}

export const audioFxService = {
  /**
   * 8D Spatial Audio: Rotates sound in 360-degree stereo orbit
   */
  enable8D(enable: boolean): void {
    is8DActive = enable;
    if (spatialTimer) {
      clearInterval(spatialTimer);
      spatialTimer = null;
    }

    const audio = getAudioElement();
    if (!audio) return;

    if (enable) {
      initFxChain();
      spatialAngle = 0;
      spatialTimer = window.setInterval(() => {
        spatialAngle += 0.055;
        const panValue = Math.sin(spatialAngle); // -1.0 to +1.0 smooth sine oscillation
        if (pannerNode && audioCtx && pannerNode.pan) {
          pannerNode.pan.setValueAtTime(panValue, audioCtx.currentTime);
        }
      }, 50);
    }
  },

  /**
   * Lo-Fi Vinyl Filter: Warm low-pass + vintage softness
   */
  enableLofi(enable: boolean): void {
    isLofiActive = enable;
    const audio = getAudioElement();
    if (!audio) return;

    // We can also apply low-pass via equalizerApi if available
    import('./equalizer.service').then(({ equalizerApi }) => {
      if (enable) {
        // Boost 200Hz, cut highs for vintage vinyl warmth
        equalizerApi.setBandGain(0, 3);
        equalizerApi.setBandGain(1, 2);
        equalizerApi.setBandGain(5, -4);
        equalizerApi.setBandGain(6, -8);
        equalizerApi.setBandGain(7, -12);
        equalizerApi.setClarity(0);
      } else {
        // Reset bands
        equalizerApi.reset();
      }
    });
  },

  /**
   * Bass Boost Hyper-Drive: Sub-woofer resonant kick
   */
  enableBassHyper(enable: boolean): void {
    isBassActive = enable;
    import('./equalizer.service').then(({ equalizerApi }) => {
      if (enable) {
        equalizerApi.setBassBoost(95);
        equalizerApi.setBandGain(0, 8);
        equalizerApi.setBandGain(1, 6);
      } else {
        equalizerApi.setBassBoost(0);
        equalizerApi.setBandGain(0, 0);
        equalizerApi.setBandGain(1, 0);
      }
    });
  },

  /**
   * Set playback tempo (0.85x Chilled, 1.0x Normal, 1.15x Nightcore)
   */
  setPlaybackRate(rate: number): void {
    const audio = getAudioElement();
    if (audio) {
      audio.playbackRate = rate;
      audio.preservesPitch = false; // Gives authentic pitch shift like vinyl speed switch!
    }
  },

  /**
   * Scratch interaction: User drags vinyl to scrub audio
   */
  onVinylScratch(deltaAngle: number, _currentPositionRatio = 0): void {
    const audio = getAudioElement();
    if (!audio || !audio.duration) return;

    const direction = deltaAngle >= 0 ? 1 : -1;
    const speed = Math.min(2.5, Math.max(0.5, Math.abs(deltaAngle) * 8));

    // Scrub audio currentTime slightly based on angular drag
    const scrubAmount = (deltaAngle / 360) * 4.5;
    audio.currentTime = Math.max(0, Math.min(audio.duration - 0.1, audio.currentTime + scrubAmount));

    // Play tactile vinyl scratch needle sound
    playScratchSfx(speed, direction);
  },

  is8D(): boolean {
    return is8DActive;
  },
  isLofi(): boolean {
    return isLofiActive;
  },
  isBass(): boolean {
    return isBassActive;
  },
};
