import Image from 'next/image';
import { mascotSrc, type MascotMood } from '@/content/assets';
import { accessoryMarkup } from '@/content/mascot-accessories';
import type { Gender } from '@/content/types';

// Stayo pup. Mood art comes from the asset manifest; gender is shown with an
// accessory overlay (bow / cap / bandana) drawn in the same 300×300 space, so
// dedicated per-gender art can replace it later without touching callers.

interface MascotProps {
  mood: MascotMood;
  gender?: Gender | null;
  size?: number;
  /** Reserved for the animation layer (§10). Unused for now. */
  animation?: string;
  /** Decorative mascots get empty alt text. */
  decorative?: boolean;
  className?: string;
  priority?: boolean;
}

const MOOD_ALT: Record<MascotMood, string> = {
  waving: 'waving hello',
  happy: 'happy',
  celebrating: 'celebrating',
  neutral: 'calm',
  thinking: 'thinking',
  confused: 'confused',
  sleepy: 'sleepy',
  sad: 'sad',
  shocked: 'shocked',
  pulling: 'pulling a rope',
};

export function Mascot({ mood, gender = null, size = 160, animation, decorative = false, className = '', priority = false }: MascotProps) {
  const src = mascotSrc(gender, mood);
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} data-animation={animation} data-mood={mood}>
      {src ? (
        <Image
          src={src}
          alt={decorative ? '' : `Stayo pup, ${MOOD_ALT[mood]}`}
          width={size}
          height={size}
          unoptimized
          priority={priority}
          className="h-full w-full"
        />
      ) : (
        <div
          className="bg-latte flex h-full w-full items-center justify-center rounded-full text-4xl"
          role={decorative ? undefined : 'img'}
          aria-label={decorative ? undefined : 'Stayo pup'}
        >
          🐶
        </div>
      )}
      {gender && src && (
        // Static, first-party markup from content/mascot-accessories (no user input).
        <svg
          viewBox="0 0 300 300"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: accessoryMarkup(gender, mood) }}
        />
      )}
    </div>
  );
}
