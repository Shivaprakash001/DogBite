import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { issueAdminToken, requireAdminApi } from '@/server/admin-auth';
import { COOKIE, COOKIE_MAX_AGE } from '@/server/cookies';
import { db, schema } from '@/server/db';
import { ApiError, assertSameOrigin, limit, ok, parseBody, route } from '@/server/http';
import { dismissMergeCandidate, mergeHostels } from '@/server/repos/hostels';
import { invalidateBank } from '@/server/repos/questions';

const schemas = {
  login: z.object({ key: z.string().min(1).max(200) }),
  logout: z.object({}),
  'question-active': z.object({ key: z.string().max(60), active: z.boolean() }),
  merge: z.object({ sourceId: z.uuid(), targetId: z.uuid() }),
  dismiss: z.object({ id: z.number().int().positive() }),
  'hostel-visibility': z.object({ id: z.uuid(), hidden: z.boolean() }),
  'hostel-status': z.object({ id: z.uuid(), status: z.enum(['user_added', 'verified', 'claimed']) }),
} as const;

const cookieAttrs = (maxAge: number) => `Path=/; Max-Age=${maxAge}; SameSite=Strict; HttpOnly${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

/** Admin actions (§15). Every action except login requires the admin cookie. */
export const POST = route<RouteContext<'/api/admin/[action]'>>(async (req, ctx) => {
  assertSameOrigin(req);
  const { action } = await ctx.params;
  if (!(action in schemas)) throw new ApiError(404, 'unknown_action');

  if (action === 'login') {
    await limit(req, 'adminLogin'); // 5 / hour per IP: slows key guessing
    const { key } = await parseBody(req, schemas.login);
    const token = issueAdminToken(key);
    if (!token) throw new ApiError(401, 'bad_key');
    const res = ok({ ok: true });
    res.headers.append('set-cookie', `${COOKIE.admin}=${token}; ${cookieAttrs(COOKIE_MAX_AGE.admin)}`);
    return res;
  }

  requireAdminApi(req);
  switch (action as keyof typeof schemas) {
    case 'logout': {
      const res = ok({ ok: true });
      res.headers.append('set-cookie', `${COOKIE.admin}=; ${cookieAttrs(0)}`);
      return res;
    }
    case 'question-active': {
      const b = await parseBody(req, schemas['question-active']);
      await db().update(schema.questions).set({ active: b.active }).where(eq(schema.questions.key, b.key));
      invalidateBank();
      return ok({ ok: true });
    }
    case 'merge': {
      const b = await parseBody(req, schemas.merge);
      await mergeHostels(b.sourceId, b.targetId);
      return ok({ ok: true });
    }
    case 'dismiss':
      await dismissMergeCandidate((await parseBody(req, schemas.dismiss)).id);
      return ok({ ok: true });
    case 'hostel-visibility': {
      const b = await parseBody(req, schemas['hostel-visibility']);
      await db().update(schema.hostels).set({ hidden: b.hidden }).where(eq(schema.hostels.id, b.id));
      return ok({ ok: true });
    }
    case 'hostel-status': {
      const b = await parseBody(req, schemas['hostel-status']);
      await db().update(schema.hostels).set({ status: b.status }).where(eq(schema.hostels.id, b.id));
      return ok({ ok: true });
    }
    default:
      throw new ApiError(404, 'unknown_action');
  }
});
