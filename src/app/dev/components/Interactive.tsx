'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PhotoCard, type PhotoCardState } from '@/components/ui/PhotoCard';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';

export function SheetAndToastDemo() {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open sheet
      </Button>
      <Button variant="secondary" onClick={() => toast('Info toast')}>
        Toast
      </Button>
      <Button variant="secondary" onClick={() => toast('Saved!', 'success')}>
        Success
      </Button>
      <Button variant="secondary" onClick={() => toast('Something broke', 'error')}>
        Error
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Bottom sheet">
        <p className="text-ink-soft">Native &lt;dialog&gt;: focus trap, Esc and backdrop close.</p>
      </Sheet>
    </div>
  );
}

export function PhotoCardStates() {
  const states: PhotoCardState[] = ['idle', 'selected', 'correct', 'wrong', 'dimmed'];
  return (
    <div className="grid grid-cols-2 gap-3">
      {states.map((s, i) => (
        <div key={s} className="flex flex-col gap-1">
          <PhotoCard label={`Chai first (${s})`} emoji="☕" state={s} tint={i} />
        </div>
      ))}
    </div>
  );
}
