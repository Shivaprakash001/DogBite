import { fmt, getCopy } from '@/content/copy';
import { renderStoryCard } from '@/server/og';
import { getPublicQuiz } from '@/server/repos/play';

/** 1080×1920 image for Instagram / WhatsApp Stories (§14 "save image"). */
export async function GET(_req: Request, ctx: RouteContext<'/q/[slug]/story-image'>) {
  const { slug } = await ctx.params;
  const copy = getCopy();
  const quiz = await getPublicQuiz(slug);
  if (!quiz || quiz.status !== 'live') return new Response('Not found', { status: 404 });
  return renderStoryCard({
    kicker: copy.landing.kicker,
    title: fmt(copy.quizLanding.title, { creator: quiz.creatorName }),
    highlight: copy.quizLanding.titleHighlight,
    subtitle: fmt(copy.og.quizSub, { dog: copy.dog.name }),
    avatar: quiz.avatar,
    characterMood: 'thinking',
    dogMood: 'neutral',
    footer: copy.og.storyFooter,
  });
}
