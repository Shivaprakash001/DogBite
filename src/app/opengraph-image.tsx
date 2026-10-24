import { getCopy } from '@/content/copy';
import { renderOgCard } from '@/server/og';

export const alt = 'Roomie Quiz by Stayo';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const copy = getCopy();
  return renderOgCard({
    kicker: copy.landing.kicker,
    title: copy.landing.headline,
    highlight: copy.landing.headlineHighlight,
    avatar: 'girl',
    characterMood: 'happy',
    dogMood: 'angry',
  });
}
