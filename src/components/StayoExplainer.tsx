'use client';

import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { useCopy } from '@/hooks/useCopy';
import { track } from '@/lib/events';

// "What is Stayo?" (§11.2): three skippable cards, plus a Discover link when configured.

export function StayoExplainer({ source, discoverHref }: { source: string; discoverHref: string | null }) {
  const copy = useCopy();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          track('stayo_explainer_view', { source_screen: source });
        }}
        className="font-display text-ink-soft mx-auto min-h-11 px-4 font-bold underline underline-offset-4"
      >
        {copy.stayo.whatIs}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={copy.stayo.whatIs} closeLabel={copy.common.close}>
        <ul className="flex flex-col gap-3">
          {copy.stayo.cards.map((c) => (
            <li key={c.title} className="bg-paper ring-line flex items-start gap-3 rounded-2xl p-4 ring-2">
              <span aria-hidden className="text-3xl">
                {c.emoji}
              </span>
              <span>
                <span className="font-display block font-extrabold">{c.title}</span>
                <span className="text-ink-soft block text-sm">{c.body}</span>
              </span>
            </li>
          ))}
        </ul>
        {discoverHref && (
          <a
            href={discoverHref}
            className="rounded-chunky bg-terracotta font-display shadow-chunky mt-4 flex min-h-14 items-center justify-center text-lg font-extrabold text-white"
          >
            {copy.stayo.discover} →
          </a>
        )}
      </Sheet>
    </>
  );
}
