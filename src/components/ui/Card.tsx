import type { ComponentProps } from 'react';

// Notebook-paper card: rounded, soft shadow, dashed inner border.

type CardProps = ComponentProps<'div'> & { lined?: boolean; tone?: 'paper' | 'latte' | 'clay'; inset?: boolean };

const tones = {
  paper: 'bg-paper text-charcoal',
  latte: 'bg-latte text-charcoal',
  clay: 'bg-clay text-white',
};

export function Card({ lined = false, tone = 'paper', inset = true, className = '', children, ...rest }: CardProps) {
  return (
    <div className={`rounded-card shadow-card relative ${tones[tone]} ${className}`} {...rest}>
      {inset && (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-1.5 rounded-[1.2rem] border-2 border-dashed ${tone === 'clay' ? 'border-white/30' : 'border-line'}`}
        />
      )}
      <div className={`rounded-card relative p-5 ${lined ? 'paper-lined' : ''}`}>{children}</div>
    </div>
  );
}
