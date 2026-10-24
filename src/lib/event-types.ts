import { z } from 'zod';

// Event catalogue (§12). Shared by the browser client and the server so names and
// props stay typed end to end. Props must never contain PII (names, phones, free text).

type Primitive = string | number | boolean | null;

export interface EventProps {
  landing_view: { utm?: string | null };
  start_click: { quiz_slug?: string | null };
  name_submit: { length: number; flow: 'creator' | 'player' };
  hostel_pick: { hostel_id: string; search_len: number; time_ms: number };
  hostel_skip: { search_len: number; time_ms: number };
  hostel_add: { hostel_id: string; time_ms?: number; duplicate_offered?: boolean };
  question_view: { quiz_id: string; question_key: string; position: number };
  answer_submit: { question_key: string; option_key: string; ms_to_answer: number; correct: boolean };
  quiz_complete: { score: number; total_ms: number };
  quiz_abandon: { last_position: number; quiz_id: string };
  result_view: { score: number; tier: string };
  teaser_view: { feature_key: string };
  teaser_tap: { feature_key: string };
  discover_click: { hostel_id?: string | null; source_screen: string };
  create_start: { resumed: boolean };
  candidates_shown: { question_keys: string };
  candidate_pick: { question_key: string; objective_tag: string; position_in_list: number };
  candidate_unpick: { question_key: string; objective_tag: string; position_in_list: number };
  candidate_shuffle: { count: number };
  creator_answer: { question_key: string; option_key: string; ms: number };
  creator_skip: { question_key: string; objective_tag: string };
  quiz_publish: { total_ms: number; research_count: number };
  share_click: { channel: string; quiz_id?: string | null; hostel_id?: string | null };
  share_open: { quiz_slug?: string | null };
  report_view: { hostel_id: string; owner_view: boolean };
  report_send_owner_click: { hostel_id: string };
  owner_contact_submit: { hostel_id: string };
  stayo_explainer_view: { source_screen: string };
  sound_toggle: { on: boolean };
  locale_change: { locale: string };
  quiz_delete: Record<string, never>;
  data_delete: Record<string, never>;
}

export type EventName = keyof EventProps;

export const EVENT_NAMES = [
  'landing_view',
  'start_click',
  'name_submit',
  'hostel_pick',
  'hostel_skip',
  'hostel_add',
  'question_view',
  'answer_submit',
  'quiz_complete',
  'quiz_abandon',
  'result_view',
  'teaser_view',
  'teaser_tap',
  'discover_click',
  'create_start',
  'candidates_shown',
  'candidate_pick',
  'candidate_unpick',
  'candidate_shuffle',
  'creator_answer',
  'creator_skip',
  'quiz_publish',
  'share_click',
  'share_open',
  'report_view',
  'report_send_owner_click',
  'owner_contact_submit',
  'stayo_explainer_view',
  'sound_toggle',
  'locale_change',
  'quiz_delete',
  'data_delete',
] as const satisfies readonly EventName[];

/** Events the browser may send. Server-authoritative events are written by API handlers. */
export const CLIENT_EVENTS = new Set<EventName>([
  'landing_view',
  'start_click',
  'name_submit',
  'hostel_pick',
  'hostel_skip',
  'question_view',
  'quiz_abandon',
  'result_view',
  'teaser_view',
  'create_start',
  'candidate_pick',
  'candidate_unpick',
  'share_open',
  'report_view',
  'report_send_owner_click',
  'stayo_explainer_view',
  'sound_toggle',
  'locale_change',
]);

const primitive = z.union([z.string().max(2000), z.number().finite(), z.boolean(), z.null()]);

export const clientEventSchema = z.object({
  name: z.enum(EVENT_NAMES),
  props: z.record(z.string().max(40), primitive).default({}),
  ts: z.number().int().positive(),
  page: z.string().max(300),
  ref: z.string().max(80).nullable().optional(),
});

export const eventBatchSchema = z.object({
  events: z.array(clientEventSchema).min(1).max(50),
});

export type ClientEvent = z.infer<typeof clientEventSchema>;

/** Keys that must never travel as analytics props. */
export const FORBIDDEN_PROP_KEYS = /name|phone|email|contact|text|message/i;

export function stripPii(props: Record<string, Primitive>): Record<string, Primitive> {
  const out: Record<string, Primitive> = {};
  for (const [k, v] of Object.entries(props)) {
    if (FORBIDDEN_PROP_KEYS.test(k) && k !== 'feature_key' && k !== 'question_key' && k !== 'option_key') continue;
    out[k] = v;
  }
  return out;
}
