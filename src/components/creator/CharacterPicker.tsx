'use client';

import { useState } from 'react';
import { Character } from '@/components/ui/Character';
import type { Avatar } from '@/content/characters';
import type { Gender } from '@/content/types';
import { useCopy } from '@/hooks/useCopy';

// The creator picks their character (boy / girl). Pronouns in question text
// follow the character unless they opt into they/them.

export function CharacterPicker({ name, onPick, busy }: { name: string; onPick: (avatar: Avatar, gender: Gender) => void; busy?: boolean }) {
  const copy = useCopy();
  const [they, setThey] = useState(false);
  const options: { avatar: Avatar; label: string; pronoun: string; gender: Gender }[] = [
    { avatar: 'girl', label: copy.character.girl, pronoun: copy.character.girlPronoun, gender: 'she' },
    { avatar: 'boy', label: copy.character.boy, pronoun: copy.character.boyPronoun, gender: 'he' },
  ];
  return (
    <section className="flex flex-1 flex-col gap-5 pt-2" aria-labelledby="character-title">
      <div>
        <h1 id="character-title" className="text-3xl font-extrabold">
          {copy.character.title}
        </h1>
        <p className="text-ink-soft mt-1">{copy.character.sub}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => (
          <button
            key={o.avatar}
            type="button"
            disabled={busy}
            onClick={() => onPick(o.avatar, they ? 'they' : o.gender)}
            className="rounded-card bg-paper ring-line shadow-chunky-light enabled:hover:ring-terracotta flex flex-col items-center p-3 pb-4 ring-2 transition active:translate-y-1 active:shadow-none"
          >
            <span className="bg-latte rounded-2xl">
              <Character avatar={o.avatar} mood="waving" size={136} />
            </span>
            <span className="font-display mt-2 text-xl font-extrabold">{o.label}</span>
            <span className="text-ink-soft text-sm font-semibold">{they ? copy.character.theyPronoun : o.pronoun}</span>
            <span className="text-ink-soft mt-0.5 text-xs">“{name}”</span>
          </button>
        ))}
      </div>
      <label className="bg-paper ring-line flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-4 ring-2">
        <input type="checkbox" checked={they} onChange={(e) => setThey(e.target.checked)} className="accent-terracotta size-5" />
        <span className="font-semibold">{copy.character.useThey}</span>
      </label>
    </section>
  );
}
