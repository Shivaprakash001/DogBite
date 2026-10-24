'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Mascot } from '@/components/ui/Mascot';
import { useToast } from '@/components/ui/Toast';
import { useCopy } from '@/hooks/useCopy';
import { api } from '@/lib/api-client';

// One friendly screen: what we collect + "are you 18+?" (§13). Shown once,
// right before the first data submission, never before the Start CTA.

export function ConsentGate({ onAccepted }: { onAccepted: () => void }) {
  const copy = useCopy();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [minor, setMinor] = useState(false);

  async function answer(adult: boolean) {
    setBusy(true);
    try {
      await api.post('/api/session/consent', { adult });
      if (adult) onAccepted();
      else setMinor(true);
    } catch {
      toast(copy.common.error, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (minor) return <MinorNotice />;

  return (
    <section className="flex flex-1 flex-col items-center gap-5 pt-4" aria-labelledby="gate-title">
      <Mascot mood="waving" size={140} priority />
      <Card className="w-full">
        <h1 id="gate-title" className="text-2xl font-extrabold">
          {copy.gate.title}
        </h1>
        <p className="text-ink-soft mt-2 text-[0.95rem] leading-relaxed">{copy.gate.body}</p>
        <Link href="/privacy" className="text-terracotta mt-2 inline-block min-h-11 py-2 text-sm font-semibold underline underline-offset-4">
          {copy.gate.privacyLink}
        </Link>
        <p className="font-display mt-3 text-lg font-extrabold">{copy.gate.ageQuestion}</p>
        <div className="mt-4 flex flex-col gap-3">
          <Button size="lg" onClick={() => answer(true)} disabled={busy}>
            {copy.gate.yes}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => answer(false)} disabled={busy}>
            {copy.gate.no}
          </Button>
        </div>
      </Card>
    </section>
  );
}

export function MinorNotice() {
  const copy = useCopy();
  return (
    <section className="flex flex-1 flex-col items-center gap-5 pt-6 text-center">
      <Mascot mood="sleepy" size={150} />
      <Card className="w-full">
        <h1 className="text-2xl font-extrabold">{copy.gate.minorTitle}</h1>
        <p className="text-ink-soft mt-2">{copy.gate.minorBody}</p>
      </Card>
    </section>
  );
}
