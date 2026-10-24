import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { PlayerFlow } from '@/components/quiz/PlayerFlow';
import { QuizMissing } from '@/components/quiz/QuizMissing';
import { FlowSkeleton } from '@/components/Skeleton';
import { paths } from '@/lib/urls';
import { getPublicQuiz, playerStatus } from '@/server/repos/play';
import { currentGate } from '@/server/session';

export const metadata: Metadata = { robots: { index: false } };

export default function PlayPage({ params }: PageProps<'/q/[slug]/play'>) {
  return (
    <Suspense fallback={<FlowSkeleton />}>
      <PlayInner params={params} />
    </Suspense>
  );
}

async function PlayInner({ params }: { params: PageProps<'/q/[slug]/play'>['params'] }) {
  const { slug } = await params;
  const quiz = await getPublicQuiz(slug);
  if (!quiz || quiz.status !== 'live') return <QuizMissing />;
  const gate = await currentGate();
  if (quiz.creatorSessionId === gate.sid) redirect(paths.done(slug));
  const status = await playerStatus(quiz.id, gate.sid);
  if (!status.canStart && status.best) redirect(paths.result(slug, status.best.id));

  return (
    <PlayerFlow
      slug={slug}
      creatorName={quiz.creatorName}
      creatorAvatar={quiz.avatar}
      consented={gate.consented}
      minor={gate.minor}
      resumeAttemptId={status.unfinishedId}
    />
  );
}
