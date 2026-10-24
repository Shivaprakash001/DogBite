import { z } from 'zod';
import { ApiError, guardWrite, ok, route } from '@/server/http';
import { flagHostel, getHostelById } from '@/server/repos/hostels';

/** Report a bad hostel entry (spam, offensive, fake). Auto-hidden after several flags. */
export const POST = route<RouteContext<'/api/hostels/[id]/flag'>>(async (req, ctx) => {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success || !(await getHostelById(id))) throw new ApiError(404, 'hostel_not_found');
  const session = await guardWrite(req, 'hostelAdd');
  await flagHostel(id, session.id);
  return ok({ ok: true });
});
