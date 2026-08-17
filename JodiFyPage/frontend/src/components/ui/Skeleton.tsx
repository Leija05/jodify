export function Skeleton({ width = '100%', height = 16, radius = 8 }: { width?: string | number; height?: number; radius?: number }) {
  return <div className="jf-skeleton" style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

export function SongListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="jf-skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div className="jf-skeleton-row" key={i}>
          <Skeleton width={48} height={48} radius={10} />
          <div style={{ flex: 1 }}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="40%" height={11} radius={6} />
          </div>
          <Skeleton width={64} height={28} radius={14} />
        </div>
      ))}
    </div>
  );
}
