import { QUIZ } from '@/config';

// Lightweight name / free-text filter. Not exhaustive: catches the common stuff,
// including leetspeak, repeated letters and s p a c e d spelling. Extend as abuse appears.
// Terms are stored normalised (lowercase, letters only, no repeated letters).

// Matched anywhere inside a word. Only terms that never occur inside real names.
const SUBSTRING_TERMS = [
  'fuck',
  'fuk',
  'bitch',
  'bastard',
  'ashole',
  'cunt',
  'fagot',
  'retard',
  'rapist',
  'chutiya',
  'chutiye',
  'madarchod',
  'behenchod',
  'bhenchod',
  'bhosdi',
  'gandu',
  'lanjakodaka',
  'nakodaka',
];

// Matched only as a whole word: these appear inside common names
// (Harshit, Shital, Randip, Dickson, Brandi…).
const WHOLE_WORD_TERMS = new Set([
  'shit',
  'dick',
  'slut',
  'whore',
  'rape',
  'porn',
  'sex',
  'fck',
  'pusy',
  'niga',
  'niger',
  'mc',
  'bc',
  'gaand',
  'lund',
  'loda',
  'lauda',
  'randi',
  'harami',
  'kutta',
  'kamina',
  'saala',
  'dengu',
  'lanja',
  'puku',
  'modda',
  'gudda',
]);

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' };

const collapse = (s: string) => s.replace(/(.)\1+/g, '$1');

function tokens(text: string): string[] {
  const lowered = [...text.toLowerCase()].map((ch) => LEET[ch] ?? ch).join('');
  const words = lowered.split(/[^a-z]+/).filter(Boolean);
  // Re-join runs of single letters so "f u c k" is seen as one word.
  const out: string[] = [];
  let run = '';
  for (const w of words) {
    if (w.length === 1) {
      run += w;
      continue;
    }
    if (run) out.push(run);
    run = '';
    out.push(w);
  }
  if (run) out.push(run);
  return out;
}

export function isProfane(text: string): boolean {
  for (const word of tokens(text)) {
    const c = collapse(word);
    if (WHOLE_WORD_TERMS.has(word) || WHOLE_WORD_TERMS.has(c)) return true;
    if (SUBSTRING_TERMS.some((term) => c.includes(term))) return true;
  }
  return false;
}

const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

export type NameError = 'empty' | 'emoji' | 'profane' | 'long';

/** Trim, collapse whitespace and validate a display name. */
export function validateDisplayName(raw: string, maxLength: number = QUIZ.nameMaxLength): { ok: true; value: string } | { ok: false; error: NameError } {
  const value = raw.replace(/\s+/g, ' ').trim();
  if (!value) return { ok: false, error: 'empty' };
  if ([...value].length > maxLength) return { ok: false, error: 'long' };
  if (!HAS_LETTER_OR_DIGIT.test(value)) return { ok: false, error: 'emoji' };
  if (isProfane(value)) return { ok: false, error: 'profane' };
  return { ok: true, value };
}
