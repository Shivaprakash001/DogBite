import type { NextRequest } from 'next/server';
import { COOKIE, isUuid } from '@/server/cookies';
import { env } from '@/server/env';
import { recordEvent } from '@/server/track';

/**
 * Deep link to Stayo Discover (§11.2) with UTM + from_quiz params. Logged here so
 * the click is recorded even if the browser drops the client beacon on navigation.
 */
export async function GET(req: NextRequest) {
  const base = env().DISCOVER_BASE_URL;
  if (!base) return Response.redirect(new URL('/', req.url), 302);
  const source = (req.nextUrl.searchParams.get('src') ?? 'unknown').slice(0, 30);
  const hostel = req.nextUrl.searchParams.get('hostel')?.slice(0, 80) ?? null;
  const hostelId = req.nextUrl.searchParams.get('hid');

  const url = new URL(base);
  url.searchParams.set('utm_source', 'quiz');
  url.searchParams.set('utm_medium', source);
  url.searchParams.set('utm_campaign', 'roomie_quiz');
  url.searchParams.set('from_quiz', '1');
  if (hostel) url.searchParams.set('hostel', hostel);

  const sid = req.cookies.get(COOKIE.session)?.value;
  recordEvent(isUuid(sid) ? sid : null, 'discover_click', { hostel_id: isUuid(hostelId) ? hostelId : null, source_screen: source });
  return Response.redirect(url, 302);
}
