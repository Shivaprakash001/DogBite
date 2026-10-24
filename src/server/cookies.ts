// Cookie names shared by the proxy and server code. No server-only import: the
// proxy bundles this file too.

export const COOKIE = {
  session: 'sq_sid',
  ref: 'sq_ref',
  utm: 'sq_utm',
  locale: 'sq_locale',
  minor: 'sq_minor',
  admin: 'sq_admin',
} as const;

export const COOKIE_MAX_AGE = {
  session: 60 * 60 * 24 * 365,
  ref: 60 * 60 * 24 * 30,
  admin: 60 * 60 * 12,
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: string | undefined | null): v is string {
  return !!v && UUID_RE.test(v);
}
