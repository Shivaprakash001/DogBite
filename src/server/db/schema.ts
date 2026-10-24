import { sql } from 'drizzle-orm';
import { bigserial, boolean, index, integer, jsonb, pgEnum, pgTable, real, serial, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true });

export const hostelType = pgEnum('hostel_type', ['boys', 'girls', 'coed', 'unknown']);
export const hostelStatus = pgEnum('hostel_status', ['user_added', 'verified', 'claimed']);
export const contactRelation = pgEnum('contact_relation', ['owner', 'warden', 'manager', 'unknown']);
export const contactStatus = pgEnum('contact_status', ['unverified', 'verified', 'opted_out']);
export const quizStatus = pgEnum('quiz_status', ['draft', 'live', 'deleted']);
export const gender = pgEnum('gender', ['he', 'she', 'they']);
export const avatar = pgEnum('avatar', ['boy', 'girl']);
export const questionKind = pgEnum('question_kind', ['fun', 'research', 'rating']);
export const segment = pgEnum('segment', ['boys', 'girls', 'coed', 'all']);
export const mergeStatus = pgEnum('merge_status', ['open', 'merged', 'dismissed']);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey(),
    createdAt: createdAt(),
    lastSeenAt: ts('last_seen_at').notNull().defaultNow(),
    uaHash: text('ua_hash'),
    locale: text('locale').notNull().default('en'),
    consentAt: ts('consent_at'),
    adultConfirmedAt: ts('adult_confirmed_at'),
    /**
     * Public referral id used in share links. Never the session id itself: that is
     * the anonymous auth credential and must not appear in URLs.
     */
    shareRef: text('share_ref').notNull(),
    /** Raw ?ref= value seen on first arrival (a share_ref or quiz slug). */
    ref: text('ref'),
    /** Resolved referring session, for the share graph / K-factor. */
    refSessionId: uuid('ref_session_id'),
    utm: text('utm'),
  },
  (t) => [uniqueIndex('sessions_share_ref_uq').on(t.shareRef)],
);

export const colleges = pgTable(
  'colleges',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    city: text('city').notNull(),
  },
  (t) => [uniqueIndex('colleges_name_city_uq').on(t.name, t.city)],
);

export const hostels = pgTable(
  'hostels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    nameNormalized: text('name_normalized').notNull(),
    area: text('area').notNull(),
    areaSlug: text('area_slug').notNull(),
    city: text('city').notNull(),
    collegeId: integer('college_id').references(() => colleges.id),
    type: hostelType('type').notNull().default('unknown'),
    status: hostelStatus('status').notNull().default('user_added'),
    lat: real('lat'),
    lng: real('lng'),
    createdBySession: uuid('created_by_session'),
    mergedInto: uuid('merged_into'),
    hidden: boolean('hidden').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('hostels_slug_uq').on(t.slug),
    index('hostels_area_idx').on(t.city, t.areaSlug),
    index('hostels_name_trgm_idx').using('gin', sql`${t.nameNormalized} gin_trgm_ops`),
  ],
);

export const hostelMergeCandidates = pgTable(
  'hostel_merge_candidates',
  {
    id: serial('id').primaryKey(),
    hostelId: uuid('hostel_id')
      .notNull()
      .references(() => hostels.id),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => hostels.id),
    similarity: real('similarity').notNull(),
    status: mergeStatus('status').notNull().default('open'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('merge_pair_uq').on(t.hostelId, t.candidateId)],
);

export const hostelFlags = pgTable(
  'hostel_flags',
  {
    id: serial('id').primaryKey(),
    hostelId: uuid('hostel_id')
      .notNull()
      .references(() => hostels.id),
    sessionId: uuid('session_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('hostel_flags_uq').on(t.hostelId, t.sessionId)],
);

export const hostelContacts = pgTable('hostel_contacts', {
  id: serial('id').primaryKey(),
  hostelId: uuid('hostel_id')
    .notNull()
    .references(() => hostels.id),
  contactNameEnc: text('contact_name_enc'),
  phoneEnc: text('phone_enc').notNull(),
  /** Keyed hash of the phone so duplicates can be detected without decrypting. */
  phoneHash: text('phone_hash').notNull(),
  relation: contactRelation('relation').notNull().default('unknown'),
  source: text('source').notNull().default('student_opt_in'),
  submittedBySession: uuid('submitted_by_session').notNull(),
  consentAt: ts('consent_at').notNull(),
  status: contactStatus('status').notNull().default('unverified'),
  createdAt: createdAt(),
});

export const creators = pgTable(
  'creators',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull(),
    displayName: text('display_name').notNull(),
    /** Pronouns used in question text. Independent of the character art. */
    gender: gender('gender'),
    avatar: avatar('avatar'),
    hostelId: uuid('hostel_id').references(() => hostels.id),
    /** The creator got past the hostel step (picked or skipped). */
    hostelDecided: boolean('hostel_decided').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('creators_session_idx').on(t.sessionId), index('creators_hostel_idx').on(t.hostelId)],
);

export const quizzes = pgTable(
  'quizzes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creators.id),
    status: quizStatus('status').notNull().default('draft'),
    /** Current candidate batch shown to the creator (question keys). */
    candidateKeys: jsonb('candidate_keys').$type<string[]>().notNull().default([]),
    /** Every key ever shown in this draft, so shuffles never repeat. */
    shownKeys: jsonb('shown_keys').$type<string[]>().notNull().default([]),
    shufflesUsed: integer('shuffles_used').notNull().default(0),
    picksConfirmedAt: ts('picks_confirmed_at'),
    createdAt: createdAt(),
    publishedAt: ts('published_at'),
  },
  (t) => [uniqueIndex('quizzes_slug_uq').on(t.slug), index('quizzes_creator_idx').on(t.creatorId)],
);

export const questions = pgTable(
  'questions',
  {
    id: serial('id').primaryKey(),
    key: text('key').notNull(),
    textTemplate: text('text_template').notNull(),
    objectiveTag: text('objective_tag').notNull(),
    kind: questionKind('kind').notNull(),
    segment: segment('segment').notNull().default('all'),
    funScore: real('fun_score').notNull(),
    dataValue: real('data_value').notNull(),
    sensitivity: integer('sensitivity').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('questions_key_uq').on(t.key)],
);

export const options = pgTable(
  'options',
  {
    id: serial('id').primaryKey(),
    questionId: integer('question_id')
      .notNull()
      .references(() => questions.id),
    key: text('key').notNull(),
    label: text('label').notNull(),
    emoji: text('emoji').notNull(),
    imageAsset: text('image_asset'),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [uniqueIndex('options_question_key_uq').on(t.questionId, t.key)],
);

/** Running counters for question health + the Thompson-sampling bandit. */
export const questionStats = pgTable('question_stats', {
  questionId: integer('question_id')
    .primaryKey()
    .references(() => questions.id),
  impressions: integer('impressions').notNull().default(0),
  picks: integer('picks').notNull().default(0),
  skips: integer('skips').notNull().default(0),
  successes: integer('successes').notNull().default(0),
  failures: integer('failures').notNull().default(0),
});

export const quizQuestions = pgTable(
  'quiz_questions',
  {
    id: serial('id').primaryKey(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id),
    questionId: integer('question_id')
      .notNull()
      .references(() => questions.id),
    position: integer('position').notNull(),
    creatorOptionId: integer('creator_option_id').references(() => options.id),
    skippedFromQuestionId: integer('skipped_from_question_id').references(() => questions.id),
    answerMs: integer('answer_ms'),
  },
  (t) => [uniqueIndex('quiz_questions_position_uq').on(t.quizId, t.position), index('quiz_questions_question_idx').on(t.questionId)],
);

export const attempts = pgTable(
  'attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id),
    sessionId: uuid('session_id').notNull(),
    playerName: text('player_name').notNull(),
    playerAvatar: avatar('player_avatar'),
    hostelId: uuid('hostel_id').references(() => hostels.id),
    hostelSkipped: boolean('hostel_skipped').notNull().default(false),
    score: integer('score'),
    totalMs: integer('total_ms'),
    startedAt: ts('started_at').notNull().defaultNow(),
    finishedAt: ts('finished_at'),
    device: text('device'),
  },
  (t) => [index('attempts_quiz_idx').on(t.quizId), index('attempts_session_idx').on(t.sessionId), index('attempts_hostel_idx').on(t.hostelId)],
);

export const attemptAnswers = pgTable(
  'attempt_answers',
  {
    id: serial('id').primaryKey(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => attempts.id, { onDelete: 'cascade' }),
    quizQuestionId: integer('quiz_question_id')
      .notNull()
      .references(() => quizQuestions.id),
    shownOptionIds: integer('shown_option_ids').array().notNull(),
    chosenOptionId: integer('chosen_option_id'),
    isCorrect: boolean('is_correct').notNull(),
    msToAnswer: integer('ms_to_answer'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('attempt_answers_uq').on(t.attemptId, t.quizQuestionId)],
);

export const events = pgTable(
  'events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    sessionId: uuid('session_id'),
    name: text('name').notNull(),
    props: jsonb('props').$type<Record<string, string | number | boolean | null>>().notNull().default({}),
    page: text('page'),
    ref: text('ref'),
    createdAt: createdAt(),
  },
  (t) => [index('events_name_created_idx').on(t.name, t.createdAt), index('events_session_idx').on(t.sessionId)],
);

export const waitlistTaps = pgTable(
  'waitlist_taps',
  {
    id: serial('id').primaryKey(),
    sessionId: uuid('session_id').notNull(),
    featureKey: text('feature_key').notNull(),
    hostelId: uuid('hostel_id').references(() => hostels.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('waitlist_session_feature_uq').on(t.sessionId, t.featureKey)],
);

export const shares = pgTable('shares', {
  id: serial('id').primaryKey(),
  sessionId: uuid('session_id').notNull(),
  quizId: uuid('quiz_id').references(() => quizzes.id),
  hostelId: uuid('hostel_id').references(() => hostels.id),
  channel: text('channel').notNull(),
  refSessionId: uuid('ref_session_id'),
  createdAt: createdAt(),
});

export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: ts('window_start').notNull(),
  count: integer('count').notNull().default(0),
});
