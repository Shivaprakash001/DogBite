// Loading placeholders for Suspense boundaries: shaped like the content they replace.

export function FlowSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 pt-4" aria-busy="true" aria-label="Loading">
      <div className="bg-latte/70 mx-auto size-28 animate-pulse rounded-full" />
      <div className="bg-latte/70 h-9 w-3/4 animate-pulse rounded-xl" />
      <div className="bg-latte/60 h-5 w-1/2 animate-pulse rounded-lg" />
      <div className="bg-latte/60 mt-2 h-16 animate-pulse rounded-2xl" />
      <div className="bg-latte/50 h-16 animate-pulse rounded-2xl" />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="bg-latte/60 h-14 animate-pulse rounded-2xl" />
      ))}
    </ul>
  );
}
