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
    return <p className="rounded-2xl bg-paper/70 px-4 py-5 text-center text-ink-soft ring-2 ring-line">{emptyText}</p>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {rows.map((r) => {
        const me = highlightAttemptIds.includes(r.attemptId);
        return (
          <li key={r.attemptId} className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2.5 ${me ? 'bg-latte ring-4 ring-terracotta' : 'bg-paper ring-2 ring-line'}`}>
            <RankBadge rank={r.rank} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display font-extrabold">
                {r.playerName}
                {me && <span className="ml-1 text-sm font-bold text-terracotta">({copy.common.you})</span>}
              </span>
              {r.hostelName && <span className="block truncate text-sm text-ink-soft">{fmt(copy.quizLanding.from, { hostel: r.hostelName })}</span>}
            </span>
            <span className="shrink-0 rounded-full bg-charcoal px-3 py-1 font-display text-sm font-extrabold text-white tabular-nums">{r.score}/10</span>
          </li>
        );
      })}
    </ol>
  );
}
