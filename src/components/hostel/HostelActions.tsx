'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { fmt } from '@/content/copy';
import { useCopy } from '@/hooks/useCopy';
import { api } from '@/lib/api-client';
import { track } from '@/lib/events';

/**
 * "Send this to my owner/warden" (§11.3): the student sends it from their own
 * WhatsApp. Nothing is ever sent to owners automatically.
 */
export function SendToOwnerButton({
  hostelId,
  hostelName,
  reportUrl,
  variant = 'primary',
}: {
  hostelId: string;
  hostelName: string;
  reportUrl: string;
  variant?: 'primary' | 'secondary';
}) {
  const copy = useCopy();
  const message = fmt(copy.hostelPage.sendOwnerMsg, { hostel: hostelName, url: reportUrl });
  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        track('report_send_owner_click', { hostel_id: hostelId });
        void api.post('/api/shares', { channel: 'owner_whatsapp', hostelId }).catch(() => undefined);
      }}
      className={
        variant === 'primary'
          ? 'rounded-chunky font-display inline-flex min-h-14 w-full items-center justify-center gap-2 bg-[#1f8f4e] px-6 py-4 text-lg font-extrabold text-white shadow-[0_5px_0_0_#156b39] transition active:translate-y-[5px] active:shadow-none'
          : 'rounded-chunky bg-paper font-display ring-line shadow-chunky-light inline-flex min-h-12 w-full items-center justify-center gap-2 px-5 py-3 font-extrabold ring-2 transition active:translate-y-[5px] active:shadow-none'
      }
    >
      <span aria-hidden>📨</span> {copy.hostelPage.sendOwner}
    </a>
  );
}

export function FlagHostelButton({ hostelId }: { hostelId: string }) {
  const copy = useCopy();
  const toast = useToast();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={done}
      onClick={async () => {
        try {
          await api.post(`/api/hostels/${hostelId}/flag`);
          setDone(true);
          toast(copy.hostelPage.flagged, 'success');
        } catch {
          toast(copy.common.error, 'error');
        }
      }}
      className="text-ink-soft mx-auto min-h-11 px-4 text-sm font-semibold underline underline-offset-4 disabled:no-underline"
    >
      🚩 {done ? copy.hostelPage.flagged : copy.hostelPage.flag}
    </button>
  );
}
