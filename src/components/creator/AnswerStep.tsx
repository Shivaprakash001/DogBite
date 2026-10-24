'use client';

import { useEffect, useRef, useState } from 'react';
import { PhotoCard } from '@/components/ui/PhotoCard';
import { ProgressBar } from '@/components/ui/ProgressPills';
import { TIMING } from '@/config';
import { fmt } from '@/content/copy';
import { useCopy } from '@/hooks/useCopy';
import { useSound } from '@/hooks/useSound';
import type { DraftQuestionDTO } from '@/lib/api-types';

// One decision per screen: the creator's own answer, auto-advancing on tap.

interface AnswerStepProps {
  question: DraftQuestionDTO;
  answered: number;
  total: number;
  busy?: boolean;
  onAnswer: (optionId: number, ms: number) => void;
  onSkip: () => void;
}

export function AnswerStep({ question, answered, total, busy, onAnswer, onSkip }: AnswerStepProps) {
  const copy = useCopy();
  const sound = useSound();
  const shownAt = useRef(0);
  const [chosen, setChosen] = useState<number | null>(null);

  useEffect(() => {
    shownAt.current = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset selection when the question changes
    setChosen(null);
  }, [question.quizQuestionId]);

  return (
    <section className="flex flex-1 flex-col gap-5 pt-1" aria-labelledby="answer-q">
      <ProgressBar value={answered} max={total} label={fmt(copy.creator.answerProgress, { n: Math.min(answered + 1, total) })} />
      <div>
        <p className="font-display text-terracotta text-sm font-bold">{copy.creator.answerTitle}</p>
        <h1 id="answer-q" className="mt-1 text-[1.6rem] leading-tight font-extrabold">
          {question.text}
        </h1>
        <p className="text-ink-soft mt-1 text-sm">{copy.creator.answerHint}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((o, i) => (
          <PhotoCard
            key={o.id}
            label={o.label}
            emoji={o.emoji}
            image={o.image}
            tint={i}
            size={question.options.length > 4 ? 'sm' : 'md'}
            state={chosen === null ? 'idle' : chosen === o.id ? 'selected' : 'dimmed'}
            disabled={busy || chosen !== null}
            onSelect={() => {
              setChosen(o.id);
              sound.play('tap');
              const ms = Date.now() - shownAt.current;
              setTimeout(() => onAnswer(o.id, ms), TIMING.creatorAdvanceMs);
            }}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onSkip}
        disabled={busy || chosen !== null}
        className="font-display text-ink-soft mx-auto mt-auto min-h-11 rounded-full px-5 font-bold underline underline-offset-4 disabled:opacity-40"
      >
        🔄 {copy.creator.skipQuestion}
      </button>
    </section>
  );
}
