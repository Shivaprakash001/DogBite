import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CreatorFlow } from '@/components/creator/CreatorFlow';
import { FlowSkeleton } from '@/components/Skeleton';
import { getDraftState } from '@/server/repos/creator';
import { currentGate } from '@/server/session';

export const metadata: Metadata = { title: 'Make your quiz', robots: { index: false } };

export default function CreatePage() {
  return (
    <Suspense fallback={<FlowSkeleton />}>
      <CreateInner />
    </Suspense>
  );
}

async function CreateInner() {
  const gate = await currentGate();
  const initial = gate.sid
    ? await getDraftState(gate.sid)
    : {
        step: 'name' as const,
        name: null,
        gender: null,
        hostel: null,
        slug: null,
        candidates: [],
        shufflesLeft: 0,
        answering: null,
        answeredCount: 0,
        suggestedName: null,
      };
  return <CreatorFlow initial={initial} consented={gate.consented} minor={gate.minor} />;
}
