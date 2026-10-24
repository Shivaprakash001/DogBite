/**
 * ⚠️  DEV DATA ONLY. Generates fake hostels, quizzes, plays and events so pages
 * and dashboards can be built and reviewed locally. Every row is tagged
 * (sessions.utm = 'dev-seed', hostel names end with "(dev)") and can be wiped with
 * `npm run db:seed:dev -- --reset`. Refuses to run against a non-local database.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { eq, inArray, like, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { slugifyArea } from '../src/content/places';
import { QUESTION_BANK } from '../src/content/questions.seed';
import { RESEARCH_TAGS } from '../src/content/types';
import { normalizeHostelName, slugify } from '../src/lib/hostels';
import { seededRng, shuffle } from '../src/lib/random';
import { pickShownOptions } from '../src/lib/scoring';
import { buildCandidates, canAdd, type PoolQuestion } from '../src/lib/selection';
import * as schema from '../src/server/db/schema';

const TAG = 'dev-seed';
const url = process.env.DATABASE_URL ?? '';
if (!/localhost|127\.0\.0\.1/.test(url) && !process.argv.includes('--force')) {
  console.error('Refusing to seed dev data into a non-local database. Pass --force if you really mean it.');
  process.exit(1);
}
const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });
const rng = seededRng(20261024);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

const HOSTELS: { name: string; area: string; type: 'boys' | 'girls' | 'coed' }[] = [
  { name: 'Sri Venkateswara Boys Hostel (dev)', area: 'Maisammaguda', type: 'boys' },
  { name: 'Green Valley Boys PG (dev)', area: 'Maisammaguda', type: 'boys' },
  { name: 'Lakshmi Ladies Hostel (dev)', area: 'Maisammaguda', type: 'girls' },
  { name: 'Sunrise Co-Living (dev)', area: 'Kompally', type: 'coed' },
  { name: 'Annapurna Girls Hostel (dev)', area: 'Kukatpally', type: 'girls' },
  { name: 'Royal Boys Hostel (dev)', area: 'Kukatpally', type: 'boys' },
  { name: 'Sai Krupa Hostel (dev)', area: 'Ameerpet', type: 'boys' },
  { name: 'Lotus Ladies PG (dev)', area: 'Ameerpet', type: 'girls' },
];
const NAMES = [
  'Ravi',
  'Priya',
  'Arjun',
  'Sneha',
  'Kiran',
  'Divya',
  'Rahul',
  'Anjali',
  'Vamsi',
  'Pooja',
  'Teja',
  'Keerthi',
  'Sai',
  'Harika',
  'Nikhil',
  'Bhavana',
  'Rohit',
  'Swathi',
  'Manoj',
  'Lavanya',
  'Abhi',
  'Meghana',
  'Charan',
  'Sravya',
];

async function reset() {
  const sessions = await db.select({ id: schema.sessions.id }).from(schema.sessions).where(eq(schema.sessions.utm, TAG));
  const sids = sessions.map((s) => s.id);
  if (sids.length) {
    const creators = await db.select({ id: schema.creators.id }).from(schema.creators).where(inArray(schema.creators.sessionId, sids));
    const quizIds = creators.length
      ? (
          await db
            .select({ id: schema.quizzes.id })
            .from(schema.quizzes)
            .where(
              inArray(
                schema.quizzes.creatorId,
                creators.map((c) => c.id),
              ),
            )
        ).map((q) => q.id)
      : [];
    if (quizIds.length) {
      await db.delete(schema.attempts).where(inArray(schema.attempts.quizId, quizIds));
      await db.delete(schema.shares).where(inArray(schema.shares.quizId, quizIds));
      await db.delete(schema.quizQuestions).where(inArray(schema.quizQuestions.quizId, quizIds));
      await db.delete(schema.quizzes).where(inArray(schema.quizzes.id, quizIds));
    }
    await db.delete(schema.creators).where(inArray(schema.creators.sessionId, sids));
    await db.delete(schema.attempts).where(inArray(schema.attempts.sessionId, sids));
    for (const t of [schema.events, schema.waitlistTaps, schema.shares] as const) await db.delete(t).where(inArray(t.sessionId, sids));
    await db.delete(schema.sessions).where(inArray(schema.sessions.id, sids));
  }
  const hostels = await db.select({ id: schema.hostels.id }).from(schema.hostels).where(like(schema.hostels.name, '%(dev)'));
  if (hostels.length) {
    const ids = hostels.map((h) => h.id);
    await db.delete(schema.hostelMergeCandidates).where(inArray(schema.hostelMergeCandidates.hostelId, ids));
    await db.delete(schema.hostelFlags).where(inArray(schema.hostelFlags.hostelId, ids));
    await db.delete(schema.hostelContacts).where(inArray(schema.hostelContacts.hostelId, ids));
    await db.update(schema.creators).set({ hostelId: null }).where(inArray(schema.creators.hostelId, ids));
    await db.update(schema.attempts).set({ hostelId: null }).where(inArray(schema.attempts.hostelId, ids));
    await db.delete(schema.hostels).where(inArray(schema.hostels.id, ids));
  }
  console.log(`✓ removed dev data (${sids.length} sessions, ${hostels.length} hostels)`);
}

async function newSession(createdAt: Date, refSessionId: string | null = null) {
  const id = randomUUID();
  await db.insert(schema.sessions).values({
    id,
    shareRef: id.slice(0, 10),
    createdAt,
    lastSeenAt: createdAt,
    consentAt: createdAt,
    adultConfirmedAt: createdAt,
    utm: TAG,
    refSessionId,
  });
  return id;
}

const ev = (sessionId: string, name: string, props: Record<string, string | number | boolean | null>, createdAt: Date) => ({
  sessionId,
  name,
  props,
  createdAt,
  page: '/',
});

async function seed() {
  await reset();
  const qs = await db.select().from(schema.questions);
  const os = await db.select().from(schema.options);
  const qByKey = new Map(qs.map((q) => [q.key, q]));
  const qById = new Map(qs.map((q) => [q.id, q]));
  const optsByQ = new Map<number, typeof os>();
  for (const o of os) optsByQ.set(o.questionId, [...(optsByQ.get(o.questionId) ?? []), o]);

  const hostelRows = [];
  for (const h of HOSTELS) {
    const [row] = await db
      .insert(schema.hostels)
      .values({
        slug: slugify(`${h.name} ${h.area}`),
        name: h.name,
        nameNormalized: normalizeHostelName(h.name),
        area: h.area,
        areaSlug: slugifyArea(h.area),
        city: 'Hyderabad',
        type: h.type,
      })
      .returning();
    hostelRows.push(row);
  }

  const pool: PoolQuestion[] = QUESTION_BANK.map((q) => ({
    key: q.key,
    objective_tag: q.objective_tag,
    kind: q.kind,
    segment: q.segment,
    fun_score: q.fun_score,
    data_value: q.data_value,
    sensitivity: q.sensitivity,
    active: true,
    optionKeys: q.options.map((o) => o.key),
    successes: 0,
    failures: 0,
    impressions: 0,
    skips: 0,
  }));

  const events: ReturnType<typeof ev>[] = [];
  let quizzes = 0;
  let plays = 0;
  // Hostels get uneven activity so the leaderboards have a story.
  const weights = [9, 6, 7, 4, 6, 3, 2, 1];
  for (const [hi, hostel] of hostelRows.entries()) {
    for (let c = 0; c < weights[hi]; c++) {
      const created = minutesAgo(Math.floor(rng() * 60 * 24 * 6));
      const sid = await newSession(created);
      const gender = pick(['he', 'she', 'they'] as const);
      const [creator] = await db
        .insert(schema.creators)
        .values({
          sessionId: sid,
          displayName: pick(NAMES),
          gender,
          avatar: gender === 'she' ? 'girl' : gender === 'he' ? 'boy' : pick(['boy', 'girl'] as const),
          hostelId: hostel.id,
          hostelDecided: true,
          createdAt: created,
        })
        .returning();
      const segment = hostel.type === 'unknown' ? null : hostel.type;
      const candidates = buildCandidates(pool, { segment, excludeKeys: new Set(), coverage: {}, rng });
      const chosen: typeof candidates = [];
      // Bias picks toward research questions so report cards unlock in dev.
      for (const q of [
        ...candidates.filter((x) => x.kind !== 'fun'),
        ...shuffle(
          candidates.filter((x) => x.kind === 'fun'),
          rng,
        ),
      ]) {
        if (chosen.length === 10) break;
        if (canAdd(chosen, q) === null) chosen.push(q);
      }
      const slug = `${slugify(creator.displayName)}-dev${quizzes}`;
      const [quiz] = await db
        .insert(schema.quizzes)
        .values({
          slug,
          creatorId: creator.id,
          status: 'live',
          createdAt: created,
          publishedAt: new Date(created.getTime() + 100_000),
          picksConfirmedAt: created,
          candidateKeys: candidates.map((q) => q.key),
          shownKeys: candidates.map((q) => q.key),
        })
        .returning();
      quizzes++;
      const qqRows = [];
      for (const [position, q] of chosen.entries()) {
        const row = qByKey.get(q.key)!;
        const options = optsByQ.get(row.id)!;
        // Skew answers a little per hostel so aggregates differ between hostels.
        const option = rng() < 0.45 ? options[hi % options.length] : pick(options);
        const [qq] = await db
          .insert(schema.quizQuestions)
          .values({ quizId: quiz.id, questionId: row.id, position, creatorOptionId: option.id, answerMs: 1500 + Math.floor(rng() * 6000) })
          .returning();
        qqRows.push({ qq, options });
        events.push(ev(sid, 'creator_answer', { question_key: q.key, option_key: option.key, ms: qq.answerMs }, created));
      }
      events.push(ev(sid, 'candidates_shown', { question_keys: candidates.map((q) => q.key).join(',') }, created));
      for (const q of chosen) events.push(ev(sid, 'candidate_pick', { question_key: q.key, objective_tag: q.objective_tag, position_in_list: 0 }, created));
      events.push(
        ev(sid, 'landing_view', { utm: null }, created),
        ev(sid, 'start_click', { quiz_slug: null }, created),
        ev(sid, 'create_start', { resumed: false }, created),
        ev(
          sid,
          'quiz_publish',
          {
            total_ms: 95_000 + Math.floor(rng() * 60_000),
            research_count: chosen.filter((q) => (RESEARCH_TAGS as readonly string[]).includes(q.objective_tag)).length,
          },
          created,
        ),
        ev(sid, 'share_click', { channel: pick(['whatsapp', 'whatsapp', 'copy', 'native']), quiz_id: quiz.id, hostel_id: hostel.id }, created),
      );
      await db.insert(schema.shares).values({ sessionId: sid, quizId: quiz.id, hostelId: hostel.id, channel: 'whatsapp', createdAt: created });

      const players = 2 + Math.floor(rng() * 7);
      for (let p = 0; p < players; p++) {
        const at = new Date(created.getTime() + (1 + rng() * 600) * 60_000);
        const psid = await newSession(at, sid);
        const sameHostel = rng() < 0.7;
        const playerHostel = sameHostel ? hostel : pick(hostelRows);
        const [attempt] = await db
          .insert(schema.attempts)
          .values({
            quizId: quiz.id,
            sessionId: psid,
            playerName: pick(NAMES),
            playerAvatar: pick(['boy', 'girl'] as const),
            hostelId: rng() < 0.85 ? playerHostel.id : null,
            startedAt: at,
          })
          .returning();
        events.push(
          ev(psid, 'share_open', { quiz_slug: slug }, at),
          ev(psid, 'landing_view', { utm: null }, at),
          ev(psid, 'start_click', { quiz_slug: slug }, at),
        );
        const abandons = rng() < 0.12;
        let score = 0;
        let total = 0;
        for (const { qq, options } of qqRows) {
          if (abandons && qq.position === 4) {
            events.push(ev(psid, 'quiz_abandon', { last_position: 4, quiz_id: quiz.id }, at));
            break;
          }
          const shown = pickShownOptions(
            attempt.id,
            qq.id,
            qq.creatorOptionId!,
            options.map((o) => o.id),
          );
          const knows = sameHostel ? 0.72 : 0.55;
          const chosenId = rng() < knows ? qq.creatorOptionId! : shown.find((id) => id !== qq.creatorOptionId)!;
          const correct = chosenId === qq.creatorOptionId;
          const ms = 1200 + Math.floor(rng() * 5000);
          score += correct ? 1 : 0;
          total += ms;
          await db
            .insert(schema.attemptAnswers)
            .values({ attemptId: attempt.id, quizQuestionId: qq.id, shownOptionIds: shown, chosenOptionId: chosenId, isCorrect: correct, msToAnswer: ms });
          const opt = options.find((o) => o.id === chosenId)!;
          events.push(ev(psid, 'answer_submit', { question_key: qById.get(qq.questionId)!.key, option_key: opt.key, ms_to_answer: ms, correct }, at));
        }
        if (!abandons) {
          await db
            .update(schema.attempts)
            .set({ score, totalMs: total, finishedAt: new Date(at.getTime() + total) })
            .where(eq(schema.attempts.id, attempt.id));
          plays++;
          events.push(ev(psid, 'quiz_complete', { score, total_ms: total }, at), ev(psid, 'result_view', { score, tier: 'x' }, at));
          const feature = pick(['gym_buddy', 'mess_tracker', 'laundry_reminders', 'rent_reminders']);
          events.push(ev(psid, 'teaser_view', { feature_key: feature }, at));
          if (rng() < 0.22) {
            events.push(ev(psid, 'teaser_tap', { feature_key: feature }, at));
            await db
              .insert(schema.waitlistTaps)
              .values({ sessionId: psid, featureKey: feature, hostelId: attempt.hostelId, createdAt: at })
              .onConflictDoNothing();
          }
          if (rng() < 0.3) events.push(ev(psid, 'create_start', { resumed: false }, at));
        }
      }
    }
  }
  for (let i = 0; i < events.length; i += 500) await db.insert(schema.events).values(events.slice(i, i + 500));
  // Bandit counters roughly consistent with what was generated.
  await db.execute(sql`update question_stats s set impressions = s.impressions + x.n, picks = s.picks + x.n, successes = s.successes + x.n
    from (select question_id, count(*)::int n from quiz_questions qq join quizzes q on q.id = qq.quiz_id where q.slug like '%-dev%' group by 1) x where x.question_id = s.question_id`);
  console.log(`✓ dev data: ${hostelRows.length} hostels, ${quizzes} quizzes, ${plays} finished plays, ${events.length} events (tagged '${TAG}')`);
}

(process.argv.includes('--reset') ? reset() : seed())
  .then(() => client.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
