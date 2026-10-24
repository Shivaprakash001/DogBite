const MEDALS: Record<number, { emoji: string; cls: string }> = {
  1: { emoji: '🥇', cls: 'bg-marigold' },
  2: { emoji: '🥈', cls: 'bg-[#e4e1dc]' },
  3: { emoji: '🥉', cls: 'bg-dusty' },
};

export function RankBadge({ rank }: { rank: number }) {
  const medal = MEDALS[rank];
  return (
    <span
      className={`font-display flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold tabular-nums ${medal ? medal.cls : 'bg-latte text-charcoal'}`}
      aria-label={`Rank ${rank}`}
    >
      {medal ? (
        <span aria-hidden className="text-xl">
          {medal.emoji}
        </span>
      ) : (
        rank
      )}
    </span>
  );
}
