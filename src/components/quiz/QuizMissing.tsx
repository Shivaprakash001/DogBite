import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Mascot } from '@/components/ui/Mascot';
import { getCopy } from '@/content/copy';

export function QuizMissing() {
  const copy = getCopy();
  return (
    <section className="flex flex-1 flex-col items-center gap-5 pt-8 text-center">
      <Mascot mood="confused" size={160} />
      <Card className="w-full">
        <h1 className="text-2xl font-extrabold">{copy.quizLanding.notFound}</h1>
        <p className="mt-2 text-ink-soft">{copy.quizLanding.notFoundSub}</p>
      </Card>
      <ButtonLink href="/create" size="lg">
        {copy.result.createCta}
      </ButtonLink>
    </section>
  );
}
