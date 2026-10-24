import { z } from 'zod';
import { ApiError, guardWrite, ok, parseBody, route } from '@/server/http';
import { submitAnswer } from '@/server/repos/play';

const body = z.object({
  quizQuestionId: z.number().int().positive(),
  optionId: z.number().int().positive().nullable(),
  ms: z.number().min(0).max(3_600_000),
});

/** Submit one guess. Feedback (and the correct option) is revealed only after submission. */
export const POST = route<RouteContext<'/api/attempts/[id]/answer'>>(async (req, ctx) => {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, 'attempt_not_found');
  const session = await guardWrite(req);
  const b = await parseBody(req, body);
  return ok(await submitAnswer(session.id, id, b.quizQuestionId, b.optionId, b.ms));
});
