'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ConsentGate, MinorNotice } from '@/components/flow/ConsentGate';
import { HostelPicker } from '@/components/flow/HostelPicker';
import { NameStep } from '@/components/flow/NameStep';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Character } from '@/components/ui/Character';
import { Mascot } from '@/components/ui/Mascot';
import { useToast } from '@/components/ui/Toast';
import { QUIZ } from '@/config';
import { fmt } from '@/content/copy';
import { useCopy } from '@/hooks/useCopy';
import { ApiClientError, api } from '@/lib/api-client';
import type { DraftState, HostelDTO } from '@/lib/api-types';
import { track } from '@/lib/events';
import { AnswerStep } from './AnswerStep';
import { CharacterPicker } from './CharacterPicker';
import { PickerList } from './PickerList';

// Creator flow driver. The server owns the state; every step is one POST that
// returns the next DraftState, so refresh / return visits resume seamlessly.

interface CreatorFlowProps {
  initial: DraftState;
  consented: boolean;
  minor: boolean;
  suggestedHostel?: HostelDTO | null;
}

export function CreatorFlow({ initial, consented: initialConsent, minor, suggestedHostel = null }: CreatorFlowProps) {
  const copy = useCopy();
  const toast = useToast();
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [consented, setConsented] = useState(initialConsent);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const announced = useRef(false);

  useEffect(() => {
    if (announced.current) return;
    announced.current = true;
    const resumed = initial.step !== 'name';
    track('create_start', { resumed });
    if (resumed) toast(copy.creator.resumeToast);
  }, [initial.step, toast, copy.creator.resumeToast]);

  async function call(action: string, body: unknown = {}) {
    setBusy(true);
    try {
      const next = await api.post<DraftState>(`/api/create/${action}`, body);
      setState(next);
      window.scrollTo({ top: 0 });
      return next;
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'unknown';
      if (code === 'research_cap') toast(copy.creator.researchCap, 'error');
      else if (code === 'no_replacement') toast(copy.common.error, 'error');
      else if (code === 'rate_limited') toast(err instanceof Error ? err.message : copy.common.error, 'error');
      else if (code === 'network') toast(copy.common.offline, 'error');
      else toast(copy.common.error, 'error');
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (minor) return <MinorNotice />;
  if (!consented) return <ConsentGate onAccepted={() => setConsented(true)} />;

  switch (state.step) {
    case 'name':
      return (
        <NameStep
          title={copy.name.titleCreator}
          hint={copy.name.hintCreator}
          initial={state.name ?? state.suggestedName}
          busy={busy}
          top={
            <div className="flex items-end justify-center">
              <Character avatar="girl" mood="waving" size={104} />
              <Character avatar="boy" mood="happy" size={104} className="-ml-6" />
            </div>
          }
          onSubmit={(name) => {
            track('name_submit', { length: [...name].length, flow: 'creator' });
            void call('start', { name });
          }}
        />
      );
    case 'character':
      return <CharacterPicker name={state.name ?? ''} busy={busy} onPick={(avatar, gender) => void call('character', { avatar, gender })} />;
    case 'hostel':
      return <HostelPicker busy={busy} suggested={suggestedHostel} onDone={(h) => void call('hostel', { hostelId: h?.id ?? null })} />;
    case 'pick':
      return (
        <PickerList
          candidates={state.candidates}
          picked={picked.filter((k) => state.candidates.some((c) => c.key === k))}
          onChange={setPicked}
          shufflesLeft={state.shufflesLeft}
          busy={busy}
          onShuffle={() => void call('shuffle', { keep: picked })}
          onDone={() => void call('picks', { keys: picked.slice(0, QUIZ.questionsPerQuiz) })}
        />
      );
    case 'answer':
      return state.answering ? (
        <AnswerStep
          question={state.answering}
          answered={state.answeredCount}
          total={QUIZ.questionsPerQuiz}
          busy={busy}
          onAnswer={(optionId, ms) => void call('answer', { quizQuestionId: state.answering!.quizQuestionId, optionId, ms })}
          onSkip={() => void call('skip', { quizQuestionId: state.answering!.quizQuestionId })}
        />
      ) : null;
    case 'publish':
      return (
        <section className="flex flex-1 flex-col items-center gap-5 pt-6 text-center">
          <div className="flex items-end justify-center">
            <Character avatar={state.avatar ?? 'boy'} mood="celebrating" size={170} label={state.name ?? undefined} />
            <Mascot mood="love" size={140} className="-ml-6" />
          </div>
          <Card className="w-full">
            <h1 className="text-2xl font-extrabold">{copy.creator.readyTitle}</h1>
            <p className="font-display text-terracotta mt-3 font-extrabold">{fmt(copy.dog.intro, { dog: copy.dog.name })}</p>
            <p className="text-ink-soft mt-1">{fmt(copy.dog.introSub, { dog: copy.dog.name })}</p>
          </Card>
          <Button
            size="lg"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const { slug } = await api.post<{ slug: string }>('/api/create/publish');
                router.push(`/create/done/${slug}`);
              } catch {
                toast(copy.common.error, 'error');
                setBusy(false);
              }
            }}
          >
            {busy ? copy.creator.publishing : copy.creator.publish}
          </Button>
        </section>
      );
  }
}
