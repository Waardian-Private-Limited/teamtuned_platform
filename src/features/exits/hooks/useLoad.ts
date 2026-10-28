'use client';

import React from 'react';
import { messageOf } from '@/lib/api/errors';

/** Loads something once (and again on `reload`), keeping loading and error state; an older answer never replaces a newer one. */
export function useLoad<T>(fn: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [nonce, setNonce] = React.useState(0);
  React.useEffect(() => {
    let live = true;
    setLoading(true);
    fn()
      .then((d) => { if (live) { setData(d); setError(null); } })
      .catch((e) => { if (live) setError(messageOf(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);
  const reload = React.useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload, setData };
}
