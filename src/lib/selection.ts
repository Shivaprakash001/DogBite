import { QUIZ, SELECTION } from '@/config';
import { isResearchTag, type ObjectiveTag, type QuestionKind, type ResearchTag, type Segment } from '@/content/types';
import { sampleBeta, shuffle, type Rng } from './random';

// Candidate generation for the creator (§8.4). Pure: all data comes in as arguments.

export interface PoolQuestion {
  key: string;
  objective_tag: ObjectiveTag;
  kind: QuestionKind;
  segment: Segment;
  fun_score: number;
  data_value: number;
  sensitivity: number;
  active: boolean;
  optionKeys: readonly string[];
  /** Bandit evidence: answered through to quiz completion. */
  successes: number;
  /** Bandit evidence: skipped / dropped at this question. */
  failures: number;
  impressions: number;
  skips: number;
}

export type HostelSegment = 'boys' | 'girls' | 'coed' | null;

export interface SelectionContext {
  /** Creator's hostel type; null when unknown or playing solo. */
  segment: HostelSegment;
  /** Keys already shown, picked or used, never offered again in this draft. */
  excludeKeys: ReadonlySet<string>;
  /** Responses already collected per research objective in the creator's stratum. */
  coverage: Partial<Record<ResearchTag, number>>;
  rng: Rng;
}

type SelectionConfig = typeof SELECTION;

export interface ScoredQuestion extends PoolQuestion {
  need: number;
  bandit: number;
  score: number;
}

export function isRetired(q: Pick<PoolQuestion, 'impressions' | 'skips'>, cfg: SelectionConfig = SELECTION): boolean {
  return q.impressions >= cfg.retire.minImpressions && q.skips / q.impressions > cfg.retire.skipRate;
}

export function eligiblePool(pool: readonly PoolQuestion[], ctx: Pick<SelectionContext, 'segment' | 'excludeKeys'>, cfg: SelectionConfig = SELECTION): PoolQuestion[] {
  return pool.filter(
    (q) =>
      q.active &&
      q.sensitivity <= 1 &&
      (q.segment === 'all' || q.segment === ctx.segment) &&
      !ctx.excludeKeys.has(q.key) &&
      !isRetired(q, cfg),
  );
}

export function needScore(q: PoolQuestion, coverage: SelectionContext['coverage'], cfg: SelectionConfig = SELECTION): number {
  if (!isResearchTag(q.objective_tag)) return 0;
  const n = coverage[q.objective_tag] ?? 0;
  return q.data_value / (1 + n / cfg.targetPerStratum);
}

export function scoreQuestion(q: PoolQuestion, ctx: SelectionContext, cfg: SelectionConfig = SELECTION): ScoredQuestion {
  const need = needScore(q, ctx.coverage, cfg);
  const bandit = sampleBeta(1 + q.successes, 1 + q.failures, ctx.rng);
  const { weights: w } = cfg;
  return { ...q, need, bandit, score: w.bandit * bandit + w.fun * q.fun_score + w.need * need };
}

export function optionJaccard(a: readonly string[], b: readonly string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  let shared = 0;
  for (const k of sa) if (sb.has(k)) shared++;
  const union = sa.size + sb.size - shared;
  return union === 0 ? 0 : shared / union;
}

function takeDiverse(
  sorted: ScoredQuestion[],
  count: number,
  chosen: ScoredQuestion[],
  cfg: SelectionConfig,
  limitObjective: boolean,
): ScoredQuestion[] {
  const taken: ScoredQuestion[] = [];
  for (const q of sorted) {
    if (taken.length >= count) break;
    const all = [...chosen, ...taken];
    if (limitObjective && all.filter((c) => c.objective_tag === q.objective_tag).length >= cfg.maxSameObjective) continue;
    if (all.some((c) => optionJaccard(c.optionKeys, q.optionKeys) >= cfg.nearDuplicateJaccard)) continue;
    taken.push(q);
  }
  return taken;
}

/**
 * Build the creator's candidate batch: ~14 fun, ~5 research, ~1 rating, diverse,
 * in shuffled display order. Short buckets are backfilled with fun questions.
 */
export function buildCandidates(
  pool: readonly PoolQuestion[],
  ctx: SelectionContext,
  size: number = QUIZ.candidatesPerBatch,
  cfg: SelectionConfig = SELECTION,
): ScoredQuestion[] {
  const scored = eligiblePool(pool, ctx, cfg)
    .map((q) => scoreQuestion(q, ctx, cfg))
    .sort((a, b) => b.score - a.score);

  const byKind = (k: QuestionKind) => scored.filter((q) => q.kind === k);
  const quota = scaleQuota(cfg.compose, size);

  const chosen: ScoredQuestion[] = [];
  chosen.push(...takeDiverse(byKind('rating'), quota.rating, chosen, cfg, true));
  chosen.push(...takeDiverse(byKind('research'), quota.research, chosen, cfg, true));
  chosen.push(...takeDiverse(byKind('fun'), quota.fun, chosen, cfg, false));

  if (chosen.length < size) {
    // Backfill: fun first, then anything left, relaxing the diversity rules.
    const rest = [...byKind('fun'), ...scored.filter((q) => q.kind !== 'fun')].filter((q) => !chosen.includes(q));
    chosen.push(...rest.slice(0, size - chosen.length));
  }
  return shuffle(chosen.slice(0, size), ctx.rng);
}

function scaleQuota(compose: SelectionConfig['compose'], size: number) {
  const total = compose.fun + compose.research + compose.rating;
  if (size === total) return { ...compose };
  const rating = Math.min(compose.rating, size);
  const research = Math.round((compose.research / total) * size);
  return { rating, research, fun: Math.max(0, size - rating - research) };
}

export interface CompositionItem {
  key: string;
  objective_tag: ObjectiveTag | string;
  kind: QuestionKind | string;
}

export type CompositionError = 'count' | 'duplicate' | 'research_cap' | 'rating_cap';

/** Server-side composition rule (§8.3). Never trust the UI for this. */
export function validateComposition(items: readonly CompositionItem[], expected: number = QUIZ.questionsPerQuiz): CompositionError[] {
  const errors: CompositionError[] = [];
  if (items.length !== expected) errors.push('count');
  if (new Set(items.map((i) => i.key)).size !== items.length) errors.push('duplicate');
  if (items.filter((i) => isResearchTag(i.objective_tag)).length > QUIZ.maxResearchPerQuiz) errors.push('research_cap');
  if (items.filter((i) => i.kind === 'rating').length > QUIZ.maxRatingPerQuiz) errors.push('rating_cap');
  return errors;
}

/** Would adding `candidate` to `current` break a cap? Used by picker UI and server alike. */
export function canAdd(current: readonly CompositionItem[], candidate: CompositionItem): CompositionError | null {
  if (current.length >= QUIZ.questionsPerQuiz) return 'count';
  if (current.some((c) => c.key === candidate.key)) return 'duplicate';
  if (isResearchTag(candidate.objective_tag) && current.filter((c) => isResearchTag(c.objective_tag)).length >= QUIZ.maxResearchPerQuiz) {
    return 'research_cap';
  }
  if (candidate.kind === 'rating' && current.some((c) => c.kind === 'rating')) return 'rating_cap';
  return null;
}

/**
 * Replacement for a question the creator skipped while answering. Prefers the same
 * kind, never breaks the quiz's composition caps. Returns null when nothing fits.
 */
export function pickReplacement(
  pool: readonly PoolQuestion[],
  ctx: SelectionContext,
  quizWithoutSkipped: readonly CompositionItem[],
  skipped: CompositionItem,
  cfg: SelectionConfig = SELECTION,
): ScoredQuestion | null {
  const scored = eligiblePool(pool, ctx, cfg)
    .map((q) => scoreQuestion(q, ctx, cfg))
    .filter((q) => canAdd(quizWithoutSkipped, q) === null)
    .sort((a, b) => Number(b.kind === skipped.kind) - Number(a.kind === skipped.kind) || b.score - a.score);
  return scored[0] ?? null;
}
