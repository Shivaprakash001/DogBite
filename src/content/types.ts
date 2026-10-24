// Shared content types. Content lives in data files (and the DB, once seeded),
// never hard-coded inside components.

export const OBJECTIVE_TAGS = ['gym', 'nutrition', 'mess', 'laundry', 'rent', 'pain_points', 'wtp', 'sleep', 'study', 'social', 'money', 'fun'] as const;
export type ObjectiveTag = (typeof OBJECTIVE_TAGS)[number];

/** Objectives that carry research weight. Everything else is "pure fun". */
export const RESEARCH_TAGS = ['gym', 'nutrition', 'mess', 'laundry', 'rent', 'pain_points', 'wtp'] as const satisfies readonly ObjectiveTag[];
export type ResearchTag = (typeof RESEARCH_TAGS)[number];

export function isResearchTag(tag: string): tag is ResearchTag {
  return (RESEARCH_TAGS as readonly string[]).includes(tag);
}

export const SEGMENTS = ['boys', 'girls', 'coed', 'all'] as const;
export type Segment = (typeof SEGMENTS)[number];

/** fun = pure entertainment, research = hidden objective, rating = hostel rating (≤1 per quiz). */
export type QuestionKind = 'fun' | 'research' | 'rating';

export interface SeedOption {
  key: string;
  label: string;
  emoji: string;
  /** Optional photo, relative to /public/questions. Falls back to an emoji tile. */
  image?: string;
}

export interface SeedQuestion {
  key: string;
  /**
   * Placeholders: {name}, {their} (his/her/their), {them} (him/her/them).
   * Creators see the same text their friends will see, personalised.
   */
  text: string;
  objective_tag: ObjectiveTag;
  kind: QuestionKind;
  segment: Segment;
  /** 0..1 editorial fun rating. */
  fun_score: number;
  /** 0..1 research importance. 0 for pure fun. */
  data_value: number;
  /** 0 safe, 1 mild, 2 avoid for the default pool. */
  sensitivity: 0 | 1 | 2;
  options: SeedOption[];
}

export type Gender = 'he' | 'she' | 'they';
