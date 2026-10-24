'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TIMING } from '@/config';
import { emitUiEvent } from '@/lib/events';

// Reveal state machine (§10): idle → suspense → reveal → result.
// Each stage has a minimum dwell (config). The result stage also waits until the
// score is ready, so a slow network extends suspense instead of skipping it.

export type RevealStage = 'idle' | 'suspense' | 'reveal' | 'result';

export interface RevealTimings {
  suspenseMs: number;
  revealMs: number;
}

export function nextStage(stage: RevealStage): RevealStage {
  return stage === 'idle' ? 'suspense' : stage === 'suspense' ? 'reveal' : 'result';
}

export function useReveal(ready: boolean, timings: RevealTimings = TIMING.reveal) {
  const [stage, setStage] = useState<RevealStage>('idle');
  const [dwellDone, setDwellDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    setStage('suspense');
    setDwellDone(false);
  }, []);

  useEffect(() => {
    emitUiEvent('reveal.stage', stage);
    if (stage === 'suspense') timer.current = setTimeout(() => setDwellDone(true), timings.suspenseMs);
    if (stage === 'reveal') timer.current = setTimeout(() => setStage('result'), timings.revealMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [stage, timings.suspenseMs, timings.revealMs]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- advancing the machine once both gates open
    if (stage === 'suspense' && dwellDone && ready) setStage('reveal');
  }, [stage, dwellDone, ready]);

  return { stage, start };
}
