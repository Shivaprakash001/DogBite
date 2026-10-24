import { z } from 'zod';
import { COOKIE } from '@/server/cookies';
import { assertSameOrigin, limit, ok, parseBody, requireSession, route } from '@/server/http';
import { recordConsent } from '@/server/session';

const body = z.object({ adult: z.boolean() });

/** Consent notice + 18+ confirmation (§13). Under-18s get a kind stop and nothing is stored. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const { adult } = await parseBody(req, body);
  if (!adult) {
    const res = ok({ ok: true, minor: true });
    res.headers.append('set-cookie', `${COOKIE.minor}=1; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax; HttpOnly`);
    return res;
  }
  const session = await requireSession(req);
  await limit(req, 'write', session.id);
  await recordConsent(session.id);
  const res = ok({ ok: true, minor: false });
  res.headers.append('set-cookie', `${COOKIE.minor}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`);
  return res;
});
