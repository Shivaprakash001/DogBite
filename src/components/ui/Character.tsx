import Image from 'next/image';
import { characterArt } from '@/content/assets';
import { characterMarkup, type Avatar, type CharacterMood } from '@/content/characters';

// The creator's / player's character (boy or girl). Drawn from code until
// commissioned art is added to the asset manifest.

interface CharacterProps {
  avatar: Avatar;
  mood: CharacterMood;
  size?: number;
  /** Reserved for the animation layer (§10). Rendered as data-animation. */
  animation?: string;
  /** Accessible name, e.g. "Ravi". Decorative characters get none. */
  label?: string;
  className?: string;
  /** Mirror horizontally (e.g. to face another character). */
  flip?: boolean;
}

export function Character({ avatar, mood, size = 160, animation, label, className = '', flip = false }: CharacterProps) {
  const art = characterArt(avatar, mood);
  const style = { width: size, height: size, transform: flip ? 'scaleX(-1)' : undefined };
  return (
    <div className={`relative shrink-0 ${className}`} style={style} data-animation={animation} data-mood={mood}>
      {art ? (
        <Image src={art} alt={label ?? ''} width={size} height={size} unoptimized className="h-full w-full" />
      ) : (
        // Static, first-party markup from content/characters (no user input).
        <svg
          viewBox="0 0 300 300"
          className="h-full w-full"
          role={label ? 'img' : undefined}
          aria-label={label}
          aria-hidden={label ? undefined : true}
          dangerouslySetInnerHTML={{ __html: characterMarkup(avatar, mood) }}
        />
      )}
    </div>
  );
}
