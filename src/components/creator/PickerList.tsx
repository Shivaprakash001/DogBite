'use client';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { QUIZ } from '@/config';
import { fmt } from '@/content/copy';
import { useCopy } from '@/hooks/useCopy';
import type { CandidateDTO } from '@/lib/api-types';
import { track } from '@/lib/events';
import { canAdd } from '@/lib/selection';

// Creator picks exactly 10 of ~20 candidates (§6.3.4). Caps from §8.3 are checked
// here for instant feedback and enforced again on the server.

interface PickerListProps {
  candidates: CandidateDTO[];
  picked: string[];
  onChange: (keys: string[]) => void;
  shufflesLeft: number;
  onShuffle: () => void;
  onDone: () => void;
  busy?: boolean;
}

const CATEGORY_STYLE: Record<CandidateDTO['category'], string> = {
  research: 'bg-[#e6efe6] text-[#2f5e3e]',
  rating: 'bg-[#f6e7c8] text-[#7a5410]',
  sleep: 'bg-[#e7e5f4] text-[#4a438a]',
  study: 'bg-[#e3eef6] text-[#2b5876]',
  social: 'bg-[#f6e3e6] text-[#8a3c4b]',
  money: 'bg-[#e9f2df] text-[#4c6a24]',
  fun: 'bg-latte text-terracotta-deep',
};

export function PickerList({ candidates, picked, onChange, shufflesLeft, onShuffle, onDone, busy }: PickerListProps) {
  const copy = useCopy();
  const toast = useToast();
  const byKey = new Map(candidates.map((c) => [c.key, c]));
  const pickedItems = picked.map((k) => byKey.get(k)).filter((c): c is CandidateDTO => !!c);
  const full = picked.length >= QUIZ.questionsPerQuiz;

  function toggle(c: CandidateDTO, index: number) {
    const item = { key: c.key, objective_tag: c.objectiveTag, kind: c.kind };
    if (picked.includes(c.key)) {
      onChange(picked.filter((k) => k !== c.key));
      track('candidate_unpick', { question_key: c.key, objective_tag: c.objectiveTag, position_in_list: index });
      return;
    }
    const block = canAdd(
      pickedItems.map((p) => ({ key: p.key, objective_tag: p.objectiveTag, kind: p.kind })),
      item,
    );
    if (block === 'research_cap') return toast(copy.creator.researchCap);
    if (block === 'rating_cap') return toast(copy.creator.ratingCap);
    if (block) return;
    onChange([...picked, c.key]);
    track('candidate_pick', { question_key: c.key, objective_tag: c.objectiveTag, position_in_list: index });
  }

  return (
    <section className="flex flex-1 flex-col gap-4 pt-2" aria-labelledby="pick-title">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 id="pick-title" className="text-3xl font-extrabold">
            {copy.creator.pickTitle}
          </h1>
          <p className="mt-1 text-ink-soft">{copy.creator.pickSub}</p>
        </div>
      </div>

      <ul className="flex flex-col gap-2.5 pb-28">
        {candidates.map((c, i) => {
          const on = picked.includes(c.key);
          const order = picked.indexOf(c.key) + 1;
          return (
            <li key={c.key}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(c, i)}
                disabled={busy || (!on && full)}
                className={`flex min-h-16 w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition active:translate-y-0.5 disabled:opacity-50 ${on ? 'bg-paper ring-4 ring-terracotta' : 'bg-paper ring-2 ring-line'}`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold ${on ? 'bg-terracotta text-white' : 'bg-latte text-transparent'}`}
                >
                  {on ? order : '·'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-bold leading-snug">{c.text}</span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${CATEGORY_STYLE[c.category]}`}>{copy.creator.categories[c.category]}</span>
                    <span aria-hidden className="text-sm tracking-wider">
                      {c.previewEmojis.join(' ')}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[440px] bg-gradient-to-t from-cream via-cream to-cream/0 px-4 pt-6 pb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-lg font-extrabold text-terracotta tabular-nums" aria-live="polite">
            {fmt(copy.creator.pickedCount, { n: picked.length })}
          </span>
          <button
            type="button"
            onClick={onShuffle}
            disabled={busy || shufflesLeft === 0}
            className="min-h-11 rounded-full bg-paper px-4 font-display text-sm font-bold ring-2 ring-line disabled:opacity-40"
          >
            🎲 {copy.creator.shuffle} <span className="text-ink-soft">· {fmt(copy.creator.shufflesLeft, { n: shufflesLeft })}</span>
          </button>
        </div>
        <Button size="lg" onClick={onDone} disabled={busy || !full}>
          {copy.creator.pickDone}
        </Button>
      </div>
    </section>
  );
}
