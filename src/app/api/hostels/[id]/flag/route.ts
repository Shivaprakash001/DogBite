import { z } from 'zod';
import { ApiError, assertSameOrigin, limit, ok, requireSession, route } from '@/server/http';
import { flagHostel, getHostelById } from '@/server/repos/hostels';

/**
 * Report a bad hostel entry (spam, offensive, fake). Auto-hidden after several flags.
 * No consent needed: a flag isn't personal data, but it is rate limited.
 */
export const POST = route<RouteContext<'/api/hostels/[id]/flag'>>(async (req, ctx) => {
  const { id } = await ctx.params;
  assertSameOrigin(req);
  if (!z.uuid().safeParse(id).success || !(await getHostelById(id))) throw new ApiError(404, 'hostel_not_found');
  const session = await requireSession(req);
  await limit(req, 'hostelAdd', session.id);
  await flagHostel(id, session.id);
  return ok({ ok: true });
});
