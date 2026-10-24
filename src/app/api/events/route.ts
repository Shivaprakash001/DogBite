import { CLIENT_EVENTS, eventBatchSchema, stripPii } from '@/lib/event-types';
import { db, schema } from '@/server/db';
import { assertSameOrigin, limit, parseBody, requireSession, route } from '@/server/http';
import { recordAbandon } from '@/server/repos/play';

/** Batched client analytics (§12). Anonymous session id only, never PII. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const session = await requireSession(req);
  await limit(req, 'events', session.id);
  const { events } = await parseBody(req, eventBatchSchema);
  const accepted = events.filter((e) => CLIENT_EVENTS.has(e.name));
  if (accepted.length) {
    await db()
      .insert(schema.events)
      .values(
        accepted.map((e) => ({
          sessionId: session.id,
          name: e.name,
          props: stripPii(e.props),
          page: e.page,
          ref: e.ref ?? null,
          createdAt: new Date(Math.min(e.ts, Date.now())),
        })),
      );
  }
  // Abandonment feeds the question bandit as a failure at that position.
  for (const e of accepted) {
    if (e.name === 'quiz_abandon' && typeof e.props.quiz_id === 'string' && typeof e.props.last_position === 'number') {
      await recordAbandon(session.id, e.props.quiz_id, e.props.last_position).catch(() => undefined);
    }
  }
  return new Response(null, { status: 204 });
});
