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
    return renderOgCard({ kicker: copy.og.kicker, title: copy.landing.headline, highlight: copy.landing.headlineHighlight, mood: 'confused', gender: null });
  }
  return renderOgCard({
    kicker: quiz.hostel ? `🏠 ${quiz.hostel.name}` : copy.og.kicker,
    title: fmt(copy.quizLanding.title, { creator: quiz.creatorName }),
    highlight: copy.landing.headlineHighlight,
    subtitle: fmt(copy.og.quizSub, { creator: quiz.creatorName }),
    mood: 'thinking',
    gender: quiz.gender,
  });
}
