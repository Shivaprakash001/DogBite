import { z } from 'zod';
import { CITIES } from '@/content/places';
import { isProfane } from '@/lib/moderation';
import { ApiError, guardWrite, limit, ok, parseBody, requireSession, route } from '@/server/http';
import { createHostel, findCollegeId, searchHostels } from '@/server/repos/hostels';
import { recordEvent } from '@/server/track';

/** Hostel search (trigram). Read-only, so no consent needed, but rate limited. */
export const GET = route(async (req) => {
  const session = await requireSession(req);
  await limit(req, 'events', session.id);
  const q = (req.nextUrl.searchParams.get('q') ?? '').slice(0, 60);
  const city = req.nextUrl.searchParams.get('city');
  return ok({ hostels: await searchHostels(q, city && city in CITIES ? city : null) });
});

const body = z.object({
  name: z.string().trim().min(3).max(60),
  city: z.string().refine((c) => c in CITIES, 'unknown city'),
  area: z.string().trim().min(2).max(40),
  type: z.enum(['boys', 'girls', 'coed', 'unknown']),
  collegeName: z.string().max(80).nullable().default(null),
  confirmedDifferent: z.boolean().default(false),
  timeMs: z.number().min(0).max(3_600_000).optional(),
});

/** Add a hostel. Returns near-duplicates first so the student can pick an existing one. */
export const POST = route(async (req) => {
  const session = await guardWrite(req, 'hostelAdd');
  const b = await parseBody(req, body);
  if (isProfane(b.name) || isProfane(b.area) || !/[a-z]/i.test(b.name)) throw new ApiError(400, 'invalid_name');
  const collegeId = b.collegeName ? await findCollegeId(b.collegeName, b.city) : null;
  const result = await createHostel({ name: b.name, city: b.city, area: b.area, type: b.type, collegeId }, session.id, b.confirmedDifferent);
  if ('hostel' in result) {
    recordEvent(session.id, 'hostel_add', { hostel_id: result.hostel.id, time_ms: b.timeMs, duplicate_offered: b.confirmedDifferent });
  }
  return ok(result);
});
