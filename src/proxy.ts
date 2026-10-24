import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, COOKIE_MAX_AGE, isUuid } from './server/cookies';

// Gives every visitor an anonymous session id (no signup, §2.1) and remembers the
// first ?ref= / utm_source they arrived with (§7.1). The new cookie is forwarded on
// the current request so server components see it on the very first render.

export function proxy(request: NextRequest) {
  const existing = request.cookies.get(COOKIE.session)?.value;
  const needsSession = !existing || !isUuid(existing);
  const ref = request.nextUrl.searchParams.get('ref');
  const utm = request.nextUrl.searchParams.get('utm_source');
  const needsRef = !!ref && !request.cookies.has(COOKIE.ref);
  const needsUtm = !!utm && !request.cookies.has(COOKIE.utm);

  if (!needsSession && !needsRef && !needsUtm) return NextResponse.next();

  const sid = needsSession ? crypto.randomUUID() : existing;
  if (needsSession) request.cookies.set(COOKIE.session, sid);
  if (needsRef) request.cookies.set(COOKIE.ref, ref.slice(0, 80));
  if (needsUtm) request.cookies.set(COOKIE.utm, utm.slice(0, 80));

  const headers = new Headers(request.headers);
  headers.set('cookie', request.cookies.toString());
  const response = NextResponse.next({ request: { headers } });

  const base = { path: '/', sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' };
  if (needsSession) response.cookies.set(COOKIE.session, sid, { ...base, httpOnly: true, maxAge: COOKIE_MAX_AGE.session });
  if (needsRef) response.cookies.set(COOKIE.ref, ref.slice(0, 80), { ...base, httpOnly: true, maxAge: COOKIE_MAX_AGE.ref });
  if (needsUtm) response.cookies.set(COOKIE.utm, utm.slice(0, 80), { ...base, httpOnly: true, maxAge: COOKIE_MAX_AGE.ref });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|brand/|questions/|favicon|robots.txt|sitemap.xml).*)'],
};
