'use client';

import { useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { QUIZ } from '@/config';
import { useCopy } from '@/hooks/useCopy';
import { validateDisplayName, type NameError } from '@/lib/moderation';

interface NameStepProps {
  title: string;
  hint: string;
  initial?: string | null;
  busy?: boolean;
  onSubmit: (name: string) => void;
  top?: ReactNode;
  /** Extra fields shown under the name (e.g. the player's character). */
  extra?: ReactNode;
  /** Extra condition for enabling Continue. */
  ready?: boolean;
}

export function NameStep({ title, hint, initial, busy, onSubmit, top, extra, ready = true }: NameStepProps) {
  const copy = useCopy();
  const id = useId();
  const [value, setValue] = useState(initial ?? '');
  const [error, setError] = useState<NameError | null>(null);
  const length = [...value].length;

  const messages: Record<NameError, string> = {
    empty: copy.name.errorEmpty,
    emoji: copy.name.errorEmoji,
    profane: copy.name.errorProfane,
    long: copy.name.errorEmpty,
  };

  return (
    <form
      className="flex flex-1 flex-col gap-5 pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        const v = validateDisplayName(value);
        if (!v.ok) return setError(v.error);
        onSubmit(v.value);
      }}
    >
      {top}
      <div>
        <label htmlFor={id} className="font-display block text-3xl font-extrabold">
          {title}
        </label>
        <p className="text-ink-soft mt-1" id={`${id}-hint`}>
          {hint}
        </p>
      </div>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e) => {
            const next = [...e.target.value].slice(0, QUIZ.nameMaxLength).join('');
            setValue(next);
            setError(null);
          }}
          autoComplete="nickname"
          autoCapitalize="words"
          enterKeyHint="go"
          placeholder={copy.name.placeholder}
          aria-describedby={`${id}-hint ${id}-count${error ? ` ${id}-err` : ''}`}
          aria-invalid={!!error}
          className="bg-paper font-display ring-line placeholder:text-ink-soft/50 focus:ring-terracotta h-16 w-full rounded-2xl px-5 pr-16 text-2xl font-bold ring-2 outline-none focus:ring-4"
        />
        <span
          id={`${id}-count`}
          className="font-display text-ink-soft absolute top-1/2 right-4 -translate-y-1/2 text-sm font-bold tabular-nums"
          aria-live="polite"
        >
          {length}/{QUIZ.nameMaxLength}
        </span>
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="text-wrong -mt-2 font-semibold">
          {messages[error]}
        </p>
      )}
      {extra}
      <div className="mt-auto">
        <Button type="submit" size="lg" disabled={busy || length === 0 || !ready}>
          {copy.name.cta}
        </Button>
      </div>
    </form>
  );
}
