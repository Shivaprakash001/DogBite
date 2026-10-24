import { describe, expect, it } from 'vitest';
import { QUESTION_BANK } from '@/content/questions.seed';
import { isResearchTag } from '@/content/types';
import { seededRng } from '@/lib/random';
import {
  buildCandidates,
  canAdd,
  eligiblePool,
  isRetired,
  needScore,
  optionJaccard,
  pickReplacement,
  validateComposition,
  type PoolQuestion,
  type SelectionContext,
} from '@/lib/selection';

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

const ctx = (over: Partial<SelectionContext> = {}): SelectionContext => ({
  segment: 'boys',
  excludeKeys: new Set(),
  coverage: {},
  rng: seededRng(42),
  ...over,
});

describe('question bank', () => {
  it('has 40+ questions with 3–6 options and unique keys', () => {
    expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(40);
    expect(new Set(QUESTION_BANK.map((q) => q.key)).size).toBe(QUESTION_BANK.length);
    for (const q of QUESTION_BANK) {
      expect(q.options.length, q.key).toBeGreaterThanOrEqual(3);
      expect(q.options.length, q.key).toBeLessThanOrEqual(6);
      expect(new Set(q.options.map((o) => o.key)).size, q.key).toBe(q.options.length);
      expect(q.text, q.key).toContain('{name}');
    }
  });

  it('keeps kind and objective consistent (fun ⇔ non-research tag)', () => {
    for (const q of QUESTION_BANK) {
      expect(q.kind === 'fun', q.key).toBe(!isResearchTag(q.objective_tag));
    }
  });
});

describe('eligiblePool', () => {
  it('excludes sensitivity 2, inactive, excluded and off-segment questions', () => {
    const p = eligiblePool(pool, { segment: 'boys', excludeKeys: new Set(['q_alarm']) });
    expect(p.some((q) => q.sensitivity > 1)).toBe(false);
    expect(p.some((q) => q.key === 'q_alarm')).toBe(false);
    expect(p.some((q) => q.segment === 'coed')).toBe(false);
    expect(eligiblePool(pool, { segment: 'coed', excludeKeys: new Set() }).some((q) => q.segment === 'coed')).toBe(true);
  });

  it('retires questions over the skip threshold once they have enough impressions', () => {
    expect(isRetired({ impressions: 100, skips: 41 })).toBe(true);
    expect(isRetired({ impressions: 99, skips: 99 })).toBe(false);
    expect(isRetired({ impressions: 200, skips: 80 })).toBe(false);
  });
});

describe('needScore', () => {
  it('is zero for fun and decays as a stratum fills up', () => {
    const fun = pool.find((q) => q.kind === 'fun')!;
    const gym = pool.find((q) => q.key === 'q_gym_week')!;
    expect(needScore(fun, {})).toBe(0);
    expect(needScore(gym, {})).toBeCloseTo(gym.data_value);
    expect(needScore(gym, { gym: 400 })).toBeCloseTo(gym.data_value / 2);
  });
});

describe('buildCandidates', () => {
  it('returns 20 unique candidates with roughly 14 fun / 5 research / 1 rating', () => {
    const c = buildCandidates(pool, ctx());
    expect(c).toHaveLength(20);
    expect(new Set(c.map((q) => q.key)).size).toBe(20);
    expect(c.filter((q) => q.kind === 'rating')).toHaveLength(1);
    expect(c.filter((q) => q.kind === 'research')).toHaveLength(5);
    expect(c.filter((q) => q.kind === 'fun')).toHaveLength(14);
  });

  it('never puts more than 2 research questions of the same objective in a batch', () => {
    for (let seed = 0; seed < 30; seed++) {
      const c = buildCandidates(pool, ctx({ rng: seededRng(seed) }));
      const counts: Record<string, number> = {};
      for (const q of c.filter((x) => x.kind !== 'fun')) counts[q.objective_tag] = (counts[q.objective_tag] ?? 0) + 1;
      expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(2);
    }
  });

  it('skips excluded keys so shuffles never repeat', () => {
    const first = buildCandidates(pool, ctx());
    const second = buildCandidates(pool, ctx({ excludeKeys: new Set(first.map((q) => q.key)), rng: seededRng(7) }));
    expect(second.some((q) => first.some((f) => f.key === q.key))).toBe(false);
  });

  it('is deterministic for a given seed', () => {
    expect(buildCandidates(pool, ctx()).map((q) => q.key)).toEqual(buildCandidates(pool, ctx()).map((q) => q.key));
  });

  it('favours objectives with fewer responses', () => {
    const tally = (coverage: SelectionContext['coverage']) => {
      let gym = 0;
      for (let s = 0; s < 60; s++) {
        gym += buildCandidates(pool, ctx({ rng: seededRng(s), coverage })).filter((q) => q.objective_tag === 'gym').length;
      }
      return gym;
    };
    const saturated = { gym: 100_000 };
    expect(tally({ laundry: 100_000, rent: 100_000, wtp: 100_000, nutrition: 100_000, mess: 100_000, pain_points: 100_000 })).toBeGreaterThan(
      tally(saturated),
    );
  });

  it('learns from the bandit: a question that keeps failing appears less often', () => {
    const bad = pool.map((q) => (q.key === 'q_cartoon' ? { ...q, successes: 0, failures: 500 } : q));
    const good = pool.map((q) => (q.key === 'q_cartoon' ? { ...q, successes: 500, failures: 0 } : q));
    const count = (p: PoolQuestion[]) =>
      Array.from({ length: 40 }, (_, s) => buildCandidates(p, ctx({ rng: seededRng(s) }))).filter((c) => c.some((q) => q.key === 'q_cartoon')).length;
    expect(count(good)).toBeGreaterThan(count(bad));
  });

  it('backfills when the pool is small', () => {
    const small = pool.filter((q) => q.kind === 'fun').slice(0, 8);
    expect(buildCandidates(small, ctx())).toHaveLength(8);
  });
});

describe('composition rules', () => {
  const item = (key: string, objective_tag: string, kind: string) => ({ key, objective_tag, kind });
  const fun = (n: number) => Array.from({ length: n }, (_, i) => item(`f${i}`, 'fun', 'fun'));

  it('accepts 7 fun + 3 research', () => {
    expect(validateComposition([...fun(7), item('r1', 'gym', 'research'), item('r2', 'rent', 'research'), item('r3', 'mess', 'rating')])).toEqual([]);
  });

  it('rejects more than 3 research-tagged questions', () => {
    const quiz = [...fun(6), item('r1', 'gym', 'research'), item('r2', 'rent', 'research'), item('r3', 'laundry', 'research'), item('r4', 'wtp', 'research')];
    expect(validateComposition(quiz)).toContain('research_cap');
  });

  it('rejects two hostel ratings, wrong counts and duplicates', () => {
    expect(validateComposition([...fun(8), item('a', 'mess', 'rating'), item('b', 'pain_points', 'rating')])).toContain('rating_cap');
    expect(validateComposition(fun(9))).toContain('count');
    expect(validateComposition([...fun(9), item('f0', 'fun', 'fun')])).toContain('duplicate');
  });

  it('canAdd blocks the 4th research pick and the 2nd rating', () => {
    const three = [item('r1', 'gym', 'research'), item('r2', 'rent', 'research'), item('r3', 'mess', 'research')];
    expect(canAdd(three, item('r4', 'wtp', 'research'))).toBe('research_cap');
    expect(canAdd(three, item('f', 'fun', 'fun'))).toBeNull();
    expect(canAdd([item('a', 'mess', 'rating')], item('b', 'pain_points', 'rating'))).toBe('rating_cap');
  });

  it('pickReplacement keeps caps and prefers the same kind', () => {
    const quiz = [...fun(6).map((f, i) => ({ ...f, key: pool.filter((q) => q.kind === 'fun')[i].key })), item('q_gym_week', 'gym', 'research'), item('q_rent_day', 'rent', 'research'), item('q_laundry_routine', 'laundry', 'research')];
    const exclude = new Set(quiz.map((q) => q.key).concat('q_alarm'));
    const rep = pickReplacement(pool, ctx({ excludeKeys: exclude }), quiz, item('q_alarm', 'sleep', 'fun'));
    expect(rep).not.toBeNull();
    expect(rep!.kind).toBe('fun');
    expect(isResearchTag(rep!.objective_tag)).toBe(false);
  });
});

describe('optionJaccard', () => {
  it('measures option overlap', () => {
    expect(optionJaccard(['a', 'b'], ['a', 'b'])).toBe(1);
    expect(optionJaccard(['a', 'b'], ['c'])).toBe(0);
    expect(optionJaccard(['a', 'b', 'c'], ['a', 'b', 'd'])).toBeCloseTo(0.5);
  });
});
