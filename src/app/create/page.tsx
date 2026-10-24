import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CreatorFlow } from '@/components/creator/CreatorFlow';
import { FlowSkeleton } from '@/components/Skeleton';
import { getDraftState } from '@/server/repos/creator';
import { getHostelBySlug, toHostelDTO } from '@/server/repos/hostels';
import { currentGate } from '@/server/session';

export const metadata: Metadata = { title: 'Make your quiz', robots: { index: false } };

export default function CreatePage({ searchParams }: PageProps<'/create'>) {
  return (
    <Suspense fallback={<FlowSkeleton />}>
      <CreateInner searchParams={searchParams} />
    </Suspense>
  );
}

async function CreateInner({ searchParams }: { searchParams: PageProps<'/create'>['searchParams'] }) {
  const { hostel: hostelSlug } = await searchParams;
  const suggested = typeof hostelSlug === 'string' ? await getHostelBySlug(hostelSlug.slice(0, 80)) : null;
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
  return (
    <CreatorFlow
      initial={initial}
      consented={gate.consented}
      minor={gate.minor}
      suggestedHostel={suggested && !suggested.hidden ? toHostelDTO(suggested) : null}
    />
  );
}
