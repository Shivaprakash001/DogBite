// Loading placeholders for Suspense boundaries: shaped like the content they replace.

export function FlowSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 pt-4" aria-busy="true" aria-label="Loading">
      <div className="mx-auto size-28 animate-pulse rounded-full bg-latte/70" />
      <div className="h-9 w-3/4 animate-pulse rounded-xl bg-latte/70" />
      <div className="h-5 w-1/2 animate-pulse rounded-lg bg-latte/60" />
      <div className="mt-2 h-16 animate-pulse rounded-2xl bg-latte/60" />
      <div className="h-16 animate-pulse rounded-2xl bg-latte/50" />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="h-14 animate-pulse rounded-2xl bg-latte/60" />
      ))}
    </ul>
  );
}
