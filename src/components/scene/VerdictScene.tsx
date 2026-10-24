import { Character } from '@/components/ui/Character';
import { Mascot } from '@/components/ui/Mascot';
import type { Avatar } from '@/content/characters';
import type { ResultTier } from '@/content/results';

// The guard pup's reaction to the player (§ result). Pure CSS motion with a
// static reduced-motion composition. Root exposes data-verdict for the
// animation layer to take over later (docs/animation-hooks.md).

interface VerdictSceneProps {
  tier: ResultTier;
  playerAvatar: Avatar;
  playerName: string;
  dogName: string;
}

export function VerdictScene({ tier, playerAvatar, playerName, dogName }: VerdictSceneProps) {
  const label = `${dogName}: ${tier.title}`;
  if (tier.verdict === 'chase') {
    return (
      <div data-verdict="chase" role="img" aria-label={label} className="relative h-44 w-full overflow-hidden">
        <div className="anim-chase absolute inset-0 flex items-end justify-center gap-0">
          <Character avatar={playerAvatar} mood="running" size={140} label={playerName} />
          <div className="anim-hop">
            <Mascot mood="angry" size={140} decorative />
          </div>
        </div>
        <span aria-hidden className="absolute bottom-1 left-2 text-3xl">
          🚪
        </span>
      </div>
    );
  }
  const playerMood = tier.playerMood;
  const dogMotion =
    tier.verdict === 'growl' ? 'anim-wiggle' : tier.verdict === 'sniff' ? 'anim-wiggle' : tier.verdict === 'friendly' ? 'anim-hop-slow' : 'anim-hop';
  return (
    <div data-verdict={tier.verdict} role="img" aria-label={label} className="relative flex h-44 w-full items-end justify-center">
      <Character avatar={playerAvatar} mood={playerMood} size={150} label={playerName} className="-mr-3" />
      <div className={dogMotion}>
        <Mascot mood={tier.dogMood} size={140} decorative />
      </div>
      {tier.verdict === 'love' &&
        [18, 42, 66, 82].map((left, i) => (
          <span key={left} aria-hidden className="anim-float absolute bottom-10 text-2xl" style={{ left: `${left}%`, animationDelay: `${i * 0.5}s` }}>
            {i % 2 ? '💛' : '❤️'}
          </span>
        ))}
      {tier.verdict === 'growl' && (
        <span aria-hidden className="font-display text-wrong absolute top-2 right-6 text-xl font-extrabold">
          grrr…
        </span>
      )}
    </div>
  );
}
