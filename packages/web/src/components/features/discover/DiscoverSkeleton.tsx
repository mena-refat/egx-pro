export function DiscoverSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3.5 w-28 bg-[var(--bg-card-hover)] rounded-full mb-3" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl">
            <div className="w-6 h-6 rounded-full bg-[var(--bg-card-hover)] shrink-0" />
            <div className="w-9 h-9 rounded-full bg-[var(--bg-card-hover)] shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 bg-[var(--bg-card-hover)] rounded-full" />
              <div className="h-2.5 w-36 bg-[var(--bg-card-hover)] rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
