import 'server-only';
import { sql } from 'drizzle-orm';
import { FEATURE_DECISIONS, SELECTION, type FeatureKey } from '@/config';
import { RESEARCH_TAGS } from '@/content/types';
import { featureDecision, truthGap, wilson, type Decision, type Distribution, type TruthGap } from '@/lib/aggregation';
import { isRetired } from '@/lib/selection';
import { db } from '../db';
import { loadBank } from './questions';

// Admin analytics (§15). Read-only, aggregate queries. Every number travels with
// its sample size; nothing here is shown outside /admin.

type Row = Record<string, unknown>;
const rows = async <T extends Row>(q: ReturnType<typeof sql>) => (await db().execute(q)) as unknown as T[];
const num = (v: unknown) => Number(v ?? 0);
/** Raw-SQL timestamp parameter (Date objects aren't serialised for untyped params). */
const at = (d: Date) => sql`${d.toISOString()}::timestamptz`;

export async function overview(since: Date) {
  const [r] = await rows<{ sessions: number; consented: number; quizzes: number; plays: number; hostels: number; events: number }>(sql`
    select
      (select count(*) from sessions where created_at >= ${at(since)}) sessions,
      (select count(*) from sessions where consent_at >= ${at(since)}) consented,
      (select count(*) from quizzes where status = 'live' and published_at >= ${at(since)}) quizzes,
      (select count(*) from attempts where finished_at >= ${at(since)}) plays,
      (select count(*) from hostels where merged_into is null) hostels,
      (select count(*) from events where created_at >= ${at(since)}) events`);
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, num(v)])) as Record<keyof typeof r, number>;
}

export const FUNNEL_STEPS = [
  'landing_view',
  'start_click',
  'quiz_complete',
  'result_view',
  'create_start',
  'quiz_publish',
  'share_click',
  'share_open',
] as const;

export async function funnel(since: Date) {
  const counts = await rows<{ name: string; n: number }>(sql`
    select name, count(distinct session_id) n from events
    where created_at >= ${at(since)} and name in (${sql.join(
      FUNNEL_STEPS.map((s) => sql`${s}`),
      sql`, `,
    )})
    group by name`);
  const byName = new Map(counts.map((c) => [c.name, num(c.n)]));
  const steps = FUNNEL_STEPS.map((name) => ({ name, sessions: byName.get(name) ?? 0 }));

  const perQ = await rows<{ position: number; n: number }>(sql`
    select qq.position, count(*) n from attempt_answers aa
    join quiz_questions qq on qq.id = aa.quiz_question_id
    join attempts a on a.id = aa.attempt_id
    where a.started_at >= ${at(since)} group by 1 order by 1`);
  const [{ started }] = await rows<{ started: number }>(sql`select count(*) started from attempts where started_at >= ${at(since)}`);
  return { steps, started: num(started), perQuestion: perQ.map((p) => ({ position: num(p.position), answered: num(p.n) })) };
}

export async function virality(since: Date) {
  const [k] = await rows<{ plays: number; referred_quizzes: number; players: number; players_who_created: number; referrers: number; referred: number }>(sql`
    with players as (select distinct session_id from attempts where finished_at >= ${at(since)}),
         creators_live as (select distinct c.session_id from creators c join quizzes q on q.creator_id = c.id where q.status = 'live' and q.published_at >= ${at(since)})
    select
      (select count(*) from attempts where finished_at >= ${at(since)}) plays,
      (select count(*) from quizzes q join creators c on c.id = q.creator_id join sessions s on s.id = c.session_id
         where q.status = 'live' and q.published_at >= ${at(since)} and s.ref_session_id is not null) referred_quizzes,
      (select count(*) from players) players,
      (select count(*) from players p join creators_live c on c.session_id = p.session_id) players_who_created,
      (select count(distinct ref_session_id) from sessions where created_at >= ${at(since)} and ref_session_id is not null) referrers,
      (select count(*) from sessions where created_at >= ${at(since)} and ref_session_id is not null) referred`);

  const spread = await rows<{ same_hostel: number; cross_hostel: number; cross_area: number; cross_college: number; unknown: number }>(sql`
    with sh as (
      select distinct on (session_id) session_id, hostel_id from (
        select session_id, hostel_id, started_at t from attempts where hostel_id is not null
        union all select session_id, hostel_id, created_at t from creators where hostel_id is not null) x
      order by session_id, t desc)
    select
      count(*) filter (where hb.id = ha.id) same_hostel,
      count(*) filter (where hb.id <> ha.id) cross_hostel,
      count(*) filter (where hb.area_slug <> ha.area_slug or hb.city <> ha.city) cross_area,
      count(*) filter (where hb.college_id is distinct from ha.college_id and hb.college_id is not null and ha.college_id is not null) cross_college,
      count(*) filter (where ha.id is null or hb.id is null) unknown
    from sessions s
    left join sh a on a.session_id = s.ref_session_id left join hostels ha on ha.id = a.hostel_id
    left join sh b on b.session_id = s.id left join hostels hb on hb.id = b.hostel_id
    where s.ref_session_id is not null and s.created_at >= ${at(since)}`);

  const channels = await rows<{ channel: string; n: number }>(
    sql`select channel, count(*) n from shares where created_at >= ${at(since)} group by 1 order by 2 desc`,
  );
  const plays = num(k.plays);
  const players = num(k.players);
  return {
    kFactor: { value: plays ? num(k.referred_quizzes) / plays : null, numerator: num(k.referred_quizzes), sample: plays },
    playToCreate: { value: players ? num(k.players_who_created) / players : null, numerator: num(k.players_who_created), sample: players },
    referralsPerReferrer: { value: num(k.referrers) ? num(k.referred) / num(k.referrers) : null, numerator: num(k.referred), sample: num(k.referrers) },
    spread: Object.fromEntries(Object.entries(spread[0] ?? {}).map(([a, b]) => [a, num(b)])) as Record<string, number>,
    channels: channels.map((c) => ({ channel: c.channel, n: num(c.n) })),
  };
}

export interface ResearchRow {
  questionKey: string;
  objective: string;
  text: string;
  options: { key: string; label: string }[];
  overall: TruthGap;
  topShare: { key: string; share: number; ci: [number, number] } | null;
  strata: { city: string; type: string; n: number; needed: number }[];
}

/** Stated (creator self-report) vs peer-perceived (friends' modal guess), per research question. */
export async function research(): Promise<ResearchRow[]> {
  const bank = await loadBank();
  const data = await rows<{ qkey: string; stated: string; city: string; htype: string; creator: string; guesses: string[] }>(sql`
    select q.key qkey, o.key stated, coalesce(h.city, '(no hostel)') city, coalesce(h.type::text, 'unknown') htype, c.session_id::text creator,
      coalesce(array_agg(oc.key) filter (where oc.key is not null and a.finished_at is not null), '{}') guesses
    from quiz_questions qq
    join quizzes z on z.id = qq.quiz_id and z.status = 'live'
    join creators c on c.id = z.creator_id
    left join hostels h on h.id = c.hostel_id
    join questions q on q.id = qq.question_id
    join options o on o.id = qq.creator_option_id
    left join attempt_answers aa on aa.quiz_question_id = qq.id
    left join attempts a on a.id = aa.attempt_id
    left join options oc on oc.id = aa.chosen_option_id
    where q.objective_tag in (${sql.join(
      RESEARCH_TAGS.map((t) => sql`${t}`),
      sql`, `,
    )})
    group by qq.id, q.key, o.key, h.city, h.type, c.session_id`);

  const byQ = new Map<string, typeof data>();
  for (const r of data) byQ.set(r.qkey, [...(byQ.get(r.qkey) ?? []), r]);

  return [...bank.byKey.values()]
    .filter((q) => (RESEARCH_TAGS as readonly string[]).includes(q.objectiveTag))
    .map((q) => {
      const rs = byQ.get(q.key) ?? [];
      const overall = truthGap(rs.map((r) => ({ creatorId: r.creator, stated: r.stated, guesses: r.guesses })));
      const top = Object.entries(overall.stated).sort((a, b) => b[1] - a[1])[0];
      const strata = new Map<string, { city: string; type: string; n: number }>();
      for (const r of rs) {
        const key = `${r.city}|${r.htype}`;
        const s = strata.get(key) ?? { city: r.city, type: r.htype, n: 0 };
        s.n++;
        strata.set(key, s);
      }
      return {
        questionKey: q.key,
        objective: q.objectiveTag,
        text: q.textTemplate.replaceAll('{name}', '…').replaceAll('{their}', 'their').replaceAll('{them}', 'them'),
        options: q.options.map((o) => ({ key: o.key, label: o.label })),
        overall,
        topShare: top ? { key: top[0], share: top[1] / overall.respondents, ci: wilson(top[1], overall.respondents) } : null,
        strata: [...strata.values()].sort((a, b) => b.n - a.n).map((s) => ({ ...s, needed: Math.max(0, SELECTION.targetPerStratum - s.n) })),
      };
    })
    .sort((a, b) => a.objective.localeCompare(b.objective) || b.overall.respondents - a.overall.respondents);
}

export async function questionHealth() {
  const bank = await loadBank();
  const stats = await rows<{ question_id: number; impressions: number; picks: number; skips: number; successes: number; failures: number }>(
    sql`select * from question_stats`,
  );
  const byId = new Map(stats.map((s) => [num(s.question_id), s]));
  return [...bank.byId.values()]
    .map((q) => {
      const s = byId.get(q.id);
      const impressions = num(s?.impressions);
      const picks = num(s?.picks);
      const skips = num(s?.skips);
      const successes = num(s?.successes);
      const failures = num(s?.failures);
      return {
        key: q.key,
        kind: q.kind,
        objective: q.objectiveTag,
        active: q.active,
        sensitivity: q.sensitivity,
        impressions,
        picks,
        skips,
        pickRate: impressions ? picks / impressions : null,
        skipRate: impressions ? skips / impressions : null,
        completion: successes + failures ? successes / (successes + failures) : null,
        posteriorMean: (1 + successes) / (2 + successes + failures),
        flagged: isRetired({ impressions, skips }),
      };
    })
    .sort((a, b) => Number(b.flagged) - Number(a.flagged) || (b.pickRate ?? -1) - (a.pickRate ?? -1));
}

export async function hostelsAdmin() {
  const [totals] = await rows<{ total: number; verified: number; claimed: number; hidden: number; contacts: number }>(sql`
    select count(*) filter (where merged_into is null) total,
      count(*) filter (where status = 'verified' and merged_into is null) verified,
      count(*) filter (where status = 'claimed' and merged_into is null) claimed,
      count(*) filter (where hidden) hidden,
      (select count(*) from hostel_contacts where status <> 'opted_out') contacts
    from hostels`);
  const queue = await rows<{ id: number; similarity: number; a_id: string; a_name: string; a_area: string; b_id: string; b_name: string; b_area: string }>(sql`
    select m.id, m.similarity, a.id a_id, a.name a_name, a.area a_area, b.id b_id, b.name b_name, b.area b_area
    from hostel_merge_candidates m join hostels a on a.id = m.hostel_id join hostels b on b.id = m.candidate_id
    where m.status = 'open' and a.merged_into is null and b.merged_into is null order by m.created_at limit 50`);
  const flagged = await rows<{ id: string; name: string; area: string; hidden: boolean; flags: number }>(sql`
    select h.id, h.name, h.area, h.hidden, count(f.id) flags from hostels h join hostel_flags f on f.hostel_id = h.id
    group by h.id order by flags desc limit 30`);
  const recent = await rows<{ id: string; name: string; area: string; city: string; status: string; created_at: Date }>(sql`
    select id, name, area, city, status, created_at from hostels where merged_into is null order by created_at desc limit 15`);
  const contactsByHostel = await rows<{ name: string; n: number }>(sql`
    select h.name, count(*) n from hostel_contacts c join hostels h on h.id = c.hostel_id where c.status <> 'opted_out' group by h.name order by n desc limit 10`);
  return {
    totals: Object.fromEntries(Object.entries(totals).map(([a, b]) => [a, num(b)])) as Record<keyof typeof totals, number>,
    queue,
    flagged: flagged.map((f) => ({ ...f, flags: num(f.flags) })),
    recent,
    contactsByHostel: contactsByHostel.map((c) => ({ name: c.name, n: num(c.n) })),
  };
}

export interface FeatureRow {
  key: FeatureKey;
  label: string;
  stated: { value: number | null; threshold: number; sample: number; ci: [number, number] };
  tap: { value: number | null; threshold: number; sample: number; ci: [number, number] };
  decision: Decision;
}

export async function featurePanel(): Promise<FeatureRow[]> {
  const out: FeatureRow[] = [];
  for (const [key, cfg] of Object.entries(FEATURE_DECISIONS) as [FeatureKey, (typeof FEATURE_DECISIONS)[FeatureKey]][]) {
    const [stated] = await rows<{ n: number; hits: number }>(sql`
      select count(*) n, count(*) filter (where o.key in (${sql.join(
        cfg.stated.optionKeys.map((k) => sql`${k}`),
        sql`, `,
      )})) hits
      from quiz_questions qq join quizzes z on z.id = qq.quiz_id and z.status = 'live'
      join questions q on q.id = qq.question_id join options o on o.id = qq.creator_option_id
      where q.key = ${cfg.stated.questionKey}`);
    const [tap] = await rows<{ views: number; taps: number }>(sql`
      select count(distinct session_id) filter (where name = 'teaser_view') views,
             count(distinct session_id) filter (where name = 'teaser_tap') taps
      from events where name in ('teaser_view', 'teaser_tap') and props->>'feature_key' = ${key}`);
    const n = num(stated.n);
    const views = num(tap.views);
    const s = { value: n ? num(stated.hits) / n : null, threshold: cfg.stated.threshold, sample: n, ci: wilson(num(stated.hits), n) };
    const t = { value: views ? num(tap.taps) / views : null, threshold: cfg.teaserTapRate, sample: views, ci: wilson(num(tap.taps), views) };
    out.push({ key, label: cfg.label, stated: s, tap: t, decision: featureDecision([s, t], cfg.minSample) });
  }
  return out;
}

export type { Distribution };
