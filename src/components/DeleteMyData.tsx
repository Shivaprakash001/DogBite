'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useCopy } from '@/hooks/useCopy';
import { api } from '@/lib/api-client';
import { flush, track } from '@/lib/events';

export function DeleteMyData() {
  const copy = useCopy();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      size="lg"
      disabled={busy}
      className="text-wrong"
      onClick={async () => {
        if (!window.confirm(copy.privacy.deleteConfirm)) return;
        setBusy(true);
        track('data_delete', {});
        flush();
        try {
          await api.del('/api/me');
          toast(copy.privacy.deleted, 'success');
          router.push('/');
          router.refresh();
        } catch {
          toast(copy.common.error, 'error');
          setBusy(false);
        }
      }}
    >
      🗑️ {copy.privacy.deleteCta}
    </Button>
  );
}
