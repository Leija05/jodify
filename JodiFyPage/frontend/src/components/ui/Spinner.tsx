import { CircleNotch } from '@phosphor-icons/react';

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span className="jf-spinner" role="status" aria-label="Cargando">
      <CircleNotch size={size} weight="bold" />
    </span>
  );
}
