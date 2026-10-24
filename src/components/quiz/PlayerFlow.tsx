'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ConsentGate, MinorNotice } from '@/components/flow/ConsentGate';
import { HostelPicker } from '@/components/flow/HostelPicker';
import { NameStep } from '@/components/flow/NameStep';
import { Mascot } from '@/components/ui/Mascot';
import { ProgressPills, type PillState } from '@/components/ui/ProgressPills';
import { useToast } from '@/components/ui/Toast';
import { TIMING } from '@/config';
import { fmt } from '@/content/copy';
import type { Gender } from '@/content/types';
import { useCopy } from '@/hooks/useCopy';
import { useSound } from '@/hooks/useSound';
import { ApiClientError, api } from '@/lib/api-client';
import type { AnswerResultDTO, AttemptStartDTO, FinishDTO, HostelDTO } from '@/lib/api-types';
import { emitUiEvent, flush, track } from '@/lib/events';
import { QuestionCard } from './QuestionCard';
import { RevealStage } from './RevealStage';

// Player flow (§6.2): name → hostel → 10 questions → suspense → result.
// No back navigation once answered; refresh resumes the same attempt.

interface PlayerFlowProps {
  slug: string;
  creatorName: string;
  creatorGender: Gender | null;
  consented: boolean;
  minor: boolean;
  resumeAttemptId: string | null;
}

type Step = 'name' | 'hostel' | 'starting' | 'quiz' | 'reveal';

export function PlayerFlow({ slug, creatorName, creatorGender, consented: initialConsent, minor, resumeAttemptId }: PlayerFlowProps) {
  const copy = useCopy();
  const toast = useToast();
  const sound = useSound();
  const router = useRouter();

  const [consented, setConsented] = useState(initialConsent);
  const [step, setStep] = useState<Step>(resumeAttemptId ? 'starting' : 'name');
  const [playerName, setPlayerName] = useState('');
  const [attempt, setAttempt] = useState<AttemptStartDTO | null>(null);
  const [results, setResults] = useState<Map<number, AnswerResultDTO>>(new Map());
  const [current, setCurrent] = useState(0);
  const [pending, setPending] = useState<number | null>(null);
  const [finish, setFinish] = useState<FinishDTO | null>(null);
  const shownAt = useRef(0);

  const loadAttempt = useCallback((a: AttemptStartDTO) => {
    const map = new Map(a.answered.map((r) => [r.quizQuestionId, r]));
    setAttempt(a);
    setResults(map);
    const firstOpen = a.questions.findIndex((q) => !map.has(q.quizQuestionId));
    setCurrent(firstOpen === -1 ? a.questions.length : firstOpen);
    setStep(firstOpen === -1 ? 'reveal' : 'quiz');
  }, []);

  // Resume an unfinished attempt after a refresh.
  useEffect(() => {
    if (!resumeAttemptId || !consented) return;
    api
      .get<AttemptStartDTO>(`/api/attempts/${resumeAttemptId}`)
      .then(loadAttempt)
      .catch(() => setStep('name'));
  }, [resumeAttemptId, consented, loadAttempt]);

  async function start(hostel: HostelDTO | null) {
    setStep('starting');
    try {
      loadAttempt(await api.post<AttemptStartDTO>('/api/attempts', { slug, playerName, hostelId: hostel?.id ?? null, hostelSkipped: !hostel }));
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : '';
      if (code === 'no_retries' || code === 'own_quiz') {
        toast(code === 'no_retries' ? copy.play.noRetries : copy.quizLanding.ownQuiz);
        router.replace(`/q/${slug}`);
        return;
      }
      toast(code === 'network' ? copy.common.offline : copy.common.error, 'error');
      setStep('hostel');
    }
  }

  const question = attempt?.questions[current];

  // question_view + timing start.
  useEffect(() => {
    if (step !== 'quiz' || !question || !attempt) return;
    shownAt.current = Date.now();
    track('question_view', { quiz_id: attempt.quizId, question_key: question.key, position: question.position });
  }, [step, question, attempt]);

  // Abandon signal if the player leaves mid-quiz.
  useEffect(() => {
    if (step !== 'quiz' || !attempt) return;
    const onHide = () => {
      track('quiz_abandon', { last_position: current, quiz_id: attempt.quizId });
      flush(true);
    };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [step, attempt, current]);

  async function guess(optionId: number) {
    if (!attempt || !question || pending !== null) return;
    setPending(optionId);
    sound.play('tap');
    try {
      const r = await api.post<AnswerResultDTO>(`/api/attempts/${attempt.attemptId}/answer`, {
        quizQuestionId: question.quizQuestionId,
        optionId,
        ms: Date.now() - shownAt.current,
      });
      setResults((m) => new Map(m).set(r.quizQuestionId, r));
      emitUiEvent(r.correct ? 'answer.correct' : 'answer.wrong', { position: question.position });
      sound.play(r.correct ? 'correct' : 'wrong');
      setTimeout(() => {
        setPending(null);
        const next = current + 1;
        setCurrent(next);
        if (next >= attempt.questions.length) setStep('reveal');
      }, TIMING.answerFeedbackMs);
    } catch (err) {
      setPending(null);
      toast(err instanceof ApiClientError && err.code === 'network' ? copy.common.offline : copy.common.error, 'error');
    }
  }

  // Finalise once every question is answered (also covers a resumed, fully answered attempt).
  const finishing = useRef(false);
  useEffect(() => {
    if (step !== 'reveal' || !attempt || finishing.current) return;
    finishing.current = true;
    void (async () => {
      for (let i = 0; i < 4; i++) {
        try {
          setFinish(await api.post<FinishDTO>(`/api/attempts/${attempt.attemptId}/finish`));
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 800 * (i + 1)));
        }
      }
      toast(copy.common.offline, 'error');
      finishing.current = false;
    })();
  }, [step, attempt, toast, copy.common.offline]);

  // Preload the next question's photos so it appears instantly.
  useEffect(() => {
    const next = attempt?.questions[current + 1];
    next?.options.forEach((o) => {
      if (o.image) new window.Image().src = `/questions/${o.image}`;
    });
  }, [attempt, current]);

  const goToResult = useCallback(() => {
    if (finish) router.replace(finish.resultPath);
  }, [finish, router]);

  if (minor) return <MinorNotice />;
  if (!consented) return <ConsentGate onAccepted={() => setConsented(true)} />;

  if (step === 'name') {
    return (
      <NameStep
        title={copy.name.titlePlayer}
        hint={fmt(copy.name.hintPlayer, { creator: creatorName })}
        top={<Mascot mood="thinking" gender={creatorGender} size={110} className="mx-auto" priority />}
        onSubmit={(name) => {
          track('name_submit', { length: [...name].length, flow: 'player' });
          setPlayerName(name);
          setStep('hostel');
        }}
      />
    );
  }
  if (step === 'hostel') return <HostelPicker onDone={(h) => void start(h)} />;
  if (step === 'starting' || !attempt) {
    return (
      <div className="flex flex-1 items-center justify-center" aria-busy="true">
        <Mascot mood="thinking" gender={creatorGender} size={140} />
      </div>
    );
  }
  if (step === 'reveal') {
    return <RevealStage seed={attempt.attemptId} creatorGender={creatorGender} score={finish?.score ?? null} onResult={goToResult} />;
  }

  const pills: PillState[] = attempt.questions.map((q, i) => {
    const r = results.get(q.quizQuestionId);
    if (r) return r.correct ? 'correct' : 'wrong';
    return i === current ? 'current' : 'upcoming';
  });

  return (
    <section className="flex flex-1 flex-col gap-6 pt-1">
      <ProgressPills states={pills} />
      <div className="flex items-center gap-3">
        <Mascot
          mood={
            pending !== null && question && results.get(question.quizQuestionId)
              ? results.get(question.quizQuestionId)!.correct
                ? 'happy'
                : 'sad'
              : 'thinking'
          }
          gender={creatorGender}
          size={64}
          decorative
        />
        <p className="font-display text-ink-soft text-sm font-bold">{fmt(copy.play.questionOf, { n: current + 1 })}</p>
      </div>
      {question && <QuestionCard question={question} result={results.get(question.quizQuestionId) ?? null} pendingOptionId={pending} onGuess={guess} />}
      <p className="sr-only" aria-live="assertive">
        {question && results.get(question.quizQuestionId) ? (results.get(question.quizQuestionId)!.correct ? copy.play.correct : copy.play.wrong) : ''}
      </p>
    </section>
  );
}
