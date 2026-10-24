// 10 numbered pills. States pair colour with a symbol so they read without colour.

export type PillState = 'upcoming' | 'current' | 'correct' | 'wrong' | 'done';

const styles: Record<PillState, string> = {
  upcoming: 'bg-paper text-ink-soft ring-1 ring-line',
  current: 'bg-terracotta text-white ring-2 ring-terracotta-deep scale-110',
  correct: 'bg-correct text-white',
  wrong: 'bg-wrong text-white',
  done: 'bg-dusty text-white',
};

const labels: Record<PillState, string> = {
  upcoming: 'not answered yet',
  current: 'current question',
  correct: 'correct',
  wrong: 'wrong',
  done: 'answered',
};

export function ProgressPills({ states }: { states: PillState[] }) {
  return (
    <ol className="flex w-full items-center justify-between gap-1" aria-label="Quiz progress">
      {states.map((s, i) => (
        <li
          key={i}
          aria-current={s === 'current' ? 'step' : undefined}
          className={`flex h-7 min-w-0 flex-1 items-center justify-center rounded-full font-display text-xs font-extrabold transition-all ${styles[s]}`}
        >
          <span aria-hidden>{s === 'correct' ? '✓' : s === 'wrong' ? '✗' : i + 1}</span>
          <span className="sr-only">
            Question {i + 1}: {labels[s]}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Thin bar for the creator's n/10 progress. */
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.round((Math.min(value, max) / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-latte" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
        <div className="h-full rounded-full bg-terracotta transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-display text-sm font-extrabold text-terracotta tabular-nums">{label}</span>
    </div>
  );
}
