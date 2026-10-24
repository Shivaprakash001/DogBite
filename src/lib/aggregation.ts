import { PRIVACY } from '@/config';

// Aggregation + privacy floor (§8.5, §11.3, §13). Pure functions only.

export type Distribution = Record<string, number>;

export function distribution(values: readonly string[]): Distribution {
  const out: Distribution = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

export function total(dist: Distribution): number {
  return Object.values(dist).reduce((a, b) => a + b, 0);
}

/** k-anonymity floor: an aggregate is only shown when at least k people contributed. */
export function meetsK(respondents: number, k: number = PRIVACY.minRespondents): boolean {
  return respondents >= k;
}

export interface PublicShare {
  key: string;
  pct: number;
}

/**
 * Percentages for public display. Returns null under the k floor. Rounded to `step`
 * so a single respondent can't be inferred from a precise percentage.
 */
export function publicShares(
  dist: Distribution,
  respondents: number = total(dist),
  k: number = PRIVACY.minRespondents,
  step: number = PRIVACY.percentStep,
): PublicShare[] | null {
  if (!meetsK(respondents, k)) return null;
  const n = total(dist);
  if (n === 0) return null;
  return Object.entries(dist)
    .map(([key, count]) => ({ key, pct: Math.round(((count / n) * 100) / step) * step }))
    .filter((s) => s.pct > 0)
    .sort((a, b) => b.pct - a.pct || a.key.localeCompare(b.key));
}

/** Mean of a 1–5 rating where option keys encode the value ('one'…'five'). */
const RATING_VALUES: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
export function ratingAverage(dist: Distribution): number | null {
  let sum = 0;
  let n = 0;
  for (const [key, count] of Object.entries(dist)) {
    const v = RATING_VALUES[key];
    if (v === undefined) continue;
    sum += v * count;
    n += count;
  }
  return n === 0 ? null : Math.round((sum / n) * 10) / 10;
}

/** Wilson score interval for a proportion. Returns [low, high] in 0..1. */
export function wilson(successes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 0];
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, (centre - margin) / denom), Math.min(1, (centre + margin) / denom)];
}

export interface CreatorGuesses {
  creatorId: string;
  /** What the creator said about themselves. */
  stated: string;
  /** What each friend guessed. */
  guesses: readonly string[];
}

export interface TruthGap {
  respondents: number;
  stated: Distribution;
  /** Distribution of each creator's modal friend guess (ties → stated answer wins, then alphabetical). */
  perceived: Distribution;
  guesses: number;
  agreementRate: number | null;
  /** Creators whose friends mostly guessed something else. */
  discrepancies: number;
}

/** Stated vs peer-perceived answers for one research question. */
export function truthGap(rows: readonly CreatorGuesses[]): TruthGap {
  const stated: Distribution = {};
  const perceived: Distribution = {};
  let guesses = 0;
  let agree = 0;
  let discrepancies = 0;
  for (const row of rows) {
    stated[row.stated] = (stated[row.stated] ?? 0) + 1;
    if (row.guesses.length === 0) continue;
    const counts = distribution(row.guesses);
    const modal = Object.entries(counts).sort(
      ([ka, a], [kb, b]) => b - a || Number(kb === row.stated) - Number(ka === row.stated) || ka.localeCompare(kb),
    )[0][0];
    perceived[modal] = (perceived[modal] ?? 0) + 1;
    if (modal !== row.stated) discrepancies++;
    guesses += row.guesses.length;
    agree += counts[row.stated] ?? 0;
  }
  return {
    respondents: rows.length,
    stated,
    perceived,
    guesses,
    agreementRate: guesses === 0 ? null : agree / guesses,
    discrepancies,
  };
}

export type Decision = 'build' | 'wait' | 'drop' | 'insufficient';

export interface DecisionMetric {
  value: number | null;
  threshold: number;
  sample: number;
}

/**
 * build: every metric clears its bar; drop: every metric is under half its bar;
 * otherwise wait. Never decide without enough sample.
 */
export function featureDecision(metrics: readonly DecisionMetric[], minSample: number): Decision {
  if (metrics.some((m) => m.value === null || m.sample < minSample)) return 'insufficient';
  if (metrics.every((m) => (m.value ?? 0) >= m.threshold)) return 'build';
  if (metrics.every((m) => (m.value ?? 0) < m.threshold / 2)) return 'drop';
  return 'wait';
}
