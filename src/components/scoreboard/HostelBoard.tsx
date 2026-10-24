import Link from 'next/link';
import { fmt, getCopy } from '@/content/copy';
import { paths } from '@/lib/urls';
import type { RankedHostel } from '@/server/repos/stats';
import { RankBadge } from './RankBadge';

export function HostelBoard({ hostels, emptyText, showArea = true }: { hostels: RankedHostel[]; emptyText: string; showArea?: boolean }) {
  const copy = getCopy();
  if (hostels.length === 0) {
    return <p className="rounded-2xl bg-paper/70 px-4 py-5 text-center text-ink-soft ring-2 ring-line ring-dashed">{emptyText}</p>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {hostels.map((h) => (
        <li key={h.id}>
          <Link href={paths.hostel(h.slug)} className="flex min-h-14 items-center gap-3 rounded-2xl bg-paper px-3 py-2.5 ring-2 ring-line transition hover:ring-terracotta">
            <RankBadge rank={h.rank} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display font-extrabold">{h.name}</span>
              {showArea && <span className="block truncate text-sm text-ink-soft">{h.area}</span>}
            </span>
            <span className="shrink-0 font-display text-sm font-extrabold text-terracotta tabular-nums">{fmt(copy.faceoff.points, { n: h.points })}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
