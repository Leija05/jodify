import { motion } from 'motion/react';

interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string>({ options, value, onChange, size = 'md' }: SegmentedProps<T>) {
  return (
    <div className={`jf-segmented jf-segmented--${size}`} role="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            className={`jf-segmented-btn ${active ? 'is-active' : ''}`}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            data-testid={`segmented-${option.value}`}
          >
            {active && <motion.span layoutId={`segmented-${value}`} className="jf-segmented-thumb" transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} />}
            <span className="jf-segmented-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
