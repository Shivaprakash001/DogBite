import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { DeleteMyData } from '@/components/DeleteMyData';
import { DeleteQuizButton } from '@/components/DeleteQuizButton';
import { ListSkeleton } from '@/components/Skeleton';
import { Card } from '@/components/ui/Card';
import { Mascot } from '@/components/ui/Mascot';
import { PRIVACY } from '@/config';
import { fmt, getCopy } from '@/content/copy';
import { paths } from '@/lib/urls';
import { myQuizzes } from '@/server/repos/play';
import { readSessionId } from '@/server/session';

export const metadata: Metadata = { title: 'Privacy & your data' };

export default function PrivacyPage() {
  const copy = getCopy();
  return (
    <>
      <section className="flex items-center gap-3 pt-2">
        <Mascot mood="neutral" size={84} />
        <h1 className="text-3xl leading-tight font-extrabold">{copy.privacy.title}</h1>
      </section>
      <p className="mt-4 text-lg leading-relaxed">{copy.privacy.intro}</p>

      <Card className="mt-5" lined>
        <h2 className="text-lg font-extrabold">{copy.privacy.collectTitle}</h2>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-ink-soft">
          {copy.privacy.collect.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <h2 className="mt-5 text-lg font-extrabold">{copy.privacy.whyTitle}</h2>
        <p className="mt-2 text-ink-soft">{fmt(copy.privacy.why, { k: PRIVACY.minRespondents })}</p>
      </Card>

      <section className="mt-8" aria-labelledby="mine">
        <h2 id="mine" className="mb-3 text-xl font-extrabold">
          {copy.privacy.myQuizzes}
        </h2>
        <Suspense fallback={<ListSkeleton rows={2} />}>
          <MyQuizzes />
        </Suspense>
      </section>

      <section className="mt-8" aria-labelledby="del">
        <Card>
          <h2 id="del" className="text-lg font-extrabold">
            {copy.privacy.deleteTitle}
          </h2>
          <p className="mt-2 mb-4 text-ink-soft">{copy.privacy.deleteBody}</p>
          <DeleteMyData />
        </Card>
      </section>
      <p className="mt-6 text-center text-sm text-ink-soft">{copy.privacy.contact}</p>
    </>
  );
}

async function MyQuizzes() {
  const copy = getCopy();
  const sid = await readSessionId();
  const quizzes = sid ? await myQuizzes(sid) : [];
  if (quizzes.length === 0) return <p className="text-ink-soft">{copy.privacy.noQuizzes}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {quizzes.map((q) => (
        <li key={q.slug} className="flex items-center justify-between gap-2 rounded-2xl bg-paper px-4 py-2 ring-2 ring-line">
          <Link href={paths.quiz(q.slug)} className="min-h-11 py-2.5 font-display font-extrabold">
            {fmt(copy.quizLanding.title, { creator: q.name })}
          </Link>
          <DeleteQuizButton slug={q.slug} after="refresh" />
        </li>
      ))}
    </ul>
  );
}
