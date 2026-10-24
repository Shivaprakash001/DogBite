import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { QUIZ } from '@/config';
import type { Gender } from '@/content/types';
import { isResearchTag } from '@/content/types';
import { categoryFor, type CandidateDTO, type DraftQuestionDTO, type DraftState, type HostelDTO } from '@/lib/api-types';
import { slugify } from '@/lib/hostels';
import { seededRng } from '@/lib/random';
import { buildCandidates, pickReplacement, validateComposition, type CompositionItem, type HostelSegment } from '@/lib/selection';
import { renderQuestionText } from '@/lib/text';
import { db, schema } from '../db';
import { ApiError } from '../http';
import { recordEvent } from '../track';
import { getHostelById, toHostelDTO } from './hostels';
import { bumpStats, coverageFor, loadBank, loadPool, type QuestionRow } from './questions';

// Creator draft lifecycle (§6.3). Every step autosaves; state is derived from the
// rows so a returning creator resumes exactly where they left off.

type Creator = typeof schema.creators.$inferSelect;
type Quiz = typeof schema.quizzes.$inferSelect;
type Draft = { creator: Creator; quiz: Quiz };

async function currentDraft(sid: string): Promise<Draft | null> {
  const [row] = await db()
    .select({ creator: schema.creators, quiz: schema.quizzes })
    .from(schema.quizzes)
    .innerJoin(schema.creators, eq(schema.creators.id, schema.quizzes.creatorId))
    .where(and(eq(schema.creators.sessionId, sid), eq(schema.quizzes.status, 'draft')))
    .orderBy(desc(schema.quizzes.createdAt))
    .limit(1);
  return row ?? null;
}

async function requireDraft(sid: string): Promise<Draft> {
  const draft = await currentDraft(sid);
  if (!draft) throw new ApiError(404, 'no_draft');
  return draft;
}

function newSlug(name: string): string {
  const base = slugify(name).slice(0, 14) || 'quiz';
  return `${base}-${randomBytes(4)
    .toString('base64url')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 5)
    .padEnd(5, 'x')}`;
}

function toCandidate(q: QuestionRow, name: string, gender: Gender | null): CandidateDTO {
  return {
    key: q.key,
    text: renderQuestionText(q.textTemplate, name, gender),
    kind: q.kind,
    objectiveTag: q.objectiveTag,
    category: categoryFor(q.kind, q.objectiveTag),
    previewEmojis: q.options.slice(0, 4).map((o) => o.emoji),
  };
}

function toDraftQuestion(qq: { id: number; position: number }, q: QuestionRow, name: string, gender: Gender | null): DraftQuestionDTO {
  return {
    quizQuestionId: qq.id,
    position: qq.position,
    key: q.key,
    text: renderQuestionText(q.textTemplate, name, gender),
    kind: q.kind,
    objectiveTag: q.objectiveTag,
    options: q.options.map((o) => ({ id: o.id, key: o.key, label: o.label, emoji: o.emoji, image: o.imageAsset })),
  };
}

async function quizQuestionRows(quizId: string) {
  return db().select().from(schema.quizQuestions).where(eq(schema.quizQuestions.quizId, quizId)).orderBy(asc(schema.quizQuestions.position));
}

export async function getDraftState(sid: string): Promise<DraftState> {
  const draft = await currentDraft(sid);
  if (!draft) {
    const [last] = await db()
      .select({ name: schema.creators.displayName })
      .from(schema.creators)
      .where(eq(schema.creators.sessionId, sid))
      .orderBy(desc(schema.creators.createdAt))
      .limit(1);
    return emptyState('name', last?.name ?? null);
  }
  const { creator, quiz } = draft;
  const hostel = creator.hostelId ? await getHostelById(creator.hostelId) : null;
  const base: DraftState = {
    ...emptyState('mascot', null),
    name: creator.displayName,
    gender: creator.gender,
    hostel: hostel ? toHostelDTO(hostel) : null,
    slug: quiz.slug,
    shufflesLeft: Math.max(0, QUIZ.maxShuffles - quiz.shufflesUsed),
  };
  if (!creator.gender) return base;
  if (!creator.hostelDecided) return { ...base, step: 'hostel' };

  const bank = await loadBank();
  if (!quiz.picksConfirmedAt) {
    const candidates = quiz.candidateKeys.flatMap((k) => {
      const q = bank.byKey.get(k);
      return q ? [toCandidate(q, creator.displayName, creator.gender)] : [];
    });
    return { ...base, step: 'pick', candidates };
  }

  const rows = await quizQuestionRows(quiz.id);
  const answeredCount = rows.filter((r) => r.creatorOptionId !== null).length;
  const next = rows.find((r) => r.creatorOptionId === null);
  if (next) {
    const q = bank.byId.get(next.questionId)!;
    return { ...base, step: 'answer', answeredCount, answering: toDraftQuestion(next, q, creator.displayName, creator.gender) };
  }
  return { ...base, step: 'publish', answeredCount };
}

function emptyState(step: DraftState['step'], suggestedName: string | null): DraftState {
  return {
    step,
    name: null,
    gender: null,
    hostel: null,
    slug: null,
    candidates: [],
    shufflesLeft: QUIZ.maxShuffles,
    answering: null,
    answeredCount: 0,
    suggestedName,
  };
}

export async function startDraft(sid: string, name: string): Promise<DraftState> {
  const draft = await currentDraft(sid);
  if (draft) {
    await db().update(schema.creators).set({ displayName: name }).where(eq(schema.creators.id, draft.creator.id));
    return getDraftState(sid);
  }
  await db().transaction(async (tx) => {
    const [creator] = await tx.insert(schema.creators).values({ sessionId: sid, displayName: name }).returning();
    for (let i = 0; i < 5; i++) {
      const inserted = await tx
        .insert(schema.quizzes)
        .values({ slug: newSlug(name), creatorId: creator.id })
        .onConflictDoNothing()
        .returning({ id: schema.quizzes.id });
      if (inserted.length) return;
    }
    throw new ApiError(500, 'slug_collision');
  });
  return getDraftState(sid);
}

export async function setMascot(sid: string, gender: Gender): Promise<DraftState> {
  const { creator } = await requireDraft(sid);
  await db().update(schema.creators).set({ gender }).where(eq(schema.creators.id, creator.id));
  return getDraftState(sid);
}

function segmentFor(type: HostelDTO['type'] | undefined): HostelSegment {
  return type === 'boys' || type === 'girls' || type === 'coed' ? type : null;
}

async function generateBatch(draft: Draft, keep: readonly string[]): Promise<string[]> {
  const hostel = draft.creator.hostelId ? await getHostelById(draft.creator.hostelId) : null;
  const pool = await loadPool();
  const coverage = await coverageFor(hostel?.city ?? null, hostel?.type ?? null);
  const segment = segmentFor(hostel?.type);
  const rng = seededRng(randomBytes(4).readUInt32LE(0));
  const size = QUIZ.candidatesPerBatch - keep.length;

  let batch = buildCandidates(pool, { segment, excludeKeys: new Set([...draft.quiz.shownKeys, ...keep]), coverage, rng }, size);
  if (batch.length < QUIZ.questionsPerQuiz) {
    // Bank nearly exhausted: allow earlier, unpicked candidates to come back.
    batch = buildCandidates(pool, { segment, excludeKeys: new Set([...draft.quiz.candidateKeys, ...keep]), coverage, rng }, size);
  }
  return batch.map((q) => q.key);
}

async function storeBatch(draft: Draft, keep: readonly string[], fresh: string[], shufflesUsed: number) {
  const bank = await loadBank();
  const candidateKeys = [...keep, ...fresh];
  const shownKeys = [...new Set([...draft.quiz.shownKeys, ...fresh])];
  await db().update(schema.quizzes).set({ candidateKeys, shownKeys, shufflesUsed }).where(eq(schema.quizzes.id, draft.quiz.id));
  await bumpStats(
    fresh.map((k) => bank.byKey.get(k)!.id),
    'impressions',
  );
  recordEvent(draft.creator.sessionId, 'candidates_shown', { question_keys: fresh.join(',') });
}

export async function setHostel(sid: string, hostelId: string | null): Promise<DraftState> {
  const draft = await requireDraft(sid);
  if (hostelId && !(await getHostelById(hostelId))) throw new ApiError(404, 'hostel_not_found');
  await db().update(schema.creators).set({ hostelId, hostelDecided: true }).where(eq(schema.creators.id, draft.creator.id));
  const fresh = { ...draft, creator: { ...draft.creator, hostelId, hostelDecided: true } };
  if (!draft.quiz.picksConfirmedAt && draft.quiz.candidateKeys.length === 0) {
    await storeBatch(fresh, [], await generateBatch(fresh, []), draft.quiz.shufflesUsed);
  }
  return getDraftState(sid);
}

export async function shuffleCandidates(sid: string, keep: readonly string[]): Promise<DraftState> {
  const draft = await requireDraft(sid);
  if (draft.quiz.picksConfirmedAt) throw new ApiError(409, 'already_picked');
  if (draft.quiz.shufflesUsed >= QUIZ.maxShuffles) throw new ApiError(409, 'no_shuffles_left');
  const kept = keep.filter((k) => draft.quiz.shownKeys.includes(k)).slice(0, QUIZ.questionsPerQuiz);
  const fresh = await generateBatch(draft, kept);
  await storeBatch(draft, kept, fresh, draft.quiz.shufflesUsed + 1);
  recordEvent(sid, 'candidate_shuffle', { count: draft.quiz.shufflesUsed + 1 });
  return getDraftState(sid);
}

export async function confirmPicks(sid: string, keys: readonly string[]): Promise<DraftState> {
  const draft = await requireDraft(sid);
  if (draft.quiz.picksConfirmedAt) throw new ApiError(409, 'already_picked');
  const bank = await loadBank();
  const picked = keys.map((k) => bank.byKey.get(k));
  if (picked.some((q, i) => !q || !draft.quiz.shownKeys.includes(keys[i]) || !q.active || q.sensitivity > 1)) {
    throw new ApiError(400, 'invalid_pick');
  }
  const rows = picked as QuestionRow[];
  const errors = validateComposition(rows.map((q) => ({ key: q.key, objective_tag: q.objectiveTag, kind: q.kind })));
  if (errors.length) throw new ApiError(422, errors[0]);

  await db().transaction(async (tx) => {
    await tx.insert(schema.quizQuestions).values(rows.map((q, position) => ({ quizId: draft.quiz.id, questionId: q.id, position })));
    await tx
      .update(schema.quizzes)
      .set({ picksConfirmedAt: sql`now()` })
      .where(eq(schema.quizzes.id, draft.quiz.id));
  });
  await bumpStats(
    rows.map((q) => q.id),
    'picks',
  );
  return getDraftState(sid);
}

async function draftQuestion(sid: string, quizQuestionId: number) {
  const draft = await requireDraft(sid);
  const [qq] = await db()
    .select()
    .from(schema.quizQuestions)
    .where(and(eq(schema.quizQuestions.id, quizQuestionId), eq(schema.quizQuestions.quizId, draft.quiz.id)));
  if (!qq) throw new ApiError(404, 'question_not_in_quiz');
  return { draft, qq };
}

export async function answerQuestion(sid: string, quizQuestionId: number, optionId: number, ms: number): Promise<DraftState> {
  const { qq } = await draftQuestion(sid, quizQuestionId);
  if (qq.creatorOptionId !== null) return getDraftState(sid); // idempotent on double tap / retry
  const bank = await loadBank();
  const q = bank.byId.get(qq.questionId)!;
  const option = q.options.find((o) => o.id === optionId);
  if (!option) throw new ApiError(400, 'invalid_option');
  await db()
    .update(schema.quizQuestions)
    .set({ creatorOptionId: optionId, answerMs: Math.min(Math.max(0, Math.round(ms)), 600_000) })
    .where(and(eq(schema.quizQuestions.id, qq.id), sql`${schema.quizQuestions.creatorOptionId} is null`));
  recordEvent(sid, 'creator_answer', { question_key: q.key, option_key: option.key, ms: Math.round(ms) });
  return getDraftState(sid);
}

export async function skipQuestion(sid: string, quizQuestionId: number): Promise<DraftState> {
  const { draft, qq } = await draftQuestion(sid, quizQuestionId);
  if (qq.creatorOptionId !== null) throw new ApiError(409, 'already_answered');
  const bank = await loadBank();
  const rows = await quizQuestionRows(draft.quiz.id);
  const skipped = bank.byId.get(qq.questionId)!;
  const item = (q: QuestionRow): CompositionItem => ({ key: q.key, objective_tag: q.objectiveTag, kind: q.kind });
  const others = rows.filter((r) => r.id !== qq.id).map((r) => item(bank.byId.get(r.questionId)!));
  const everUsed = rows.flatMap((r) => [r.questionId, r.skippedFromQuestionId]).filter((id): id is number => id !== null);

  const hostel = draft.creator.hostelId ? await getHostelById(draft.creator.hostelId) : null;
  const replacement = pickReplacement(
    await loadPool(),
    {
      segment: segmentFor(hostel?.type),
      excludeKeys: new Set(everUsed.map((id) => bank.byId.get(id)!.key)),
      coverage: await coverageFor(hostel?.city ?? null, hostel?.type ?? null),
      rng: seededRng(randomBytes(4).readUInt32LE(0)),
    },
    others,
    item(skipped),
  );
  if (!replacement) throw new ApiError(409, 'no_replacement');
  const next = bank.byKey.get(replacement.key)!;
  await db()
    .update(schema.quizQuestions)
    .set({ questionId: next.id, skippedFromQuestionId: skipped.id, creatorOptionId: null })
    .where(eq(schema.quizQuestions.id, qq.id));
  await Promise.all([bumpStats([skipped.id], 'skips'), bumpStats([skipped.id], 'failures'), bumpStats([next.id], 'impressions')]);
  recordEvent(sid, 'creator_skip', { question_key: skipped.key, objective_tag: skipped.objectiveTag });
  return getDraftState(sid);
}

export async function publishDraft(sid: string): Promise<{ slug: string }> {
  const draft = await requireDraft(sid);
  const rows = await quizQuestionRows(draft.quiz.id);
  if (rows.length !== QUIZ.questionsPerQuiz || rows.some((r) => r.creatorOptionId === null)) throw new ApiError(409, 'incomplete');
  const bank = await loadBank();
  const qs = rows.map((r) => bank.byId.get(r.questionId)!);
  const errors = validateComposition(qs.map((q) => ({ key: q.key, objective_tag: q.objectiveTag, kind: q.kind })));
  if (errors.length) throw new ApiError(422, errors[0]);

  const updated = await db()
    .update(schema.quizzes)
    .set({ status: 'live', publishedAt: sql`now()` })
    .where(and(eq(schema.quizzes.id, draft.quiz.id), eq(schema.quizzes.status, 'draft')))
    .returning({ id: schema.quizzes.id });
  if (updated.length) {
    await bumpStats(
      qs.map((q) => q.id),
      'successes',
    );
    recordEvent(sid, 'quiz_publish', {
      total_ms: Date.now() - draft.quiz.createdAt.getTime(),
      research_count: qs.filter((q) => isResearchTag(q.objectiveTag)).length,
    });
  }
  return { slug: draft.quiz.slug };
}
