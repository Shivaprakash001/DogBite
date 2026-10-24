import { fmt, getCopy } from '@/content/copy';
import { compatibilityPct, tierForScore } from '@/lib/scoring';
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
    return renderOgCard({
      kicker: copy.landing.kicker,
      title: copy.landing.headline,
      highlight: copy.landing.headlineHighlight,
      avatar: 'boy',
      characterMood: 'thinking',
      dogMood: 'confused',
    });
  }
  const tier = tierForScore(r.score);
  return renderOgCard({
    kicker: tier.title,
    pct: compatibilityPct(r.score),
    title: fmt(copy.og.resultTitle, { player: r.playerName, creator: r.quiz.creatorName }),
    subtitle: copy.og.resultSub,
    avatar: r.playerAvatar,
    characterMood: tier.playerMood,
    dogMood: tier.dogMood,
  });
}
