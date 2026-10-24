/* eslint-disable @next/next/no-img-element -- satori (ImageResponse) renders plain <img>, next/image doesn't apply */
import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { ASSETS, type MascotMood } from '@/content/assets';
import { characterSvg, type Avatar, type CharacterMood } from '@/content/characters';
import { getCopy } from '@/content/copy';
import { THEME } from '@/styles/theme';

// Shared renderer for Open Graph cards (1200×630) and Story images (1080×1920):
// the character plus the guard pup. Assets are read from disk; next.config's
// outputFileTracingIncludes ships them.

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

const toDataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
const publicSvg = async (path: string) => toDataUri(await readFile(join(root, 'public', path), 'utf8'));

export interface CardInput {
  kicker: string;
  title: string;
  /** Phrase inside the title to underline in marigold. */
  highlight?: string;
  subtitle?: string;
  avatar: Avatar;
  characterMood: CharacterMood;
  dogMood: MascotMood;
  /** Compatibility percentage, shown big when present. */
  pct?: number | null;
  footer?: string;
}

function Title({ text, highlight, size, center = false }: { text: string; highlight?: string; size: number; center?: boolean }) {
  // One flex item per word so satori can wrap; words of the highlight phrase get a marker stroke.
  const words = text.split(/\s+/);
  const bare = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, '');
  const hw = highlight ? highlight.split(/\s+/) : [];
  const start = hw.length ? words.findIndex((_, i) => hw.every((h, j) => bare(words[i + j] ?? '') === bare(h))) : -1;
  const marked = (i: number) => start !== -1 && i >= start && i < start + hw.length;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: center ? 'center' : 'flex-start',
        columnGap: size * 0.26,
        fontSize: size,
        fontWeight: 800,
        lineHeight: 1.08,
        color: C.charcoal,
        letterSpacing: -1,
      }}
    >
      {words.map((w, i) =>
        marked(i) ? (
          <span key={i} style={{ display: 'flex', position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: -4,
                right: -4,
                bottom: size * 0.1,
                height: size * 0.26,
                background: C.marigold,
                borderRadius: 999,
                opacity: 0.85,
              }}
            />
            <span style={{ position: 'relative' }}>{w}</span>
          </span>
        ) : (
          <span key={i}>{w}</span>
        ),
      )}
    </div>
  );
}

async function art(input: CardInput) {
  const [dog, logo] = await Promise.all([publicSvg(ASSETS[`mascot.${input.dogMood}`]), publicSvg(ASSETS['logo.mark'])]);
  return { character: toDataUri(characterSvg(input.avatar, input.characterMood)), dog, logo };
}

function Brand({ logo, scale = 1 }: { logo: string; scale?: number }) {
  const copy = getCopy();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 * scale }}>
      <img src={logo} width={40 * scale} height={54 * scale} alt="" />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 30 * scale, fontWeight: 800, color: C.charcoal }}>{copy.brand.product}</span>
        <span style={{ fontSize: 20 * scale, fontWeight: 700, color: C.terracotta }}>{copy.brand.by}</span>
      </div>
    </div>
  );
}

function Pill({ text, size }: { text: string; size: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignSelf: 'flex-start',
        background: C.paper,
        border: `3px solid ${C.line}`,
        borderRadius: 999,
        padding: `${size * 0.33}px ${size * 0.8}px`,
        color: C.terracotta,
        fontSize: size,
        fontWeight: 800,
      }}
    >
      {text}
    </div>
  );
}

const CACHE = { 'cache-control': 'public, max-age=300, s-maxage=3600' };

export async function renderOgCard(input: CardInput): Promise<ImageResponse> {
  const { character, dog, logo } = await art(input);
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: C.cream, fontFamily: 'Manrope', padding: 56, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 22, left: 22, right: 22, bottom: 22, border: `4px dashed ${C.line}`, borderRadius: 40, display: 'flex' }} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 640, paddingLeft: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Pill text={input.kicker} size={24} />
          {input.pct != null && (
            <div style={{ display: 'flex', alignItems: 'baseline', color: C.terracotta, fontWeight: 800 }}>
              <span style={{ fontSize: 140, lineHeight: 1 }}>{input.pct}</span>
              <span style={{ fontSize: 70, color: C['ink-soft'] }}>%</span>
            </div>
          )}
          <Title text={input.title} highlight={input.highlight} size={input.pct != null ? 54 : 66} />
          {input.subtitle && <div style={{ display: 'flex', fontSize: 30, color: C['ink-soft'], fontWeight: 700 }}>{input.subtitle}</div>}
        </div>
        <Brand logo={logo} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div style={{ display: 'flex', width: 440, height: 440, borderRadius: 999, background: C.latte, alignItems: 'flex-end', justifyContent: 'center' }}>
          <img src={character} width={330} height={330} alt="" style={{ marginRight: -70, marginBottom: 24 }} />
          <img src={dog} width={210} height={210} alt="" style={{ marginBottom: 24 }} />
        </div>
      </div>
    </div>,
    { width: 1200, height: 630, fonts: await fonts(), headers: CACHE },
  );
}

export async function renderStoryCard(input: CardInput): Promise<ImageResponse> {
  const { character, dog, logo } = await art(input);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: C.cream,
        fontFamily: 'Manrope',
        padding: '130px 80px 110px',
      }}
    >
      <Pill text={input.kicker} size={38} />
      <div
        style={{
          display: 'flex',
          width: 800,
          height: 680,
          marginTop: 60,
          borderRadius: 120,
          background: C.latte,
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        <img src={character} width={540} height={540} alt="" style={{ marginRight: -120, marginBottom: 30 }} />
        <img src={dog} width={360} height={360} alt="" style={{ marginBottom: 30 }} />
      </div>
      {input.pct != null && (
        <div style={{ display: 'flex', alignItems: 'baseline', color: C.terracotta, fontWeight: 800, marginTop: 40 }}>
          <span style={{ fontSize: 200, lineHeight: 1 }}>{input.pct}</span>
          <span style={{ fontSize: 100, color: C['ink-soft'] }}>%</span>
        </div>
      )}
      <div style={{ display: 'flex', marginTop: 36, justifyContent: 'center', width: '100%' }}>
        <Title text={input.title} highlight={input.highlight} size={input.pct != null ? 72 : 88} center />
      </div>
      {input.subtitle && (
        <div style={{ display: 'flex', marginTop: 26, fontSize: 44, color: C['ink-soft'], fontWeight: 700, textAlign: 'center' }}>{input.subtitle}</div>
      )}
      <div style={{ flex: 1, display: 'flex' }} />
      {input.footer && (
        <div
          style={{
            display: 'flex',
            background: C.terracotta,
            color: 'white',
            borderRadius: 36,
            padding: '26px 46px',
            fontSize: 40,
            fontWeight: 800,
            marginBottom: 50,
          }}
        >
          {input.footer}
        </div>
      )}
      <Brand logo={logo} scale={1.4} />
    </div>,
    { width: 1080, height: 1920, fonts: await fonts(), headers: CACHE },
  );
}
