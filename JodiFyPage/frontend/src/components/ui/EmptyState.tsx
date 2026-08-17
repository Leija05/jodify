import type { Icon } from '@phosphor-icons/react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: Icon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: IconComponent, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="jf-empty">
      {IconComponent && (
        <div className="jf-empty-icon">
          <IconComponent size={28} />
        </div>
      )}
      <p className="jf-empty-title">{title}</p>
      {description && <p className="jf-empty-desc">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
