'use client';

import { Character } from '@/components/ui/Character';
import { AVATARS, type Avatar } from '@/content/characters';
import { useCopy } from '@/hooks/useCopy';

/** Compact "pick yourself" choice for players, shown under their name. */
export function AvatarToggle({ value, onChange }: { value: Avatar | null; onChange: (a: Avatar) => void }) {
  const copy = useCopy();
  return (
    <fieldset>
      <legend className="font-display mb-2 font-bold">{copy.name.pickYourself}</legend>
      <div className="grid grid-cols-2 gap-3">
        {AVATARS.map((a) => (
          <label
            key={a}
            className={`flex cursor-pointer flex-col items-center rounded-2xl p-2 ring-2 transition ${value === a ? 'bg-latte ring-terracotta ring-4' : 'bg-paper ring-line'}`}
          >
            <input type="radio" name="player-avatar" value={a} checked={value === a} onChange={() => onChange(a)} className="sr-only" />
            <Character avatar={a} mood={value === a ? 'happy' : 'idle'} size={88} />
            <span className="font-display font-extrabold">{copy.character[a]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
