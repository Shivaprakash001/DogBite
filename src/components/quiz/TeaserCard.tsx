'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { Teaser } from '@/content/teasers';
import { useCopy } from '@/hooks/useCopy';
import { api } from '@/lib/api-client';
import { track } from '@/lib/events';

// Fake-door test (§11.1): the tap is the demand signal. No contact details asked.

export function TeaserCard({ teaser, hostelId, signupUrl }: { teaser: Teaser; hostelId: string | null; signupUrl: string | null }) {
  const copy = useCopy();
  const [tapped, setTapped] = useState(false);
  const seen = useRef(false);

  useEffect(() => {
    if (seen.current) return;
    seen.current = true;
    track('teaser_view', { feature_key: teaser.featureKey });
  }, [teaser.featureKey]);

  return (
    <Card tone="latte">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-soft">
          {teaser.emoji}
        </span>
        <div className="min-w-0">
          <p className="font-display text-xs font-extrabold tracking-wide text-terracotta uppercase">{copy.result.teaserKicker}</p>
          <h3 className="text-lg font-extrabold">{teaser.title}</h3>
          <p className="mt-1 text-sm text-ink-soft">{teaser.body}</p>
        </div>
      </div>
      {tapped ? (
        <div className="mt-4 flex flex-col gap-2" role="status">
          <p className="font-display font-extrabold text-correct">{copy.result.teaserThanks}</p>
          {signupUrl && (
            <a href={signupUrl} target="_blank" rel="noopener" className="min-h-11 py-2 font-display font-bold text-terracotta underline underline-offset-4">
              {copy.result.teaserLink} →
            </a>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setTapped(true);
            void api.post('/api/waitlist', { featureKey: teaser.featureKey, hostelId }).catch(() => undefined);
          }}
          className="mt-4 min-h-12 w-full rounded-chunky bg-charcoal px-5 font-display font-extrabold text-white shadow-[0_5px_0_0_#111] transition active:translate-y-[5px] active:shadow-none"
        >
          {teaser.cta}
        </button>
      )}
    </Card>
  );
}
