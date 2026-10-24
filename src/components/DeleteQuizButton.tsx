'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useCopy } from '@/hooks/useCopy';
import { api } from '@/lib/api-client';

export function DeleteQuizButton({ slug, after = 'home' }: { slug: string; after?: 'home' | 'refresh' }) {
  const copy = useCopy();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="text-wrong mx-auto min-h-11 px-4 text-sm font-semibold underline underline-offset-4"
      onClick={async () => {
        if (!window.confirm(copy.done.deleteConfirm)) return;
        setBusy(true);
        try {
          await api.del(`/api/quizzes/${slug}`);
          toast(copy.done.deleted, 'success');
          if (after === 'refresh') router.refresh();
          else router.push('/');
        } catch {
          toast(copy.common.error, 'error');
          setBusy(false);
        }
      }}
    >
      {copy.done.deleteQuiz}
    </button>
  );
}
