'use client';

import { useEffect, useState } from 'react';
import * as api from '../api/detailedAttendance.api';

/** The selfie of one check-in or check-out, fetched when its card appears (the link lives for two minutes). */
export function usePunchImage(punchId: number, enabled: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'failed'>(enabled ? 'loading' : 'idle');

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    setState('loading');
    api.getPunchImage(punchId, controller.signal)
      .then((res) => { setUrl(res.url); setState('ready'); })
      .catch(() => { if (!controller.signal.aborted) setState('failed'); });
    return () => controller.abort();
  }, [punchId, enabled]);

  return { url, state };
}
