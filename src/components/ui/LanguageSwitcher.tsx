'use client';

import { LOCALE_LABELS, LOCALES, isLocale } from '@/content/copy';
import { useLocale } from '@/hooks/useCopy';

/** UI only for now: English strings ship first; hi/te fall back to English. */
export function LanguageSwitcher() {
  const { locale, setLocale, copy } = useLocale();
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{copy.common.language}</span>
      <select
        value={locale}
        onChange={(e) => isLocale(e.target.value) && setLocale(e.target.value)}
        className="bg-paper font-display ring-line min-h-11 appearance-none rounded-full py-2 pr-8 pl-3 text-sm font-bold ring-2"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 text-xs">
        ▾
      </span>
    </label>
  );
}
