import { useEffect, useRef } from 'react';
import { equalizerApi } from '../services/equalizer.service';
import { useSettingsStore } from '../store/settings.store';

export function useVisualizer(canvasRef: React.RefObject<HTMLCanvasElement | null>): void {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const draw = () => {
      if (!running) return;
      const analyser = equalizerApi.getAnalyser();
      if (!analyser || useSettingsStore.getState().disableVisualizer) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      const bars = 24;
      const step = Math.floor(bufferLength / bars);
      const barWidth = width / bars;
      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, height, width, 0);
      gradient.addColorStop(0, '#7f00ff');
      gradient.addColorStop(0.5, '#00f0ff');
      gradient.addColorStop(1, '#ff0080');

      for (let i = 0; i < bars; i++) {
        const value = dataArray[Math.floor(i * step)];
        const ratio = value / 255;
        const barHeight = Math.max(2, ratio * height * 0.92);
        const x = i * barWidth + barWidth * 0.18;
        const w = barWidth * 0.64;
        const y = height - barHeight;

        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.35 + ratio * 0.65;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, barHeight, 2);
        } else {
          ctx.rect(x, y, w, barHeight);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [canvasRef]);
}
