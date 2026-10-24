import { describe, expect, it } from 'vitest';
import { RESULT_TIERS } from '@/content/results';
import { pickShownOptions, rankScoreboard, scoreAttempt, tierForScore, tierMessage, type BoardRow } from '@/lib/scoring';

describe('tierForScore', () => {
  it('covers every score 0..10 with exactly one tier', () => {
    for (let s = 0; s <= 10; s++) {
      expect(RESULT_TIERS.filter((t) => s >= t.min && s <= t.max)).toHaveLength(1);
      expect(tierForScore(s)).toBeDefined();
    }
  });

  it('maps the brief’s bands', () => {
    expect(tierForScore(0).id).toBe('stranger');
    expect(tierForScore(2).id).toBe('stranger');
    expect(tierForScore(3).id).toBe('neighbour');
    expect(tierForScore(6).id).toBe('floormate');
    expect(tierForScore(8).id).toBe('roomie');
    expect(tierForScore(10).id).toBe('certified');
  });

  it('clamps out-of-range scores', () => {
    expect(tierForScore(-3).id).toBe('stranger');
    expect(tierForScore(42).id).toBe('certified');
  });

  it('picks a stable message per seed', () => {
    const t = tierForScore(10);
    expect(tierMessage(t, 'attempt-1')).toBe(tierMessage(t, 'attempt-1'));
  });
});

describe('scoreAttempt', () => {
  const key = new Map<number, number>([
    [1, 10],
    [2, 20],
    [3, 30],
  ]);

  it('counts correct answers', () => {
    const r = scoreAttempt(
      [
        { quizQuestionId: 1, chosenOptionId: 10 },
        { quizQuestionId: 2, chosenOptionId: 21 },
        { quizQuestionId: 3, chosenOptionId: 30 },
      ],
      key,
    );
    expect(r.score).toBe(2);
    expect(r.total).toBe(3);
  });

  it('treats skipped (null) and missing answers as wrong', () => {
    expect(scoreAttempt([{ quizQuestionId: 1, chosenOptionId: null }], key).score).toBe(0);
    expect(scoreAttempt([], key).score).toBe(0);
  });

  it('ignores duplicate submissions: the first answer wins (refresh / offline retry)', () => {
    const r = scoreAttempt(
      [
        { quizQuestionId: 1, chosenOptionId: 11 },
        { quizQuestionId: 1, chosenOptionId: 10 },
      ],
      key,
    );
    expect(r.score).toBe(0);
  });

  it('ignores answers for questions not in the quiz', () => {
    expect(scoreAttempt([{ quizQuestionId: 99, chosenOptionId: 10 }], key).score).toBe(0);
  });
});

describe('pickShownOptions', () => {
  const all = [1, 2, 3, 4, 5];

  it('always includes the creator answer plus one distractor', () => {
    for (let i = 0; i < 50; i++) {
      const pair = pickShownOptions(`a${i}`, 7, 3, all);
      expect(pair).toContain(3);
      expect(new Set(pair).size).toBe(2);
    }
  });

  it('is stable for the same attempt (refresh does not reroll)', () => {
    expect(pickShownOptions('abc', 7, 3, all)).toEqual(pickShownOptions('abc', 7, 3, all));
  });

  it('varies the correct answer position across attempts', () => {
    const firsts = new Set(Array.from({ length: 40 }, (_, i) => pickShownOptions(`x${i}`, 1, 3, all)[0] === 3));
    expect(firsts.size).toBe(2);
  });

  it('rejects questions with a single option', () => {
    expect(() => pickShownOptions('a', 1, 3, [3])).toThrow();
  });
});

describe('rankScoreboard', () => {
  const row = (sessionId: string, score: number, totalMs: number, finished: number): BoardRow => ({
    sessionId,
    attemptId: `${sessionId}-${score}-${totalMs}`,
    playerName: sessionId,
    score,
    totalMs,
    finishedAt: new Date(finished),
  });

  it('orders by score, then faster time, then earlier finish', () => {
    const ranked = rankScoreboard([row('a', 7, 50_000, 3), row('b', 9, 90_000, 2), row('c', 7, 40_000, 5), row('d', 7, 40_000, 1)]);
    expect(ranked.map((r) => r.sessionId)).toEqual(['b', 'd', 'c', 'a']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it('keeps only the best attempt per player (retries)', () => {
    const ranked = rankScoreboard([row('a', 4, 10_000, 1), row('a', 8, 20_000, 2), row('b', 6, 1, 1)]);
    expect(ranked).toHaveLength(2);
    expect(ranked[0]).toMatchObject({ sessionId: 'a', score: 8 });
  });
});
