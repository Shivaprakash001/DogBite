import 'server-only';
import { stripPii, type EventName, type EventProps } from '@/lib/event-types';
import { db, schema } from './db';

/**
 * Server-authoritative events (state changes the server performs itself).
 * Fire-and-forget: analytics never fails a request.
 */
export function recordEvent<N extends EventName>(sessionId: string | null, name: N, props: EventProps[N], page?: string): void {
  void db()
    .insert(schema.events)
    .values({ sessionId, name, props: stripPii(props as Record<string, string | number | boolean | null>), page: page ?? null })
    .catch((err: unknown) => console.error('[events] insert failed', name, err));
}
