import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/player.store';
import { useSettingsStore } from '../store/settings.store';
import { useJamStore } from '../store/jam.store';
import { useToastStore } from '../store/toast.store';
import { equalizerApi } from '../services/equalizer.service';
import { obsService } from '../services/obs.service';
import { useEqStore } from '../store/eq.store';

export function useAudioEngine(): React.RefObject<HTMLAudioElement | null> {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      usePlayerStore.getState().setIsPlaying(true);
      equalizerApi.resume();
      const { broadcastPlaybackChange } = useJamStore.getState();
      broadcastPlaybackChange('play');
    };
    const onPause = () => {
      usePlayerStore.getState().setIsPlaying(false);
      useJamStore.getState().broadcastPlaybackChange('pause');
    };
    const onTimeUpdate = () => {
      usePlayerStore.getState().setCurrentTime(audio.currentTime);
      obsService.persist();
    };
    const onLoadedMetadata = () => {
      usePlayerStore.getState().setDuration(audio.duration);
    };
    const onEnded = () => {
      const { isLoop, next } = usePlayerStore.getState();
      const jam = useJamStore.getState();
      if (jam.active && !jam.isHost) return;
      if (isLoop) {
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
        return;
      }
      void next();
    };
    const onError = () => {
      usePlayerStore.getState().setLastError('Error de reproducción');
      useToastStore.getState().show('Error reproduciendo la canción, saltando…', 'warning');
      const { next } = usePlayerStore.getState();
      setTimeout(() => void next(), 600);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    const { volume, muted } = usePlayerStore.getState();
    audio.volume = volume;
    audio.muted = muted;

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  return audioRef;
}

export function useVolumeBinding(): void {
  useEffect(() => {
    const audio = audioElement();
    if (!audio) return;
    const unsub = usePlayerStore.subscribe((state, prev) => {
      if (state.volume !== prev.volume) audio.volume = state.volume;
      if (state.muted !== prev.muted) audio.muted = state.muted;
    });
    return unsub;
  }, []);
}

export function useEqBinding(): void {
  useEffect(() => {
    const values = useEqStore.getState().values;
    equalizerApi.setBandGains(values);
  }, []);
}

function audioElement(): HTMLAudioElement | null {
  return document.querySelector('audio#jodify-audio');
}

export function useSettingsBinding(): void {
  const focusMode = useSettingsStore((s) => s.focusMode);
  const disableVisualizer = useSettingsStore((s) => s.disableVisualizer);
  const disableDynamicBg = useSettingsStore((s) => s.disableDynamicBg);
  const fadeEnabled = useSettingsStore((s) => s.fadeEnabled);
  const fadeDuration = useSettingsStore((s) => s.fadeDuration);

  useEffect(() => {
    document.body.classList.toggle('focus-mode', focusMode);
    document.body.classList.toggle('no-visual', disableVisualizer);
    document.body.classList.toggle('no-dynamic-bg', disableDynamicBg);
  }, [focusMode, disableVisualizer, disableDynamicBg]);

  useEffect(() => {
    localStorage.setItem('fadeEnabled', String(fadeEnabled));
    localStorage.setItem('fadeDuration', String(fadeDuration));
  }, [fadeEnabled, fadeDuration]);
}
