'use client';

import { Mascot } from '@/components/ui/Mascot';
import type { Gender } from '@/content/types';
import { useCopy } from '@/hooks/useCopy';

const OPTIONS: Gender[] = ['she', 'he', 'they'];

export function MascotPicker({ name, onPick, busy }: { name: string; onPick: (g: Gender) => void; busy?: boolean }) {
  const copy = useCopy();
  return (
    <section className="flex flex-1 flex-col gap-5 pt-2" aria-labelledby="mascot-title">
      <div>
        <h1 id="mascot-title" className="text-3xl font-extrabold">
          {copy.mascot.title}
        </h1>
        <p className="text-ink-soft mt-1">{copy.mascot.sub}</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {OPTIONS.map((g) => (
          <button
            key={g}
            type="button"
            disabled={busy}
            onClick={() => onPick(g)}
            className="rounded-card bg-paper ring-line shadow-chunky-light enabled:hover:ring-terracotta flex min-h-24 items-center gap-4 p-3 pr-5 text-left ring-2 transition active:translate-y-1 active:shadow-none"
          >
            <span className="bg-latte rounded-2xl">
              <Mascot mood={g === 'they' ? 'happy' : 'waving'} gender={g} size={84} decorative />
            </span>
            <span className="flex flex-col">
              <span className="font-display text-xl font-extrabold">{copy.mascot[g].label}</span>
              <span className="text-ink-soft text-sm font-semibold">{copy.mascot[g].pronoun}</span>
              <span className="text-ink-soft mt-1 text-xs">“{name}”</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
