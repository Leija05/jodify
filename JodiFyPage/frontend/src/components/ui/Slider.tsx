import type { InputHTMLAttributes } from 'react';
import { useState } from 'react';

interface SliderProps extends InputHTMLAttributes<HTMLInputElement> {
  vertical?: boolean;
  fill?: boolean;
  'data-testid'?: string;
}

export function Slider({
  vertical = false,
  fill = true,
  className = '',
  style,
  'data-testid': testId,
  ...rest
}: SliderProps) {
  const [dragging, setDragging] = useState(false);

  const min = typeof rest.min === 'number' && Number.isFinite(rest.min) ? rest.min : Number(rest.min) || 0;
  const rawMax = typeof rest.max === 'number' && Number.isFinite(rest.max) ? rest.max : Number(rest.max);
  const max = Number.isFinite(rawMax) && rawMax > min ? rawMax : min + 100;
  const rawVal = typeof rest.value === 'number' && Number.isFinite(rest.value) ? rest.value : Number(rest.value);
  const val = Number.isFinite(rawVal) ? Math.max(min, Math.min(max, rawVal)) : min;
  const pct = max > min ? Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100)) : 0;

  const mergedStyle = {
    '--fill-pct': `${pct}%`,
    ...style,
  } as React.CSSProperties;

  return (
    <input
      type="range"
      className={`jf-slider ${vertical ? 'jf-slider--v' : ''} ${fill ? 'jf-slider--fill' : ''} ${dragging ? 'is-dragging' : ''} ${className}`}
      data-testid={testId}
      style={mergedStyle}
      onPointerDown={() => setDragging(true)}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setDragging(false)}
      {...rest}
    />
  );
}
