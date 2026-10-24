import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Footer } from '@/components/Footer';
import { SendToOwnerButton } from '@/components/hostel/HostelActions';
import { OwnerContactForm } from '@/components/hostel/OwnerContactForm';
import { ShareBars } from '@/components/hostel/ShareBars';
import { FlowSkeleton } from '@/components/Skeleton';
import { TrackView } from '@/components/Tracked';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Mascot } from '@/components/ui/Mascot';
import { PRIVACY } from '@/config';
import { fmt, getCopy } from '@/content/copy';
import { absoluteUrl, paths } from '@/lib/urls';
import { env } from '@/server/env';
import { getHostelBySlug } from '@/server/repos/hostels';
import { reportCard, type ReportSection } from '@/server/repos/stats';
import { currentGate } from '@/server/session';

type Props = PageProps<'/report/[hostelSlug]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hostelSlug } = await params;
  const h = await getHostelBySlug(hostelSlug);
  if (!h) return {};
  const title = fmt(getCopy().report.title, { hostel: h.name });
  return { title, description: getCopy().report.sub, openGraph: { title }, robots: { index: false } };
}

export default function ReportPage(props: Props) {
  return (
    <Suspense fallback={<FlowSkeleton />}>
      <ReportInner {...props} />
    </Suspense>
  );
}

function Section({ title, section, emptyText }: { title: string; section: ReportSection; emptyText: string }) {
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {section.average != null && (
          <span className="font-display text-xl font-extrabold text-terracotta">
            {section.average}
            <span className="text-sm text-ink-soft">/5 ★</span>
          </span>
        )}
      </div>
      <div className="mt-3">{section.shares ? <ShareBars bars={section.shares} /> : <p className="text-sm text-ink-soft">🔒 {emptyText}</p>}</div>
    </Card>
  );
}

async function ReportInner({ params, searchParams }: Props) {
  const copy = getCopy();
  const { hostelSlug } = await params;
  const { v } = await searchParams;
  const ownerView = v === 'owner';
  const hostel = await getHostelBySlug(hostelSlug);
  if (!hostel || hostel.hidden) notFound();
  const [report, gate] = await Promise.all([reportCard(hostel), currentGate()]);
  const ownerSignup = env().OWNER_SIGNUP_URL;
  const ownerHref = ownerSignup ? `${ownerSignup}${ownerSignup.includes('?') ? '&' : '?'}utm_source=quiz&utm_medium=report&hostel=${encodeURIComponent(hostel.slug)}` : null;
  const ownerLink = absoluteUrl(paths.report(hostel.slug), { v: 'owner', ref: gate.shareRef });
  const sectionLocked = fmt(copy.report.sectionLocked, { k: PRIVACY.minRespondents });

  const ownerCta = ownerHref && (
    <Card tone="clay">
      <h2 className="text-xl font-extrabold text-white">{copy.report.ownerTitle}</h2>
      <p className="mt-1 text-white/85">{copy.report.ownerBody}</p>
      <ButtonLink href={ownerHref} variant="accent" size="lg" className="mt-4">
        🏠 {copy.report.ownerCta}
      </ButtonLink>
    </Card>
  );

  return (
    <>
      <TrackView name="report_view" props={{ hostel_id: hostel.id, owner_view: ownerView }} />
      <section className="flex items-center gap-3 pt-2">
        <Mascot mood={report.unlocked ? 'happy' : 'sleepy'} size={88} />
        <div className="min-w-0">
          <h1 className="text-[1.65rem] leading-tight font-extrabold">{fmt(copy.report.title, { hostel: hostel.name })}</h1>
          <p className="text-sm text-ink-soft">{copy.report.sub}</p>
        </div>
      </section>

      {ownerView && <div className="mt-5">{ownerCta}</div>}

      {report.unlocked ? (
        <div className="mt-5 flex flex-col gap-3">
          <p className="font-display text-sm font-bold text-ink-soft">{fmt(copy.report.respondents, { n: report.respondents })}</p>
          <Section title={copy.report.mess} section={report.sections.mess} emptyText={sectionLocked} />
          <Section title={copy.report.painPoints} section={report.sections.painPoints} emptyText={sectionLocked} />
          <Section title={copy.report.wifi} section={report.sections.wifi} emptyText={sectionLocked} />
          <Section title={copy.report.wishList} section={report.sections.wishList} emptyText={sectionLocked} />
          <Section title={copy.report.laundry} section={report.sections.laundry} emptyText={sectionLocked} />
          <p className="text-xs text-ink-soft">{copy.report.sampleNote}</p>
        </div>
      ) : (
        <Card className="mt-5">
          <p className="text-center font-display text-lg font-extrabold">🔒 {fmt(copy.report.locked, { n: report.respondents, k: PRIVACY.minRespondents })}</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuemin={0} aria-valuemax={PRIVACY.minRespondents} aria-valuenow={report.respondents} aria-label={copy.report.title}>
            <div className="h-full rounded-full bg-terracotta" style={{ width: `${(Math.min(report.respondents, PRIVACY.minRespondents) / PRIVACY.minRespondents) * 100}%` }} />
          </div>
          <ButtonLink href={`/create?hostel=${hostel.slug}`} size="lg" className="mt-4">
            ✍️ {copy.hostelPage.playCta}
          </ButtonLink>
        </Card>
      )}

      {!ownerView && (
        <div className="mt-6 flex flex-col gap-3">
          <SendToOwnerButton hostelId={hostel.id} hostelName={hostel.name} reportUrl={ownerLink} />
          <OwnerContactForm hostelId={hostel.id} consented={gate.consented} />
        </div>
      )}

      {!ownerView && ownerCta && <div className="mt-6">{ownerCta}</div>}

      <Link href={paths.hostel(hostel.slug)} className="mt-4 block min-h-11 py-3 text-center font-display font-bold text-terracotta underline underline-offset-4">
        ← {hostel.name}
      </Link>
      <Footer />
    </>
  );
}
