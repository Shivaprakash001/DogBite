'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// Sound hook point (§10). Audio is deferred: play() is a no-op today. The registry
// and the on/off preference exist so a sound layer can plug in without refactors.
// Sound is OFF by default until the user opts in.

export const SOUND_KEYS = ['tap', 'correct', 'wrong', 'suspense', 'reveal.low', 'reveal.mid', 'reveal.high', 'share'] as const;
export type SoundKey = (typeof SOUND_KEYS)[number];

interface SoundApi {
  enabled: boolean;
  setEnabled: (on: boolean) => void;
  play: (key: SoundKey) => void;
  mute: () => void;
}

const SoundContext = createContext<SoundApi | null>(null);
const STORAGE_KEY = 'sq_sound';

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate a per-device preference after mount
      if (localStorage.getItem(STORAGE_KEY) === '1') setEnabledState(true);
    } catch {
      /* storage blocked: stay muted */
    }
  }, []);

  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on);
    try {
      localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const play = useCallback(
    (key: SoundKey) => {
      if (!enabled) return;
      // TODO(sound): look up `key` in a sound registry and play it. Intentionally a no-op for now.
      void key;
    },
    [enabled],
  );

  const api = useMemo<SoundApi>(() => ({ enabled, setEnabled, play, mute: () => setEnabled(false) }), [enabled, setEnabled, play]);
  return <SoundContext.Provider value={api}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundApi {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used inside <SoundProvider>');
  return ctx;
}
