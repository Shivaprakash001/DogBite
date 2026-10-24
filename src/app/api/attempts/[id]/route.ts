import { z } from 'zod';
import { ApiError, ok, requireSession, route } from '@/server/http';
import { resumeAttempt } from '@/server/repos/play';

/** Resume payload for the player's own unfinished attempt (no answers revealed ahead). */
export const GET = route<RouteContext<'/api/attempts/[id]'>>(async (req, ctx) => {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, 'attempt_not_found');
  const session = await requireSession(req);
  return ok(await resumeAttempt(session.id, id));
});
