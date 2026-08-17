import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: Icon;
  size?: 'sm' | 'md' | 'lg';
  label: string;
  active?: boolean;
  children?: ReactNode;
  'data-testid'?: string;
}

export function IconButton({ icon: IconComponent, size = 'md', label, active = false, className = '', children, 'data-testid': testId, ...rest }: IconButtonProps) {
  return (
    <button
      className={`jf-icon-btn jf-icon-btn--${size} ${active ? 'is-active' : ''} ${className}`}
      aria-label={label}
      title={label}
      data-testid={testId}
      {...rest}
    >
      <IconComponent weight={active ? 'fill' : 'regular'} />
      {children}
    </button>
  );
}
