import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { Footer } from '@/components/Footer';
import { FlagHostelButton, SendToOwnerButton } from '@/components/hostel/HostelActions';
import { RankBadge } from '@/components/scoreboard/RankBadge';
import { FlowSkeleton } from '@/components/Skeleton';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Mascot } from '@/components/ui/Mascot';
import { PRIVACY } from '@/config';
import { fmt, getCopy } from '@/content/copy';
import { slugifyArea } from '@/content/places';
import { absoluteUrl, paths } from '@/lib/urls';
import { env } from '@/server/env';
import { getHostelBySlug } from '@/server/repos/hostels';
import { hostelPage } from '@/server/repos/stats';
import { currentGate } from '@/server/session';

type Params = PageProps<'/hostel/[hostelSlug]'>['params'];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { hostelSlug } = await params;
  const h = await getHostelBySlug(hostelSlug);
  if (!h) return {};
  return { title: `${h.name}, ${h.area}`, description: `${h.name} on the ${getCopy().faceoff.title}` };
}

export default function HostelPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<FlowSkeleton />}>
      <HostelInner params={params} />
    </Suspense>
  );
}

const TYPE_EMOJI = { boys: '👦', girls: '👧', coed: '🧑‍🤝‍🧑', unknown: '🏠' } as const;

async function HostelInner({ params }: { params: Params }) {
  const { hostelSlug } = await params;
  const copy = getCopy();
  const hostel = await getHostelBySlug(hostelSlug);
  if (!hostel || hostel.hidden) notFound();
  if (hostel.slug !== hostelSlug) permanentRedirect(paths.hostel(hostel.slug));

  const [data, gate] = await Promise.all([hostelPage(hostel), currentGate()]);
  const reportUrl = absoluteUrl(paths.report(hostel.slug), { v: 'owner', ref: gate.shareRef });
  const discover = env().DISCOVER_BASE_URL ? paths.discover('hostel', hostel) : null;

  return (
    <>
      <section className="flex items-start gap-3 pt-2">
        <span aria-hidden className="bg-paper shadow-soft ring-line flex size-16 shrink-0 items-center justify-center rounded-2xl text-3xl ring-2">
          {TYPE_EMOJI[hostel.type]}
        </span>
        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-tight font-extrabold">{hostel.name}</h1>
          <p className="text-ink-soft">
            {hostel.area}, {hostel.city}
            {hostel.status !== 'user_added' && (
              <span className="bg-correct-soft text-correct ml-2 rounded-full px-2 py-0.5 text-xs font-bold">✓ {hostel.status}</span>
            )}
          </p>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Link
          href={paths.leaderboard(slugifyArea(hostel.area))}
          className="bg-paper ring-line flex flex-col items-center gap-1 rounded-2xl p-3 text-center ring-2"
        >
          {data.rank ? <RankBadge rank={data.rank} /> : <span className="text-2xl">—</span>}
          <span className="text-ink-soft text-xs font-bold">
            {data.rank ? fmt(copy.hostelPage.rank, { rank: data.rank, area: hostel.area }) : copy.hostelPage.unranked}
          </span>
        </Link>
        <div className="bg-paper ring-line flex flex-col items-center justify-center rounded-2xl p-3 text-center ring-2">
          <span className="font-display text-2xl font-extrabold tabular-nums">{data.players}</span>
          <span className="text-ink-soft text-xs font-bold">{copy.hostelPage.statPlayers}</span>
        </div>
        <div className="bg-paper ring-line flex flex-col items-center justify-center rounded-2xl p-3 text-center ring-2">
          <span className="font-display text-2xl font-extrabold tabular-nums">{data.quizzes}</span>
          <span className="text-ink-soft text-xs font-bold">{copy.hostelPage.statQuizzes}</span>
        </div>
      </div>

      <ButtonLink href={`/create?hostel=${hostel.slug}`} size="lg" className="mt-5">
        ✍️ {copy.hostelPage.playCta}
      </ButtonLink>

      {data.topQuizzes.length > 0 ? (
        <section className="mt-8" aria-labelledby="tq">
          <h2 id="tq" className="mb-3 text-xl font-extrabold">
            {copy.hostelPage.topQuizzes}
          </h2>
          <ul className="flex flex-col gap-2">
            {data.topQuizzes.map((q) => (
              <li key={q.slug}>
                <Link
                  href={paths.quiz(q.slug)}
                  className="bg-paper ring-line hover:ring-terracotta flex min-h-14 items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-2"
                >
                  <span className="font-display font-extrabold">{fmt(copy.quizLanding.title, { creator: q.creatorName })}</span>
                  <span className="text-terracotta shrink-0 text-sm font-bold">{fmt(copy.hostelPage.players, { n: q.plays })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <Card className="mt-8">
          <div className="flex items-center gap-3">
            <Mascot mood="sleepy" size={72} decorative />
            <p className="font-display font-bold">{copy.hostelPage.empty}</p>
          </div>
        </Card>
      )}

      {data.topGuessers.length > 0 && (
        <section className="mt-8" aria-labelledby="tg">
          <h2 id="tg" className="mb-3 text-xl font-extrabold">
            {copy.hostelPage.topGuessers}
          </h2>
          <ol className="flex flex-col gap-2">
            {data.topGuessers.map((g, i) => (
              <li key={i} className="bg-paper ring-line flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2 ring-2">
                <RankBadge rank={i + 1} />
                <span className="font-display flex-1 truncate font-extrabold">{g.name}</span>
                <span className="font-display text-terracotta text-sm font-extrabold tabular-nums">{fmt(copy.faceoff.points, { n: g.points })}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-8" aria-labelledby="vibes">
        <h2 id="vibes" className="mb-3 text-xl font-extrabold">
          {copy.hostelPage.funStats}
        </h2>
        {data.funStats.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {data.funStats.map((s) => (
              <li key={s.question} className="bg-paper ring-line flex items-center gap-3 rounded-2xl px-4 py-3 ring-2">
                <span aria-hidden className="text-3xl">
                  {s.emoji}
                </span>
                <span className="text-sm">
                  <span className="font-display text-terracotta text-lg font-extrabold">{s.pct}%</span> “{s.label}” ·{' '}
                  <span className="text-ink-soft">{s.question}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="bg-paper/70 text-ink-soft ring-line rounded-2xl px-4 py-4 text-center ring-2">
            🔒 {fmt(copy.hostelPage.funLocked, { n: data.respondents, k: PRIVACY.minRespondents })}
          </p>
        )}
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <ButtonLink href={paths.report(hostel.slug)} variant="accent" size="lg">
          📋 {copy.hostelPage.reportCta}
        </ButtonLink>
        <SendToOwnerButton hostelId={hostel.id} hostelName={hostel.name} reportUrl={reportUrl} variant="secondary" />
        {discover && (
          <a
            href={discover}
            className="rounded-chunky font-display text-terracotta inline-flex min-h-12 items-center justify-center px-5 font-extrabold underline underline-offset-4"
          >
            {copy.hostelPage.discover} →
          </a>
        )}
      </section>

      <div className="mt-6 flex justify-center">
        <FlagHostelButton hostelId={hostel.id} />
      </div>
      <Footer />
    </>
  );
}
