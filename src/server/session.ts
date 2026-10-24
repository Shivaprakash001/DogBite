import 'server-only';
import { randomBytes } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { COOKIE, isUuid } from './cookies';
import { keyedHash } from './crypto';
import { db, schema } from './db';

export interface SessionState {
  id: string;
  shareRef: string;
  consented: boolean;
  adult: boolean;
}

const newShareRef = () =>
  randomBytes(8)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 10)
    .padEnd(10, '0');

/** Session id from the cookie set by the proxy (null for bots that drop cookies). */
export async function readSessionId(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE.session)?.value;
  return isUuid(value) ? value : null;
}

/** A ref is either a session's public share_ref or a quiz slug (→ its creator). */
async function resolveRefSession(ref: string | null): Promise<string | null> {
  if (!ref) return null;
  const [bySession] = await db().select({ id: schema.sessions.id }).from(schema.sessions).where(eq(schema.sessions.shareRef, ref));
  if (bySession) return bySession.id;
  const [byQuiz] = await db()
    .select({ sessionId: schema.creators.sessionId })
    .from(schema.quizzes)
    .innerJoin(schema.creators, eq(schema.creators.id, schema.quizzes.creatorId))
    .where(eq(schema.quizzes.slug, ref));
  return byQuiz?.sessionId ?? null;
}

/**
 * Upsert the session row. First-touch attribution (ref / utm) is only written on
 * insert so later visits never overwrite where someone originally came from.
 */
export async function ensureSession(sid: string, meta: { ref?: string | null; utm?: string | null; userAgent?: string | null } = {}): Promise<SessionState> {
  const existing = await getSessionState(sid);
  if (existing) {
    await db()
      .update(schema.sessions)
      .set({ lastSeenAt: sql`now()` })
      .where(eq(schema.sessions.id, sid));
    return existing;
  }
  const refSessionId = await resolveRefSession(meta.ref ?? null);
  const shareRef = newShareRef();
  await db()
    .insert(schema.sessions)
    .values({
      id: sid,
      shareRef,
      ref: meta.ref ?? null,
      refSessionId: refSessionId === sid ? null : refSessionId,
      utm: meta.utm ?? null,
      uaHash: meta.userAgent ? keyedHash(meta.userAgent, 'ua') : null,
    })
    .onConflictDoNothing();
  return (await getSessionState(sid)) ?? { id: sid, shareRef, consented: false, adult: false };
}

export async function getSessionState(sid: string): Promise<SessionState | null> {
  const [row] = await db()
    .select({ consentAt: schema.sessions.consentAt, adultAt: schema.sessions.adultConfirmedAt, shareRef: schema.sessions.shareRef })
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sid));
  if (!row) return null;
  return { id: sid, shareRef: row.shareRef, consented: !!row.consentAt, adult: !!row.adultAt };
}

/** Consent + 18+ confirmation are given together in one friendly step. */
export async function recordConsent(sid: string): Promise<void> {
  await db()
    .update(schema.sessions)
    .set({ consentAt: sql`now()`, adultConfirmedAt: sql`now()` })
    .where(eq(schema.sessions.id, sid));
}

/** For server components: is this visitor cleared to submit data? */
export async function currentGate(): Promise<{ sid: string | null; shareRef: string | null; consented: boolean; minor: boolean }> {
  const store = await cookies();
  const sid = await readSessionId();
  const minor = store.get(COOKIE.minor)?.value === '1';
  if (!sid) return { sid, shareRef: null, consented: false, minor };
  const state = await getSessionState(sid);
  return { sid, shareRef: state?.shareRef ?? null, consented: !!state?.consented && !!state.adult, minor };
}
