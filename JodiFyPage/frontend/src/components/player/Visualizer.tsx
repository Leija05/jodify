import { useEffect, useRef } from 'react';
import { useVisualizer } from '../../hooks/useVisualizer';

export function Visualizer({ width = 72, height = 28 }: { width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useVisualizer(canvasRef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, [width, height]);

  return <canvas ref={canvasRef} className="jf-visualizer" style={{ width, height }} aria-hidden="true" />;
}
