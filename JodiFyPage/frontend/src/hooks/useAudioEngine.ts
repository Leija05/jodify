import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/player.store';
import { useSettingsStore } from '../store/settings.store';
import { useJamStore } from '../store/jam.store';
import { useToastStore } from '../store/toast.store';
import { equalizerApi } from '../services/equalizer.service';
import { obsService } from '../services/obs.service';
import { useEqStore } from '../store/eq.store';
import { ytPlayerService } from '../services/yt-player.service';

export function useAudioEngine(): React.RefObject<HTMLAudioElement | null> {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const getAudio = () => audioRef.current || document.querySelector<HTMLAudioElement>('audio#jodify-audio');
    let boundAudio: HTMLAudioElement | null = null;

    const onPlay = () => {
      usePlayerStore.getState().setIsPlaying(true);
      equalizerApi.resume();
      const eq = useEqStore.getState();
      equalizerApi.syncAll({
        enabled: eq.enabled,
        bandGains: eq.values,
        preamp: eq.preamp,
        bassBoost: eq.bassBoost,
        clarity: eq.clarity,
      });
      const { broadcastPlaybackChange } = useJamStore.getState();
      broadcastPlaybackChange('play');
      syncNowPlaying(usePlayerStore.getState().currentSong, true);
      lastPlaybackTick = Date.now();
    };

    const onPause = () => {
      usePlayerStore.getState().setIsPlaying(false);
      useJamStore.getState().broadcastPlaybackChange('pause');
      syncNowPlaying(usePlayerStore.getState().currentSong, false);
      tickListeningTime();
    };

    const onTimeUpdate = () => {
      const el = boundAudio || getAudio();
      if (el && Number.isFinite(el.currentTime)) {
        usePlayerStore.getState().setCurrentTime(el.currentTime);
      }
      obsService.persist();
      tickListeningTime();
    };

    const onLoadedMetadata = () => {
      const el = boundAudio || getAudio();
      if (el && Number.isFinite(el.duration) && el.duration > 0) {
        usePlayerStore.getState().setDuration(el.duration);
      }
    };

    const onEnded = () => {
      const el = boundAudio || getAudio();
      const { repeatMode, isLoop, next } = usePlayerStore.getState();
      const jam = useJamStore.getState();
      if (jam.active && !jam.isHost) return;
      if (repeatMode === 'one' || isLoop) {
        if (el) {
          el.currentTime = 0;
          void el.play().catch(() => undefined);
        }
        return;
      }
      void next();
    };

    let lastErrorSkip = 0;
    const onError = () => {
      const el = boundAudio || getAudio();
      if (!el || !el.src || el.src === window.location.href || !el.getAttribute('src')) return;
      // Si el reproductor integrado de YouTube está activo o cargando, no saltar la canción
      if (ytPlayerService.isPlayingVideo()) return;

      const now = Date.now();
      if (now - lastErrorSkip < 1800) return;
      lastErrorSkip = now;

      usePlayerStore.getState().setLastError('Error de reproducción');
      useToastStore.getState().show('Error reproduciendo la canción, saltando…', 'warning');
      const { next } = usePlayerStore.getState();
      setTimeout(() => void next(), 800);
    };

    const bind = (el: HTMLAudioElement) => {
      if (boundAudio === el) return;
      if (boundAudio) {
        unbind(boundAudio);
      }
      boundAudio = el;
      el.addEventListener('play', onPlay);
      el.addEventListener('playing', onPlay);
      el.addEventListener('pause', onPause);
      el.addEventListener('timeupdate', onTimeUpdate);
      el.addEventListener('loadedmetadata', onLoadedMetadata);
      el.addEventListener('durationchange', onLoadedMetadata);
      el.addEventListener('canplay', onLoadedMetadata);
      el.addEventListener('ended', onEnded);
      el.addEventListener('error', onError);

      const { volume, muted } = usePlayerStore.getState();
      el.volume = volume;
      el.muted = muted;
    };

    const unbind = (el: HTMLAudioElement) => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('playing', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('durationchange', onLoadedMetadata);
      el.removeEventListener('canplay', onLoadedMetadata);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('error', onError);
    };

    const initialEl = getAudio();
    if (initialEl) {
      bind(initialEl);
    }

    // Intervalo de precisión (100ms) para garantizar que la barra de reproducción
    // avance en tiempo real a 10 cuadros por segundo sin depender únicamente del evento timeupdate
    const interval = window.setInterval(() => {
      const el = getAudio();
      if (!el) return;
      if (boundAudio !== el) {
        bind(el);
      }
      if (!el.paused && Number.isFinite(el.currentTime)) {
        usePlayerStore.getState().setCurrentTime(el.currentTime);
        if (Number.isFinite(el.duration) && el.duration > 0) {
          const storeDur = usePlayerStore.getState().duration;
          if (Math.abs(storeDur - el.duration) > 0.5) {
            usePlayerStore.getState().setDuration(el.duration);
          }
        }
      }
    }, 100);

    return () => {
      window.clearInterval(interval);
      if (boundAudio) {
        unbind(boundAudio);
        boundAudio = null;
      }
    };
  }, []);

  return audioRef;
}

export function useVolumeBinding(): void {
  useEffect(() => {
    const unsub = usePlayerStore.subscribe((state, prev) => {
      const audio = audioElement();
      if (!audio) return;
      if (state.volume !== prev.volume) audio.volume = state.volume;
      if (state.muted !== prev.muted) audio.muted = state.muted;
    });
    return unsub;
  }, []);
}

export function useEqBinding(): void {
  useEffect(() => {
    const applyCurrentEq = () => {
      const eq = useEqStore.getState();
      equalizerApi.syncAll({
        enabled: eq.enabled,
        bandGains: eq.values,
        preamp: eq.preamp,
        bassBoost: eq.bassBoost,
        clarity: eq.clarity,
      });
    };

    applyCurrentEq();

    const unsub = useEqStore.subscribe(() => {
      applyCurrentEq();
    });

    return unsub;
  }, []);
}

function audioElement(): HTMLAudioElement | null {
  return document.querySelector('audio#jodify-audio');
}

let lastNowPlayingSync = 0;
let lastPlaybackTick = Date.now();
let listeningBuffer = 0;

function tickListeningTime(): void {
  const now = Date.now();
  const delta = Math.floor((now - lastPlaybackTick) / 1000);
  if (delta >= 1 && delta <= 5) {
    listeningBuffer += delta;
  }
  lastPlaybackTick = now;
  if (listeningBuffer >= 15) {
    const toSend = listeningBuffer;
    listeningBuffer = 0;
    const username = localStorage.getItem('currentUserName');
    if (username) {
      import('../services/users.service').then(({ recordListeningTime }) => {
        recordListeningTime(username, toSend).catch(() => undefined);
      });
    }
  }
}

function syncNowPlaying(song: { id: number | string; name: string } | null, playing: boolean): void {
  const username = localStorage.getItem('currentUserName');
  if (!username) return;
  const now = Date.now();
  if (now - lastNowPlayingSync < 1500) return;
  lastNowPlayingSync = now;
  import('../services/users.service').then(({ usersService }) => {
    usersService
      .updateNowPlaying(username, playing && song ? song.id : null, playing && song ? song.name : null)
      .catch(() => undefined);
  });
}

export function useSettingsBinding(): void {
  const focusMode = useSettingsStore((s) => s.focusMode);
  const disableVisualizer = useSettingsStore((s) => s.disableVisualizer);
  const disableDynamicBg = useSettingsStore((s) => s.disableDynamicBg);
  const performanceMode = useSettingsStore((s) => s.performanceMode);
  const reduceBlur = useSettingsStore((s) => s.reduceBlur);
  const reduceAnimations = useSettingsStore((s) => s.reduceAnimations);
  const fadeEnabled = useSettingsStore((s) => s.fadeEnabled);
  const fadeDuration = useSettingsStore((s) => s.fadeDuration);

  useEffect(() => {
    document.body.classList.toggle('focus-mode', focusMode);
    document.body.classList.toggle('no-visual', disableVisualizer);
    document.body.classList.toggle('no-dynamic-bg', disableDynamicBg);
    document.body.classList.toggle('jf-performance-mode', performanceMode);
    document.body.classList.toggle('jf-reduce-blur', reduceBlur || performanceMode);
    document.body.classList.toggle('jf-reduce-animations', reduceAnimations || performanceMode);
  }, [focusMode, disableVisualizer, disableDynamicBg, performanceMode, reduceBlur, reduceAnimations]);

  useEffect(() => {
    localStorage.setItem('fadeEnabled', String(fadeEnabled));
    localStorage.setItem('fadeDuration', String(fadeDuration));
  }, [fadeEnabled, fadeDuration]);
}
