export function UserListSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-card-hover)] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 bg-[var(--bg-card-hover)] rounded-full" />
            <div className="h-2.5 w-20 bg-[var(--bg-card-hover)] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
