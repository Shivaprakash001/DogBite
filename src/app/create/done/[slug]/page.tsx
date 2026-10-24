import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { DeleteQuizButton } from '@/components/DeleteQuizButton';
import { ShareActions } from '@/components/ShareActions';
import { FlowSkeleton } from '@/components/Skeleton';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Mascot } from '@/components/ui/Mascot';
import { Sticker } from '@/components/ui/Sticker';
import { fmt, getCopy } from '@/content/copy';
import { absoluteUrl, paths } from '@/lib/urls';
import { getPublicQuiz } from '@/server/repos/play';
import { currentGate } from '@/server/session';

export const metadata: Metadata = { title: 'Your quiz is live', robots: { index: false } };

export default function DonePage({ params }: PageProps<'/create/done/[slug]'>) {
  return (
    <Suspense fallback={<FlowSkeleton />}>
      <DoneInner params={params} />
    </Suspense>
  );
}

async function DoneInner({ params }: { params: PageProps<'/create/done/[slug]'>['params'] }) {
  const { slug } = await params;
  const copy = getCopy();
  const [quiz, gate] = await Promise.all([getPublicQuiz(slug), currentGate()]);
  if (!quiz || quiz.status === 'deleted') notFound();
  if (quiz.creatorSessionId !== gate.sid) redirect(paths.quiz(slug));

  const url = absoluteUrl(paths.quiz(slug), { ref: gate.shareRef ?? slug });
  return (
    <section className="flex flex-1 flex-col gap-5 pt-2">
      <div className="relative mx-auto mt-2">
        <Mascot mood="celebrating" gender={quiz.gender} size={180} priority />
        <Sticker emoji="🎉" size={46} rotate={-12} className="-top-1 -left-8" />
        <Sticker emoji="🏠" size={40} rotate={10} className="top-8 -right-8" />
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-extrabold">{copy.done.title}</h1>
        <p className="mt-2 text-ink-soft">{copy.done.sub}</p>
      </div>
      <Card>
        <p className="font-display text-sm font-bold text-ink-soft">{fmt(copy.quizLanding.title, { creator: quiz.creatorName })}</p>
        <p className="mt-1 font-mono text-sm break-all text-terracotta-deep">{url}</p>
      </Card>
      <ShareActions
        url={url}
        caption={fmt(copy.done.caption, { url })}
        title={fmt(copy.quizLanding.title, { creator: quiz.creatorName })}
        quizSlug={slug}
        hostelId={quiz.hostel?.id ?? null}
        storyImageUrl={`/q/${slug}/story-image`}
        storyFileName={`${slug}-roomie-quiz.png`}
      />
      <ButtonLink href={paths.board(slug)} variant="accent" size="lg">
        🏆 {copy.done.board}
      </ButtonLink>
      {quiz.hostel && (
        <Link href={paths.hostel(quiz.hostel.slug)} className="mx-auto min-h-11 py-2 font-display font-bold text-terracotta underline underline-offset-4">
          {fmt(copy.result.hostelCta, { area: quiz.hostel.area })}
        </Link>
      )}
      <DeleteQuizButton slug={slug} />
    </section>
  );
}
