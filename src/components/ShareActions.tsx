'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useCopy } from '@/hooks/useCopy';
import { useSound } from '@/hooks/useSound';
import { api } from '@/lib/api-client';

// Copy link, WhatsApp, native share sheet, and "save image" for Stories (§14).

type Channel = 'copy' | 'whatsapp' | 'native' | 'story';

interface ShareActionsProps {
  url: string;
  caption: string;
  title: string;
  quizSlug?: string | null;
  hostelId?: string | null;
  storyImageUrl?: string;
  storyFileName?: string;
}

export function ShareActions({ url, caption, title, quizSlug = null, hostelId = null, storyImageUrl, storyFileName = 'roomie-quiz.png' }: ShareActionsProps) {
  const copy = useCopy();
  const toast = useToast();
  const sound = useSound();
  const [savingImage, setSavingImage] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection must wait for the browser
    setCanNativeShare('share' in navigator);
  }, []);

  const log = (channel: Channel) => {
    sound.play('share');
    void api.post('/api/shares', { channel, quizSlug, hostelId }).catch(() => undefined);
  };

  async function copyLink() {
    log('copy');
    try {
      await navigator.clipboard.writeText(url);
      toast(copy.common.copied, 'success');
    } catch {
      window.prompt(copy.common.copy, url);
    }
  }

  async function nativeShare() {
    log('native');
    try {
      await navigator.share({ title, text: caption, url });
    } catch {
      /* user cancelled */
    }
  }

  async function saveStory() {
    if (!storyImageUrl) return;
    log('story');
    setSavingImage(true);
    try {
      const blob = await (await fetch(storyImageUrl)).blob();
      const file = new File([blob], storyFileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text: caption }).catch(() => undefined);
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = storyFileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
    } catch {
      toast(copy.common.error, 'error');
    } finally {
      setSavingImage(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(caption)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => log('whatsapp')}
        className="relative inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-chunky bg-[#1f8f4e] px-6 py-4 font-display text-lg font-extrabold text-white shadow-[0_5px_0_0_#156b39] transition active:translate-y-[5px] active:shadow-none"
      >
        <span aria-hidden>💬</span> {copy.done.whatsapp}
      </a>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={copyLink}>
          🔗 {copy.common.copy}
        </Button>
        {canNativeShare ? (
          <Button variant="secondary" onClick={nativeShare}>
            📤 {copy.done.share}
          </Button>
        ) : (
          storyImageUrl && (
            <Button variant="secondary" onClick={saveStory} disabled={savingImage}>
              📸 {copy.done.story}
            </Button>
          )
        )}
      </div>
      {canNativeShare && storyImageUrl && (
        <Button variant="secondary" onClick={saveStory} disabled={savingImage}>
          📸 {copy.done.story}
        </Button>
      )}
    </div>
  );
}
