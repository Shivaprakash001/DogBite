import Link from 'next/link';
import type { ReactNode } from 'react';

// Small, dependency-free dashboard primitives. Every metric shows its sample size.

export const pct = (v: number | null, digits = 0) => (v === null ? '—' : `${(v * 100).toFixed(digits)}%`);

export function AdminShell({ active, days, children }: { active: string; days?: string; children: ReactNode }) {
  const tabs = [
    ['/admin', 'Funnel & virality'],
    ['/admin/research', 'Research'],
    ['/admin/questions', 'Question health'],
    ['/admin/hostels', 'Hostels'],
    ['/admin/features', 'Feature decisions'],
  ] as const;
  return (
    <div className="relative left-1/2 w-[min(1100px,calc(100vw-2rem))] -translate-x-1/2 pb-10">
      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b-2 pb-3">
        <h1 className="text-2xl font-extrabold">Admin</h1>
        <nav className="flex flex-wrap gap-1.5" aria-label="Admin sections">
          {tabs.map(([href, label]) => (
            <Link
              key={href}
              href={days ? `${href}?days=${days}` : href}
              aria-current={active === href ? 'page' : undefined}
              className={`font-display min-h-11 rounded-full px-4 py-2.5 text-sm font-bold ring-2 ${active === href ? 'bg-charcoal ring-charcoal text-white' : 'bg-paper ring-line'}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-5 flex flex-col gap-6">{children}</div>
    </div>
  );
}

export function Panel({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-paper ring-line rounded-2xl p-5 ring-2">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {note && <p className="text-ink-soft mt-1 text-sm">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, sample }: { label: string; value: ReactNode; sample?: string }) {
  return (
    <div className="bg-cream ring-line rounded-xl p-3 ring-1">
      <div className="text-ink-soft text-xs font-bold">{label}</div>
      <div className="font-display text-2xl font-extrabold tabular-nums">{value}</div>
      {sample && <div className="text-ink-soft text-xs">{sample}</div>}
    </div>
  );
}

export function BarRow({
  label,
  value,
  max,
  right,
  tone = 'clay',
}: {
  label: ReactNode;
  value: number;
  max: number;
  right: ReactNode;
  tone?: 'clay' | 'dusty' | 'correct' | 'wrong';
}) {
  const width = max > 0 ? Math.max(1, (value / max) * 100) : 0;
  const color = { clay: 'bg-terracotta', dusty: 'bg-dusty', correct: 'bg-correct', wrong: 'bg-wrong' }[tone];
  return (
    <div className="grid grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3 text-sm">
      <span className="truncate font-semibold">{label}</span>
      <span className="bg-sand h-3 overflow-hidden rounded-full" aria-hidden>
        <span className={`block h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </span>
      <span className="font-display font-bold whitespace-nowrap tabular-nums">{right}</span>
    </div>
  );
}

export function PeriodPicker({ base, days }: { base: string; days: string }) {
  return (
    <div className="flex gap-1.5 text-sm" role="group" aria-label="Period">
      {['7', '30', '90', 'all'].map((d) => (
        <Link
          key={d}
          href={`${base}?days=${d}`}
          aria-current={d === days ? 'true' : undefined}
          className={`min-h-11 rounded-full px-3 py-2.5 font-bold ring-2 ${d === days ? 'bg-terracotta ring-terracotta text-white' : 'bg-paper ring-line'}`}
        >
          {d === 'all' ? 'All time' : `${d}d`}
        </Link>
      ))}
    </div>
  );
}

export function sinceFrom(days: string | string[] | undefined): { since: Date; days: string } {
  const d = typeof days === 'string' && ['7', '30', '90', 'all'].includes(days) ? days : '30';
  return { days: d, since: d === 'all' ? new Date(0) : new Date(Date.now() - Number(d) * 864e5) };
}
