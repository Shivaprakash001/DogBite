import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Footer } from '@/components/Footer';
import { QuizMissing } from '@/components/quiz/QuizMissing';
import { ScoreList } from '@/components/scoreboard/ScoreRow';
import { FlowSkeleton } from '@/components/Skeleton';
import { ButtonLink } from '@/components/ui/Button';
import { Mascot } from '@/components/ui/Mascot';
import { fmt, getCopy } from '@/content/copy';
import { paths } from '@/lib/urls';
import { getPublicQuiz, getScoreboard, playerStatus } from '@/server/repos/play';
import { currentGate } from '@/server/session';

export const metadata: Metadata = { title: 'Scoreboard', robots: { index: false } };

export default function BoardPage({ params }: PageProps<'/q/[slug]/board'>) {
  return (
    <Suspense fallback={<FlowSkeleton />}>
      <BoardInner params={params} />
    </Suspense>
  );
}

async function BoardInner({ params }: { params: PageProps<'/q/[slug]/board'>['params'] }) {
  const { slug } = await params;
  const copy = getCopy();
  const quiz = await getPublicQuiz(slug);
  if (!quiz || quiz.status !== 'live') return <QuizMissing />;
  const gate = await currentGate();
  const own = quiz.creatorSessionId === gate.sid;
  const [rows, status] = await Promise.all([getScoreboard(quiz.id, 100), playerStatus(quiz.id, gate.sid)]);

  return (
    <>
      <section className="flex items-center gap-3 pt-2">
        <Mascot mood={rows.length ? 'happy' : 'sleepy'} gender={quiz.gender} size={84} />
        <div>
          <h1 className="text-2xl leading-tight font-extrabold">{fmt(copy.board.title, { creator: quiz.creatorName })}</h1>
          <p className="text-sm font-semibold text-ink-soft">{fmt(copy.hostelPage.players, { n: rows.length })}</p>
        </div>
      </section>
      <div className="mt-5">
        <ScoreList rows={rows} highlightAttemptIds={status.attempts.map((a) => a.id)} emptyText={copy.board.empty} />
      </div>
      <div className="mt-6">
        {own ? (
          <ButtonLink href={paths.done(slug)} size="lg">
            📤 {copy.board.shareMore}
          </ButtonLink>
        ) : status.best ? (
          <ButtonLink href="/create" size="lg">
            ✍️ {copy.result.createCta}
          </ButtonLink>
        ) : (
          <ButtonLink href={paths.play(slug)} size="lg">
            {copy.quizLanding.start} →
          </ButtonLink>
        )}
      </div>
      <Footer />
    </>
  );
}
