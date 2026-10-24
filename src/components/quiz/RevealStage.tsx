'use client';

import { useEffect } from 'react';
import { Mascot } from '@/components/ui/Mascot';
import type { MascotMood } from '@/content/assets';
import type { Gender } from '@/content/types';
import { useCopy } from '@/hooks/useCopy';
import { useReveal, type RevealStage as Stage } from '@/hooks/useReveal';
import { useSound } from '@/hooks/useSound';
import { hashString } from '@/lib/random';
import { tierForScore } from '@/lib/scoring';

// Suspense → reveal → result, as explicit stages (§10). Each stage renders static
// content today; the animation layer will hook into `data-stage` and the
// `reveal.stage` UI event without changing this structure.

interface RevealStageProps {
  /** Seeds the suspense line so it is stable across re-renders. */
  seed: string;
  creatorGender: Gender | null;
  score: number | null;
  onResult: () => void;
}

const SOUND_FOR_TIER = { stranger: 'reveal.low', neighbour: 'reveal.low', floormate: 'reveal.mid', roomie: 'reveal.high', certified: 'reveal.high' } as const;

export function RevealStage({ seed, creatorGender, score, onResult }: RevealStageProps) {
  const copy = useCopy();
  const sound = useSound();
  const { stage, start } = useReveal(score !== null);
  const line = copy.suspense.lines[hashString(seed) % copy.suspense.lines.length];

  useEffect(() => start(), [start]);
  useEffect(() => {
    if (stage === 'suspense') sound.play('suspense');
    if (stage === 'reveal' && score !== null) sound.play(SOUND_FOR_TIER[tierForScore(score).id]);
    if (stage === 'result') onResult();
  }, [stage, score, sound, onResult]);

  const moods: Record<Stage, [MascotMood, MascotMood]> = {
    idle: ['neutral', 'neutral'],
    suspense: ['pulling', 'shocked'],
    reveal: score !== null ? [tierForScore(score).mood, 'happy'] : ['thinking', 'thinking'],
    result: score !== null ? [tierForScore(score).mood, 'happy'] : ['thinking', 'thinking'],
  };
  const [left, right] = moods[stage];

  return (
    <section data-stage={stage} className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center" aria-live="polite">
      <div className="flex items-end justify-center">
        <Mascot mood={left} gender={creatorGender} size={150} className="-mr-4" />
        <Mascot mood={right} size={130} className="-ml-4" decorative />
      </div>
      {stage === 'suspense' || stage === 'idle' ? (
        <p className="font-display text-3xl font-extrabold">{line}</p>
      ) : (
        <p className="font-display text-terracotta text-7xl font-extrabold tabular-nums">
          {score}
          <span className="text-ink-soft text-4xl">/10</span>
        </p>
      )}
    </section>
  );
}
