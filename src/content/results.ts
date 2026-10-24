import type { MascotMood } from './assets';
import type { CharacterMood } from './characters';

// TODO(content): tier copy is a first draft — playful, never mean.
// The guard pup belongs to the quiz creator. At the reveal it pulls the
// scoreboard down, then reacts to the player: chases them out on a very low
// score, loves them on a high one.

/** What the guard pup does to the player on the result scene. */
export type Verdict = 'chase' | 'growl' | 'sniff' | 'friendly' | 'love';

export interface ResultTier {
  id: 'kicked_out' | 'corridor' | 'probation' | 'approved' | 'soulmates';
  min: number;
  max: number;
  title: string;
  /** 2–3 variants so repeat plays don't feel stale. {creator}, {dog} are replaced at render. */
  messages: string[];
  verdict: Verdict;
  dogMood: MascotMood;
  playerMood: CharacterMood;
  /** Caption pre-filled into share actions. {score}, {pct}, {creator}, {dog}. */
  shareCaption: string;
}

export const RESULT_TIERS: ResultTier[] = [
  {
    id: 'kicked_out',
    min: 0,
    max: 2,
    title: 'Kicked out! 🧳',
    messages: [
      '{dog} chased you all the way to the hostel gate. Your bags are in the corridor.',
      'Packed and out. {creator} already gave your bed to someone else.',
      'You lasted one night. {dog} is still barking at your slippers.',
    ],
    verdict: 'chase',
    dogMood: 'angry',
    playerMood: 'running',
    shareCaption: '{pct}% compatible with {creator}… {dog} chased me out of the room 😭🧳',
  },
  {
    id: 'corridor',
    min: 3,
    max: 4,
    title: 'Sleeping in the corridor',
    messages: ['Not kicked out… yet. {dog} is growling at your mattress.', 'Corridor life: no fan, all mosquitoes. Try harder, roomie.'],
    verdict: 'growl',
    dogMood: 'confused',
    playerMood: 'nervous',
    shareCaption: 'Only {pct}% compatible with {creator}. I sleep in the corridor now 🦟',
  },
  {
    id: 'probation',
    min: 5,
    max: 6,
    title: 'Roommate on probation',
    messages: ['{dog} is still sniffing you. One more Maggi night and you’re in.', 'You know the basics. {creator}’s deep lore is still locked 🔐'],
    verdict: 'sniff',
    dogMood: 'thinking',
    playerMood: 'nervous',
    shareCaption: '{pct}% compatible with {creator}. On probation, bed not confirmed 😅',
  },
  {
    id: 'approved',
    min: 7,
    max: 8,
    title: 'Roommate approved ✅',
    messages: ['{dog} wagged its tail. Your bed is safe.', 'You could pick {creator}’s chappals out of a pile of 40.'],
    verdict: 'friendly',
    dogMood: 'happy',
    playerMood: 'happy',
    shareCaption: '{pct}% compatible with {creator}! Roommate approved ✅',
  },
  {
    id: 'soulmates',
    min: 9,
    max: 10,
    title: 'Bunk-bed soulmates 🏆',
    messages: [
      '{dog} won’t stop licking your face. You’re family now.',
      '{creator} would share their last Maggi with you. That’s love.',
      'You know {creator} better than their mom does. Suspicious, honestly.',
    ],
    verdict: 'love',
    dogMood: 'love',
    playerMood: 'celebrating',
    shareCaption: '{pct}% compatible with {creator} 🏆 Bunk-bed soulmates. Beat that.',
  },
];
