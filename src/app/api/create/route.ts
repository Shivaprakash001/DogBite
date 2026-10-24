import { ok, requireSession, route } from '@/server/http';
import { getDraftState } from '@/server/repos/creator';

/** Current creator draft, used to resume where the creator left off. */
export const GET = route(async (req) => {
  const session = await requireSession(req);
  return ok(await getDraftState(session.id));
});
