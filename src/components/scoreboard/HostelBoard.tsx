import Link from 'next/link';
import { fmt, getCopy } from '@/content/copy';
import { paths } from '@/lib/urls';
import type { RankedHostel } from '@/server/repos/stats';
import { RankBadge } from './RankBadge';

export function HostelBoard({ hostels, emptyText, showArea = true }: { hostels: RankedHostel[]; emptyText: string; showArea?: boolean }) {
  const copy = getCopy();
  if (hostels.length === 0) {
    return <p className="bg-paper/70 text-ink-soft ring-line ring-dashed rounded-2xl px-4 py-5 text-center ring-2">{emptyText}</p>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {hostels.map((h) => (
        <li key={h.id}>
          <Link
            href={paths.hostel(h.slug)}
            className="bg-paper ring-line hover:ring-terracotta flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2.5 ring-2 transition"
          >
            <RankBadge rank={h.rank} />
            <span className="min-w-0 flex-1">
              <span className="font-display block truncate font-extrabold">{h.name}</span>
              {showArea && <span className="text-ink-soft block truncate text-sm">{h.area}</span>}
            </span>
            <span className="font-display text-terracotta shrink-0 text-sm font-extrabold tabular-nums">{fmt(copy.faceoff.points, { n: h.points })}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
