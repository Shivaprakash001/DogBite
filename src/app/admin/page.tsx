import { Suspense } from 'react';
import { AdminAction } from '@/components/admin/AdminActions';
import { AdminShell, BarRow, Panel, PeriodPicker, Stat, pct, sinceFrom } from '@/components/admin/AdminUi';
import { ListSkeleton } from '@/components/Skeleton';
import { requireAdminPage } from '@/server/admin-auth';
import { funnel, overview, virality } from '@/server/repos/admin';

const STEP_LABEL: Record<string, string> = {
  landing_view: 'Landing / quiz view',
  start_click: 'Start clicked',
  quiz_complete: 'Quiz completed',
  result_view: 'Result viewed',
  create_start: 'Create started',
  quiz_publish: 'Quiz published',
  share_click: 'Share clicked',
  share_open: 'Arrived via share',
};

export default function AdminHome({ searchParams }: PageProps<'/admin'>) {
  return (
    <Suspense fallback={<ListSkeleton rows={8} />}>
      <Inner searchParams={searchParams} />
    </Suspense>
  );
}

async function Inner({ searchParams }: { searchParams: PageProps<'/admin'>['searchParams'] }) {
  await requireAdminPage();
  const { since, days } = sinceFrom((await searchParams).days);
  const [o, f, v] = await Promise.all([overview(since), funnel(since), virality(since)]);
  const top = Math.max(1, ...f.steps.map((s) => s.sessions));
  const maxQ = Math.max(1, f.started);

  return (
    <AdminShell active="/admin" days={days}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodPicker base="/admin" days={days} />
        <AdminAction action="logout" body={{}}>
          Sign out
        </AdminAction>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="New sessions" value={o.sessions} />
        <Stat label="Consented" value={o.consented} />
        <Stat label="Quizzes published" value={o.quizzes} />
        <Stat label="Plays finished" value={o.plays} />
        <Stat label="Hostels (all time)" value={o.hostels} />
        <Stat label="Events" value={o.events} />
      </div>

      <Panel title="Funnel" note="Distinct sessions reaching each step in the period. Drop-off is relative to the previous step.">
        <div className="flex flex-col gap-2.5">
          {f.steps.map((s, i) => {
            const prev = i > 0 ? f.steps[i - 1].sessions : null;
            return (
              <BarRow
                key={s.name}
                label={STEP_LABEL[s.name]}
                value={s.sessions}
                max={top}
                right={
                  s.name === 'share_open'
                    ? `${s.sessions}${prev ? ` · ×${(s.sessions / prev).toFixed(1)} per share` : ''}`
                    : `${s.sessions}${prev ? ` · ${pct(s.sessions / prev)} of prev` : ''}`
                }
              />
            );
          })}
        </div>
      </Panel>

      <Panel title="Per-question drop-off (players)" note={`Answers recorded at each position out of ${f.started} attempts started.`}>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 10 }, (_, p) => {
            const n = f.perQuestion.find((x) => x.position === p)?.answered ?? 0;
            return <BarRow key={p} label={`Question ${p + 1}`} value={n} max={maxQ} right={`${n} · ${pct(f.started ? n / f.started : null)}`} tone="dusty" />;
          })}
        </div>
      </Panel>

      <Panel title="Virality" note="K-factor here = quizzes published by referred sessions ÷ finished plays (the brief’s definition).">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="K-factor" value={v.kFactor.value?.toFixed(3) ?? '—'} sample={`${v.kFactor.numerator} referred quizzes / ${v.kFactor.sample} plays`} />
          <Stat label="Play → create" value={pct(v.playToCreate.value, 1)} sample={`${v.playToCreate.numerator} of ${v.playToCreate.sample} players`} />
          <Stat
            label="Referred sessions per referrer"
            value={v.referralsPerReferrer.value?.toFixed(2) ?? '—'}
            sample={`${v.referralsPerReferrer.numerator} referred / ${v.referralsPerReferrer.sample} referrers`}
          />
        </div>
        <h3 className="font-display mt-5 mb-2 font-bold">Spread of referrals</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(v.spread).map(([k, n]) => (
            <Stat key={k} label={k.replace(/_/g, ' ')} value={n} />
          ))}
        </div>
        <h3 className="font-display mt-5 mb-2 font-bold">Share channels</h3>
        <div className="flex flex-col gap-2">
          {v.channels.length === 0 && <p className="text-ink-soft text-sm">No shares in this period.</p>}
          {v.channels.map((c) => (
            <BarRow key={c.channel} label={c.channel} value={c.n} max={Math.max(...v.channels.map((x) => x.n))} right={c.n} />
          ))}
        </div>
      </Panel>
    </AdminShell>
  );
}
