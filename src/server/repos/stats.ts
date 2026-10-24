import 'server-only';
import { and, desc, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm';
import { PRIVACY } from '@/config';
import { slugifyArea } from '@/content/places';
import { TEASERS, type Teaser } from '@/content/teasers';
import { publicShares, ratingAverage, type PublicShare } from '@/lib/aggregation';
import type { HostelDTO } from '@/lib/api-types';
import { renderQuestionText } from '@/lib/text';
import { db, schema } from '../db';
import { toHostelDTO, type Hostel } from './hostels';
import { loadBank } from './questions';

// Hostel-level aggregates. Everything public goes through the k-anonymity floor in
// lib/aggregation; nothing here returns an individual's answers.

const POINTS = { quiz: 3, play: 1 } as const;

export interface RankedHostel extends HostelDTO {
  points: number;
  quizzes: number;
  plays: number;
  rank: number;
}

/** Points = 3 per live quiz made by residents + 1 per finished play by residents. */
async function hostelPoints(filter?: { city: string; areaSlug: string }, since?: Date): Promise<RankedHostel[]> {
  const d = db();
  const quizCounts = d
    .select({ hostelId: schema.creators.hostelId, n: sql<number>`count(*)::int`.as('qn') })
    .from(schema.quizzes)
    .innerJoin(schema.creators, eq(schema.creators.id, schema.quizzes.creatorId))
    .where(and(eq(schema.quizzes.status, 'live'), isNotNull(schema.creators.hostelId), since ? gte(schema.quizzes.publishedAt, since) : undefined))
    .groupBy(schema.creators.hostelId)
    .as('qc');
  const playCounts = d
    .select({ hostelId: schema.attempts.hostelId, n: sql<number>`count(*)::int`.as('pn') })
    .from(schema.attempts)
    .where(and(isNotNull(schema.attempts.finishedAt), isNotNull(schema.attempts.hostelId), since ? gte(schema.attempts.finishedAt, since) : undefined))
    .groupBy(schema.attempts.hostelId)
    .as('pc');
  const rows = await d
    .select({
      h: schema.hostels,
      quizzes: sql<number>`coalesce(${quizCounts.n}, 0)::int`,
      plays: sql<number>`coalesce(${playCounts.n}, 0)::int`,
    })
    .from(schema.hostels)
    .leftJoin(quizCounts, eq(quizCounts.hostelId, schema.hostels.id))
    .leftJoin(playCounts, eq(playCounts.hostelId, schema.hostels.id))
    .where(
      and(
        sql`${schema.hostels.mergedInto} is null`,
        eq(schema.hostels.hidden, false),
        filter ? and(eq(schema.hostels.city, filter.city), eq(schema.hostels.areaSlug, filter.areaSlug)) : undefined,
        sql`coalesce(${quizCounts.n}, 0) + coalesce(${playCounts.n}, 0) > 0`,
      ),
    );
  return rows
    .map((r) => ({ ...toHostelDTO(r.h), quizzes: r.quizzes, plays: r.plays, points: r.quizzes * POINTS.quiz + r.plays * POINTS.play, rank: 0 }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

export async function areaLeaderboard(city: string, areaSlug: string): Promise<RankedHostel[]> {
  return hostelPoints({ city, areaSlug });
}

export async function globalLeaderboard(limit = 20): Promise<RankedHostel[]> {
  return (await hostelPoints()).slice(0, limit);
}

/** Landing strip: hostels with the most activity this week. */
export async function hostelsPlayingNow(limit = 6): Promise<RankedHostel[]> {
  return (await hostelPoints(undefined, new Date(Date.now() - 7 * 864e5))).slice(0, limit);
}

/** Areas that have at least one active hostel, for the Face-off picker. */
export async function activeAreas(): Promise<{ city: string; area: string; areaSlug: string; hostels: number }[]> {
  const rows = await hostelPoints();
  const map = new Map<string, { city: string; area: string; areaSlug: string; hostels: number }>();
  for (const h of rows) {
    const key = `${h.city}|${h.area.toLowerCase()}`;
    const cur = map.get(key) ?? { city: h.city, area: h.area, areaSlug: slugifyArea(h.area), hostels: 0 };
    cur.hostels++;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.hostels - a.hostels);
}

export interface HostelPageData {
  hostel: HostelDTO;
  rank: number | null;
  areaCount: number;
  players: number;
  quizzes: number;
  topQuizzes: { slug: string; creatorName: string; plays: number }[];
  topGuessers: { name: string; points: number; quizzes: number }[];
  funStats: { question: string; label: string; emoji: string; pct: number }[];
  respondents: number;
}

/** Distinct creators from this hostel with live quizzes = respondents for aggregates. */
async function hostelRespondents(hostelId: string): Promise<number> {
  const [{ n }] = await db()
    .select({ n: sql<number>`count(distinct ${schema.creators.sessionId})::int` })
    .from(schema.creators)
    .innerJoin(schema.quizzes, eq(schema.quizzes.creatorId, schema.creators.id))
    .where(and(eq(schema.creators.hostelId, hostelId), eq(schema.quizzes.status, 'live')));
  return n;
}

/**
 * Self-reported answers of this hostel's creators, grouped by question key.
 * One answer per respondent (their latest quiz) so prolific creators don't skew it.
 */
async function hostelAnswers(hostelId: string, questionKeys?: string[]): Promise<Map<string, Record<string, number>>> {
  const rows = await db()
    .selectDistinctOn([schema.creators.sessionId, schema.questions.key], {
      session: schema.creators.sessionId,
      questionKey: schema.questions.key,
      optionKey: schema.options.key,
    })
    .from(schema.quizQuestions)
    .innerJoin(schema.quizzes, eq(schema.quizzes.id, schema.quizQuestions.quizId))
    .innerJoin(schema.creators, eq(schema.creators.id, schema.quizzes.creatorId))
    .innerJoin(schema.questions, eq(schema.questions.id, schema.quizQuestions.questionId))
    .innerJoin(schema.options, eq(schema.options.id, schema.quizQuestions.creatorOptionId))
    .where(
      and(
        eq(schema.creators.hostelId, hostelId),
        eq(schema.quizzes.status, 'live'),
        questionKeys ? inArray(schema.questions.key, questionKeys) : undefined,
      ),
    )
    .orderBy(schema.creators.sessionId, schema.questions.key, desc(schema.quizzes.publishedAt));
  const out = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const dist = out.get(r.questionKey) ?? {};
    dist[r.optionKey] = (dist[r.optionKey] ?? 0) + 1;
    out.set(r.questionKey, dist);
  }
  return out;
}

export async function hostelPage(hostel: Hostel): Promise<HostelPageData> {
  const d = db();
  const area = await areaLeaderboard(hostel.city, hostel.areaSlug);
  const me = area.find((h) => h.id === hostel.id);

  const [{ players }] = await d
    .select({ players: sql<number>`count(distinct ${schema.attempts.sessionId})::int` })
    .from(schema.attempts)
    .where(and(eq(schema.attempts.hostelId, hostel.id), isNotNull(schema.attempts.finishedAt)));

  const topQuizzes = await d
    .select({ slug: schema.quizzes.slug, creatorName: schema.creators.displayName, plays: sql<number>`count(distinct ${schema.attempts.sessionId})::int` })
    .from(schema.quizzes)
    .innerJoin(schema.creators, eq(schema.creators.id, schema.quizzes.creatorId))
    .leftJoin(schema.attempts, and(eq(schema.attempts.quizId, schema.quizzes.id), isNotNull(schema.attempts.finishedAt)))
    .where(and(eq(schema.creators.hostelId, hostel.id), eq(schema.quizzes.status, 'live')))
    .groupBy(schema.quizzes.id, schema.creators.displayName)
    .orderBy(desc(sql`count(distinct ${schema.attempts.sessionId})`))
    .limit(5);

  // Best score per (player, quiz), summed per player.
  const best = d
    .select({
      sessionId: schema.attempts.sessionId,
      quizId: schema.attempts.quizId,
      name: sql<string>`max(${schema.attempts.playerName})`.as('pname'),
      best: sql<number>`max(${schema.attempts.score})`.as('best'),
    })
    .from(schema.attempts)
    .where(and(eq(schema.attempts.hostelId, hostel.id), isNotNull(schema.attempts.finishedAt)))
    .groupBy(schema.attempts.sessionId, schema.attempts.quizId)
    .as('b');
  const topGuessers = await d
    .select({ name: sql<string>`max(${best.name})`, points: sql<number>`sum(${best.best})::int`, quizzes: sql<number>`count(*)::int` })
    .from(best)
    .groupBy(best.sessionId)
    .orderBy(desc(sql`sum(${best.best})`))
    .limit(5);

  const respondents = await hostelRespondents(hostel.id);
  const funStats: HostelPageData['funStats'] = [];
  if (respondents >= PRIVACY.minRespondents) {
    const bank = await loadBank();
    const funKeys = [...bank.byKey.values()].filter((q) => q.kind === 'fun').map((q) => q.key);
    const answers = await hostelAnswers(hostel.id, funKeys);
    for (const [key, dist] of answers) {
      const shares = publicShares(dist);
      if (!shares?.length) continue;
      const q = bank.byKey.get(key)!;
      const top = q.options.find((o) => o.key === shares[0].key)!;
      funStats.push({ question: renderQuestionText(q.textTemplate, 'this hostel', 'they'), label: top.label, emoji: top.emoji, pct: shares[0].pct });
    }
    funStats.sort((a, b) => b.pct - a.pct);
  }

  return {
    hostel: toHostelDTO(hostel),
    rank: me?.rank ?? null,
    areaCount: area.length,
    players,
    quizzes: me?.quizzes ?? 0,
    topQuizzes,
    topGuessers,
    funStats: funStats.slice(0, 4),
    respondents,
  };
}

export interface ReportSection {
  key: string;
  respondents: number;
  shares: (PublicShare & { label: string; emoji: string })[] | null;
  average?: number | null;
}

export interface ReportCard {
  hostel: HostelDTO;
  respondents: number;
  unlocked: boolean;
  sections: Record<'mess' | 'painPoints' | 'wishList' | 'laundry' | 'wifi', ReportSection>;
}

const REPORT_QUESTIONS = {
  mess: 'q_mess_rating',
  painPoints: 'q_pain_biggest',
  wishList: 'q_wtp_upgrade',
  laundry: 'q_laundry_routine',
  wifi: 'q_wifi_rating',
} as const;

/** Hostel Report Card (§11.3). Locked entirely below the k floor; each section has its own floor too. */
export async function reportCard(hostel: Hostel): Promise<ReportCard> {
  const respondents = await hostelRespondents(hostel.id);
  const unlocked = respondents >= PRIVACY.minRespondents;
  const bank = await loadBank();
  const answers = unlocked ? await hostelAnswers(hostel.id, Object.values(REPORT_QUESTIONS)) : new Map<string, Record<string, number>>();

  const section = (key: keyof typeof REPORT_QUESTIONS): ReportSection => {
    const qKey = REPORT_QUESTIONS[key];
    const dist = answers.get(qKey) ?? {};
    const n = Object.values(dist).reduce((a, b) => a + b, 0);
    const q = bank.byKey.get(qKey);
    const shares = publicShares(dist, n);
    return {
      key: qKey,
      respondents: n,
      shares:
        shares && q
          ? shares.map((s) => {
              const o = q.options.find((x) => x.key === s.key)!;
              return { ...s, label: o.label, emoji: o.emoji };
            })
          : null,
      average: q?.kind === 'rating' && shares ? ratingAverage(dist) : undefined,
    };
  };

  return {
    hostel: toHostelDTO(hostel),
    respondents,
    unlocked,
    sections: {
      mess: section('mess'),
      painPoints: section('painPoints'),
      wishList: section('wishList'),
      laundry: section('laundry'),
      wifi: section('wifi'),
    },
  };
}

/** Rotate teaser cards toward the feature with the least demand data (fewest views). */
export async function pickTeaser(): Promise<Teaser> {
  const rows = await db()
    .select({ key: sql<string>`${schema.events.props}->>'feature_key'`, n: sql<number>`count(*)::int` })
    .from(schema.events)
    .where(eq(schema.events.name, 'teaser_view'))
    .groupBy(sql`${schema.events.props}->>'feature_key'`);
  const views = new Map(rows.map((r) => [r.key, r.n]));
  const min = Math.min(...TEASERS.map((t) => views.get(t.featureKey) ?? 0));
  const candidates = TEASERS.filter((t) => (views.get(t.featureKey) ?? 0) === min);
  return candidates[Math.floor(Math.random() * candidates.length)];
}
