import { RESULT_TIERS, type ResultTier } from '@/content/results';
import { seededRng, shuffle } from './random';

// Pure scoring functions. The server is the only place answers are compared:
// correct options never reach the client before an answer is submitted.

export function tierForScore(score: number, tiers: ResultTier[] = RESULT_TIERS): ResultTier {
  const clamped = Math.max(0, Math.min(10, Math.round(score)));
  const tier = tiers.find((t) => clamped >= t.min && clamped <= t.max);
  if (!tier) throw new Error(`No result tier covers score ${clamped}`);
  return tier;
}

/** Stable per-attempt message choice so a refresh shows the same line. */
export function tierMessage(tier: ResultTier, seed: string): string {
  const rng = seededRng(`${seed}:msg`);
  return tier.messages[Math.floor(rng() * tier.messages.length)];
}

/**
 * Two options for the player: the creator's real answer plus one distractor from
 * the same question, seeded by attempt so refresh never rerolls.
 */
export function pickShownOptions<T extends string | number>(
  attemptId: string,
  quizQuestionId: string | number,
  creatorOptionId: T,
  allOptionIds: readonly T[],
): [T, T] {
  const rng = seededRng(`${attemptId}:${quizQuestionId}`);
  const distractors = allOptionIds.filter((id) => id !== creatorOptionId);
  if (distractors.length === 0) throw new Error('Question needs at least 2 options');
  const distractor = distractors[Math.floor(rng() * distractors.length)];
  const pair = shuffle([creatorOptionId, distractor], rng);
  return [pair[0], pair[1]];
}

export interface SubmittedAnswer<Q, O> {
  quizQuestionId: Q;
  chosenOptionId: O | null;
}

/**
 * Score an attempt from stored answers. Handles duplicates (first answer wins),
 * skipped questions (null → wrong), answers for unknown questions (ignored) and
 * questions never answered (wrong).
 */
export function scoreAttempt<Q, O>(
  answers: readonly SubmittedAnswer<Q, O>[],
  answerKey: ReadonlyMap<Q, O>,
): { score: number; total: number; correct: Set<Q> } {
  const seen = new Set<Q>();
  const correct = new Set<Q>();
  for (const a of answers) {
    if (!answerKey.has(a.quizQuestionId) || seen.has(a.quizQuestionId)) continue;
    seen.add(a.quizQuestionId);
    if (a.chosenOptionId !== null && answerKey.get(a.quizQuestionId) === a.chosenOptionId) {
      correct.add(a.quizQuestionId);
    }
  }
  return { score: correct.size, total: answerKey.size, correct };
}

export interface BoardRow {
  sessionId: string;
  attemptId: string;
  playerName: string;
  score: number;
  totalMs: number;
  finishedAt: Date;
  hostelName?: string | null;
}

/** Tie-break order: higher score, then faster total time, then earlier finish. */
export function compareBoardRows(a: BoardRow, b: BoardRow): number {
  return b.score - a.score || a.totalMs - b.totalMs || a.finishedAt.getTime() - b.finishedAt.getTime();
}

/** Keep each player's best attempt (retries allowed) and rank. */
export function rankScoreboard(rows: readonly BoardRow[]): (BoardRow & { rank: number })[] {
  const best = new Map<string, BoardRow>();
  for (const row of rows) {
    const current = best.get(row.sessionId);
    if (!current || compareBoardRows(row, current) < 0) best.set(row.sessionId, row);
  }
  return [...best.values()].sort(compareBoardRows).map((row, i) => ({ ...row, rank: i + 1 }));
}
