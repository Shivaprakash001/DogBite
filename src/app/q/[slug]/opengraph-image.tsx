import { fmt, getCopy } from '@/content/copy';
import { renderOgCard } from '@/server/og';
import { getPublicQuiz } from '@/server/repos/play';

export const alt = 'Roomie Quiz by Stayo';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const copy = getCopy();
  const quiz = await getPublicQuiz(slug);
  if (!quiz || quiz.status !== 'live') {
    return renderOgCard({
      kicker: copy.landing.kicker,
      title: copy.landing.headline,
      highlight: copy.landing.headlineHighlight,
      avatar: 'boy',
      characterMood: 'thinking',
      dogMood: 'confused',
    });
  }
  return renderOgCard({
    kicker: quiz.hostel ? `🏠 ${quiz.hostel.name}` : copy.landing.kicker,
    title: fmt(copy.quizLanding.title, { creator: quiz.creatorName }),
    highlight: copy.quizLanding.titleHighlight,
    subtitle: fmt(copy.og.quizSub, { dog: copy.dog.name }),
    avatar: quiz.avatar,
    characterMood: 'thinking',
    dogMood: 'neutral',
  });
}
