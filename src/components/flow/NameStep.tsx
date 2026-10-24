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
}

export function NameStep({ title, hint, initial, busy, onSubmit, top }: NameStepProps) {
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
        <label htmlFor={id} className="block font-display text-3xl font-extrabold">
          {title}
        </label>
        <p className="mt-1 text-ink-soft" id={`${id}-hint`}>
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
          className="h-16 w-full rounded-2xl bg-paper px-5 pr-16 font-display text-2xl font-bold ring-2 ring-line outline-none placeholder:text-ink-soft/50 focus:ring-4 focus:ring-terracotta"
        />
        <span id={`${id}-count`} className="absolute top-1/2 right-4 -translate-y-1/2 font-display text-sm font-bold text-ink-soft tabular-nums" aria-live="polite">
          {length}/{QUIZ.nameMaxLength}
        </span>
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="-mt-2 font-semibold text-wrong">
          {messages[error]}
        </p>
      )}
      <div className="mt-auto">
        <Button type="submit" size="lg" disabled={busy || length === 0}>
          {copy.name.cta}
        </Button>
      </div>
    </form>
  );
}
