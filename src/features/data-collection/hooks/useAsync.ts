'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';

/** One request with loading / error / refetch. Re-runs when `deps` change; a stale response never overwrites a newer one. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[], enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const seq = useRef(0);
  const loader = useRef(load);
  loader.current = load;

  const run = useCallback(async () => {
    const mine = (seq.current += 1);
    setLoading(true);
    setError('');
    try {
      const out = await loader.current();
      if (mine === seq.current) setData(out);
    } catch (err) {
      if (mine === seq.current) setError(messageOf(err));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (enabled) void run(); }, [enabled, run, ...deps]);

  return { data, loading, error, refetch: run, setData };
}
