'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_RETRIES = 2;

/**
 * A short-lived signed image link. The link is fetched when `enabled`, and fetched again (up to twice) when the
 * browser fails to load it: it may have expired while the card sat off-screen, or the first request may have failed.
 * A reply without a link counts as a failure, so the card never stays blank.
 */
export function useSignedImage(load: (signal: AbortSignal) => Promise<{ url?: string | null }>, key: string | number, enabled: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'failed'>(enabled ? 'loading' : 'idle');
  const [attempt, setAttempt] = useState(0);
  const attemptRef = useRef(0);
  attemptRef.current = attempt;
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => { setAttempt(0); }, [key]);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    setState('loading');
    loadRef.current(controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        if (res?.url) { setUrl(res.url); setState('ready'); } else { setUrl(null); setState('failed'); }
      })
      .catch(() => { if (!controller.signal.aborted) { setUrl(null); setState('failed'); } });
    return () => controller.abort();
  }, [key, enabled, attempt]);

  /** For the image's onError: ask for a fresh link, or give up after a couple of tries. */
  const onImageError = useCallback(() => {
    if (attemptRef.current >= MAX_RETRIES) { setState('failed'); return; }
    setAttempt(attemptRef.current + 1);
  }, []);

  return { url, state, onImageError };
}
