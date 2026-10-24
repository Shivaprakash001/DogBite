import type { Gender } from './types';

// Asset manifest: components reference semantic keys, never file paths.
// To swap art, change a path here. Missing keys render a placeholder (see resolveAsset).

export const MASCOT_MOODS = ['waving', 'happy', 'celebrating', 'neutral', 'thinking', 'confused', 'sleepy', 'sad', 'shocked', 'pulling'] as const;
export type MascotMood = (typeof MASCOT_MOODS)[number];

const mascotEntries = Object.fromEntries(MASCOT_MOODS.map((mood) => [`mascot.${mood}`, `/brand/mascot/stayo-mascot-${mood}.svg`])) as Record<
  `mascot.${MascotMood}`,
  string
>;

export const ASSETS = {
  ...mascotEntries,
  // Gender-specific art can be added as e.g. 'mascot.she.happy'; the generic mood art
  // plus an accessory overlay (bow / cap / bandana) is used until then.
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

export function mascotSrc(gender: Gender | null, mood: MascotMood): string | null {
  const specific = gender ? (ASSETS as Record<string, string>)[`mascot.${gender}.${mood}`] : undefined;
  return specific ?? resolveAsset(`mascot.${mood}`);
}

/** Question photos live in /public/questions; an emoji tile renders when absent. */
export function questionImageSrc(image: string | null | undefined): string | null {
  return image ? `/questions/${image}` : null;
}
