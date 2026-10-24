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
      className="bg-paper ring-line flex size-11 items-center justify-center rounded-full text-lg ring-2"
    >
      <span aria-hidden>{enabled ? '🔊' : '🔇'}</span>
    </button>
  );
}
