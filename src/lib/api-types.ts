import type { Avatar } from '@/content/characters';
import type { Gender, ObjectiveTag, QuestionKind } from '@/content/types';

// REST contract types shared by route handlers and the browser. If the backend
// moves to another stack (e.g. FastAPI), these shapes are the contract to keep.

export interface OptionDTO {
  id: number;
  key: string;
  label: string;
  emoji: string;
  image: string | null;
}

export type CategoryKey = 'research' | 'rating' | 'sleep' | 'study' | 'social' | 'money' | 'fun';

export interface CandidateDTO {
  key: string;
  text: string;
  kind: QuestionKind;
  objectiveTag: ObjectiveTag;
  category: CategoryKey;
  previewEmojis: string[];
}

export interface HostelDTO {
  id: string;
  slug: string;
  name: string;
  area: string;
  city: string;
  type: 'boys' | 'girls' | 'coed' | 'unknown';
}

export type CreatorStep = 'name' | 'character' | 'hostel' | 'pick' | 'answer' | 'publish';

export interface DraftQuestionDTO {
  quizQuestionId: number;
  position: number;
  key: string;
  text: string;
  kind: QuestionKind;
  objectiveTag: ObjectiveTag;
  options: OptionDTO[];
}

export interface DraftState {
  step: CreatorStep;
  name: string | null;
  gender: Gender | null;
  avatar: Avatar | null;
  hostel: HostelDTO | null;
  slug: string | null;
  candidates: CandidateDTO[];
  shufflesLeft: number;
  answering: DraftQuestionDTO | null;
  answeredCount: number;
  /** Previous display name on this device, to prefill a new quiz. */
  suggestedName: string | null;
}

export interface PlayQuestionDTO {
  quizQuestionId: number;
  position: number;
  key: string;
  text: string;
  options: [OptionDTO, OptionDTO];
}

export interface AnswerResultDTO {
  quizQuestionId: number;
  chosenOptionId: number | null;
  correct: boolean;
  correctOptionId: number;
}

export interface AttemptStartDTO {
  attemptId: string;
  quizId: string;
  questions: PlayQuestionDTO[];
  answered: AnswerResultDTO[];
}

export interface FinishDTO {
  attemptId: string;
  score: number;
  tierId: string;
  resultPath: string;
}

export interface ApiErrorBody {
  error: string;
  message?: string;
}

export function categoryFor(kind: QuestionKind, tag: ObjectiveTag): CategoryKey {
  if (kind === 'research') return 'research';
  if (kind === 'rating') return 'rating';
  return tag === 'sleep' || tag === 'study' || tag === 'social' || tag === 'money' ? tag : 'fun';
}
