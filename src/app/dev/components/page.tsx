import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Mascot } from '@/components/ui/Mascot';
import { ProgressBar, ProgressPills } from '@/components/ui/ProgressPills';
import { Sticker } from '@/components/ui/Sticker';
import { MASCOT_MOODS } from '@/content/assets';
import { THEME } from '@/styles/theme';
import { PhotoCardStates, SheetAndToastDemo } from './Interactive';

// Living component reference (§5). Dev only: 404s in production builds.

export const metadata: Metadata = { title: 'Components', robots: { index: false } };

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

export default function ComponentsPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <div className="pt-2">
      <h1 className="text-3xl font-extrabold">Components</h1>
      <p className="text-ink-soft">Brand change = token change in src/styles/tokens.css.</p>

      <Block title="Colour tokens">
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(THEME.colors).map(([name, hex]) => (
            <div key={name} className="ring-line overflow-hidden rounded-xl ring-1">
              <div className="h-12" style={{ background: hex }} />
              <div className="bg-paper px-2 py-1 text-xs">
                <div className="font-bold">{name}</div>
                <div className="text-ink-soft">{hex}</div>
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Button">
        <div className="flex flex-col gap-3">
          <Button size="lg">Primary (lg)</Button>
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="ghost">Ghost</Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </Block>

      <Block title="Card">
        <div className="flex flex-col gap-3">
          <Card>Paper card with dashed inset border.</Card>
          <Card lined>Lined notebook card. Lines repeat every 32px so text can sit on them.</Card>
          <Card tone="latte">Latte tone</Card>
          <Card tone="clay">Clay tone</Card>
        </div>
      </Block>

      <Block title="PhotoCard states">
        <PhotoCardStates />
      </Block>

      <Block title="ProgressPills / ProgressBar">
        <div className="flex flex-col gap-4">
          <ProgressPills states={['correct', 'wrong', 'correct', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming']} />
          <ProgressPills states={['done', 'done', 'done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming']} />
          <ProgressBar value={4} max={10} label="5/10" />
        </div>
      </Block>

      <Block title="Mascot: moods × gender accessory">
        <div className="grid grid-cols-4 gap-2">
          {MASCOT_MOODS.map((mood) => (
            <div key={mood} className="bg-paper ring-line flex flex-col items-center rounded-xl p-1 text-xs ring-1">
              <Mascot mood={mood} size={80} decorative />
              {mood}
            </div>
          ))}
        </div>
        <div className="bg-latte mt-3 flex justify-around rounded-xl p-2">
          {(['she', 'he', 'they'] as const).map((g) => (
            <div key={g} className="flex flex-col items-center text-xs font-bold">
              <Mascot mood="happy" gender={g} size={96} decorative />
              {g}
            </div>
          ))}
        </div>
      </Block>

      <Block title="Sticker">
        <div className="bg-paper ring-line relative h-28 rounded-xl ring-1">
          <Sticker emoji="🏠" rotate={-10} className="top-4 left-4" />
          <Sticker emoji="🍜" size={52} rotate={8} className="top-8 left-24" />
          <Sticker asset="sticker.house" size={56} rotate={-4} className="top-6 left-48" />
          <Sticker asset="sticker.missing-key" size={44} className="top-10 left-72" />
        </div>
      </Block>

      <Block title="Sheet + Toast">
        <SheetAndToastDemo />
      </Block>

      <Block title="LanguageSwitcher">
        <LanguageSwitcher />
      </Block>
    </div>
  );
}
