import 'server-only';
import { eq, inArray } from 'drizzle-orm';
import { db, schema } from '../db';

/**
 * Right to erasure (§13, DPDP). Removes everything tied to this session: quizzes
 * (and other players' attempts on them), attempts, answers, events, taps, shares,
 * flags and owner contacts submitted. Hostels the session added stay (not personal
 * data) but lose the link back. Aggregate question counters are kept.
 */
export async function deleteAllData(sid: string): Promise<void> {
  await db().transaction(async (tx) => {
    const creators = await tx.select({ id: schema.creators.id }).from(schema.creators).where(eq(schema.creators.sessionId, sid));
    const creatorIds = creators.map((c) => c.id);
    const quizIds = creatorIds.length
      ? (await tx.select({ id: schema.quizzes.id }).from(schema.quizzes).where(inArray(schema.quizzes.creatorId, creatorIds))).map((q) => q.id)
      : [];

    if (quizIds.length) {
      // attempt_answers cascade from attempts.
      await tx.delete(schema.attempts).where(inArray(schema.attempts.quizId, quizIds));
      await tx.delete(schema.shares).where(inArray(schema.shares.quizId, quizIds));
      await tx.delete(schema.quizQuestions).where(inArray(schema.quizQuestions.quizId, quizIds));
      await tx.delete(schema.quizzes).where(inArray(schema.quizzes.id, quizIds));
    }
    if (creatorIds.length) await tx.delete(schema.creators).where(inArray(schema.creators.id, creatorIds));

    await tx.delete(schema.attempts).where(eq(schema.attempts.sessionId, sid));
    await tx.delete(schema.events).where(eq(schema.events.sessionId, sid));
    await tx.delete(schema.waitlistTaps).where(eq(schema.waitlistTaps.sessionId, sid));
    await tx.delete(schema.shares).where(eq(schema.shares.sessionId, sid));
    await tx.delete(schema.hostelFlags).where(eq(schema.hostelFlags.sessionId, sid));
    await tx.delete(schema.hostelContacts).where(eq(schema.hostelContacts.submittedBySession, sid));
    await tx.update(schema.hostels).set({ createdBySession: null }).where(eq(schema.hostels.createdBySession, sid));
    await tx.update(schema.sessions).set({ refSessionId: null }).where(eq(schema.sessions.refSessionId, sid));
    await tx.delete(schema.sessions).where(eq(schema.sessions.id, sid));
  });
}
