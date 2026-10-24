import { fmt, getCopy } from '@/content/copy';
import { tierForScore } from '@/lib/scoring';
import { renderStoryCard } from '@/server/og';
import { getAttemptResult } from '@/server/repos/play';

/** Story-sized result card the player can save and post. */
export async function GET(_req: Request, ctx: RouteContext<'/q/[slug]/result/[attemptId]/story-image'>) {
  const { slug, attemptId } = await ctx.params;
  const copy = getCopy();
  const r = /^[0-9a-f-]{36}$/i.test(attemptId) ? await getAttemptResult(slug, attemptId) : null;
  if (!r || !r.finished) return new Response('Not found', { status: 404 });
  const tier = tierForScore(r.score);
  return renderStoryCard({
    kicker: tier.title,
    score: r.score,
    title: fmt(copy.og.resultTitle, { player: r.playerName, creator: r.quiz.creatorName }),
    subtitle: copy.og.resultSub,
    mood: tier.mood,
    gender: r.quiz.gender,
    footer: copy.og.storyFooter,
  });
}
