import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Footer } from '@/components/Footer';
import { QuizMissing } from '@/components/quiz/QuizMissing';
import { TeaserCard } from '@/components/quiz/TeaserCard';
import { ScoreList } from '@/components/scoreboard/ScoreRow';
import { ShareActions } from '@/components/ShareActions';
import { FlowSkeleton } from '@/components/Skeleton';
import { StayoExplainer } from '@/components/StayoExplainer';
import { TrackView, TrackedLink } from '@/components/Tracked';
import { ButtonLink, buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Mascot } from '@/components/ui/Mascot';
import { Sticker } from '@/components/ui/Sticker';
import { fmt, getCopy } from '@/content/copy';
import { tierForScore, tierMessage } from '@/lib/scoring';
import { absoluteUrl, paths } from '@/lib/urls';
import { env } from '@/server/env';
import { getAttemptResult, getScoreboard, playerStatus } from '@/server/repos/play';
import { pickTeaser } from '@/server/repos/stats';
import { currentGate } from '@/server/session';

type Params = PageProps<'/q/[slug]/result/[attemptId]'>['params'];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, attemptId } = await params;
  const r = await getAttemptResult(slug, attemptId).catch(() => null);
  const copy = getCopy();
  if (!r || !r.finished) return { robots: { index: false } };
  const title = fmt(copy.result.sharedTitle, { player: r.playerName, score: r.score, creator: r.quiz.creatorName });
  const description = tierForScore(r.score).title;
  return { title, description, openGraph: { title, description }, twitter: { title, description }, robots: { index: false } };
}

export default function ResultPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<FlowSkeleton />}>
      <ResultInner params={params} />
    </Suspense>
  );
}

async function ResultInner({ params }: { params: Params }) {
  const { slug, attemptId } = await params;
  const copy = getCopy();
  const result = /^[0-9a-f-]{36}$/i.test(attemptId) ? await getAttemptResult(slug, attemptId) : null;
  if (!result || result.quiz.status === 'deleted') return <QuizMissing />;
  if (!result.finished) redirect(paths.play(slug));

  const gate = await currentGate();
  const mine = gate.sid === result.sessionId;
  const { quiz } = result;
  const tier = tierForScore(result.score);
  const message = fmt(tierMessage(tier, attemptId), { creator: quiz.creatorName });
  const [board, teaser, status] = await Promise.all([getScoreboard(quiz.id, 10), mine ? pickTeaser() : null, playerStatus(quiz.id, gate.sid)]);
  const hostel = result.playerHostel;
  const shareUrl = absoluteUrl(paths.result(slug, attemptId), { ref: gate.shareRef ?? slug });
  const discoverHref = env().DISCOVER_BASE_URL ? paths.discover('result', hostel) : null;

  return (
    <>
      {mine && <TrackView name="result_view" props={{ score: result.score, tier: tier.id }} />}
      <section className="flex flex-col items-center pt-2 text-center">
        <p className="font-display text-sm font-bold text-ink-soft">
          {mine ? copy.result.scoreLabel : fmt(copy.result.sharedTitle, { player: result.playerName, score: result.score, creator: quiz.creatorName })}
        </p>
        <div className="relative mt-2">
          <Mascot mood={tier.mood} gender={quiz.gender} size={170} priority />
          {result.score >= 9 && <Sticker emoji="🏆" size={48} rotate={-12} className="top-0 -left-10" />}
          {result.score <= 2 && <Sticker emoji="🚫" size={44} rotate={10} className="top-2 -right-8" />}
        </div>
        <p className="mt-1 font-display text-7xl leading-none font-extrabold text-terracotta tabular-nums">
          {result.score}
          <span className="text-4xl text-ink-soft">/10</span>
        </p>
        <h1 className="mt-3 text-3xl font-extrabold">{tier.title}</h1>
        <p className="mt-2 max-w-[32ch] text-lg text-ink-soft">{message}</p>
      </section>

      <div className="mt-6 flex flex-col gap-3">
        {mine ? (
          <Card tone="clay">
            <p className="font-display text-sm font-bold text-white/80">{copy.result.yourTurn}</p>
            <p className="mt-0.5 font-display text-xl font-extrabold text-white">{fmt(copy.quizLanding.title, { creator: copy.common.you })}</p>
            <ButtonLink href="/create" variant="accent" size="lg" className="mt-3">
              ✍️ {copy.result.createCta}
            </ButtonLink>
          </Card>
        ) : (
          <TrackedLink href={paths.play(slug)} event="start_click" eventProps={{ quiz_slug: slug }} className={buttonClass('primary', 'lg')}>
            {copy.result.playCta} →
          </TrackedLink>
        )}

        {mine && (
          <ShareActions
            url={shareUrl}
            caption={`${fmt(tier.shareCaption, { score: result.score, creator: quiz.creatorName })} ${absoluteUrl(paths.quiz(slug), { ref: gate.shareRef ?? slug })}`}
            title={fmt(copy.result.sharedTitle, { player: result.playerName, score: result.score, creator: quiz.creatorName })}
            quizSlug={slug}
            hostelId={hostel?.id ?? null}
            storyImageUrl={`${paths.result(slug, attemptId)}/story-image`}
            storyFileName={`roomie-quiz-${result.score}.png`}
          />
        )}

        {mine && status.canStart && !status.unfinishedId && (
          <TrackedLink href={paths.play(slug)} event="start_click" eventProps={{ quiz_slug: slug }} className={buttonClass('ghost', 'md', 'mx-auto')}>
            🔁 {copy.quizLanding.retry}
          </TrackedLink>
        )}
      </div>

      {mine && teaser && (
        <div className="mt-6">
          <TeaserCard teaser={teaser} hostelId={hostel?.id ?? null} signupUrl={env().TENANT_SIGNUP_URL ?? null} />
        </div>
      )}

      <div className="mt-6">
        {hostel ? (
          <ButtonLink href={paths.hostel(hostel.slug)} variant="secondary" size="lg">
            🏠 {fmt(copy.result.hostelCta, { area: hostel.area })}
          </ButtonLink>
        ) : (
          <ButtonLink href={paths.leaderboard()} variant="secondary" size="lg">
            🏆 {copy.result.hostelCtaNoArea}
          </ButtonLink>
        )}
      </div>

      <section className="mt-8" aria-labelledby="board-title">
        <h2 id="board-title" className="mb-3 text-xl font-extrabold">
          {fmt(copy.board.title, { creator: quiz.creatorName })}
        </h2>
        <ScoreList rows={board} highlightAttemptIds={mine ? status.attempts.map((a) => a.id) : [attemptId]} emptyText={copy.board.empty} />
        <Link href={paths.board(slug)} className="mt-2 inline-block min-h-11 py-3 font-display font-bold text-terracotta underline underline-offset-4">
          {copy.result.viewBoard} →
        </Link>
      </section>

      <div className="mt-4 flex justify-center">
        <StayoExplainer source="result" discoverHref={discoverHref} />
      </div>
      <Footer />
    </>
  );
}
