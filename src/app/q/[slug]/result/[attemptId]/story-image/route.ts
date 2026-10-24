import { fmt, getCopy } from '@/content/copy';
import { compatibilityPct, tierForScore } from '@/lib/scoring';
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
    pct: compatibilityPct(r.score),
    title: fmt(copy.og.resultTitle, { player: r.playerName, creator: r.quiz.creatorName }),
    subtitle: copy.og.resultSub,
    avatar: r.playerAvatar,
    characterMood: tier.playerMood,
    dogMood: tier.dogMood,
    footer: copy.og.storyFooter,
  });
}
