// Horizontal bars for aggregated shares. The percentage is always printed, so the
// bar length is never the only carrier of the value.

export interface Bar {
  key: string;
  label: string;
  emoji: string;
  pct: number;
}

export function ShareBars({ bars, max = 5 }: { bars: Bar[]; max?: number }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {bars.slice(0, max).map((b, i) => (
        <li key={b.key} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-1.5 font-semibold">
              <span aria-hidden>{b.emoji}</span>
              <span className="truncate">{b.label}</span>
            </span>
            <span className="font-display font-extrabold tabular-nums">{b.pct}%</span>
          </div>
          <div className="bg-sand h-2.5 overflow-hidden rounded-full" aria-hidden>
            <div className={`h-full rounded-full ${i === 0 ? 'bg-terracotta' : 'bg-dusty'}`} style={{ width: `${Math.max(4, b.pct)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
