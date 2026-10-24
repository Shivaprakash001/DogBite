import 'server-only';
import { sql } from 'drizzle-orm';
import { RATE_LIMITS } from '@/config';
import { db } from './db';

// Fixed-window limiter in Postgres: no extra infrastructure for v1. Swap for a
// Redis/Upstash limiter if traffic outgrows it; callers only use hit().

export type Bucket = keyof typeof RATE_LIMITS;

/** Returns true when the request is allowed. */
export async function hit(bucket: Bucket, scope: 'session' | 'ip', subject: string): Promise<boolean> {
  const [max, windowSec] = RATE_LIMITS[bucket][scope];
  const key = `${bucket}:${scope}:${subject}`;
  const rows = await db().execute<{ count: number }>(sql`
    insert into rate_limits (key, window_start, count)
    values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${windowSec}) then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${windowSec}) then now() else rate_limits.window_start end
    returning count
  `);
  return Number(rows[0]?.count ?? 0) <= max;
}
