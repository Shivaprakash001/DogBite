import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Footer } from '@/components/Footer';
import { HostelBoard } from '@/components/scoreboard/HostelBoard';
import { ListSkeleton } from '@/components/Skeleton';
import { TrackArrival, TrackedLink } from '@/components/Tracked';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Mascot } from '@/components/ui/Mascot';
import { Sticker } from '@/components/ui/Sticker';
import { getCopy } from '@/content/copy';
import { hostelsPlayingNow } from '@/server/repos/stats';

export default function LandingPage() {
  const copy = getCopy();
  const word = copy.landing.headlineHighlight;
  const [before, after] = copy.landing.headline.split(word);
  return (
    <>
      <TrackArrival page="landing" />
      <section className="flex flex-col items-center pt-4 text-center">
        <span className="rounded-full bg-paper px-3 py-1 font-display text-xs font-extrabold tracking-wide text-terracotta uppercase ring-2 ring-line">
          {copy.landing.kicker}
        </span>
        <h1 className="mt-4 text-[2.6rem] leading-[1.05] font-extrabold text-balance">
          {before}
          {after !== undefined ? (
            <>
              <span className="relative inline-block">
                <span className="relative z-10">{word}</span>
                <span aria-hidden className="absolute inset-x-0 bottom-1 z-0 h-3 -rotate-1 rounded-full bg-marigold/80" />
              </span>
              {after}
            </>
          ) : null}
        </h1>

        <div className="relative mt-6 flex items-end justify-center">
          <Mascot mood="waving" gender="he" size={150} priority className="-mr-6" />
          <Mascot mood="shocked" gender="she" size={150} priority className="-ml-6" />
          <Sticker emoji="🏠" size={48} rotate={-10} className="top-0 -left-6" />
          <Sticker emoji="🍜" size={42} rotate={12} className="top-4 -right-4" />
          <Sticker emoji="🚫" size={40} rotate={-6} className="-right-2 bottom-10" />
        </div>

        <p className="mt-4 max-w-[34ch] text-lg leading-relaxed text-ink-soft">{copy.landing.sub}</p>

        <TrackedLink href="/create" event="start_click" eventProps={{ quiz_slug: null }} className={buttonClass('primary', 'lg', 'mt-6')}>
          {copy.landing.cta} →
        </TrackedLink>
      </section>

      <section className="mt-10" aria-labelledby="how-title">
        <h2 id="how-title" className="mb-3 text-xl font-extrabold">
          {copy.landing.howTitle}
        </h2>
        <Card lined>
          <ol className="flex flex-col gap-4">
            {copy.landing.how.map((step, i) => (
              <li key={i} className="flex items-center gap-3">
                <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-soft ring-2 ring-line">
                  {step.emoji}
                </span>
                <span className="font-display font-bold">{step.text}</span>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <section className="mt-10" aria-labelledby="board-title">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="board-title" className="text-xl font-extrabold">
            {copy.landing.boardTitle}
          </h2>
          <span className="flex items-center gap-1.5 text-xs font-bold text-correct">
            <span aria-hidden className="size-2 rounded-full bg-correct" /> {copy.landing.live}
          </span>
        </div>
        <Suspense fallback={<ListSkeleton rows={3} />}>
          <PlayingNow />
        </Suspense>
        <Link href="/leaderboard" className={buttonClass('secondary', 'lg', 'mt-4')}>
          🏆 {copy.landing.boardCta}
        </Link>
      </section>

      <Footer />
    </>
  );
}

async function PlayingNow() {
  await connection();
  const copy = getCopy();
  const hostels = await hostelsPlayingNow(5);
  return <HostelBoard hostels={hostels} emptyText={copy.landing.boardEmpty} />;
}
