import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Footer } from '@/components/Footer';
import { HostelBoard } from '@/components/scoreboard/HostelBoard';
import { ListSkeleton } from '@/components/Skeleton';
import { TrackArrival, TrackedLink } from '@/components/Tracked';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Character } from '@/components/ui/Character';
import { Highlight } from '@/components/ui/Highlight';
import { Mascot } from '@/components/ui/Mascot';
import { Sticker } from '@/components/ui/Sticker';
import { getCopy } from '@/content/copy';
import { hostelsPlayingNow } from '@/server/repos/stats';

export default function LandingPage() {
  const copy = getCopy();
  return (
    <>
      <TrackArrival page="landing" />
      <section className="flex flex-col items-center pt-4 text-center">
        <span className="bg-paper font-display text-terracotta ring-line rounded-full px-3 py-1 text-xs font-extrabold tracking-wide uppercase ring-2">
          {copy.landing.kicker}
        </span>
        <h1 className="mt-4 text-[2.4rem] leading-[1.05] font-extrabold text-balance">
          <Highlight text={copy.landing.headline} phrase={copy.landing.headlineHighlight} />
        </h1>

        {/* The whole idea in one picture: the creator laughs while their guard pup chases a roommate out. */}
        <div className="relative mt-6 flex h-[150px] w-full items-end justify-center">
          <Character avatar="girl" mood="happy" size={130} className="-mr-4" />
          <div className="anim-hop">
            <Mascot mood="angry" size={120} priority decorative />
          </div>
          <Character avatar="boy" mood="running" size={130} flip className="-ml-4" />
          <Sticker emoji="🚪" size={46} rotate={-8} className="top-0 -right-1" />
          <Sticker emoji="🧳" size={40} rotate={10} className="top-2 left-0" />
        </div>

        <p className="text-ink-soft mt-4 max-w-[34ch] text-lg leading-relaxed">{copy.landing.sub}</p>

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
                <span aria-hidden className="shadow-soft ring-line flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl ring-2">
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
          <span className="text-correct flex items-center gap-1.5 text-xs font-bold">
            <span aria-hidden className="bg-correct size-2 rounded-full" /> {copy.landing.live}
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
