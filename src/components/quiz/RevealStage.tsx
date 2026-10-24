'use client';

import { useEffect } from 'react';
import { Mascot } from '@/components/ui/Mascot';
import { fmt } from '@/content/copy';
import { useCopy } from '@/hooks/useCopy';
import { useReveal } from '@/hooks/useReveal';
import { useSound } from '@/hooks/useSound';
import { hashString } from '@/lib/random';
import { compatibilityPct, tierForScore } from '@/lib/scoring';

// Suspense → reveal → result (§10). The creator's guard pup pulls the rope and
// the room-verdict board drops. Root exposes data-stage for the animation layer.

interface RevealStageProps {
  /** Seeds the suspense line so it is stable across re-renders. */
  seed: string;
  score: number | null;
  onResult: () => void;
}

const SOUND_FOR_TIER = {
  kicked_out: 'reveal.low',
  corridor: 'reveal.low',
  probation: 'reveal.mid',
  approved: 'reveal.high',
  soulmates: 'reveal.high',
} as const;

export function RevealStage({ seed, score, onResult }: RevealStageProps) {
  const copy = useCopy();
  const sound = useSound();
  const { stage, start } = useReveal(score !== null);
  const dog = copy.dog.name;
  const line = fmt(copy.suspense.lines[hashString(seed) % copy.suspense.lines.length], { dog });
  const revealed = score !== null && (stage === 'reveal' || stage === 'result');
  const tier = score !== null ? tierForScore(score) : null;

  useEffect(() => start(), [start]);
  useEffect(() => {
    if (stage === 'suspense') sound.play('suspense');
    if (stage === 'reveal' && tier) sound.play(SOUND_FOR_TIER[tier.id]);
    if (stage === 'result') onResult();
  }, [stage, tier, sound, onResult]);

  return (
    <section data-stage={stage} className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center" aria-live="polite">
      <div className={`rounded-card bg-paper ring-line shadow-card w-64 px-5 py-4 ring-2 ${revealed ? 'anim-board-drop' : ''}`}>
        <p className="font-display text-terracotta text-xs font-extrabold tracking-wide uppercase">{copy.suspense.board}</p>
        {revealed && tier ? (
          <>
            <p className="font-display text-terracotta text-6xl leading-none font-extrabold tabular-nums">{compatibilityPct(score!)}%</p>
            <p className="font-display mt-1 text-lg font-extrabold">{tier.title}</p>
          </>
        ) : (
          <p className="font-display text-ink-soft text-6xl leading-none font-extrabold">??%</p>
        )}
      </div>
      {/* Rope from the board down to the pup's paws. */}
      <div aria-hidden className="bg-dusty h-6 w-1.5 rounded-full" />
      <div className="-mt-8">
        <Mascot mood={revealed && tier ? tier.dogMood : 'pulling'} size={190} />
      </div>
      <p className="font-display mt-2 text-2xl font-extrabold">{revealed ? fmt(copy.result.scoreLine, { score: score! }) : line}</p>
    </section>
  );
}
