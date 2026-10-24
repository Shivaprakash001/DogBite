// Absolute share URLs. Every shared link carries ?ref= (§7.1): a session's public
// share_ref, or the quiz slug when that's all we have.

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export function absoluteUrl(path: string, params: Record<string, string | null | undefined> = {}): string {
  const url = new URL(path, SITE);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  return url.toString();
}

export const paths = {
  quiz: (slug: string) => `/q/${slug}`,
  play: (slug: string) => `/q/${slug}/play`,
  board: (slug: string) => `/q/${slug}/board`,
  result: (slug: string, attemptId: string) => `/q/${slug}/result/${attemptId}`,
  done: (slug: string) => `/create/done/${slug}`,
  hostel: (slug: string) => `/hostel/${slug}`,
  report: (slug: string) => `/report/${slug}`,
  leaderboard: (areaSlug?: string) => (areaSlug ? `/leaderboard/${areaSlug}` : '/leaderboard'),
  discover: (src: string, hostel?: { slug: string; id: string } | null) =>
    `/discover?src=${encodeURIComponent(src)}${hostel ? `&hostel=${encodeURIComponent(hostel.slug)}&hid=${hostel.id}` : ''}`,
};
