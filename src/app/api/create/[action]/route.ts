import { z } from 'zod';
import { QUIZ } from '@/config';
import { validateDisplayName } from '@/lib/moderation';
import { ApiError, guardWrite, limit, ok, parseBody, route } from '@/server/http';
import {
  answerQuestion,
  confirmPicks,
  publishDraft,
  setHostel,
  setMascot,
  shuffleCandidates,
  skipQuestion,
  startDraft,
} from '@/server/repos/creator';

const key = z.string().regex(/^q_[a-z0-9_]+$/).max(60);

const schemas = {
  start: z.object({ name: z.string().max(40) }),
  mascot: z.object({ gender: z.enum(['he', 'she', 'they']) }),
  hostel: z.object({ hostelId: z.uuid().nullable() }),
  shuffle: z.object({ keep: z.array(key).max(QUIZ.questionsPerQuiz).default([]) }),
  picks: z.object({ keys: z.array(key).length(QUIZ.questionsPerQuiz) }),
  answer: z.object({ quizQuestionId: z.number().int().positive(), optionId: z.number().int().positive(), ms: z.number().min(0).max(3_600_000) }),
  skip: z.object({ quizQuestionId: z.number().int().positive() }),
  publish: z.object({}),
} as const;

type Action = keyof typeof schemas;

/** Creator flow steps (§6.3): one POST per decision, each autosaved. */
export const POST = route<RouteContext<'/api/create/[action]'>>(async (req, ctx) => {
  const { action } = await ctx.params;
  if (!(action in schemas)) throw new ApiError(404, 'unknown_action');
  const session = await guardWrite(req);
  const sid = session.id;

  switch (action as Action) {
    case 'start': {
      const { name } = await parseBody(req, schemas.start);
      const v = validateDisplayName(name);
      if (!v.ok) throw new ApiError(400, `name_${v.error}`);
      return ok(await startDraft(sid, v.value));
    }
    case 'mascot':
      return ok(await setMascot(sid, (await parseBody(req, schemas.mascot)).gender));
    case 'hostel':
      return ok(await setHostel(sid, (await parseBody(req, schemas.hostel)).hostelId));
    case 'shuffle':
      return ok(await shuffleCandidates(sid, (await parseBody(req, schemas.shuffle)).keep));
    case 'picks':
      return ok(await confirmPicks(sid, (await parseBody(req, schemas.picks)).keys));
    case 'answer': {
      const b = await parseBody(req, schemas.answer);
      return ok(await answerQuestion(sid, b.quizQuestionId, b.optionId, b.ms));
    }
    case 'skip':
      return ok(await skipQuestion(sid, (await parseBody(req, schemas.skip)).quizQuestionId));
    case 'publish':
      await parseBody(req, schemas.publish);
      await limit(req, 'publish', sid);
      return ok(await publishDraft(sid));
  }
});
