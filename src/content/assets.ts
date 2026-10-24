// Asset manifest: components reference semantic keys, never file paths.
// To swap art, change a path here. Missing keys render a placeholder (see resolveAsset).

/** Moods of the Stayo pup: the creator's room-guard companion (not a player avatar). */
export const MASCOT_MOODS = [
  'waving',
  'happy',
  'celebrating',
  'neutral',
  'thinking',
  'confused',
  'sleepy',
  'sad',
  'shocked',
  'pulling',
  'angry',
  'love',
] as const;
export type MascotMood = (typeof MASCOT_MOODS)[number];

const mascotEntries = Object.fromEntries(MASCOT_MOODS.map((mood) => [`mascot.${mood}`, `/brand/mascot/stayo-mascot-${mood}.svg`])) as Record<
  `mascot.${MascotMood}`,
  string
>;

export const ASSETS = {
  ...mascotEntries,
  // Human characters are drawn in code (content/characters.ts). To use commissioned
  // art instead, add keys like 'character.girl.happy' pointing at files.
  'logo.horizontal': '/brand/logo/stayo-logo-horizontal-terracotta.svg',
  'logo.horizontal.white': '/brand/logo/stayo-logo-horizontal-white.svg',
  'logo.mark': '/brand/logo/stayo-mark-terracotta.svg',
  'logo.mark.white': '/brand/logo/stayo-mark-white.svg',
  'logo.wordmark': '/brand/logo/stayo-wordmark-terracotta.svg',
  'sticker.house': '/brand/sticker/stayo-sticker-house.png',
  'sticker.badge': '/brand/sticker/stayo-sticker-badge.png',
  'sticker.mark': '/brand/sticker/stayo-sticker-mark.png',
  'pattern.tile': '/brand/pattern/stayo-pattern-tile.svg',
  'icon.192': '/brand/icon/stayo-app-icon-clay-192.png',
  'icon.512': '/brand/icon/stayo-app-icon-clay-512.png',
} as const satisfies Record<string, string>;

export type AssetKey = keyof typeof ASSETS;

const warned = new Set<string>();

/** Resolve a semantic key to a URL, or null (and a one-time warning) if missing. */
export function resolveAsset(key: string): string | null {
  const path = (ASSETS as Record<string, string>)[key];
  if (!path) {
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(`[assets] missing asset for key "${key}", rendering placeholder`);
    }
    return null;
  }
  return path;
}

export function mascotSrc(mood: MascotMood): string | null {
  return resolveAsset(`mascot.${mood}`);
}

/** Optional commissioned art for a character mood; null means "draw it in code". */
export function characterArt(avatar: string, mood: string): string | null {
  return (ASSETS as Record<string, string>)[`character.${avatar}.${mood}`] ?? null;
}

/** Question photos live in /public/questions; an emoji tile renders when absent. */
export function questionImageSrc(image: string | null | undefined): string | null {
  return image ? `/questions/${image}` : null;
}
