import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/server/db';
import { assertSameOrigin, limit, ok, parseBody, requireSession, route } from '@/server/http';
import { recordEvent } from '@/server/track';

const body = z.object({
  channel: z.enum(['copy', 'whatsapp', 'native', 'story', 'owner_whatsapp', 'owner_native']),
  quizSlug: z.string().max(40).nullable().default(null),
  hostelId: z.uuid().nullable().default(null),
});

/**
 * Share action log (§7.1). Shares are allowed before consent (sharing someone
 * else's quiz link is not personal data), so this only needs a session.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const session = await requireSession(req);
  await limit(req, 'write', session.id);
  const b = await parseBody(req, body);
  let quizId: string | null = null;
  if (b.quizSlug) {
    const [q] = await db().select({ id: schema.quizzes.id }).from(schema.quizzes).where(eq(schema.quizzes.slug, b.quizSlug));
    quizId = q?.id ?? null;
  }
  const [s] = await db().select({ ref: schema.sessions.refSessionId }).from(schema.sessions).where(eq(schema.sessions.id, session.id));
  await db().insert(schema.shares).values({ sessionId: session.id, quizId, hostelId: b.hostelId, channel: b.channel, refSessionId: s?.ref ?? null });
  recordEvent(session.id, 'share_click', { channel: b.channel, quiz_id: quizId, hostel_id: b.hostelId });
  return ok({ ok: true });
});
