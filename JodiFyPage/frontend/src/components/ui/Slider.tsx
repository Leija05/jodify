import type { InputHTMLAttributes } from 'react';
import { useState } from 'react';

interface SliderProps extends InputHTMLAttributes<HTMLInputElement> {
  vertical?: boolean;
  fill?: boolean;
  'data-testid'?: string;
}

export function Slider({ vertical = false, fill = false, className = '', style, 'data-testid': testId, ...rest }: SliderProps) {
  const [dragging, setDragging] = useState(false);

  return (
    <input
      type="range"
      className={`jf-slider ${vertical ? 'jf-slider--v' : ''} ${fill ? 'jf-slider--fill' : ''} ${dragging ? 'is-dragging' : ''} ${className}`}
      data-testid={testId}
      style={style}
      onPointerDown={() => setDragging(true)}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setDragging(false)}
      {...rest}
    />
  );
}
