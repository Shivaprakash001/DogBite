// Hostel name normalisation, slugs and similarity (§7.2). The database uses
// pg_trgm for search; trigramSimilarity mirrors it for tests and fallbacks.

const STOP_WORDS = new Set([
  'boys',
  'boy',
  'girls',
  'girl',
  'ladies',
  'gents',
  'mens',
  'womens',
  'hostel',
  'hostels',
  'pg',
  'the',
  'and',
  'for',
  'co',
  'living',
  'stay',
  'residency',
]);

/** lowercase, strip punctuation + common words, collapse whitespace. */
export function normalizeHostelName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w))
    .join(' ')
    .trim();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/** Title-case user input lightly so "sri sai boys hostel" displays nicely. */
export function tidyHostelName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => (w.length <= 3 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

function trigrams(text: string): Set<string> {
  const grams = new Set<string>();
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const padded = `  ${word} `;
    for (let i = 0; i < padded.length - 2; i++) grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

/** Same definition as pg_trgm's similarity(): |A∩B| / |A∪B| over word trigrams. */
export function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const g of ta) if (tb.has(g)) shared++;
  return shared / (ta.size + tb.size - shared);
}
