import { useMemo, useState } from 'react';
import { CheckCircle, Copy } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

export const nf = new Intl.NumberFormat('es-AR');

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}

export function timeAgo(iso: string | undefined | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

export function Sparkline({ data }: { data: Array<{ date: string; count: number }> }) {
  const width = 280;
  const height = 64;
  const points = useMemo(() => {
    if (data.length === 0) return { line: '', area: '' };
    const max = Math.max(1, ...data.map((d) => d.count));
    const step = width / Math.max(1, data.length - 1);
    const coords = data.map((d, i) => [i * step, height - 6 - (d.count / max) * (height - 14)] as const);
    const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { line, area };
  }, [data]);

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const peak = Math.max(0, ...data.map((d) => d.count));
  const last = data[data.length - 1]?.count ?? 0;

  return (
    <div className="jf-dev-spark">
      <div className="jf-dev-spark-copy">
        <div>
          <strong className="jf-dev-spark-total">{nf.format(total)}</strong>
          <span className="jf-dev-spark-label">reproducciones · {data.length} días</span>
        </div>
        <div className="jf-dev-spark-peak">
          <span>hoy {nf.format(last)}</span>
          <span>pico {nf.format(peak)}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="jf-spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(var(--primary-rgb), 0.45)" />
            <stop offset="100%" stopColor="rgba(var(--primary-rgb), 0)" />
          </linearGradient>
        </defs>
        {points.area && <path d={points.area} fill="url(#jf-spark-fill)" />}
        {points.line && (
          <path
            d={points.line}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}

export function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: Icon;
  label: string;
  value: number | string;
  tone?: 'live' | 'warn';
}) {
  return (
    <div className={`jf-dev-stat ${tone === 'live' ? 'is-live' : ''} ${tone === 'warn' ? 'is-warn' : ''}`}>
      <span className="jf-dev-stat-icon">
        <Icon size={16} />
      </span>
      <div className="jf-dev-stat-body">
        <strong>{typeof value === 'number' ? nf.format(value) : value}</strong>
        <span>{label}</span>
      </div>
      {tone === 'live' && <span className="jf-pulse-dot" title="En vivo" />}
    </div>
  );
}

export function CopyableToken({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard no disponible */
    }
  };
  return (
    <span
      className={`jf-dev-token-copy ${copied ? 'is-just-copied' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => void copy()}
      onKeyDown={(e) => e.key === 'Enter' && void copy()}
      title="Copiar código"
    >
      <span className="jf-dev-token-mono">{token}</span>
      <CheckCircle size={14} weight="fill" className="is-copied" />
      <Copy size={14} className="is-idle" />
    </span>
  );
}

export function SkeletonRows({ rows }: { rows: number }) {
  return (
    <div className="jf-dev-skeleton">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="jf-dev-skeleton-row jf-skeleton" />
      ))}
    </div>
  );
}
