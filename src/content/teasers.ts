import type { FeatureKey } from '@/config';
import type { ResearchTag } from './types';

// Fake-door teaser cards shown on the result screen (§11.1). One per result view,
// rotated toward the feature with the least demand data so far.
// TODO(content): copy draft.

export interface Teaser {
  featureKey: FeatureKey;
  objective: ResearchTag;
  emoji: string;
  title: string;
  body: string;
  cta: string;
}

export const TEASERS: Teaser[] = [
  {
    featureKey: 'gym_buddy',
    objective: 'gym',
    emoji: '🏋️',
    title: 'Gym streak buddy',
    body: 'Get matched with someone in your hostel who actually wakes up for the gym.',
    cta: 'Join the waitlist',
  },
  {
    featureKey: 'mess_tracker',
    objective: 'nutrition',
    emoji: '🍱',
    title: 'Mess calorie tracker',
    body: "See what's in today's mess menu, protein included. No more guessing.",
    cta: 'Want early access?',
  },
  {
    featureKey: 'laundry_reminders',
    objective: 'laundry',
    emoji: '🧺',
    title: 'Laundry reminders',
    body: 'A nudge before it rains and before the pile becomes sentient.',
    cta: 'Want early access?',
  },
  {
    featureKey: 'rent_reminders',
    objective: 'rent',
    emoji: '💸',
    title: 'Rent reminders',
    body: 'Pay rent from your phone and never get the warden’s 3rd reminder again.',
    cta: 'Want early access?',
  },
];
