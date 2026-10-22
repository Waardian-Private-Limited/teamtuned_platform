// The outside reviewer's page has no session, so this does not use the shared apiClient (cookies, 401 bounce to /login).
import { API_BASE_URL } from '@/config/env';
import type { PublicFeedbackForm } from '../types/perf.types';

export class PublicFeedbackError extends Error {
  constructor(message: string, readonly status: number, readonly errors?: Record<string, string>) { super(message); this.name = 'PublicFeedbackError'; }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/public/performance${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'omit', cache: 'no-store',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new PublicFeedbackError('We could not reach the server. Check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => null) as { message?: string; errors?: Record<string, string> } | null;
  if (!res.ok) throw new PublicFeedbackError(data?.message || (res.status === 429 ? 'Too many attempts. Please wait a minute.' : 'Something went wrong. Please try again.'), res.status, data?.errors);
  return data as T;
}

const path = (token: string) => `/feedback/${encodeURIComponent(token)}`;
export const getForm = (token: string) => call<PublicFeedbackForm>(path(token));
export const answer = (token: string, body: { ratings: Record<number, number>; answers: string[] }) => call<{ ok: true }>(path(token), body);
export const decline = (token: string) => call<{ ok: true }>(`${path(token)}/decline`, {});
