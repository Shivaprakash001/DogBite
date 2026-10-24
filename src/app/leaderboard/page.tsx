import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Footer } from '@/components/Footer';
import { HostelBoard } from '@/components/scoreboard/HostelBoard';
import { ListSkeleton } from '@/components/Skeleton';
import { Mascot } from '@/components/ui/Mascot';
import { getCopy } from '@/content/copy';
import { paths } from '@/lib/urls';
import { activeAreas, globalLeaderboard } from '@/server/repos/stats';

export const metadata: Metadata = { title: 'Hostel Face-off' };

export default function FaceoffPage() {
  const copy = getCopy();
  return (
    <>
      <section className="flex items-center gap-3 pt-2">
        <Mascot mood="celebrating" size={90} />
        <div>
          <h1 className="text-3xl leading-tight font-extrabold">{copy.faceoff.title}</h1>
          <p className="text-ink-soft">{copy.faceoff.subAll}</p>
        </div>
      </section>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Boards />
      </Suspense>
      <Footer />
    </>
  );
}

async function Boards() {
  await connection();
  const copy = getCopy();
  const [top, areas] = await Promise.all([globalLeaderboard(20), activeAreas()]);
  return (
    <>
      {areas.length > 0 && (
        <nav className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4" aria-label={copy.faceoff.areaPicker}>
          {areas.map((a) => (
            <Link key={`${a.city}-${a.areaSlug}`} href={`${paths.leaderboard(a.areaSlug)}?city=${encodeURIComponent(a.city)}`} className="min-h-11 shrink-0 rounded-full bg-paper px-4 py-2.5 font-display text-sm font-bold ring-2 ring-line hover:ring-terracotta">
              📍 {a.area}
            </Link>
          ))}
        </nav>
      )}
      <div className="mt-5">
        <HostelBoard hostels={top} emptyText={copy.faceoff.empty} />
      </div>
    </>
  );
}
