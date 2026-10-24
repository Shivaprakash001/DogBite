'use client';

import Link from 'next/link';
import { useEffect, useRef, type ComponentProps } from 'react';
import type { EventName, EventProps } from '@/lib/event-types';
import { track } from '@/lib/events';

/** Fires one analytics event when mounted. Renders nothing. */
export function TrackView<N extends EventName>({ name, props }: { name: N; props: EventProps[N] }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(name, props);
  }, [name, props]);
  return null;
}

/** Landing view with utm, plus share_open when the visitor arrived through a share link. */
export function TrackArrival({ page, quizSlug = null }: { page: 'landing' | 'quiz'; quizSlug?: string | null }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const params = new URLSearchParams(window.location.search);
    if (page === 'landing') track('landing_view', { utm: params.get('utm_source') });
    if (params.get('ref')) track('share_open', { quiz_slug: quizSlug });
  }, [page, quizSlug]);
  return null;
}

type TrackedLinkProps<N extends EventName> = ComponentProps<typeof Link> & { event: N; eventProps: EventProps[N] };

export function TrackedLink<N extends EventName>({ event, eventProps, onClick, ...rest }: TrackedLinkProps<N>) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        track(event, eventProps);
        onClick?.(e);
      }}
    />
  );
}
