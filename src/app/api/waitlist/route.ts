import { z } from 'zod';
import { FEATURE_DECISIONS } from '@/config';
import { db, schema } from '@/server/db';
import { guardWrite, ok, parseBody, route } from '@/server/http';
import { recordEvent } from '@/server/track';

const body = z.object({
  featureKey: z.string().refine((k) => k in FEATURE_DECISIONS, 'unknown feature'),
  hostelId: z.uuid().nullable().default(null),
});

/** Fake-door teaser tap (§11.1). The tap itself is the demand signal; no contact details. */
export const POST = route(async (req) => {
  const session = await guardWrite(req);
  const b = await parseBody(req, body);
  const inserted = await db()
    .insert(schema.waitlistTaps)
    .values({ sessionId: session.id, featureKey: b.featureKey, hostelId: b.hostelId })
    .onConflictDoNothing()
    .returning({ id: schema.waitlistTaps.id });
  if (inserted.length) recordEvent(session.id, 'teaser_tap', { feature_key: b.featureKey });
  return ok({ ok: true });
});
