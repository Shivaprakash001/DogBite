import type { MascotMood } from './assets';

// TODO(content): tier copy is a first draft — playful, never mean.

export interface ResultTier {
  id: 'stranger' | 'neighbour' | 'floormate' | 'roomie' | 'certified';
  min: number;
  max: number;
  title: string;
  /** 2–3 variants so repeat plays don't feel stale. {creator} is replaced at render. */
  messages: string[];
  mood: MascotMood;
  /** Caption pre-filled into share actions. {score}, {creator}. */
  shareCaption: string;
}

export const RESULT_TIERS: ResultTier[] = [
  {
    id: 'stranger',
    min: 0,
    max: 2,
    title: 'Stranger in Room 204',
    messages: [
      'Do you even know {creator}? Go knock on their door and say hi 👋',
      "{creator} just asked the warden who you are. Time to fix that!",
      'Zero hostel lore unlocked. Chai with {creator} tonight, compulsory.',
    ],
    mood: 'sad',
    shareCaption: 'I scored {score}/10 on {creator}’s hostel quiz… we need to talk 😭',
  },
  {
    id: 'neighbour',
    min: 3,
    max: 4,
    title: 'Corridor Acquaintance',
    messages: [
      'You know {creator}’s face, not their 2 AM secrets.',
      'Nodding terms only. One Maggi night would fix this.',
    ],
    mood: 'confused',
    shareCaption: 'Only {score}/10 on {creator}’s quiz. Corridor friends only 😅',
  },
  {
    id: 'floormate',
    min: 5,
    max: 6,
    title: 'Same-Floor Friend',
    messages: [
      'Solid! You’ve shared at least three canteen samosas with {creator}.',
      'You know the basics. The deep lore is still locked 🔐',
    ],
    mood: 'thinking',
    shareCaption: '{score}/10 on {creator}’s quiz. Same floor, same vibes 🙌',
  },
  {
    id: 'roomie',
    min: 7,
    max: 8,
    title: 'Basically a Roomie',
    messages: [
      'You could pick {creator}’s chappals out of a pile of 40.',
      'Practically roommates. {creator} owes you a treat.',
    ],
    mood: 'happy',
    shareCaption: '{score}/10! I basically live in {creator}’s room 🏠',
  },
  {
    id: 'certified',
    min: 9,
    max: 10,
    title: 'Certified Roommate 🏆',
    messages: [
      'You know {creator} better than their mom does. Suspicious, honestly.',
      'Hostel legend status. {creator} can never block you now.',
      'Are you… {creator}’s second brain?',
    ],
    mood: 'celebrating',
    shareCaption: '{score}/10 on {creator}’s quiz 🏆 Certified roommate. Beat that.',
  },
];
