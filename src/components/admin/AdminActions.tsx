'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ApiClientError, api } from '@/lib/api-client';

/** Posts one admin action, then refreshes the server-rendered dashboard. */
export function AdminAction({
  action,
  body,
  children,
  confirm,
  tone = 'default',
}: {
  action: string;
  body: unknown;
  children: ReactNode;
  confirm?: string;
  tone?: 'default' | 'danger';
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (confirm && !window.confirm(confirm)) return;
        setBusy(true);
        try {
          await api.post(`/api/admin/${action}`, body);
          router.refresh();
        } catch (err) {
          toast(err instanceof ApiClientError ? err.code : 'Failed', 'error');
        } finally {
          setBusy(false);
        }
      }}
      className={`min-h-9 rounded-full px-3 text-xs font-bold ring-2 disabled:opacity-50 ${tone === 'danger' ? 'bg-wrong-soft text-wrong ring-wrong/30' : 'bg-cream ring-line hover:ring-terracotta'}`}
    >
      {children}
    </button>
  );
}

export function AdminLogin() {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api.post('/api/admin/login', { key });
          router.push('/admin');
          router.refresh();
        } catch (err) {
          setError(err instanceof ApiClientError && err.code === 'rate_limited' ? 'Too many attempts. Try later.' : 'That key did not work.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="admin-key" className="font-display font-bold">
        Admin access key
      </label>
      <input
        id="admin-key"
        type="password"
        autoComplete="current-password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="bg-paper ring-line focus:ring-terracotta h-12 rounded-xl px-4 ring-2 outline-none focus:ring-4"
      />
      {error && (
        <p role="alert" className="text-wrong font-semibold">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !key}
        className="rounded-chunky bg-terracotta font-display shadow-chunky min-h-12 font-extrabold text-white disabled:opacity-50"
      >
        Sign in
      </button>
    </form>
  );
}
