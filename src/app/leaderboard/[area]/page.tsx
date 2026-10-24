import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Footer } from '@/components/Footer';
import { HostelBoard } from '@/components/scoreboard/HostelBoard';
import { ListSkeleton } from '@/components/Skeleton';
import { ButtonLink } from '@/components/ui/Button';
import { Mascot } from '@/components/ui/Mascot';
import { fmt, getCopy } from '@/content/copy';
import { CITIES, slugifyArea } from '@/content/places';
import { paths } from '@/lib/urls';
import { areaLeaderboard } from '@/server/repos/stats';

type Props = PageProps<'/leaderboard/[area]'>;

function resolveArea(areaSlug: string, cityParam: string | undefined): { city: string; area: string } | null {
  const cities = cityParam && cityParam in CITIES ? [cityParam] : Object.keys(CITIES);
  for (const city of cities) {
    const area = CITIES[city].find((a) => slugifyArea(a) === areaSlug);
    if (area) return { city, area };
  }
  return cityParam && cityParam in CITIES ? { city: cityParam, area: areaSlug.replace(/-/g, ' ') } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area } = await params;
  return { title: `Hostel Face-off · ${area.replace(/-/g, ' ')}` };
}

export default function AreaFaceoffPage(props: Props) {
  return (
    <Suspense fallback={<ListSkeleton rows={6} />}>
      <AreaInner {...props} />
    </Suspense>
  );
}

async function AreaInner({ params, searchParams }: Props) {
  const copy = getCopy();
  const { area: areaSlug } = await params;
  const { city } = await searchParams;
  const resolved = resolveArea(areaSlug, typeof city === 'string' ? city : undefined);
  const hostels = resolved ? await areaLeaderboard(resolved.city, areaSlug) : [];
  const areaName = resolved?.area ?? areaSlug.replace(/-/g, ' ');

  return (
    <>
      <section className="flex items-center gap-3 pt-2">
        <Mascot mood={hostels.length ? 'celebrating' : 'sleepy'} size={90} />
        <div>
          <h1 className="text-3xl leading-tight font-extrabold">{copy.faceoff.title}</h1>
          <p className="text-ink-soft">{fmt(copy.faceoff.sub, { area: resolved ? `${areaName}, ${resolved.city}` : areaName })}</p>
        </div>
      </section>
      <div className="mt-5">
        <HostelBoard hostels={hostels} emptyText={copy.faceoff.empty} showArea={false} />
      </div>
      <ButtonLink href="/create" size="lg" className="mt-6">
        ✍️ {copy.landing.cta}
      </ButtonLink>
      <Link href={paths.leaderboard()} className="font-display text-terracotta mt-3 block min-h-11 py-3 text-center font-bold underline underline-offset-4">
        {copy.faceoff.subAll} →
      </Link>
      <Footer />
    </>
  );
}
