import { assertSameOrigin, ok, requireSession, route } from '@/server/http';
import { deleteQuiz } from '@/server/repos/play';

/** Creator deletes their own quiz. Published answers can never be edited, only deleted. */
export const DELETE = route<RouteContext<'/api/quizzes/[slug]'>>(async (req, ctx) => {
  assertSameOrigin(req);
  const { slug } = await ctx.params;
  const session = await requireSession(req);
  await deleteQuiz(session.id, slug);
  return ok({ ok: true });
});
