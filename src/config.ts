// Tunable knobs. Change numbers here, not in components or lib code.

export const QUIZ = {
  questionsPerQuiz: 10,
  candidatesPerBatch: 20,
  maxShuffles: 3,
  /** Hard cap enforced on the server (§8.3). */
  maxResearchPerQuiz: 3,
  maxRatingPerQuiz: 1,
  /** Players may retry once; the scoreboard shows the best score. */
  maxAttemptsPerPlayer: 2,
  nameMaxLength: 15,
} as const;

export const SELECTION = {
  weights: { bandit: 0.5, fun: 0.3, need: 0.2 },
  /** Target responses per objective per stratum (city × hostel type). */
  targetPerStratum: 400,
  compose: { fun: 14, research: 5, rating: 1 },
  /** Max research questions sharing one objective_tag in a batch. */
  maxSameObjective: 2,
  /** Option-set Jaccard similarity at/above which two questions count as near-duplicates. */
  nearDuplicateJaccard: 0.8,
  retire: { skipRate: 0.4, minImpressions: 100 },
} as const;

export const TIMING = {
  /** Delay after an answer before auto-advancing. Animation timing gets tuned later. */
  answerFeedbackMs: 900,
  creatorAdvanceMs: 250,
  /** Reveal state machine dwell times (see docs/animation-hooks.md). */
  reveal: { idleMs: 0, suspenseMs: 1500, revealMs: 600 },
} as const;

export const PRIVACY = {
  /** k-anonymity floor for any aggregate shown to the public or owners. */
  minRespondents: 5,
  /** Percentages shown publicly are rounded to this step to blur small cells. */
  percentStep: 5,
} as const;

export const HOSTELS = {
  duplicateSimilarity: 0.6,
  searchLimit: 8,
} as const;

export const RATE_LIMITS = {
  // [max requests, window seconds]
  write: [60, 60],
  publish: [10, 3600],
  hostelAdd: [10, 3600],
  contact: [5, 3600],
  events: [240, 60],
} as const satisfies Record<string, readonly [number, number]>;

/**
 * Feature decision thresholds (§15.6). "build" when every metric clears its bar,
 * "drop" when every metric is below half of it, otherwise "wait".
 */
export const FEATURE_DECISIONS = {
  gym_buddy: {
    label: 'Gym streak buddy',
    stated: { questionKey: 'q_gym_week', optionKeys: ['daily', 'three_four'], threshold: 0.3 },
    teaserTapRate: 0.2,
    minSample: 100,
  },
  mess_tracker: {
    label: 'Mess calorie tracker',
    stated: { questionKey: 'q_protein', optionKeys: ['tracks', 'eggs', 'shake'], threshold: 0.3 },
    teaserTapRate: 0.2,
    minSample: 100,
  },
  laundry_reminders: {
    label: 'Laundry reminders',
    stated: { questionKey: 'q_laundry_forget', optionKeys: ['sometimes', 'always', 'lost'], threshold: 0.4 },
    teaserTapRate: 0.2,
    minSample: 100,
  },
  rent_reminders: {
    label: 'Rent reminders',
    stated: { questionKey: 'q_rent_day', optionKeys: ['reminded'], threshold: 0.2 },
    teaserTapRate: 0.2,
    minSample: 100,
  },
} as const;
export type FeatureKey = keyof typeof FEATURE_DECISIONS;
