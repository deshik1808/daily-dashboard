// components/design/Skeleton.tsx

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-shimmer rounded-control ${className}`}
    />
  );
}

export function SkeletonWindow({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-window border border-ink/85 bg-paper">
      <div className="flex items-center gap-2 border-b border-ink/85 bg-mist px-2.5 py-1.5 font-mono text-xs font-bold tracking-wide">
        <span className="flex gap-1" aria-hidden>
          <span className="h-[7px] w-[7px] rounded-full bg-accent" />
          <span className="h-[7px] w-[7px] rounded-full bg-sage" />
        </span>
        {title ? (
          <span>{title}</span>
        ) : (
          <Skeleton className="h-3.5 w-32" />
        )}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

export function SkeletonStatGrid() {
  return (
    <div className="grid grid-cols-2 gap-x-3.5 gap-y-2.5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-1 h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="w-full font-mono text-xs">
      <div className="flex justify-between border-b border-ink pb-1.5 text-[10px] text-muted">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="space-y-2 pt-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-sage/70 py-1.5 last:border-b-0"
          >
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-3.5 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonEntries() {
  return (
    <div className="space-y-2.5">
      <div className="flex gap-1.5">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="space-y-1.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-sage/70 py-2 last:border-b-0"
          >
            <div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-1 h-3 w-12" />
            </div>
            <div className="flex items-center gap-2">
              <div className="space-y-1 text-right">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <SkeletonWindow>
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-20" />
      </div>
    </SkeletonWindow>
  );
}
