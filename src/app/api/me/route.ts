import { COOKIE } from '@/server/cookies';
import { assertSameOrigin, limit, requireSession, route } from '@/server/http';
import { deleteAllData } from '@/server/repos/privacy';

/** Delete my data (§13). Erases everything tied to this session and resets the cookie. */
export const DELETE = route(async (req) => {
  assertSameOrigin(req);
  const session = await requireSession(req);
  await limit(req, 'write', session.id);
  await deleteAllData(session.id);
  const res = new Response(null, { status: 204 });
  for (const name of [COOKIE.session, COOKIE.ref, COOKIE.utm]) {
    res.headers.append('set-cookie', `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`);
  }
  return res;
});
