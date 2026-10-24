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
        <span aria-hidden className="shadow-soft flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl">
          {teaser.emoji}
        </span>
        <div className="min-w-0">
          <p className="font-display text-terracotta text-xs font-extrabold tracking-wide uppercase">{copy.result.teaserKicker}</p>
          <h3 className="text-lg font-extrabold">{teaser.title}</h3>
          <p className="text-ink-soft mt-1 text-sm">{teaser.body}</p>
        </div>
      </div>
      {tapped ? (
        <div className="mt-4 flex flex-col gap-2" role="status">
          <p className="font-display text-correct font-extrabold">{copy.result.teaserThanks}</p>
          {signupUrl && (
            <a href={signupUrl} target="_blank" rel="noopener" className="font-display text-terracotta min-h-11 py-2 font-bold underline underline-offset-4">
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
          className="rounded-chunky bg-charcoal font-display mt-4 min-h-12 w-full px-5 font-extrabold text-white shadow-[0_5px_0_0_#111] transition active:translate-y-[5px] active:shadow-none"
        >
          {teaser.cta}
        </button>
      )}
    </Card>
  );
}
