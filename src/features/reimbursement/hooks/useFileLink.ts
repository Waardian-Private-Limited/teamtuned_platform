'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/reimbursement.api';

/**
 * Where a receipt's bytes come from: a stored file on a claim line (fetched as a presigned link), or
 * a file just picked in the browser (an object URL made by the form).
 */
export type ReceiptSource =
  | { kind: 'remote'; scope: 'me' | 'hr'; claimId: number; lineId: number; index: number; payment?: boolean }
  | { kind: 'local'; url: string };

/** One file shown by the receipt viewer. `source` null: nothing to show (an old file not kept). */
export interface ReceiptFile {
  id: string;
  name: string;
  type: string | null;
  size: number | null;
  source: ReceiptSource | null;
}

export const isPdfFile = (f: Pick<ReceiptFile, 'name' | 'type'>) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

const DEFAULT_TTL_S = 300;
type Remote = Extract<ReceiptSource, { kind: 'remote' }>;

// Presigned links by (scope, claim, line, kind, index), kept until shortly before they expire.
const cache = new Map<string, { url: string; expiresAt: number }>();
const inflight = new Map<string, Promise<string>>();

export function sourceKey(s: ReceiptSource): string {
  return s.kind === 'local' ? `local:${s.url}` : `${s.scope}:${s.claimId}:${s.lineId}:${s.payment ? 'proof' : 'bill'}:${s.index}`;
}

function fetchLink(s: Remote, force: boolean): Promise<string> {
  const key = sourceKey(s);
  if (force) cache.delete(key);
  else {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.url);
    const pending = inflight.get(key);
    if (pending) return pending;
  }
  const p = api
    .claimFileUrl(s.scope, s.claimId, { lineId: s.lineId, index: s.index, payment: s.payment })
    .then((res) => {
      const ttl = Math.max(20, Number(res.expires_in) || DEFAULT_TTL_S);
      // Stop using a link a little before it expires so an open image never 403s mid-view.
      cache.set(key, { url: res.url, expiresAt: Date.now() + (ttl - Math.min(30, ttl / 3)) * 1000 });
      return res.url;
    })
    .finally(() => {
      if (inflight.get(key) === p) inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

/**
 * The URL of a receipt, fetched only while `enabled` (the thumbnail is on screen, the viewer is open).
 * `retry` is for a media load error (an expired or refused link): it fetches a fresh link once per file.
 */
export function useFileLink(source: ReceiptSource | null, enabled: boolean) {
  const key = source ? sourceKey(source) : null;
  const sourceRef = useRef(source);
  const [state, setState] = useState<{ key: string | null; url: string | null; error: string }>({ key: null, url: null, error: '' });
  const [attempt, setAttempt] = useState(0);
  // The file whose link failed to load once: fetched fresh (once) on the next run.
  const retried = useRef<string | null>(null);
  const forceNext = useRef<string | null>(null);

  useEffect(() => {
    sourceRef.current = source;
  });

  useEffect(() => {
    const s = sourceRef.current;
    if (!s || !key || !enabled || s.kind !== 'remote') return;
    let cancelled = false;
    const force = forceNext.current === key;
    forceNext.current = null;
    fetchLink(s, force)
      .then((url) => !cancelled && setState({ key, url, error: '' }))
      .catch((err) => !cancelled && setState({ key, url: null, error: messageOf(err) }));
    return () => {
      cancelled = true;
    };
  }, [key, enabled, attempt]);

  const retry = useCallback(() => {
    if (!key || retried.current === key || source?.kind !== 'remote') return false;
    retried.current = key;
    forceNext.current = key;
    setAttempt((n) => n + 1);
    return true;
  }, [key, source?.kind]);

  if (!source) return { url: null, error: '', loading: false, retry };
  if (source.kind === 'local') return { url: source.url, error: '', loading: false, retry };
  const current = state.key === key;
  return { url: current ? state.url : null, error: current ? state.error : '', loading: enabled && !current, retry };
}

/** True once the element has come near the viewport (stays true). */
export function useInView<T extends Element>(rootMargin = '200px') {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (seen || !node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setSeen(true);
        io.disconnect();
      }
    }, { rootMargin });
    io.observe(node);
    return () => io.disconnect();
  }, [seen, rootMargin]);
  return [ref, seen] as const;
}
