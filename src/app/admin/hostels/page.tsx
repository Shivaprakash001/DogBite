import Link from 'next/link';
import { Suspense } from 'react';
import { AdminAction } from '@/components/admin/AdminActions';
import { AdminShell, Panel, Stat } from '@/components/admin/AdminUi';
import { ListSkeleton } from '@/components/Skeleton';
import { requireAdminPage } from '@/server/admin-auth';
import { hostelsAdmin } from '@/server/repos/admin';

export default function HostelsAdminPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={8} />}>
      <Inner />
    </Suspense>
  );
}

async function Inner() {
  await requireAdminPage();
  const h = await hostelsAdmin();
  return (
    <AdminShell active="/admin/hostels">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Hostels" value={h.totals.total} />
        <Stat label="Verified" value={h.totals.verified} />
        <Stat label="Claimed" value={h.totals.claimed} />
        <Stat label="Hidden" value={h.totals.hidden} />
        <Stat label="Owner contacts (opt-in)" value={h.totals.contacts} />
      </div>

      <Panel title="Merge queue" note="Near-duplicates students said were different. Merge points every foreign key at the kept hostel.">
        {h.queue.length === 0 ? (
          <p className="text-sm text-ink-soft">Nothing to review.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {h.queue.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream p-3 ring-1 ring-line">
                <span className="text-sm">
                  <strong>{m.a_name}</strong> ({m.a_area}) ↔ <strong>{m.b_name}</strong> ({m.b_area}) · similarity {Number(m.similarity).toFixed(2)}
                </span>
                <span className="flex gap-2">
                  <AdminAction action="merge" body={{ sourceId: m.a_id, targetId: m.b_id }} confirm={`Merge “${m.a_name}” into “${m.b_name}”?`}>
                    Merge new → existing
                  </AdminAction>
                  <AdminAction action="dismiss" body={{ id: m.id }}>
                    Different hostels
                  </AdminAction>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Flagged entries" note="Auto-hidden at 5 flags unless verified.">
        {h.flagged.length === 0 ? (
          <p className="text-sm text-ink-soft">No flags.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {h.flagged.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {f.name} ({f.area}) · {f.flags} flags {f.hidden && '· hidden'}
                </span>
                <AdminAction action="hostel-visibility" body={{ id: f.id, hidden: !f.hidden }}>
                  {f.hidden ? 'Unhide' : 'Hide'}
                </AdminAction>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Recently added">
        <ul className="flex flex-col gap-2">
          {h.recent.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {r.name} · {r.area}, {r.city} · <em>{r.status}</em>
              </span>
              {r.status === 'user_added' && (
                <AdminAction action="hostel-status" body={{ id: r.id, status: 'verified' }}>
                  Mark verified
                </AdminAction>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Owner contact opt-ins by hostel" note="Numbers are encrypted at rest and never shown here. Export requires a separate, audited admin step (not built in v1).">
        {h.contactsByHostel.length === 0 ? (
          <p className="text-sm text-ink-soft">None yet.</p>
        ) : (
          <ul className="text-sm">
            {h.contactsByHostel.map((c) => (
              <li key={c.name}>
                {c.name}: {c.n}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Link href="/leaderboard" className="text-sm font-bold text-terracotta underline">
        Public Face-off →
      </Link>
    </AdminShell>
  );
}
