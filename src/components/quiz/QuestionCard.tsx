'use client';

import { PhotoCard, type PhotoCardState } from '@/components/ui/PhotoCard';
import type { AnswerResultDTO, PlayQuestionDTO } from '@/lib/api-types';

// One question, two big photo cards (§6.4). Feedback state comes from the server
// response, so the correct option is only known after the guess is submitted.

interface QuestionCardProps {
  question: PlayQuestionDTO;
  result: AnswerResultDTO | null;
  pendingOptionId: number | null;
  onGuess: (optionId: number) => void;
}

export function QuestionCard({ question, result, pendingOptionId, onGuess }: QuestionCardProps) {
  const stateFor = (optionId: number): PhotoCardState => {
    if (result) {
      if (optionId === result.correctOptionId) return 'correct';
      if (optionId === result.chosenOptionId) return 'wrong';
      return 'dimmed';
    }
    if (pendingOptionId !== null) return optionId === pendingOptionId ? 'selected' : 'dimmed';
    return 'idle';
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[1.65rem] leading-tight font-extrabold text-balance" id={`q-${question.quizQuestionId}`}>
        {question.text}
      </h1>
      <AnswerGrid labelledBy={`q-${question.quizQuestionId}`}>
        {question.options.map((o, i) => (
          <PhotoCard
            key={o.id}
            label={o.label}
            emoji={o.emoji}
            image={o.image}
            tint={(question.position + i) % 6}
            state={stateFor(o.id)}
            disabled={!!result || pendingOptionId !== null}
            onSelect={() => onGuess(o.id)}
          />
        ))}
      </AnswerGrid>
    </div>
  );
}

export function AnswerGrid({ children, labelledBy }: { children: React.ReactNode; labelledBy: string }) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="grid grid-cols-2 gap-3">
      {children}
    </div>
  );
}
