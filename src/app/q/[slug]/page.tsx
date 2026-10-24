import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Footer } from '@/components/Footer';
import { QuizMissing } from '@/components/quiz/QuizMissing';
import { ScoreList } from '@/components/scoreboard/ScoreRow';
import { FlowSkeleton } from '@/components/Skeleton';
import { TrackArrival, TrackedLink } from '@/components/Tracked';
import { ButtonLink, buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Mascot } from '@/components/ui/Mascot';
import { Sticker } from '@/components/ui/Sticker';
import { fmt, getCopy } from '@/content/copy';
import { paths } from '@/lib/urls';
import { getPublicQuiz, getScoreboard, playerStatus, playsCount } from '@/server/repos/play';
import { currentGate } from '@/server/session';

export async function generateMetadata({ params }: PageProps<'/q/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const quiz = await getPublicQuiz(slug);
  const copy = getCopy();
  if (!quiz || quiz.status !== 'live') return { title: copy.quizLanding.notFound, robots: { index: false } };
  const title = fmt(copy.quizLanding.title, { creator: quiz.creatorName });
  const description = fmt(copy.quizLanding.sub, { creator: quiz.creatorName });
  return { title, description, openGraph: { title, description }, twitter: { title, description }, robots: { index: false } };
}

export default function QuizLandingPage({ params }: PageProps<'/q/[slug]'>) {
  return (
    <Suspense fallback={<FlowSkeleton />}>
      <QuizLanding params={params} />
    </Suspense>
  );
}

async function QuizLanding({ params }: { params: PageProps<'/q/[slug]'>['params'] }) {
  const { slug } = await params;
  const copy = getCopy();
  const quiz = await getPublicQuiz(slug);
  if (!quiz || quiz.status !== 'live') return <QuizMissing />;

  const gate = await currentGate();
  const [status, board, plays] = await Promise.all([playerStatus(quiz.id, gate.sid), getScoreboard(quiz.id, 5), playsCount(quiz.id)]);
  const own = quiz.creatorSessionId === gate.sid;

  return (
    <>
      <TrackArrival page="quiz" quizSlug={slug} />
      <section className="flex flex-col items-center pt-2 text-center">
        <div className="relative">
          <Mascot mood="thinking" gender={quiz.gender} size={170} priority />
          <Sticker emoji="🤔" size={42} rotate={-10} className="top-2 -left-10" />
          <Sticker emoji="🚫" size={40} rotate={12} className="-right-8 bottom-8" />
        </div>
        <h1 className="mt-3 text-[2.4rem] leading-[1.05] font-extrabold text-balance">{fmt(copy.quizLanding.title, { creator: quiz.creatorName })}</h1>
        <p className="text-ink-soft mt-3 max-w-[32ch] text-lg">{fmt(copy.quizLanding.sub, { creator: quiz.creatorName })}</p>
        {quiz.hostel && (
          <Link
            href={paths.hostel(quiz.hostel.slug)}
            className="bg-paper font-display ring-line mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold ring-2"
          >
            🏠 {quiz.hostel.name} · {quiz.hostel.area}
          </Link>
        )}
      </section>

      <div className="mt-6 flex flex-col gap-3">
        {own ? (
          <Card tone="latte">
            <p className="font-display font-bold">{copy.quizLanding.ownQuiz}</p>
            <ButtonLink href={paths.done(slug)} size="lg" className="mt-3">
              📤 {copy.quizLanding.ownQuizCta}
            </ButtonLink>
          </Card>
        ) : status.best ? (
          <>
            <Card tone="latte">
              <p className="font-display text-center text-lg font-extrabold">{fmt(copy.quizLanding.playedAlready, { score: status.best.score })}</p>
            </Card>
            <ButtonLink href={paths.result(slug, status.best.id)} size="lg">
              {copy.quizLanding.viewResult}
            </ButtonLink>
            {status.canStart && (
              <TrackedLink href={paths.play(slug)} event="start_click" eventProps={{ quiz_slug: slug }} className={buttonClass('secondary', 'lg')}>
                🔁 {copy.quizLanding.retry}
              </TrackedLink>
            )}
          </>
        ) : (
          <TrackedLink href={paths.play(slug)} event="start_click" eventProps={{ quiz_slug: slug }} className={buttonClass('primary', 'lg')}>
            {copy.quizLanding.start} →
          </TrackedLink>
        )}
      </div>

      <section className="mt-8" aria-labelledby="board-title">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="board-title" className="text-xl font-extrabold">
            {copy.quizLanding.boardTitle}
          </h2>
          <span className="text-ink-soft text-sm font-semibold">{fmt(copy.hostelPage.players, { n: plays })}</span>
        </div>
        <ScoreList rows={board} emptyText={copy.quizLanding.boardEmpty} highlightAttemptIds={status.attempts.map((a) => a.id)} />
        {board.length > 0 && (
          <Link href={paths.board(slug)} className="font-display text-terracotta mt-2 inline-block min-h-11 py-3 font-bold underline underline-offset-4">
            {copy.result.viewBoard} →
          </Link>
        )}
      </section>
      <Footer />
    </>
  );
}
