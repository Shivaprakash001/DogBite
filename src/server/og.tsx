import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { ASSETS, type MascotMood } from '@/content/assets';
import { getCopy } from '@/content/copy';
import { withAccessory } from '@/content/mascot-accessories';
import type { Gender } from '@/content/types';
import { THEME } from '@/styles/theme';

// Shared renderer for Open Graph cards (1200×630) and Story images (1080×1920).
// Assets are read from disk; next.config's outputFileTracingIncludes ships them.

const C = THEME.colors;
const root = process.cwd();

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 700 | 800; style: 'normal' }[]> | null = null;
function fonts() {
  fontsPromise ??= Promise.all(
    ([700, 800] as const).map(async (weight) => ({
      name: 'Manrope',
      weight,
      style: 'normal' as const,
      data: await readFile(join(root, `node_modules/@fontsource/manrope/files/manrope-latin-${weight}-normal.woff`)),
    })),
  );
  return fontsPromise;
}

async function svgDataUri(publicPath: string, transform?: (svg: string) => string): Promise<string> {
  let svg = await readFile(join(root, 'public', publicPath), 'utf8');
  if (transform) svg = transform(svg);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export interface CardInput {
  kicker: string;
  title: string;
  /** Word inside the title to underline in marigold. */
  highlight?: string;
  subtitle?: string;
  mood: MascotMood;
  gender: Gender | null;
  score?: number | null;
  footer?: string;
}

function Title({ text, highlight, size, center = false }: { text: string; highlight?: string; size: number; center?: boolean }) {
  // One flex item per word so satori can wrap; the highlight word gets a marker stroke.
  const words = text.split(/\s+/);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: center ? 'center' : 'flex-start', columnGap: size * 0.26, fontSize: size, fontWeight: 800, lineHeight: 1.08, color: C.charcoal, letterSpacing: -1 }}>
      {words.map((w, i) =>
        highlight && w.replace(/[^\p{L}\p{N}]/gu, '') === highlight ? (
          <span key={i} style={{ display: 'flex', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0, right: 0, bottom: size * 0.1, height: size * 0.26, background: C.marigold, borderRadius: 999, opacity: 0.85 }} />
            <span style={{ position: 'relative' }}>{w}</span>
          </span>
        ) : (
          <span key={i}>{w}</span>
        ),
      )}
    </div>
  );
}

async function assets(input: CardInput) {
  const mascotPath = ASSETS[`mascot.${input.mood}`];
  const [mascot, logo] = await Promise.all([
    svgDataUri(mascotPath, (svg) => withAccessory(svg, input.gender, input.mood)),
    svgDataUri(ASSETS['logo.mark']),
  ]);
  return { mascot, logo };
}

export async function renderOgCard(input: CardInput): Promise<ImageResponse> {
  const copy = getCopy();
  const { mascot, logo } = await assets(input);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: C.cream, fontFamily: 'Manrope', padding: 56, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 22, left: 22, right: 22, bottom: 22, border: `4px dashed ${C.line}`, borderRadius: 40, display: 'flex' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 640, paddingLeft: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignSelf: 'flex-start', background: C.paper, border: `3px solid ${C.line}`, borderRadius: 999, padding: '8px 20px', color: C.terracotta, fontSize: 24, fontWeight: 800 }}>
              {input.kicker}
            </div>
            {input.score != null && (
              <div style={{ display: 'flex', alignItems: 'baseline', color: C.terracotta, fontWeight: 800 }}>
                <span style={{ fontSize: 150, lineHeight: 1 }}>{input.score}</span>
                <span style={{ fontSize: 70, color: C['ink-soft'] }}>/10</span>
              </div>
            )}
            <Title text={input.title} highlight={input.highlight} size={input.score != null ? 54 : 76} />
            {input.subtitle && <div style={{ display: 'flex', fontSize: 30, color: C['ink-soft'], fontWeight: 700 }}>{input.subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={logo} width={40} height={54} alt="" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: C.charcoal }}>{copy.brand.product}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: C.terracotta }}>{copy.brand.by}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ display: 'flex', width: 440, height: 440, borderRadius: 999, background: C.latte, alignItems: 'center', justifyContent: 'center' }}>
            <img src={mascot} width={400} height={400} alt="" />
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: await fonts(), headers: { 'cache-control': 'public, max-age=300, s-maxage=3600' } },
  );
}

export async function renderStoryCard(input: CardInput): Promise<ImageResponse> {
  const copy = getCopy();
  const { mascot, logo } = await assets(input);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', background: C.cream, fontFamily: 'Manrope', padding: '140px 80px 120px' }}>
        <div style={{ display: 'flex', background: C.paper, border: `4px solid ${C.line}`, borderRadius: 999, padding: '14px 34px', color: C.terracotta, fontSize: 38, fontWeight: 800 }}>{input.kicker}</div>
        <div style={{ display: 'flex', width: 760, height: 760, marginTop: 70, borderRadius: 999, background: C.latte, alignItems: 'center', justifyContent: 'center' }}>
          <img src={mascot} width={700} height={700} alt="" />
        </div>
        {input.score != null && (
          <div style={{ display: 'flex', alignItems: 'baseline', color: C.terracotta, fontWeight: 800, marginTop: 40 }}>
            <span style={{ fontSize: 220, lineHeight: 1 }}>{input.score}</span>
            <span style={{ fontSize: 100, color: C['ink-soft'] }}>/10</span>
          </div>
        )}
        <div style={{ display: 'flex', marginTop: 40, justifyContent: 'center', width: '100%' }}>
          <Title text={input.title} highlight={input.highlight} size={input.score != null ? 74 : 104} center />
        </div>
        {input.subtitle && <div style={{ display: 'flex', marginTop: 28, fontSize: 44, color: C['ink-soft'], fontWeight: 700, textAlign: 'center' }}>{input.subtitle}</div>}
        <div style={{ flex: 1, display: 'flex' }} />
        {input.footer && (
          <div style={{ display: 'flex', background: C.terracotta, color: 'white', borderRadius: 36, padding: '26px 46px', fontSize: 40, fontWeight: 800, marginBottom: 50 }}>{input.footer}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img src={logo} width={56} height={76} alt="" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: C.charcoal }}>{copy.brand.product}</span>
            <span style={{ fontSize: 30, fontWeight: 700, color: C.terracotta }}>{copy.brand.by}</span>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts: await fonts(), headers: { 'cache-control': 'public, max-age=300, s-maxage=3600' } },
  );
}
