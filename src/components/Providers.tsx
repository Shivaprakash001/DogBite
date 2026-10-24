'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { LocaleProvider } from '@/hooks/useCopy';
import { SoundProvider } from '@/hooks/useSound';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <SoundProvider>
        <ToastProvider>{children}</ToastProvider>
      </SoundProvider>
    </LocaleProvider>
  );
}
