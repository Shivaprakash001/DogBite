import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

// Chunky, tactile buttons: a solid bottom edge that the face presses into.

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost';
export type ButtonSize = 'md' | 'lg';

const base =
  'relative inline-flex select-none items-center justify-center gap-2 rounded-chunky font-display font-extrabold transition-[transform,box-shadow,background-color] duration-100 disabled:cursor-not-allowed disabled:opacity-50 min-h-11';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-terracotta text-white shadow-chunky hover:bg-clay active:translate-y-[5px] active:shadow-none disabled:active:translate-y-0 disabled:active:shadow-chunky',
  secondary: 'bg-paper text-charcoal ring-2 ring-line shadow-chunky-light hover:bg-white active:translate-y-[5px] active:shadow-none',
  accent: 'bg-marigold text-charcoal shadow-chunky-marigold hover:brightness-105 active:translate-y-[5px] active:shadow-none',
  ghost: 'bg-transparent text-terracotta underline-offset-4 hover:underline min-h-11',
};

const sizes: Record<ButtonSize, string> = {
  md: 'px-5 py-2.5 text-base',
  lg: 'w-full px-6 py-4 text-lg',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = ''): string {
  return `${base} ${variants[variant]} ${variant === 'ghost' ? 'px-3 py-2 text-base' : sizes[size]} ${extra}`;
}

type ButtonProps = ComponentProps<'button'> & { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode };

export function Button({ variant = 'primary', size = 'md', icon, className = '', children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode };

export function ButtonLink({ variant = 'primary', size = 'md', icon, className = '', children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
