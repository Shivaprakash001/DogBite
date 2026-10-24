import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { COOKIE, isUuid } from './cookies';
import { keyedHash } from './crypto';
import { env } from './env';
import { hit, type Bucket } from './rate-limit';
import { ensureSession, type SessionState } from './session';

// Shared plumbing for route handlers: typed errors, Zod-validated bodies,
// same-origin (CSRF) checks, session + consent guards and rate limits.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

export function route<C>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      unstable_rethrow(err); // let Next's own control-flow signals (prerender bail-out, redirects) through
      if (err instanceof ApiError) {
        return Response.json({ error: err.code, message: err.message }, { status: err.status });
      }
      // No PII in logs: only the error itself.
      console.error('[api]', req.method, req.nextUrl.pathname, err);
      return Response.json({ error: 'internal' }, { status: 500 });
    }
  };
}

const MAX_BODY_BYTES = 16 * 1024;

export async function parseBody<S extends z.ZodType>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  const type = req.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) throw new ApiError(415, 'unsupported_media_type');
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new ApiError(413, 'payload_too_large');
  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(400, 'invalid_json');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(400, 'invalid_input', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  return parsed.data;
}

/** CSRF: state-changing requests must come from our own origin. */
export function assertSameOrigin(req: NextRequest): void {
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') throw new ApiError(403, 'cross_site');
  const origin = req.headers.get('origin');
  if (origin) {
    const allowed = new Set([req.nextUrl.origin, new URL(env().NEXT_PUBLIC_SITE_URL).origin]);
    if (!allowed.has(origin)) throw new ApiError(403, 'bad_origin');
  }
}

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

export async function limit(req: NextRequest, bucket: Bucket, sid?: string | null): Promise<void> {
  const ipKey = keyedHash(clientIp(req), 'ip');
  const checks = [hit(bucket, 'ip', ipKey)];
  if (sid) checks.push(hit(bucket, 'session', sid));
  if ((await Promise.all(checks)).some((okay) => !okay)) throw new ApiError(429, 'rate_limited', 'Slow down a little 🙂');
}

export async function requireSession(req: NextRequest): Promise<SessionState> {
  const sid = req.cookies.get(COOKIE.session)?.value;
  if (!isUuid(sid)) throw new ApiError(401, 'no_session');
  return ensureSession(sid, {
    ref: req.cookies.get(COOKIE.ref)?.value ?? null,
    utm: req.cookies.get(COOKIE.utm)?.value ?? null,
    userAgent: req.headers.get('user-agent'),
  });
}

/** Writes need a same-origin request, a session, consent + 18+, and a rate-limit slot. */
export async function guardWrite(req: NextRequest, bucket: Bucket = 'write'): Promise<SessionState> {
  assertSameOrigin(req);
  const session = await requireSession(req);
  if (!session.consented || !session.adult) throw new ApiError(403, 'consent_required');
  await limit(req, bucket, session.id);
  return session;
}

export const ok = <T>(data: T, init?: ResponseInit) => Response.json(data, init);
