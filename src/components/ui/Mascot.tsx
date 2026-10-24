import Image from 'next/image';
import { mascotSrc, type MascotMood } from '@/content/assets';
import type { Gender } from '@/content/types';

// Stayo pup. Mood art comes from the asset manifest; gender is shown with an
// accessory overlay (bow / cap / bandana) drawn in the same 300×300 space, so
// dedicated per-gender art can replace it later without touching callers.

/** Head-group transform per mood, mirrored from the SVG art so accessories sit right. */
const HEAD_TRANSFORM: Partial<Record<MascotMood, string>> = {
  confused: 'rotate(-8 150 130)',
  thinking: 'rotate(-8 150 130)',
  sleepy: 'rotate(4 150 130)',
  pulling: 'translate(0 -6)',
};

function Accessory({ gender, mood }: { gender: Gender; mood: MascotMood }) {
  const head = HEAD_TRANSFORM[mood];
  if (gender === 'she') {
    return (
      <g transform={head}>
        <g transform="translate(104 78) rotate(-20)">
          <path d="M0 0 C-10 -16 -32 -16 -30 0 C-32 16 -10 16 0 0 Z" fill="#E8837E" />
          <path d="M0 0 C10 -16 32 -16 30 0 C32 16 10 16 0 0 Z" fill="#E8837E" />
          <path d="M-22 -2 C-16 -6 -10 -4 -6 0" stroke="#C9605B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M22 -2 C16 -6 10 -4 6 0" stroke="#C9605B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle r="7" fill="#C9605B" />
        </g>
      </g>
    );
  }
  if (gender === 'he') {
    return (
      <g transform={head}>
        <g transform="rotate(-6 150 70)">
          <path d="M106 80 Q108 44 150 42 Q192 44 194 80 Z" fill="#2F2F2F" />
          <path d="M150 42 L150 80" stroke="#4a4a4a" strokeWidth="2" />
          <path d="M98 80 Q150 92 202 80 Q206 86 200 90 Q150 102 100 90 Q94 86 98 80 Z" fill="#F2B33D" />
          <circle cx="150" cy="42" r="5" fill="#F2B33D" />
        </g>
      </g>
    );
  }
  return (
    <g>
      <path d="M108 184 Q150 198 192 184 L184 196 Q160 230 150 236 Q140 230 116 196 Z" fill="#F2B33D" />
      <circle cx="132" cy="198" r="3.5" fill="#F7F3EE" />
      <circle cx="150" cy="212" r="3.5" fill="#F7F3EE" />
      <circle cx="168" cy="198" r="3.5" fill="#F7F3EE" />
      <circle cx="150" cy="194" r="3" fill="#F7F3EE" />
      <path d="M108 184 Q150 198 192 184" stroke="#C98A17" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  );
}

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
        <Image src={src} alt={decorative ? '' : `Stayo pup, ${MOOD_ALT[mood]}`} width={size} height={size} unoptimized priority={priority} className="h-full w-full" />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-latte text-4xl" role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : 'Stayo pup'}>
          🐶
        </div>
      )}
      {gender && src && (
        <svg viewBox="0 0 300 300" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          <Accessory gender={gender} mood={mood} />
        </svg>
      )}
    </div>
  );
}
