import 'server-only';
import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { QUIZ } from '@/config';
import type { Gender } from '@/content/types';
import type { AnswerResultDTO, AttemptStartDTO, FinishDTO, HostelDTO, PlayQuestionDTO } from '@/lib/api-types';
import { pickShownOptions, rankScoreboard, scoreAttempt, tierForScore, type BoardRow } from '@/lib/scoring';
import { renderQuestionText } from '@/lib/text';
import { isUuid } from '../cookies';
import { db, schema } from '../db';
import { ApiError } from '../http';
import { recordEvent } from '../track';
import { getHostelById, toHostelDTO } from './hostels';
import { bumpStats, loadBank } from './questions';

export interface PublicQuiz {
  id: string;
  slug: string;
  status: 'draft' | 'live' | 'deleted';
  creatorName: string;
  gender: Gender | null;
  creatorSessionId: string;
  hostel: HostelDTO | null;
  publishedAt: Date | null;
}

export async function getPublicQuiz(slug: string): Promise<PublicQuiz | null> {
  const [row] = await db()
    .select({ quiz: schema.quizzes, creator: schema.creators })
    .from(schema.quizzes)
    .innerJoin(schema.creators, eq(schema.creators.id, schema.quizzes.creatorId))
    .where(eq(schema.quizzes.slug, slug));
  if (!row) return null;
  const hostel = row.creator.hostelId ? await getHostelById(row.creator.hostelId) : null;
  return {
    id: row.quiz.id,
    slug: row.quiz.slug,
    status: row.quiz.status,
    creatorName: row.creator.displayName,
    gender: row.creator.gender,
    creatorSessionId: row.creator.sessionId,
    hostel: hostel ? toHostelDTO(hostel) : null,
    publishedAt: row.quiz.publishedAt,
  };
}

export async function getScoreboard(quizId: string, limit = 50): Promise<(BoardRow & { rank: number })[]> {
  const rows = await db()
    .select({
      attemptId: schema.attempts.id,
      sessionId: schema.attempts.sessionId,
      playerName: schema.attempts.playerName,
      score: schema.attempts.score,
      totalMs: schema.attempts.totalMs,
      finishedAt: schema.attempts.finishedAt,
      hostelName: schema.hostels.name,
    })
    .from(schema.attempts)
    .leftJoin(schema.hostels, eq(schema.hostels.id, schema.attempts.hostelId))
    .where(and(eq(schema.attempts.quizId, quizId), isNotNull(schema.attempts.finishedAt)));
  return rankScoreboard(rows.map((r) => ({ ...r, score: r.score ?? 0, totalMs: r.totalMs ?? 0, finishedAt: r.finishedAt! }))).slice(0, limit);
}

export interface PlayerStatus {
  attempts: { id: string; score: number | null; finished: boolean }[];
  best: { id: string; score: number } | null;
  canStart: boolean;
  unfinishedId: string | null;
}

export async function playerStatus(quizId: string, sid: string | null): Promise<PlayerStatus> {
  if (!sid) return { attempts: [], best: null, canStart: true, unfinishedId: null };
  const rows = await db()
    .select({ id: schema.attempts.id, score: schema.attempts.score, finishedAt: schema.attempts.finishedAt })
    .from(schema.attempts)
    .where(and(eq(schema.attempts.quizId, quizId), eq(schema.attempts.sessionId, sid)))
    .orderBy(asc(schema.attempts.startedAt));
  const attempts = rows.map((r) => ({ id: r.id, score: r.score, finished: !!r.finishedAt }));
  const finished = attempts.filter((a) => a.finished);
  const best = finished.reduce<{ id: string; score: number } | null>((b, a) => (!b || (a.score ?? 0) > b.score ? { id: a.id, score: a.score ?? 0 } : b), null);
  const unfinished = attempts.find((a) => !a.finished) ?? null;
  return { attempts, best, canStart: !!unfinished || attempts.length < QUIZ.maxAttemptsPerPlayer, unfinishedId: unfinished?.id ?? null };
}

async function quizQuestionsWithKey(quizId: string) {
  return db()
    .select({
      id: schema.quizQuestions.id,
      position: schema.quizQuestions.position,
      questionId: schema.quizQuestions.questionId,
      creatorOptionId: schema.quizQuestions.creatorOptionId,
    })
    .from(schema.quizQuestions)
    .where(eq(schema.quizQuestions.quizId, quizId))
    .orderBy(asc(schema.quizQuestions.position));
}

async function buildAttemptPayload(attemptId: string, quiz: PublicQuiz): Promise<AttemptStartDTO> {
  const bank = await loadBank();
  const qqs = await quizQuestionsWithKey(quiz.id);
  const questions: PlayQuestionDTO[] = qqs.map((qq) => {
    const q = bank.byId.get(qq.questionId)!;
    const [a, b] = pickShownOptions(
      attemptId,
      qq.id,
      qq.creatorOptionId!,
      q.options.map((o) => o.id),
    );
    const dto = (id: number) => {
      const o = q.options.find((x) => x.id === id)!;
      return { id: o.id, key: o.key, label: o.label, emoji: o.emoji, image: o.imageAsset };
    };
    return {
      quizQuestionId: qq.id,
      position: qq.position,
      key: q.key,
      text: renderQuestionText(q.textTemplate, quiz.creatorName, quiz.gender),
      options: [dto(a), dto(b)],
    };
  });
  const answers = await db().select().from(schema.attemptAnswers).where(eq(schema.attemptAnswers.attemptId, attemptId));
  const keyById = new Map(qqs.map((qq) => [qq.id, qq.creatorOptionId!]));
  const answered: AnswerResultDTO[] = answers.map((a) => ({
    quizQuestionId: a.quizQuestionId,
    chosenOptionId: a.chosenOptionId,
    correct: a.isCorrect,
    correctOptionId: keyById.get(a.quizQuestionId)!,
  }));
  return { attemptId, quizId: quiz.id, questions, answered };
}

export async function startAttempt(
  sid: string,
  slug: string,
  input: { playerName: string; hostelId: string | null; hostelSkipped: boolean; device: string | null },
): Promise<AttemptStartDTO> {
  const quiz = await getPublicQuiz(slug);
  if (!quiz || quiz.status !== 'live') throw new ApiError(404, 'quiz_not_found');
  if (quiz.creatorSessionId === sid) throw new ApiError(409, 'own_quiz');
  const status = await playerStatus(quiz.id, sid);
  if (status.unfinishedId) return buildAttemptPayload(status.unfinishedId, quiz); // refresh resumes
  if (!status.canStart) throw new ApiError(409, 'no_retries');
  if (input.hostelId && !(await getHostelById(input.hostelId))) throw new ApiError(404, 'hostel_not_found');

  const [attempt] = await db()
    .insert(schema.attempts)
    .values({
      quizId: quiz.id,
      sessionId: sid,
      playerName: input.playerName,
      hostelId: input.hostelId,
      hostelSkipped: input.hostelSkipped,
      device: input.device,
    })
    .returning({ id: schema.attempts.id });
  return buildAttemptPayload(attempt.id, quiz);
}

/** Resume an unfinished attempt after refresh / app switch. */
export async function resumeAttempt(sid: string, attemptId: string): Promise<AttemptStartDTO> {
  const attempt = await ownedAttempt(sid, attemptId);
  if (attempt.finishedAt) throw new ApiError(409, 'attempt_finished');
  const [q] = await db().select({ slug: schema.quizzes.slug }).from(schema.quizzes).where(eq(schema.quizzes.id, attempt.quizId));
  const quiz = await getPublicQuiz(q.slug);
  if (!quiz || quiz.status !== 'live') throw new ApiError(404, 'quiz_not_found');
  return buildAttemptPayload(attemptId, quiz);
}

async function ownedAttempt(sid: string, attemptId: string) {
  const [attempt] = await db()
    .select()
    .from(schema.attempts)
    .where(and(eq(schema.attempts.id, attemptId), eq(schema.attempts.sessionId, sid)));
  if (!attempt) throw new ApiError(404, 'attempt_not_found');
  return attempt;
}

export async function submitAnswer(sid: string, attemptId: string, quizQuestionId: number, optionId: number | null, ms: number): Promise<AnswerResultDTO> {
  const attempt = await ownedAttempt(sid, attemptId);
  const [qq] = await db()
    .select()
    .from(schema.quizQuestions)
    .where(and(eq(schema.quizQuestions.id, quizQuestionId), eq(schema.quizQuestions.quizId, attempt.quizId)));
  if (!qq || qq.creatorOptionId === null) throw new ApiError(404, 'question_not_in_quiz');

  // Duplicate submission (double tap, offline retry): return what was stored.
  const [prior] = await db()
    .select()
    .from(schema.attemptAnswers)
    .where(and(eq(schema.attemptAnswers.attemptId, attemptId), eq(schema.attemptAnswers.quizQuestionId, quizQuestionId)));
  if (prior) return { quizQuestionId, chosenOptionId: prior.chosenOptionId, correct: prior.isCorrect, correctOptionId: qq.creatorOptionId };
  if (attempt.finishedAt) throw new ApiError(409, 'attempt_finished');

  const bank = await loadBank();
  const q = bank.byId.get(qq.questionId)!;
  const shown = pickShownOptions(
    attemptId,
    qq.id,
    qq.creatorOptionId,
    q.options.map((o) => o.id),
  );
  if (optionId !== null && !shown.includes(optionId)) throw new ApiError(400, 'invalid_option');
  const correct = optionId === qq.creatorOptionId;
  const msClamped = Math.min(Math.max(0, Math.round(ms)), 600_000);

  const inserted = await db()
    .insert(schema.attemptAnswers)
    .values({ attemptId, quizQuestionId, shownOptionIds: shown, chosenOptionId: optionId, isCorrect: correct, msToAnswer: msClamped })
    .onConflictDoNothing()
    .returning({ id: schema.attemptAnswers.id });
  if (inserted.length) {
    const option = q.options.find((o) => o.id === optionId);
    recordEvent(sid, 'answer_submit', { question_key: q.key, option_key: option?.key ?? 'skipped', ms_to_answer: msClamped, correct });
  }
  return { quizQuestionId, chosenOptionId: optionId, correct, correctOptionId: qq.creatorOptionId };
}

export async function finishAttempt(sid: string, attemptId: string): Promise<FinishDTO> {
  const attempt = await ownedAttempt(sid, attemptId);
  const [quiz] = await db().select({ slug: schema.quizzes.slug }).from(schema.quizzes).where(eq(schema.quizzes.id, attempt.quizId));
  const resultPath = `/q/${quiz.slug}/result/${attemptId}`;
  if (attempt.finishedAt) {
    return { attemptId, score: attempt.score ?? 0, tierId: tierForScore(attempt.score ?? 0).id, resultPath };
  }
  const qqs = await quizQuestionsWithKey(attempt.quizId);
  const answers = await db().select().from(schema.attemptAnswers).where(eq(schema.attemptAnswers.attemptId, attemptId));
  const { score } = scoreAttempt(
    answers.map((a) => ({ quizQuestionId: a.quizQuestionId, chosenOptionId: a.chosenOptionId })),
    new Map(qqs.map((qq) => [qq.id, qq.creatorOptionId!])),
  );
  // Total time = time spent answering, so slow name typing doesn't cost rank.
  const totalMs = answers.reduce((sum, a) => sum + (a.msToAnswer ?? 0), 0);
  const updated = await db()
    .update(schema.attempts)
    .set({ score, totalMs, finishedAt: sql`now()` })
    .where(and(eq(schema.attempts.id, attemptId), sql`${schema.attempts.finishedAt} is null`))
    .returning({ id: schema.attempts.id });
  if (updated.length) recordEvent(sid, 'quiz_complete', { score, total_ms: totalMs });
  return { attemptId, score, tierId: tierForScore(score).id, resultPath };
}

export interface AttemptResult {
  attemptId: string;
  sessionId: string;
  playerName: string;
  score: number;
  finished: boolean;
  playerHostel: HostelDTO | null;
  quiz: PublicQuiz;
}

export async function getAttemptResult(slug: string, attemptId: string): Promise<AttemptResult | null> {
  const quiz = await getPublicQuiz(slug);
  if (!quiz) return null;
  const [attempt] = await db()
    .select()
    .from(schema.attempts)
    .where(and(eq(schema.attempts.id, attemptId), eq(schema.attempts.quizId, quiz.id)));
  if (!attempt) return null;
  const hostel = attempt.hostelId ? await getHostelById(attempt.hostelId) : null;
  return {
    attemptId,
    sessionId: attempt.sessionId,
    playerName: attempt.playerName,
    score: attempt.score ?? 0,
    finished: !!attempt.finishedAt,
    playerHostel: hostel ? toHostelDTO(hostel) : null,
    quiz,
  };
}

export async function playsCount(quizId: string): Promise<number> {
  const [{ n }] = await db()
    .select({ n: sql<number>`count(distinct ${schema.attempts.sessionId})::int` })
    .from(schema.attempts)
    .where(and(eq(schema.attempts.quizId, quizId), isNotNull(schema.attempts.finishedAt)));
  return n;
}

/** Quizzes made on this device, for the privacy page. */
export async function myQuizzes(sid: string) {
  return db()
    .select({ slug: schema.quizzes.slug, status: schema.quizzes.status, publishedAt: schema.quizzes.publishedAt, name: schema.creators.displayName })
    .from(schema.quizzes)
    .innerJoin(schema.creators, eq(schema.creators.id, schema.quizzes.creatorId))
    .where(and(eq(schema.creators.sessionId, sid), eq(schema.quizzes.status, 'live')))
    .orderBy(desc(schema.quizzes.publishedAt));
}

/** Creator deletes their quiz: it stops being playable and their answers are erased. */
export async function deleteQuiz(sid: string, slug: string): Promise<void> {
  const quiz = await getPublicQuiz(slug);
  if (!quiz || quiz.creatorSessionId !== sid) throw new ApiError(404, 'quiz_not_found');
  await db().transaction(async (tx) => {
    await tx.update(schema.quizzes).set({ status: 'deleted' }).where(eq(schema.quizzes.id, quiz.id));
    await tx.update(schema.quizQuestions).set({ creatorOptionId: null }).where(eq(schema.quizQuestions.quizId, quiz.id));
  });
  recordEvent(sid, 'quiz_delete', {});
}

/**
 * Abandoned-at-question signal for the bandit (called from the abandon beacon).
 * Counted once, and only for a session with a real unfinished attempt on the quiz.
 */
export async function recordAbandon(sid: string, quizId: string, position: number): Promise<void> {
  if (!isUuid(quizId)) return;
  const [open] = await db()
    .select({ id: schema.attempts.id })
    .from(schema.attempts)
    .where(and(eq(schema.attempts.quizId, quizId), eq(schema.attempts.sessionId, sid), sql`${schema.attempts.finishedAt} is null`));
  if (!open) return;
  // The beacon's own event row is stored before this runs, so > 1 means already counted.
  const seen = await db().$count(
    schema.events,
    and(eq(schema.events.sessionId, sid), eq(schema.events.name, 'quiz_abandon'), sql`${schema.events.props}->>'quiz_id' = ${quizId}`),
  );
  if (seen > 1) return;
  const [qq] = await db()
    .select({ questionId: schema.quizQuestions.questionId })
    .from(schema.quizQuestions)
    .where(and(eq(schema.quizQuestions.quizId, quizId), eq(schema.quizQuestions.position, position)));
  if (qq) await bumpStats([qq.questionId], 'failures');
}
