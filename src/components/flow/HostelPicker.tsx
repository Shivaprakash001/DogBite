'use client';

import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { fmt } from '@/content/copy';
import { CITIES, COLLEGES, DEFAULT_CITY } from '@/content/places';
import { useCopy } from '@/hooks/useCopy';
import { ApiClientError, api } from '@/lib/api-client';
import type { HostelDTO } from '@/lib/api-types';
import { track } from '@/lib/events';
import { msSince } from '@/lib/time';

// "Join your hostel's leaderboard" (§6.2). Framed as joining, not data entry.
// Skipping is allowed and is itself a signal.

interface HostelPickerProps {
  onDone: (hostel: HostelDTO | null) => void;
  busy?: boolean;
  /** Pre-suggested hostel (e.g. arriving from a hostel page). */
  suggested?: HostelDTO | null;
}

const TYPE_EMOJI: Record<HostelDTO['type'], string> = { boys: '👦', girls: '👧', coed: '🧑‍🤝‍🧑', unknown: '🏠' };

export function HostelPicker({ onDone, busy, suggested = null }: HostelPickerProps) {
  const copy = useCopy();
  const startedAt = useRef(0);
  const [city, setCity] = useState(DEFAULT_CITY);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HostelDTO[] | null>(null);
  const [adding, setAdding] = useState(false);
  const searchId = useId();

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/hostels?q=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { hostels: [] }))
        .then((d: { hostels: HostelDTO[] }) => setResults(d.hostels))
        .catch(() => undefined);
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, city]);

  function pick(h: HostelDTO) {
    track('hostel_pick', { hostel_id: h.id, search_len: query.length, time_ms: msSince(startedAt.current) });
    onDone(h);
  }

  return (
    <section className="flex flex-1 flex-col gap-4 pt-2" aria-labelledby={`${searchId}-title`}>
      <div>
        <h1 id={`${searchId}-title`} className="text-3xl font-extrabold">
          {copy.hostel.title}
        </h1>
        <p className="text-ink-soft mt-1">{copy.hostel.sub}</p>
      </div>

      {suggested && (
        <button
          type="button"
          onClick={() => pick(suggested)}
          disabled={busy}
          className="bg-latte ring-terracotta flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ring-4"
        >
          <span aria-hidden className="text-2xl">
            ⭐
          </span>
          <span className="min-w-0">
            <span className="text-terracotta block text-sm font-bold">{copy.hostel.suggested}</span>
            <span className="font-display block truncate font-extrabold">{suggested.name}</span>
            <span className="text-ink-soft block truncate text-sm">
              {suggested.area}, {suggested.city}
            </span>
          </span>
        </button>
      )}

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label={copy.hostel.cityLabel}>
        {Object.keys(CITIES).map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === city}
            onClick={() => setCity(c)}
            className={`font-display min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ring-2 ${c === city ? 'bg-charcoal ring-charcoal text-white' : 'bg-paper ring-line'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <label htmlFor={searchId} className="sr-only">
        {copy.hostel.searchPlaceholder}
      </label>
      <div className="relative">
        <span aria-hidden className="absolute top-1/2 left-4 -translate-y-1/2 text-lg">
          🔎
        </span>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 60))}
          placeholder={copy.hostel.searchPlaceholder}
          autoComplete="off"
          className="bg-paper font-display ring-line placeholder:text-ink-soft/60 focus:ring-terracotta h-14 w-full rounded-2xl pr-4 pl-12 text-lg font-bold ring-2 outline-none focus:ring-4"
        />
      </div>

      <ul className="flex flex-col gap-2" aria-live="polite" aria-busy={results === null}>
        {results === null && [0, 1, 2].map((i) => <li key={i} className="bg-latte/60 h-16 animate-pulse rounded-2xl" aria-hidden />)}
        {results?.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => pick(h)}
              disabled={busy}
              className="bg-paper ring-line enabled:hover:ring-terracotta flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ring-2 transition active:translate-y-0.5"
            >
              <span aria-hidden className="bg-latte flex size-10 shrink-0 items-center justify-center rounded-xl text-xl">
                {TYPE_EMOJI[h.type]}
              </span>
              <span className="min-w-0">
                <span className="font-display block truncate font-extrabold">{h.name}</span>
                <span className="text-ink-soft block truncate text-sm">
                  {h.area}, {h.city}
                </span>
              </span>
            </button>
          </li>
        ))}
        {results?.length === 0 && <li className="text-ink-soft py-2 text-center">{copy.hostel.noResults}</li>}
      </ul>

      <Button variant="secondary" size="lg" onClick={() => setAdding(true)} disabled={busy}>
        {copy.hostel.addCta}
      </Button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          track('hostel_skip', { search_len: query.length, time_ms: Date.now() - startedAt.current });
          onDone(null);
        }}
        className="font-display text-ink-soft mx-auto min-h-11 px-4 font-bold underline underline-offset-4"
      >
        {copy.hostel.skip}
      </button>

      <AddHostelSheet open={adding} onClose={() => setAdding(false)} city={city} initialName={query} startedAt={startedAt} onCreated={pick} />
    </section>
  );
}

function AddHostelSheet({
  open,
  onClose,
  city,
  initialName,
  startedAt,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  city: string;
  initialName: string;
  startedAt: RefObject<number>;
  onCreated: (h: HostelDTO) => void;
}) {
  const copy = useCopy();
  const toast = useToast();
  const id = useId();
  const [name, setName] = useState(initialName);
  const [area, setArea] = useState('');
  const [otherArea, setOtherArea] = useState('');
  const [type, setType] = useState<HostelDTO['type']>('boys');
  const [college, setCollege] = useState('');
  const [dups, setDups] = useState<HostelDTO[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the form each time the sheet opens
      setName(initialName);
      setDups(null);
    }
  }, [open, initialName]);

  const areas = CITIES[city] ?? [];
  const colleges = COLLEGES.filter((c) => c.city === city);
  const finalArea = area === '__other' ? otherArea.trim() : area;

  async function submit(confirmedDifferent: boolean) {
    setBusy(true);
    try {
      const res = await api.post<{ hostel: HostelDTO } | { duplicates: HostelDTO[] }>('/api/hostels', {
        name,
        city,
        area: finalArea,
        type,
        collegeName: college || null,
        confirmedDifferent,
        timeMs: Date.now() - startedAt.current,
      });
      if ('duplicates' in res) setDups(res.duplicates);
      else {
        onClose();
        onCreated(res.hostel);
      }
    } catch (err) {
      toast(err instanceof ApiClientError && err.code === 'invalid_name' ? copy.hostel.errorName : copy.common.error, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={dups ? copy.hostel.dupTitle : copy.hostel.addTitle} closeLabel={copy.common.close}>
      {dups ? (
        <div className="flex flex-col gap-3">
          <p className="text-ink-soft">{copy.hostel.dupSub}</p>
          {dups.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                onClose();
                onCreated(h);
              }}
              className="bg-paper ring-line hover:ring-terracotta min-h-14 rounded-2xl px-4 py-3 text-left ring-2"
            >
              <span className="font-display block font-extrabold">{h.name}</span>
              <span className="text-ink-soft block text-sm">
                {h.area}, {h.city}
              </span>
            </button>
          ))}
          <Button variant="secondary" size="lg" disabled={busy} onClick={() => submit(true)}>
            {copy.hostel.dupNone}
          </Button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(false);
          }}
        >
          <Field label={copy.hostel.addName} htmlFor={`${id}-name`}>
            <input id={`${id}-name`} required minLength={3} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </Field>
          <Field label={copy.hostel.addArea} htmlFor={`${id}-area`}>
            <select id={`${id}-area`} required value={area} onChange={(e) => setArea(e.target.value)} className={inputClass}>
              <option value="" disabled>
                {fmt('{city}…', { city })}
              </option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
              <option value="__other">{copy.hostel.addAreaOther}</option>
            </select>
          </Field>
          {area === '__other' && (
            <Field label={copy.hostel.addAreaFree} htmlFor={`${id}-other`}>
              <input
                id={`${id}-other`}
                required
                minLength={2}
                maxLength={40}
                value={otherArea}
                onChange={(e) => setOtherArea(e.target.value)}
                className={inputClass}
              />
            </Field>
          )}
          <fieldset>
            <legend className="font-display mb-2 font-bold">{copy.hostel.addType}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['boys', 'girls', 'coed', 'unknown'] as const).map((t) => (
                <label
                  key={t}
                  className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-3 ring-2 ${type === t ? 'bg-latte ring-terracotta' : 'bg-paper ring-line'}`}
                >
                  <input type="radio" name={`${id}-type`} value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
                  <span aria-hidden>{TYPE_EMOJI[t]}</span>
                  <span className="font-display font-bold">{copy.hostel.types[t]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {colleges.length > 0 && (
            <Field label={copy.hostel.addCollege} htmlFor={`${id}-college`}>
              <select id={`${id}-college`} value={college} onChange={(e) => setCollege(e.target.value)} className={inputClass}>
                <option value="">—</option>
                {colleges.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Button type="submit" size="lg" disabled={busy || !name.trim() || !finalArea}>
            {copy.hostel.addSubmit}
          </Button>
        </form>
      )}
    </Sheet>
  );
}

const inputClass = 'h-12 w-full rounded-xl bg-paper px-4 font-semibold ring-2 ring-line outline-none focus:ring-4 focus:ring-terracotta';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="font-display font-bold">
        {label}
      </label>
      {children}
    </div>
  );
}
