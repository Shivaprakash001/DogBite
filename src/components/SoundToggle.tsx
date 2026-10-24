'use client';

import { useCopy } from '@/hooks/useCopy';
import { useSound } from '@/hooks/useSound';
import { track } from '@/lib/events';

export function SoundToggle() {
  const { enabled, setEnabled } = useSound();
  const copy = useCopy();
  return (
    <button
      type="button"
      onClick={() => {
        setEnabled(!enabled);
        track('sound_toggle', { on: !enabled });
      }}
      aria-pressed={enabled}
      aria-label={enabled ? copy.common.soundOn : copy.common.soundOff}
      className="flex size-11 items-center justify-center rounded-full bg-paper text-lg ring-2 ring-line"
    >
      <span aria-hidden>{enabled ? '🔊' : '🔇'}</span>
    </button>
  );
}
