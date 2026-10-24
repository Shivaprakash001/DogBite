import { fmt, getCopy } from '@/content/copy';
import { tierForScore } from '@/lib/scoring';
import { renderOgCard } from '@/server/og';
import { getAttemptResult } from '@/server/repos/play';

export const alt = 'Roomie Quiz result';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string; attemptId: string }> }) {
  const { slug, attemptId } = await params;
  const copy = getCopy();
  const r = /^[0-9a-f-]{36}$/i.test(attemptId) ? await getAttemptResult(slug, attemptId) : null;
  if (!r || !r.finished) {
    return renderOgCard({ kicker: copy.og.kicker, title: copy.landing.headline, highlight: copy.landing.headlineHighlight, mood: 'confused', gender: null });
  }
  const tier = tierForScore(r.score);
  return renderOgCard({
    kicker: tier.title,
    score: r.score,
    title: fmt(copy.og.resultTitle, { player: r.playerName, creator: r.quiz.creatorName }),
    subtitle: copy.og.resultSub,
    mood: tier.mood,
    gender: r.quiz.gender,
  });
}
