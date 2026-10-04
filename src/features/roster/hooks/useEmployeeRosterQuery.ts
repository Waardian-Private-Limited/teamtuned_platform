'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';

export function useEmployeeRosterQuery<T>(fetcher: () => Promise<T>, key: string, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const fetcherRef = useRef(fetcher);
  const runRef = useRef(0);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const load = useCallback(async () => {
    const run = ++runRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await fetcherRef.current();
      if (run === runRef.current) setData(result);
    } catch (err) {
      if (run === runRef.current) setError(messageOf(err));
    } finally {
      if (run === runRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void load();
  }, [key, enabled, load]);

  return { data, loading, error, reload: load };
}
