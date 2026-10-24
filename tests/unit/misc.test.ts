import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fmt, getCopy } from '@/content/copy';
import { normalizeHostelName, slugify, tidyHostelName, trigramSimilarity } from '@/lib/hostels';
import { isProfane, validateDisplayName } from '@/lib/moderation';
import { sampleBeta, seededRng, shuffle } from '@/lib/random';
import { renderQuestionText } from '@/lib/text';
import { THEME } from '@/styles/theme';

describe('hostel normalisation + similarity', () => {
  it('strips punctuation and filler words', () => {
    expect(normalizeHostelName('Sri Adithya Boys Hostel')).toBe('sri adithya');
    expect(normalizeHostelName('  The  Sri-Adithya PG!! ')).toBe('sri adithya');
  });

  it('treats spelling variants as similar (≥ 0.6 dedupe threshold)', () => {
    expect(trigramSimilarity(normalizeHostelName('Sri Adithya Boys Hostel'), normalizeHostelName('sri aditya boys hostel'))).toBeGreaterThanOrEqual(0.6);
    expect(trigramSimilarity(normalizeHostelName('Rithik Boys Hostel'), normalizeHostelName('Sai Krupa Ladies PG'))).toBeLessThan(0.3);
  });

  it('slugifies and tidies', () => {
    expect(slugify('Sri Sai Boys Hostel (Ameerpet)')).toBe('sri-sai-boys-hostel-ameerpet');
    expect(tidyHostelName('sri  sai BOYS hostel')).toBe('Sri Sai Boys Hostel');
    expect(tidyHostelName('SVR pg')).toBe('SVR Pg');
  });
});

describe('moderation', () => {
  it('blocks profanity including leetspeak, repeats and spacing', () => {
    for (const bad of ['fuck', 'FuUuCk', 'f u c k', 'sh1t', 'chutiya', 'b1tch']) expect(isProfane(bad), bad).toBe(true);
  });

  it('allows common Indian names that contain blocked substrings', () => {
    for (const ok of ['Harshit', 'Shital', 'Randip', 'Dickson', 'Ashita', 'Nigam', 'Sexton', 'Kashish', 'Brandi']) {
      expect(isProfane(ok), ok).toBe(false);
    }
  });

  it('validates display names', () => {
    expect(validateDisplayName('  Ravi   Teja ')).toEqual({ ok: true, value: 'Ravi Teja' });
    expect(validateDisplayName('')).toEqual({ ok: false, error: 'empty' });
    expect(validateDisplayName('🔥🔥')).toEqual({ ok: false, error: 'emoji' });
    expect(validateDisplayName('Ravi 🔥')).toMatchObject({ ok: true });
    expect(validateDisplayName('a'.repeat(16))).toEqual({ ok: false, error: 'long' });
    expect(validateDisplayName('रवि')).toMatchObject({ ok: true });
  });
});

describe('question text', () => {
  it('fills name and pronouns', () => {
    const t = 'What does {name} spend most of {their} money on?';
    expect(renderQuestionText(t, 'Priya', 'she')).toBe('What does Priya spend most of her money on?');
    expect(renderQuestionText(t, 'Arjun', 'he')).toBe('What does Arjun spend most of his money on?');
    expect(renderQuestionText(t, 'Sam', null)).toBe('What does Sam spend most of their money on?');
  });
});

describe('random', () => {
  it('is deterministic per seed', () => {
    const a = seededRng('x');
    const b = seededRng('x');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('shuffle keeps all items', () => {
    expect(shuffle([1, 2, 3, 4], seededRng(1)).sort()).toEqual([1, 2, 3, 4]);
  });

  it('Beta samples have the right mean', () => {
    const rng = seededRng(9);
    let sum = 0;
    for (let i = 0; i < 4000; i++) sum += sampleBeta(8, 2, rng);
    expect(sum / 4000).toBeCloseTo(0.8, 1);
  });
});

describe('copy', () => {
  it('formats placeholders and leaves unknown ones visible', () => {
    expect(fmt('{a} and {b}', { a: 1 })).toBe('1 and {b}');
  });

  it('falls back to English for untranslated locales', () => {
    expect(getCopy('hi').landing.headline).toBe(getCopy('en').landing.headline);
  });
});

describe('theme tokens', () => {
  it('theme.ts mirrors the CSS tokens', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8');
    for (const [name, hex] of Object.entries(THEME.colors)) {
      expect(css.toLowerCase(), name).toContain(`--color-${name}: ${hex.toLowerCase()}`);
    }
  });
});
