import { Suspense } from 'react';
import { AdminShell, Panel, pct } from '@/components/admin/AdminUi';
import { ListSkeleton } from '@/components/Skeleton';
import { FEATURE_DECISIONS } from '@/config';
import { requireAdminPage } from '@/server/admin-auth';
import { featurePanel } from '@/server/repos/admin';

const BADGE = {
  build: 'bg-correct text-white',
  wait: 'bg-marigold text-charcoal',
  drop: 'bg-wrong text-white',
  insufficient: 'bg-line text-charcoal',
} as const;

export default function FeaturesPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <Inner />
    </Suspense>
  );
}

async function Inner() {
  await requireAdminPage();
  const rowsData = await featurePanel();
  return (
    <AdminShell active="/admin/features">
      <p className="bg-latte rounded-xl p-4 text-sm">
        Thresholds live in <code>src/config.ts → FEATURE_DECISIONS</code>. <strong>Build</strong> = every metric clears its bar, <strong>drop</strong> = every
        metric is under half its bar, otherwise <strong>wait</strong>. No decision is shown below the minimum sample.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {rowsData.map((f) => (
          <Panel key={f.key} title={f.label}>
            <span className={`font-display inline-block rounded-full px-3 py-1 text-sm font-extrabold uppercase ${BADGE[f.decision]}`}>
              {f.decision === 'insufficient' ? 'not enough data' : f.decision}
            </span>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="font-bold">Stated habit</dt>
              <dd>
                {pct(f.stated.value, 1)} vs bar {pct(f.stated.threshold)} · n={f.stated.sample} · 95% CI {pct(f.stated.ci[0])}–{pct(f.stated.ci[1])}
                <div className="text-ink-soft text-xs">
                  {FEATURE_DECISIONS[f.key].stated.questionKey} ∈ {FEATURE_DECISIONS[f.key].stated.optionKeys.join(', ')}
                </div>
              </dd>
              <dt className="font-bold">Teaser tap rate</dt>
              <dd>
                {pct(f.tap.value, 1)} vs bar {pct(f.tap.threshold)} · n={f.tap.sample} viewers · 95% CI {pct(f.tap.ci[0])}–{pct(f.tap.ci[1])}
              </dd>
              <dt className="font-bold">Min sample</dt>
              <dd>{FEATURE_DECISIONS[f.key].minSample}</dd>
            </dl>
          </Panel>
        ))}
      </div>
    </AdminShell>
  );
}
