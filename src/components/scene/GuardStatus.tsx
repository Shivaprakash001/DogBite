'use client';

import { Mascot } from '@/components/ui/Mascot';
import { fmt } from '@/content/copy';
import { useCopy } from '@/hooks/useCopy';
import { guardState } from '@/lib/scoring';

/** The creator's guard pup, reacting live as the friend answers. */
export function GuardStatus({ correct, wrong }: { correct: number; wrong: number }) {
  const copy = useCopy();
  const { state, mood } = guardState(correct, wrong);
  const tone = state === 'growling' ? 'text-wrong' : state === 'suspicious' ? 'text-terracotta' : state === 'wagging' ? 'text-correct' : 'text-ink-soft';
  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <div className={state === 'growling' ? 'anim-wiggle' : undefined}>
        <Mascot mood={mood} size={60} decorative />
      </div>
      <p className={`font-display text-sm font-extrabold ${tone}`}>{fmt(copy.dog.guard[state], { dog: copy.dog.name })}</p>
    </div>
  );
}
