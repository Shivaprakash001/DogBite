import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE, COOKIE_MAX_AGE } from './cookies';
import { keyedHash, safeEqual } from './crypto';
import { env } from './env';
import { ApiError } from './http';

// v1 admin auth: an env allowlist of access keys (ADMIN_KEYS). The cookie holds
// expiry + key id + signature, so removing a key from the env revokes it.

function keys(): string[] {
  return env()
    .ADMIN_KEYS.split(',')
    .map((k) => k.trim())
    .filter((k) => k.length >= 16);
}

const kidOf = (key: string) => keyedHash(key, 'admin-kid').slice(0, 12);
const sign = (exp: number, kid: string) => keyedHash(`${exp}.${kid}`, 'admin');

/** Returns a cookie value for a valid key, or null. */
export function issueAdminToken(key: string): string | null {
  const match = keys().find((k) => safeEqual(k, key));
  if (!match) return null;
  const exp = Date.now() + COOKIE_MAX_AGE.admin * 1000;
  const kid = kidOf(match);
  return `${exp}.${kid}.${sign(exp, kid)}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const [expStr, kid, sig] = token.split('.');
  const exp = Number(expStr);
  if (!exp || exp < Date.now() || !kid || !sig) return false;
  if (!keys().some((k) => kidOf(k) === kid)) return false;
  return safeEqual(sig, sign(exp, kid));
}

/** For admin pages: redirect to the login form when not signed in. */
export async function requireAdminPage(): Promise<void> {
  await connection();
  const token = (await cookies()).get(COOKIE.admin)?.value;
  if (!verifyAdminToken(token)) redirect('/admin/login');
}

/** For admin API routes. */
export function requireAdminApi(req: NextRequest): void {
  if (!verifyAdminToken(req.cookies.get(COOKIE.admin)?.value)) throw new ApiError(401, 'admin_required');
}
