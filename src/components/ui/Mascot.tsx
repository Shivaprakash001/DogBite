import Image from 'next/image';
import { mascotSrc, type MascotMood } from '@/content/assets';

// The Stayo pup: the creator's room-guard companion. It pulls the scoreboard
// and reacts to the score (see content/results.ts). Players and creators are
// drawn with <Character>, not this.

interface MascotProps {
  mood: MascotMood;
  size?: number;
  /** Reserved for the animation layer (§10). Rendered as data-animation. */
  animation?: string;
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
  confused: 'suspicious',
  sleepy: 'sleepy',
  sad: 'sad',
  shocked: 'shocked',
  pulling: 'pulling the scoreboard rope',
  angry: 'barking angrily',
  love: 'in love',
};

export function Mascot({ mood, size = 160, animation, decorative = false, className = '', priority = false }: MascotProps) {
  const src = mascotSrc(mood);
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} data-animation={animation} data-mood={mood}>
      {src ? (
        <Image
          src={src}
          alt={decorative ? '' : `Guard pup, ${MOOD_ALT[mood]}`}
          width={size}
          height={size}
          unoptimized
          priority={priority}
          className="h-full w-full"
        />
      ) : (
        <div className="bg-latte flex h-full w-full items-center justify-center rounded-full text-4xl" aria-hidden>
          🐶
        </div>
      )}
    </div>
  );
}
