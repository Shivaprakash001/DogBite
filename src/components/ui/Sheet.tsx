'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// Bottom sheet built on <dialog>: native focus trap, Esc to close, backdrop click closes.

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeLabel?: string;
}

export function Sheet({ open, onClose, title, children, closeLabel = 'Close' }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:backdrop-blur-[1px] sm:mx-auto sm:max-w-[440px]"
    >
      <div className="mx-auto max-h-[85dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[1.75rem] bg-cream px-5 pt-3 pb-8 shadow-soft">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" aria-hidden />
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-paper text-xl ring-2 ring-line" aria-label={closeLabel}>
            <span aria-hidden>×</span>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
