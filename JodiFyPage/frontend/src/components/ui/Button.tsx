import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'glass' | 'ghost' | 'danger' | 'outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
  'data-testid'?: string;
}

export function Button({ variant = 'glass', size = 'md', className = '', children, 'data-testid': testId, ...rest }: ButtonProps) {
  return (
    <button
      className={`jf-btn jf-btn--${variant} jf-btn--${size} ${className}`}
      data-testid={testId}
      {...rest}
    >
      {children}
    </button>
  );
}
