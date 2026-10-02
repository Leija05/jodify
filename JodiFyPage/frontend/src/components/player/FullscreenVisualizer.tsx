import { useEffect, useRef } from 'react';
import { equalizerApi } from '../../services/equalizer.service';
import { useSettingsStore } from '../../store/settings.store';
import { usePlayerStore } from '../../store/player.store';

interface FullscreenVisualizerProps {
  mode?: 'bars' | 'wave';
  className?: string;
}

export function FullscreenVisualizer({ mode = 'bars', className }: FullscreenVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const performanceMode = useSettingsStore((s) => s.performanceMode);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    let rafId: number | null = null;
    let phase = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(rect.width * dpr, 300);
      canvas.height = Math.max(rect.height * dpr, 100);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      if (!running) return;
      phase += 0.04;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const analyser = equalizerApi.getAnalyser();
      const isMutedOrPaused = !isPlaying || useSettingsStore.getState().disableVisualizer;

      let dataArray: Uint8Array;
      if (analyser && !isMutedOrPaused) {
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Subtle ambient harmonic wave when paused/no analyser
        const count = 32;
        dataArray = new Uint8Array(count);
        for (let i = 0; i < count; i++) {
          dataArray[i] = isPlaying ? Math.floor(25 + Math.sin(phase + i * 0.4) * 20) : 6;
        }
      }

      const bars = Math.min(36, dataArray.length);
      const barTotalWidth = width / bars;
      const barWidth = Math.max(4, barTotalWidth * 0.58);
      const gap = barTotalWidth - barWidth;

      const grad = ctx.createLinearGradient(0, height, 0, 0);
      grad.addColorStop(0, 'rgba(127, 0, 255, 0.2)');
      grad.addColorStop(0.3, '#7f00ff');
      grad.addColorStop(0.7, '#00f0ff');
      grad.addColorStop(1, '#ff007a');

      // Draw reflection / glow base (evitar shadowBlur en modo rendimiento)
      if (!performanceMode) {
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(0, 240, 255, 0.45)';
      } else {
        ctx.shadowBlur = 0;
      }

      for (let i = 0; i < bars; i++) {
        const val = dataArray[i] ?? 0;
        const ratio = Math.min(1, val / 235);
        const barHeight = Math.max(6, ratio * (height * 0.88));
        const x = i * barTotalWidth + gap / 2;
        const y = height - barHeight;

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barWidth, barHeight, [barWidth / 2, barWidth / 2, 2, 2]);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();

        // Top illuminated cap
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + barWidth / 2, Math.max(4, y + 2), barWidth / 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;

      // Si la música está pausada, no ciclar a 60fps innecesariamente
      if (!isPlaying) {
        return;
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [isPlaying, mode, performanceMode]);

  return <canvas ref={canvasRef} className={`jf-fullscreen-canvas ${className ?? ''}`} aria-hidden="true" />;
}
