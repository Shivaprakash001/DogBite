import { Suspense } from 'react';
import { AdminShell, Panel, pct } from '@/components/admin/AdminUi';
import { ListSkeleton } from '@/components/Skeleton';
import { SELECTION } from '@/config';
import { requireAdminPage } from '@/server/admin-auth';
import { research } from '@/server/repos/admin';

export default function ResearchPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={8} />}>
      <Inner />
    </Suspense>
  );
}

async function Inner() {
  await requireAdminPage();
  const rowsData = await research();
  return (
    <AdminShell active="/admin/research">
      <p className="rounded-xl bg-latte p-4 text-sm">
        <strong>Read with care:</strong> the sample skews toward socially active, smartphone-savvy students who play quizzes. “Stated” is what creators
        say about themselves; “peer-perceived” is each creator’s friends’ most common guess. Friends choose between the true answer and one
        distractor, so peer guesses are constrained. Target is {SELECTION.targetPerStratum} responses per stratum (city × hostel type).
      </p>
      {rowsData.map((r) => {
        const keys = r.options.map((o) => o.key);
        const n = r.overall.respondents;
        const perceivedN = Object.values(r.overall.perceived).reduce((a, b) => a + b, 0);
        return (
          <Panel
            key={r.questionKey}
            title={`${r.objective} · ${r.questionKey}`}
            note={
              <>
                “{r.text}” · <strong>{n}</strong> creator responses · {r.overall.guesses} friend guesses · agreement {pct(r.overall.agreementRate)} ·
                {' '}{r.overall.discrepancies} discrepancies
                {r.topShare && (
                  <>
                    {' '}· top stated “{r.topShare.key}” {pct(r.topShare.share)} (95% CI {pct(r.topShare.ci[0])}–{pct(r.topShare.ci[1])})
                  </>
                )}
              </>
            }
          >
            {n === 0 ? (
              <p className="text-sm text-ink-soft">No responses yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-soft">
                      <th className="py-1 pr-3">Option</th>
                      <th className="py-1 pr-3">Stated (n={n})</th>
                      <th className="py-1 pr-3">Peer-perceived (n={perceivedN})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => {
                      const s = r.overall.stated[k] ?? 0;
                      const p = r.overall.perceived[k] ?? 0;
                      return (
                        <tr key={k} className="border-t border-line">
                          <td className="py-1.5 pr-3 font-semibold">{r.options.find((o) => o.key === k)?.label}</td>
                          <td className="py-1.5 pr-3 tabular-nums">
                            {s} · {pct(n ? s / n : null)}
                          </td>
                          <td className="py-1.5 pr-3 tabular-nums">
                            {p} · {pct(perceivedN ? p / perceivedN : null)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <h3 className="mt-4 mb-1 font-display text-sm font-bold">Responses still needed per stratum</h3>
                <ul className="flex flex-wrap gap-2 text-xs">
                  {r.strata.map((s) => (
                    <li key={`${s.city}-${s.type}`} className="rounded-full bg-cream px-3 py-1 ring-1 ring-line">
                      {s.city} · {s.type}: {s.n} / {SELECTION.targetPerStratum} ({s.needed} to go)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        );
      })}
    </AdminShell>
  );
}
