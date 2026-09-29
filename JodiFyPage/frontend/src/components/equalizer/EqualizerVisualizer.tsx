import { useEffect, useRef, useState, useCallback } from 'react';
import { EQ_BANDS } from '../../lib/constants';
import { equalizerApi } from '../../services/equalizer.service';
import { usePlayerStore } from '../../store/player.store';

interface EqualizerVisualizerProps {
  values: number[];
  enabled: boolean;
  preamp: number;
  bassBoost: number;
  clarity: number;
  onBandSelect?: (index: number) => void;
  onBandChange?: (index: number, gain: number) => void;
}

const BAND_NAMES = ['Sub', 'Bajo', 'Calidez', 'Cuerpo', 'Medios', 'Presencia', 'Definición', 'Brillo', 'Detalle', 'Aire'];

export function EqualizerVisualizer({
  values,
  enabled,
  preamp,
  bassBoost,
  clarity,
  onBandSelect,
  onBandChange,
}: EqualizerVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const [hoveredBand, setHoveredBand] = useState<number | null>(null);
  const [draggingBand, setDraggingBand] = useState<number | null>(null);

  const isDraggingRef = useRef(false);
  const activeBandRef = useRef<number | null>(null);

  // Calcula la ganancia a partir de la posición Y relativa al canvas
  const calculateGainFromY = useCallback((y: number, height: number): number => {
    const padY = 24;
    const plotH = height - padY * 2;
    const centerY = padY + plotH / 2;
    const normalized = -((y - centerY) / (plotH / 2));
    const rawGain = normalized * 12;
    const clamped = Math.max(-12, Math.min(12, rawGain));
    return Math.round(clamped * 10) / 10;
  }, []);

  // Encuentra la banda más cercana a una posición X
  const findClosestBand = useCallback((x: number, width: number): { index: number; dist: number } => {
    const padX = 36;
    const plotW = width - padX * 2;
    const numBands = EQ_BANDS.length;
    let closest = 0;
    let minDist = Infinity;

    for (let i = 0; i < numBands; i++) {
      const bx = padX + (i / (numBands - 1)) * plotW;
      const dist = Math.abs(x - bx);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    return { index: closest, dist: minDist };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animId: number;
    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(300, Math.floor(rect.width));
      const height = Math.max(140, Math.floor(rect.height));

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const padX = 36;
      const padY = 24;
      const plotW = width - padX * 2;
      const plotH = height - padY * 2;
      const centerY = padY + plotH / 2;

      // 1. Grid de fondo (Decibelios)
      ctx.lineWidth = 1;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      const dBLabels = [
        { db: 12, label: '+12' },
        { db: 6, label: '+6' },
        { db: 0, label: '0' },
        { db: -6, label: '-6' },
        { db: -12, label: '-12' },
      ];

      for (const { db, label } of dBLabels) {
        const y = centerY - (db / 12) * (plotH / 2);
        ctx.beginPath();
        if (db === 0) {
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.32)';
          ctx.setLineDash([4, 4]);
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.setLineDash([]);
        }
        ctx.moveTo(padX, y);
        ctx.lineTo(width - padX, y);
        ctx.stroke();

        ctx.fillStyle = db === 0 ? 'rgba(0, 240, 255, 0.85)' : 'rgba(255, 255, 255, 0.32)';
        ctx.fillText(label, padX - 8, y);
      }
      ctx.setLineDash([]);

      // 2. Espectro de audio FFT en tiempo real
      const analyser = equalizerApi.getAnalyser();
      if (analyser && isPlaying) {
        const binCount = analyser.frequencyBinCount;
        const freqData = new Uint8Array(binCount);
        analyser.getByteFrequencyData(freqData);

        const barCount = 36;
        const barWidth = plotW / barCount;

        for (let b = 0; b < barCount; b++) {
          const binIndex = Math.floor((b / barCount) * (binCount * 0.75));
          const val = freqData[binIndex] || 0;
          const ratio = Math.min(1, val / 255);
          if (ratio > 0.02) {
            const barH = ratio * (plotH * 0.78);
            const bx = padX + b * barWidth;
            const by = height - padY - barH;

            const barGrad = ctx.createLinearGradient(0, by, 0, height - padY);
            barGrad.addColorStop(0, enabled ? 'rgba(0, 240, 255, 0.38)' : 'rgba(255, 255, 255, 0.14)');
            barGrad.addColorStop(1, enabled ? 'rgba(127, 0, 255, 0.04)' : 'rgba(255, 255, 255, 0.02)');

            ctx.fillStyle = barGrad;
            ctx.fillRect(bx + 1, by, Math.max(1, barWidth - 2), barH);
          }
        }
      }

      // 3. Puntos de la curva de respuesta en frecuencia
      const points: { x: number; y: number; gain: number; freq: number }[] = [];
      const numBands = EQ_BANDS.length;

      for (let i = 0; i < numBands; i++) {
        const x = padX + (i / (numBands - 1)) * plotW;
        let gain = enabled ? (values[i] ?? 0) : 0;

        if (enabled) {
          gain += preamp * 0.45;
          if (i <= 1) {
            gain += (bassBoost / 100) * (i === 0 ? 5.5 : 3.0);
          }
          if (i >= 8) {
            gain += (clarity / 100) * (i === 9 ? 4.5 : 2.5);
          }
        }

        const clampedGain = Math.max(-12, Math.min(12, gain));
        const y = centerY - (clampedGain / 12) * (plotH / 2);
        points.push({ x, y, gain: values[i] ?? 0, freq: EQ_BANDS[i] });
      }

      // 4. Relleno suave con gradiente
      if (points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, centerY);
        ctx.lineTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[i];
          const p1 = points[i + 1];
          const mx = (p0.x + p1.x) / 2;
          ctx.bezierCurveTo(mx, p0.y, mx, p1.y, p1.x, p1.y);
        }

        ctx.lineTo(points[points.length - 1].x, centerY);
        ctx.closePath();

        const fillGrad = ctx.createLinearGradient(0, padY, 0, height - padY);
        if (enabled) {
          fillGrad.addColorStop(0, 'rgba(0, 240, 255, 0.28)');
          fillGrad.addColorStop(0.5, 'rgba(127, 0, 255, 0.14)');
          fillGrad.addColorStop(1, 'rgba(255, 0, 128, 0.06)');
        } else {
          fillGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
          fillGrad.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
        }
        ctx.fillStyle = fillGrad;
        ctx.fill();

        // 5. Línea luminosa de la curva
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[i];
          const p1 = points[i + 1];
          const mx = (p0.x + p1.x) / 2;
          ctx.bezierCurveTo(mx, p0.y, mx, p1.y, p1.x, p1.y);
        }

        ctx.lineWidth = 2.5;
        const lineGrad = ctx.createLinearGradient(padX, 0, width - padX, 0);
        if (enabled) {
          lineGrad.addColorStop(0, '#00f0ff');
          lineGrad.addColorStop(0.5, '#a855f7');
          lineGrad.addColorStop(1, '#ff0080');
        } else {
          lineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
          lineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.22)');
        }
        ctx.strokeStyle = lineGrad;
        ctx.stroke();

        // 6. Nodos de frecuencia interactivos
        points.forEach((pt, idx) => {
          const isSelected = draggingBand === idx || (draggingBand === null && hoveredBand === idx);
          const nodeRadius = isSelected ? 7 : 4;

          // Línea guía vertical si el nodo está seleccionado o en arrastre
          if (isSelected) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
            ctx.setLineDash([2, 2]);
            ctx.moveTo(pt.x, centerY);
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Halo exterior
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, nodeRadius + (isSelected ? 4 : 0), 0, Math.PI * 2);
          if (enabled) {
            ctx.fillStyle = pt.gain > 0 ? 'rgba(0, 240, 255, 0.35)' : pt.gain < 0 ? 'rgba(255, 51, 102, 0.35)' : 'rgba(168, 85, 247, 0.35)';
            ctx.fill();
          }

          // Punto central
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, nodeRadius, 0, Math.PI * 2);

          if (enabled) {
            ctx.fillStyle = pt.gain > 0 ? '#00f0ff' : pt.gain < 0 ? '#ff3366' : '#a855f7';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = isSelected ? 16 : 6;
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.shadowBlur = 0;
          }
          ctx.fill();

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isSelected ? 3.5 : 2, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      // 7. Marca de estado si está en BYPASS
      if (!enabled) {
        ctx.save();
        ctx.font = '700 11px "Outfit Variable", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffb800';
        ctx.fillText('BYPASS ACTIVO · SONIDO ORIGINAL (SIN FILTROS)', width / 2, centerY - 28);
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
    };
  }, [values, enabled, preamp, bassBoost, clarity, isPlaying, hoveredBand, draggingBand]);

  // Manejador global de arrastre para no perder el foco si el cursor sale del canvas
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || activeBandRef.current === null || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const newGain = calculateGainFromY(y, rect.height);
      onBandChange?.(activeBandRef.current, newGain);
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        activeBandRef.current = null;
        setDraggingBand(null);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [calculateGainFromY, onBandChange]);

  // Hover y detección de bandas
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const { index, dist } = findClosestBand(x, rect.width);
    setHoveredBand(dist < 28 ? index : null);
  };

  const handleMouseLeave = () => {
    if (!isDraggingRef.current) {
      setHoveredBand(null);
    }
  };

  // Inicio de arrastre con ratón
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { index } = findClosestBand(x, rect.width);

    isDraggingRef.current = true;
    activeBandRef.current = index;
    setDraggingBand(index);
    onBandSelect?.(index);

    const newGain = calculateGainFromY(y, rect.height);
    onBandChange?.(index, newGain);
  };

  // Doble clic para resetear banda a 0 dB
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const { index, dist } = findClosestBand(x, rect.width);
    if (dist < 32) {
      onBandChange?.(index, 0);
      onBandSelect?.(index);
    }
  };

  // Soporte táctil para pantallas táctiles y móviles
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    if (!touch || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const { index } = findClosestBand(x, rect.width);

    isDraggingRef.current = true;
    activeBandRef.current = index;
    setDraggingBand(index);
    onBandSelect?.(index);

    const newGain = calculateGainFromY(y, rect.height);
    onBandChange?.(index, newGain);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || activeBandRef.current === null || !canvasRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const y = touch.clientY - rect.top;
    const newGain = calculateGainFromY(y, rect.height);
    onBandChange?.(activeBandRef.current, newGain);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    activeBandRef.current = null;
    setDraggingBand(null);
  };

  const currentDisplayBand = draggingBand !== null ? draggingBand : hoveredBand;

  return (
    <div className="jf-eq-visualizer-wrap" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className={`jf-eq-canvas ${hoveredBand !== null || draggingBand !== null ? 'is-draggable' : ''}`}
        style={{ cursor: hoveredBand !== null || draggingBand !== null ? 'ns-resize' : 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        title="Haz clic o arrastra sobre la gráfica para modificar los valores de cada frecuencia (doble clic para resetear a 0 dB)"
      />
      {currentDisplayBand !== null && (
        <div
          className="jf-eq-canvas-tooltip"
          style={{
            left: `${36 + (currentDisplayBand / (EQ_BANDS.length - 1)) * (containerRef.current ? containerRef.current.clientWidth - 72 : 100)}px`,
          }}
        >
          <span className="jf-eq-tt-freq">
            {EQ_BANDS[currentDisplayBand] >= 1000
              ? `${EQ_BANDS[currentDisplayBand] / 1000}k`
              : EQ_BANDS[currentDisplayBand]}{' '}
            Hz
          </span>
          <span className="jf-eq-tt-zone">{BAND_NAMES[currentDisplayBand]}</span>
          <span className="jf-eq-tt-gain">
            {values[currentDisplayBand] > 0
              ? `+${values[currentDisplayBand].toFixed(1)}`
              : values[currentDisplayBand].toFixed(1)}{' '}
            dB
          </span>
        </div>
      )}
    </div>
  );
}
