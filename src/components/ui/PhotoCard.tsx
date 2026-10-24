'use client';

import Image from 'next/image';
import { questionImageSrc } from '@/content/assets';

// Answer card: image (or an emoji tile when there's no photo) over a label.
// State is shown with colour AND an icon (✓ / ✗), never colour alone.

export type PhotoCardState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

interface PhotoCardProps {
  label: string;
  emoji: string;
  image?: string | null;
  state?: PhotoCardState;
  onSelect?: () => void;
  disabled?: boolean;
  /** Index used to vary the emoji tile background. */
  tint?: number;
  size?: 'md' | 'sm';
}

const TINTS = ['bg-latte', 'bg-sand', 'bg-[#f4dccb]', 'bg-[#efe3cf]', 'bg-[#f7e2c2]', 'bg-[#ead7cc]'];

const stateRing: Record<PhotoCardState, string> = {
  idle: 'ring-2 ring-line shadow-chunky-light',
  selected: 'ring-4 ring-terracotta shadow-chunky',
  correct: 'ring-4 ring-correct shadow-[0_5px_0_0_var(--color-correct)]',
  wrong: 'ring-4 ring-wrong shadow-[0_5px_0_0_var(--color-wrong)]',
  dimmed: 'ring-2 ring-line opacity-55',
};

export function PhotoCard({ label, emoji, image, state = 'idle', onSelect, disabled, tint = 0, size = 'md' }: PhotoCardProps) {
  const src = questionImageSrc(image);
  const pressed = state === 'selected' || state === 'correct' || state === 'wrong';
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={pressed}
      className={`group relative flex w-full flex-col overflow-hidden rounded-[1.25rem] bg-paper text-left transition-[transform,box-shadow] duration-100 enabled:active:translate-y-1 disabled:cursor-default ${stateRing[state]}`}
    >
      <span
        className={`relative flex w-full items-center justify-center ${size === 'md' ? 'aspect-square' : 'aspect-[4/3]'} ${TINTS[tint % TINTS.length]}`}
      >
        {src ? (
          <Image src={src} alt={label} fill sizes="(max-width: 440px) 45vw, 200px" className="object-cover" />
        ) : (
          <span aria-hidden className={`${size === 'md' ? 'text-6xl' : 'text-4xl'} drop-shadow-sm transition-transform group-enabled:group-active:scale-95`}>
            {emoji}
          </span>
        )}
        {(state === 'correct' || state === 'wrong') && (
          <span
            className={`absolute top-2 right-2 flex size-9 items-center justify-center rounded-full text-lg font-black text-white shadow-soft ${state === 'correct' ? 'bg-correct' : 'bg-wrong'}`}
          >
            <span aria-hidden>{state === 'correct' ? '✓' : '✗'}</span>
          </span>
        )}
      </span>
      <span className={`flex min-h-14 items-center px-3 py-2.5 font-display font-bold leading-tight ${size === 'md' ? 'text-[0.95rem]' : 'text-sm'}`}>
        {label}
      </span>
      {(state === 'correct' || state === 'wrong') && <span className="sr-only">{state === 'correct' ? 'Correct answer' : 'Wrong answer'}</span>}
    </button>
  );
}
