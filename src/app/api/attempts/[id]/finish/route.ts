import { z } from 'zod';
import { ApiError, guardWrite, ok, route } from '@/server/http';
import { finishAttempt } from '@/server/repos/play';

/** Finalise the attempt and compute the score server-side. Idempotent. */
export const POST = route<RouteContext<'/api/attempts/[id]/finish'>>(async (req, ctx) => {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, 'attempt_not_found');
  const session = await guardWrite(req);
  return ok(await finishAttempt(session.id, id));
});
