'use client';

import type { ApiErrorBody } from './api-types';

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * JSON request with retry on network failure (offline / flaky 4G). Only HTTP
 * errors from the server stop retries; every game write endpoint is idempotent.
 */
async function request<T>(method: 'GET' | 'POST' | 'DELETE', url: string, body?: unknown, retries = 3): Promise<T> {
  let attempt = 0;
  for (;;) {
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'same-origin',
      });
    } catch (err) {
      if (attempt++ >= retries) throw new ApiClientError(0, 'network', err instanceof Error ? err.message : 'network');
      await sleep(400 * 2 ** attempt);
      continue;
    }
    if (res.status === 204) return undefined as T;
    const data = (await res.json().catch(() => ({}))) as T & ApiErrorBody;
    if (!res.ok) throw new ApiClientError(res.status, data.error ?? 'unknown', data.message);
    return data;
  }
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body: unknown = {}) => request<T>('POST', url, body),
  del: <T>(url: string) => request<T>('DELETE', url),
};
