import { describe, expect, it } from 'vitest';
import { distribution, featureDecision, meetsK, publicShares, ratingAverage, truthGap, wilson } from '@/lib/aggregation';

describe('k-anonymity', () => {
  it('hides aggregates under 5 respondents', () => {
    expect(meetsK(4)).toBe(false);
    expect(meetsK(5)).toBe(true);
    expect(publicShares({ a: 2, b: 2 })).toBeNull();
    expect(publicShares({ a: 3, b: 2 })).not.toBeNull();
  });

  it('respects an explicit respondent count (e.g. multi-answer questions)', () => {
    expect(publicShares({ a: 10 }, 3)).toBeNull();
  });

  it('rounds percentages to 5% steps and sorts by share', () => {
    const shares = publicShares({ a: 1, b: 2, c: 4 })!;
    expect(shares.map((s) => s.key)).toEqual(['c', 'b', 'a']);
    for (const s of shares) expect(s.pct % 5).toBe(0);
    expect(shares[0].pct).toBe(55); // 57.1% → 55
  });
});

describe('ratingAverage', () => {
  it('averages one..five keys and ignores others', () => {
    expect(ratingAverage({ five: 2, one: 2, other: 9 })).toBe(3);
    expect(ratingAverage({})).toBeNull();
  });
});

describe('wilson', () => {
  it('brackets the observed proportion', () => {
    const [lo, hi] = wilson(30, 100);
    expect(lo).toBeLessThan(0.3);
    expect(hi).toBeGreaterThan(0.3);
    expect(wilson(0, 0)).toEqual([0, 0]);
  });

  it('narrows with more data', () => {
    const [a, b] = wilson(3, 10);
    const [c, d] = wilson(300, 1000);
    expect(d - c).toBeLessThan(b - a);
  });
});

describe('truthGap', () => {
  it('compares stated answers with friends’ modal guesses', () => {
    const gap = truthGap([
      { creatorId: '1', stated: 'daily', guesses: ['never', 'never', 'daily'] },
      { creatorId: '2', stated: 'daily', guesses: ['daily', 'daily'] },
      { creatorId: '3', stated: 'never', guesses: [] },
    ]);
    expect(gap.stated).toEqual({ daily: 2, never: 1 });
    expect(gap.perceived).toEqual({ never: 1, daily: 1 });
    expect(gap.discrepancies).toBe(1);
    expect(gap.guesses).toBe(5);
    expect(gap.agreementRate).toBeCloseTo(3 / 5);
  });

  it('breaks modal ties in favour of the stated answer', () => {
    const gap = truthGap([{ creatorId: '1', stated: 'gym', guesses: ['sleep', 'gym'] }]);
    expect(gap.perceived).toEqual({ gym: 1 });
    expect(gap.discrepancies).toBe(0);
  });
});

describe('featureDecision', () => {
  const m = (value: number | null, threshold: number, sample = 200) => ({ value, threshold, sample });

  it('builds when every metric clears its bar', () => {
    expect(featureDecision([m(0.35, 0.3), m(0.25, 0.2)], 100)).toBe('build');
  });
  it('drops when everything is under half the bar', () => {
    expect(featureDecision([m(0.1, 0.3), m(0.05, 0.2)], 100)).toBe('drop');
  });
  it('waits otherwise', () => {
    expect(featureDecision([m(0.35, 0.3), m(0.05, 0.2)], 100)).toBe('wait');
  });
  it('never decides on too little data', () => {
    expect(featureDecision([m(0.9, 0.3, 20), m(0.9, 0.2)], 100)).toBe('insufficient');
    expect(featureDecision([m(null, 0.3)], 100)).toBe('insufficient');
  });
});

describe('distribution', () => {
  it('counts values', () => {
    expect(distribution(['a', 'b', 'a'])).toEqual({ a: 2, b: 1 });
  });
});
