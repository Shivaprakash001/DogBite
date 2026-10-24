import Image from 'next/image';
import type { CSSProperties } from 'react';
import { resolveAsset } from '@/content/assets';

// Decorative sticker: absolutely positioned, aria-hidden, never interactive.

interface StickerProps {
  /** An emoji, or an asset key like "sticker.house". */
  emoji?: string;
  asset?: string;
  size?: number;
  rotate?: number;
  className?: string;
  style?: CSSProperties;
}

export function Sticker({ emoji, asset, size = 44, rotate = 0, className = '', style }: StickerProps) {
  const src = asset ? resolveAsset(asset) : null;
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute flex items-center justify-center rounded-2xl bg-paper shadow-soft ring-4 ring-white select-none ${className}`}
      style={{ width: size, height: size, transform: `rotate(${rotate}deg)`, fontSize: size * 0.55, ...style }}
    >
      {src ? <Image src={src} alt="" width={size} height={size} className="h-full w-full rounded-2xl object-contain p-1" /> : emoji}
    </span>
  );
}
