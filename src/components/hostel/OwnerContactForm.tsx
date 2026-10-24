'use client';

import { useId, useState } from 'react';
import { ConsentGate } from '@/components/flow/ConsentGate';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { useCopy } from '@/hooks/useCopy';
import { ApiClientError, api } from '@/lib/api-client';

// Optional, student-initiated owner/warden contact (§11.3). The UI says plainly
// what the number is used for. Stored encrypted; never shown publicly.

const RELATIONS = ['owner', 'warden', 'manager', 'unknown'] as const;

export function OwnerContactForm({ hostelId, consented: initialConsent }: { hostelId: string; consented: boolean }) {
  const copy = useCopy();
  const toast = useToast();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [consented, setConsented] = useState(initialConsent);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState<(typeof RELATIONS)[number]>('owner');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mx-auto min-h-11 px-4 font-display font-bold text-terracotta underline underline-offset-4">
        📇 {copy.report.contactTitle}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={copy.report.contactTitle} closeLabel={copy.common.close}>
        {!consented ? (
          <ConsentGate onAccepted={() => setConsented(true)} />
        ) : done ? (
          <p className="py-6 text-center font-display text-lg font-extrabold text-correct" role="status">
            {copy.report.contactDone}
          </p>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api.post(`/api/hostels/${hostelId}/contact`, { name: name.trim() || null, phone, relation, consent: true });
                setDone(true);
              } catch (err) {
                toast(err instanceof ApiClientError && err.code === 'invalid_phone' ? copy.report.contactPhone : copy.common.error, 'error');
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="text-sm leading-relaxed text-ink-soft">{copy.report.contactBody}</p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-phone`} className="font-display font-bold">
                {copy.report.contactPhone}
              </label>
              <input
                id={`${id}-phone`}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                required
                pattern="[+0-9 ]{10,16}"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98xxxxxx10"
                className="h-12 rounded-xl bg-paper px-4 font-semibold ring-2 ring-line outline-none focus:ring-4 focus:ring-terracotta"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-name`} className="font-display font-bold">
                {copy.report.contactName}
              </label>
              <input id={`${id}-name`} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className="h-12 rounded-xl bg-paper px-4 font-semibold ring-2 ring-line outline-none focus:ring-4 focus:ring-terracotta" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-rel`} className="font-display font-bold">
                {copy.report.contactRelation}
              </label>
              <select id={`${id}-rel`} value={relation} onChange={(e) => setRelation(e.target.value as (typeof RELATIONS)[number])} className="h-12 rounded-xl bg-paper px-4 font-semibold ring-2 ring-line">
                {RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {copy.report.relations[r]}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-5 accent-terracotta" />
              <span>{copy.report.contactConsent}</span>
            </label>
            <Button type="submit" size="lg" disabled={busy || !agree}>
              {copy.report.contactSubmit}
            </Button>
          </form>
        )}
      </Sheet>
    </>
  );
}
