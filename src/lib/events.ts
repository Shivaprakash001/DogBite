'use client';

import type { ClientEvent, EventName, EventProps } from './event-types';

// Browser event client: batched, fire-and-forget, flushed with sendBeacon when the
// page is hidden. Never blocks the UI and swallows every failure.

const ENDPOINT = '/api/events';
const FLUSH_MS = 2000;
const MAX_BATCH = 25;

let queue: ClientEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

/** UI-level pub/sub so an animation/sound layer can react later (see docs/animation-hooks.md). */
type UiEvent = 'answer.correct' | 'answer.wrong' | 'reveal.stage' | 'tap';
const uiListeners = new Map<UiEvent, Set<(detail?: unknown) => void>>();

export function onUiEvent(name: UiEvent, fn: (detail?: unknown) => void): () => void {
  if (!uiListeners.has(name)) uiListeners.set(name, new Set());
  uiListeners.get(name)!.add(fn);
  return () => uiListeners.get(name)?.delete(fn);
}

export function emitUiEvent(name: UiEvent, detail?: unknown): void {
  uiListeners.get(name)?.forEach((fn) => {
    try {
      fn(detail);
    } catch {
      /* a listener must never break the game */
    }
  });
}

function currentRef(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('ref');
  } catch {
    return null;
  }
}

export function track<N extends EventName>(name: N, props: EventProps[N]): void {
  if (typeof window === 'undefined') return;
  queue.push({
    name,
    props: props as ClientEvent['props'],
    ts: Date.now(),
    page: window.location.pathname,
    ref: currentRef(),
  });
  ensureListeners();
  if (queue.length >= MAX_BATCH) flush();
  else if (!timer) timer = setTimeout(flush, FLUSH_MS);
}

export function flush(useBeacon = false): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;
  const batch = queue.splice(0, MAX_BATCH);
  const body = JSON.stringify({ events: batch });
  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    } else {
      void fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    /* analytics must never throw */
  }
  if (queue.length) timer = setTimeout(flush, FLUSH_MS);
}

function ensureListeners() {
  if (listening) return;
  listening = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
  window.addEventListener('pagehide', () => flush(true));
}
