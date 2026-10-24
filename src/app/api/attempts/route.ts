import { z } from 'zod';
import { validateDisplayName } from '@/lib/moderation';
import { ApiError, guardWrite, ok, parseBody, route } from '@/server/http';
import { startAttempt } from '@/server/repos/play';

const body = z.object({
  slug: z.string().min(3).max(40),
  playerName: z.string().max(40),
  hostelId: z.uuid().nullable(),
  hostelSkipped: z.boolean(),
});

function deviceClass(ua: string | null): string | null {
  if (!ua) return null;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'desktop';
}

/** Start (or resume) an attempt. Returns two options per question, never the answers. */
export const POST = route(async (req) => {
  const session = await guardWrite(req);
  const b = await parseBody(req, body);
  const v = validateDisplayName(b.playerName);
  if (!v.ok) throw new ApiError(400, `name_${v.error}`);
  return ok(
    await startAttempt(session.id, b.slug, {
      playerName: v.value,
      hostelId: b.hostelId,
      hostelSkipped: b.hostelSkipped,
      device: deviceClass(req.headers.get('user-agent')),
    }),
  );
});
