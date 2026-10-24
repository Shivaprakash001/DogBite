import { fmt, getCopy } from '@/content/copy';
import { RankBadge } from './RankBadge';

export interface ScoreRowData {
  rank: number;
  attemptId: string;
  playerName: string;
  score: number;
  hostelName?: string | null;
}

export function ScoreList({ rows, highlightAttemptIds = [], emptyText }: { rows: ScoreRowData[]; highlightAttemptIds?: string[]; emptyText: string }) {
  const copy = getCopy();
  if (rows.length === 0) {
    return <p className="bg-paper/70 text-ink-soft ring-line rounded-2xl px-4 py-5 text-center ring-2">{emptyText}</p>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {rows.map((r) => {
        const me = highlightAttemptIds.includes(r.attemptId);
        return (
          <li
            key={r.attemptId}
            className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2.5 ${me ? 'bg-latte ring-terracotta ring-4' : 'bg-paper ring-line ring-2'}`}
          >
            <RankBadge rank={r.rank} />
            <span className="min-w-0 flex-1">
              <span className="font-display block truncate font-extrabold">
                {r.playerName}
                {me && <span className="text-terracotta ml-1 text-sm font-bold">({copy.common.you})</span>}
              </span>
              {r.hostelName && <span className="text-ink-soft block truncate text-sm">{fmt(copy.quizLanding.from, { hostel: r.hostelName })}</span>}
            </span>
            <span className="bg-charcoal font-display shrink-0 rounded-full px-3 py-1 text-sm font-extrabold text-white tabular-nums">{r.score}/10</span>
          </li>
        );
      })}
    </ol>
  );
}
