import 'server-only';
import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { RESEARCH_TAGS, type ObjectiveTag, type QuestionKind, type ResearchTag, type Segment } from '@/content/types';
import type { PoolQuestion } from '@/lib/selection';
import { db, schema } from '../db';

export interface OptionRow {
  id: number;
  key: string;
  label: string;
  emoji: string;
  imageAsset: string | null;
}

export interface QuestionRow {
  id: number;
  key: string;
  textTemplate: string;
  objectiveTag: ObjectiveTag;
  kind: QuestionKind;
  segment: Segment;
  funScore: number;
  dataValue: number;
  sensitivity: number;
  active: boolean;
  options: OptionRow[];
}

export interface Bank {
  byKey: Map<string, QuestionRow>;
  byId: Map<number, QuestionRow>;
}

// The bank is small and changes rarely: keep it in memory briefly per instance.
const BANK_TTL_MS = 60_000;
let bankCache: { at: number; bank: Bank } | null = null;

export async function loadBank(): Promise<Bank> {
  if (bankCache && Date.now() - bankCache.at < BANK_TTL_MS) return bankCache.bank;
  const qs = await db().select().from(schema.questions);
  const os = await db().select().from(schema.options).orderBy(asc(schema.options.questionId), asc(schema.options.sort));
  const byId = new Map<number, QuestionRow>();
  for (const q of qs) {
    byId.set(q.id, {
      id: q.id,
      key: q.key,
      textTemplate: q.textTemplate,
      objectiveTag: q.objectiveTag as ObjectiveTag,
      kind: q.kind,
      segment: q.segment,
      funScore: q.funScore,
      dataValue: q.dataValue,
      sensitivity: q.sensitivity,
      active: q.active,
      options: [],
    });
  }
  for (const o of os) {
    byId.get(o.questionId)?.options.push({ id: o.id, key: o.key, label: o.label, emoji: o.emoji, imageAsset: o.imageAsset });
  }
  const bank = { byId, byKey: new Map([...byId.values()].map((q) => [q.key, q])) };
  bankCache = { at: Date.now(), bank };
  return bank;
}

export function invalidateBank(): void {
  bankCache = null;
}

/** Bank + live bandit/health counters, shaped for lib/selection. */
export async function loadPool(): Promise<PoolQuestion[]> {
  const bank = await loadBank();
  const stats = await db().select().from(schema.questionStats);
  const statsById = new Map(stats.map((s) => [s.questionId, s]));
  return [...bank.byId.values()].map((q) => {
    const s = statsById.get(q.id);
    return {
      key: q.key,
      objective_tag: q.objectiveTag,
      kind: q.kind,
      segment: q.segment,
      fun_score: q.funScore,
      data_value: q.dataValue,
      sensitivity: q.sensitivity,
      active: q.active,
      optionKeys: q.options.map((o) => o.key),
      successes: s?.successes ?? 0,
      failures: s?.failures ?? 0,
      impressions: s?.impressions ?? 0,
      skips: s?.skips ?? 0,
    };
  });
}

type StatField = 'impressions' | 'picks' | 'skips' | 'successes' | 'failures';

export async function bumpStats(questionIds: readonly number[], field: StatField, by = 1): Promise<void> {
  if (questionIds.length === 0) return;
  const col = schema.questionStats[field];
  // Upsert so newly added questions don't need a seed row first.
  await db()
    .insert(schema.questionStats)
    .values(questionIds.map((questionId) => ({ questionId, [field]: by })))
    .onConflictDoUpdate({ target: schema.questionStats.questionId, set: { [field]: sql`${col} + ${by}` } });
}

/**
 * Research responses already collected per objective in a stratum
 * (city × hostel type). Creators without a hostel form their own stratum.
 */
export async function coverageFor(city: string | null, hostelType: string | null): Promise<Partial<Record<ResearchTag, number>>> {
  const d = db();
  const stratum =
    city && hostelType
      ? and(eq(schema.hostels.city, city), eq(schema.hostels.type, hostelType as 'boys' | 'girls' | 'coed' | 'unknown'))
      : sql`${schema.creators.hostelId} is null`;
  const rows = await d
    .select({ tag: schema.questions.objectiveTag, n: sql<number>`count(*)::int` })
    .from(schema.quizQuestions)
    .innerJoin(schema.quizzes, eq(schema.quizzes.id, schema.quizQuestions.quizId))
    .innerJoin(schema.creators, eq(schema.creators.id, schema.quizzes.creatorId))
    .leftJoin(schema.hostels, eq(schema.hostels.id, schema.creators.hostelId))
    .innerJoin(schema.questions, eq(schema.questions.id, schema.quizQuestions.questionId))
    .where(
      and(
        eq(schema.quizzes.status, 'live'),
        isNotNull(schema.quizQuestions.creatorOptionId),
        inArray(schema.questions.objectiveTag, [...RESEARCH_TAGS]),
        stratum,
      ),
    )
    .groupBy(schema.questions.objectiveTag);
  return Object.fromEntries(rows.map((r) => [r.tag, r.n]));
}
