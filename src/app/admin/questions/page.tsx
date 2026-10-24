import { Suspense } from 'react';
import { AdminAction } from '@/components/admin/AdminActions';
import { AdminShell, Panel, pct } from '@/components/admin/AdminUi';
import { ListSkeleton } from '@/components/Skeleton';
import { SELECTION } from '@/config';
import { requireAdminPage } from '@/server/admin-auth';
import { questionHealth } from '@/server/repos/admin';

export default function QuestionsPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={10} />}>
      <Inner />
    </Suspense>
  );
}

async function Inner() {
  await requireAdminPage();
  const qs = await questionHealth();
  return (
    <AdminShell active="/admin/questions">
      <Panel
        title="Question health"
        note={`Flagged = skip rate above ${pct(SELECTION.retire.skipRate)} with ≥ ${SELECTION.retire.minImpressions} impressions (auto-excluded from selection). Posterior = Beta mean of the bandit. Retire/restore toggles the question’s active flag.`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-soft">
                {['Question', 'Kind', 'Impr.', 'Pick rate', 'Skip rate', 'Completion', 'Posterior', 'Status', ''].map((h) => (
                  <th key={h} className="py-1 pr-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {qs.map((q) => (
                <tr key={q.key} className={`border-t border-line ${q.flagged ? 'bg-wrong-soft' : ''}`}>
                  <td className="py-1.5 pr-3 font-mono text-xs">{q.key}</td>
                  <td className="py-1.5 pr-3">
                    {q.kind} · {q.objective}
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums">{q.impressions}</td>
                  <td className="py-1.5 pr-3 tabular-nums">
                    {pct(q.pickRate)} <span className="text-ink-soft">({q.picks})</span>
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums">
                    {pct(q.skipRate)} <span className="text-ink-soft">({q.skips})</span>
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums">{pct(q.completion)}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{q.posteriorMean.toFixed(2)}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    {!q.active ? '⛔ retired' : q.flagged ? '⚠️ flagged' : q.sensitivity > 1 ? '🔒 sensitive' : '✓ active'}
                  </td>
                  <td className="py-1.5">
                    <AdminAction action="question-active" body={{ key: q.key, active: !q.active }} tone={q.active ? 'danger' : 'default'}>
                      {q.active ? 'Retire' : 'Restore'}
                    </AdminAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AdminShell>
  );
}
