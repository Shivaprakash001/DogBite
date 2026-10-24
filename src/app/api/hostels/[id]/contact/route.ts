import { z } from 'zod';
import { isProfane } from '@/lib/moderation';
import { ApiError, guardWrite, ok, parseBody, route } from '@/server/http';
import { addOwnerContact, getHostelById } from '@/server/repos/hostels';
import { recordEvent } from '@/server/track';

const body = z.object({
  name: z.string().trim().max(40).nullable().default(null),
  phone: z.string().trim().min(10).max(16),
  relation: z.enum(['owner', 'warden', 'manager', 'unknown']),
  consent: z.literal(true),
});

/** Opt-in owner/warden contact (§11.3). Encrypted at rest, admin-only, never shown publicly. */
export const POST = route<RouteContext<'/api/hostels/[id]/contact'>>(async (req, ctx) => {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, 'hostel_not_found');
  const session = await guardWrite(req, 'contact');
  const b = await parseBody(req, body);
  const hostel = await getHostelById(id);
  if (!hostel) throw new ApiError(404, 'hostel_not_found');
  if (b.name && isProfane(b.name)) throw new ApiError(400, 'invalid_name');
  await addOwnerContact(hostel.id, session.id, { name: b.name || null, phone: b.phone, relation: b.relation });
  recordEvent(session.id, 'owner_contact_submit', { hostel_id: hostel.id });
  return ok({ ok: true });
});
