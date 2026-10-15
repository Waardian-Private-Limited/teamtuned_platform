'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf, statusOf } from '@/lib/api/errors';

/**
 * One GET with the module's loading conventions: a request-sequence ref drops stale answers,
 * `isLoading` only on the first load (or when `key` changes), `isFetching` on every refetch.
 */
export function useRemote<T>(fetcher: (() => Promise<T>) | null, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(fetcher));
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const request = useRef(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const load = useCallback(async () => {
    const run = fetcherRef.current;
    if (!run) {
      setData(null);
      setIsLoading(false);
      return;
    }
    const id = ++request.current;
    setIsFetching(true);
    setError('');
    setNotFound(false);
    try {
      const result = await run();
      if (id === request.current) setData(result);
    } catch (err) {
      if (id !== request.current) return;
      if (statusOf(err) === 404) setNotFound(true);
      setError(messageOf(err));
    } finally {
      if (id === request.current) {
        setIsFetching(false);
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    setIsLoading(Boolean(fetcherRef.current));
    load();
  }, [key, load]);

  return { data, setData, isLoading, isFetching, error, notFound, refetch: load };
}
