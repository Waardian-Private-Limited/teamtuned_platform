'use client';

import { useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import type { PickerOption } from '../types/siteSubOrgMapper.model';
import { OPTION_SEARCH_DEBOUNCE_MS } from '../constants/siteSubOrgMapper.constants';

// Server-searched option list for a picker. Fetches only while `enabled`
// (the picker is open), debounces typing, and drops responses that arrive
// after a newer request so fast typing never shows stale results. `load`
// must be stable (a module-level function), since it is an effect dependency.
export function useRemoteOptions(
  load: (search: string) => Promise<PickerOption[]>,
  query: string,
  enabled: boolean
) {
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const result = await load(query.trim());
        if (requestId !== requestIdRef.current) return;
        setOptions(result);
        setError('');
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(messageOf(err));
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, query ? OPTION_SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timeout);
  }, [load, query, enabled]);

  return { options, isLoading, error };
}
