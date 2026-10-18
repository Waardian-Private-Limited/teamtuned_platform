'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PublicApiError, fetchHostedJobs } from '../api/careers.api';
import type { JobFacets, JobsPage, WorkMode } from '../types/careers.types';

export interface BoardFilters {
  search: string;
  department: string;
  location: string;
  workMode: WorkMode | '';
  page: number;
}

type LoadState = 'loading' | 'ready' | 'not_found' | 'error';

const WORK_MODES: WorkMode[] = ['onsite', 'hybrid', 'remote'];

function readFilters(sp: URLSearchParams | null): BoardFilters {
  const wm = sp?.get('mode') ?? '';
  const page = Number(sp?.get('page') ?? 1);
  return {
    search: sp?.get('q') ?? '',
    department: sp?.get('department') ?? '',
    location: sp?.get('location') ?? '',
    workMode: WORK_MODES.includes(wm as WorkMode) ? (wm as WorkMode) : '',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/**
 * Hosted careers board state. Filters live in the URL (shareable, back button
 * works); the search box is debounced so typing does not fire a request per key.
 */
export function useHostedJobs(slug: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<BoardFilters>(() => readFilters(searchParams));
  const [searchInput, setSearchInput] = useState(filters.search);
  const [data, setData] = useState<JobsPage | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [fetching, setFetching] = useState(false);

  // Facet values seen so far — used when the server does not send facet lists.
  const seen = useRef<{ departments: Set<string>; locations: Set<string>; workModes: Set<WorkMode> }>({
    departments: new Set(),
    locations: new Set(),
    workModes: new Set(),
  });

  // Debounce the free-text search into the real filter.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.search === searchInput.trim() ? f : { ...f, search: searchInput.trim(), page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Mirror filters into the URL.
  useEffect(() => {
    const sp = new URLSearchParams();
    if (filters.search) sp.set('q', filters.search);
    if (filters.department) sp.set('department', filters.department);
    if (filters.location) sp.set('location', filters.location);
    if (filters.workMode) sp.set('mode', filters.workMode);
    if (filters.page > 1) sp.set('page', String(filters.page));
    const qs = sp.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    const current = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
    if (next !== current) router.replace(next, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to filter changes
  }, [filters]);

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => (s === 'ready' ? 'ready' : 'loading'));
    setError(null);
    setFetching(true);
    fetchHostedJobs(slug, filters, ctrl.signal)
      .then((res) => {
        res.items.forEach((j) => {
          if (j.department) seen.current.departments.add(j.department);
          if (j.location) seen.current.locations.add(j.location);
          if (j.workMode) seen.current.workModes.add(j.workMode);
        });
        setData(res);
        setState('ready');
        setFetching(false);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setFetching(false);
        if (err instanceof PublicApiError && err.status === 404) {
          setState('not_found');
          return;
        }
        setError(err instanceof Error ? err.message : 'Could not load jobs.');
        setState('error');
      });
    return () => ctrl.abort();
  }, [slug, filters, reloadKey]);

  const facets: JobFacets = useMemo(() => {
    if (data?.facets && (data.facets.departments.length || data.facets.locations.length || data.facets.workModes.length)) {
      return data.facets;
    }
    const sort = (s: Set<string>) => Array.from(s).sort((a, b) => a.localeCompare(b));
    return {
      departments: sort(seen.current.departments),
      locations: sort(seen.current.locations),
      workModes: WORK_MODES.filter((m) => seen.current.workModes.has(m)),
    };
  }, [data]);

  const update = useCallback((patch: Partial<Omit<BoardFilters, 'search'>>) => {
    setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  }, []);

  const clear = useCallback(() => {
    setSearchInput('');
    setFilters({ search: '', department: '', location: '', workMode: '', page: 1 });
  }, []);

  const hasFilters = Boolean(filters.search || filters.department || filters.location || filters.workMode);

  // Work mode is also narrowed on the client in case the server ignores `work_mode`.
  const items = useMemo(
    () => (data?.items ?? []).filter((j) => !filters.workMode || !j.workMode || j.workMode === filters.workMode),
    [data, filters.workMode]
  );

  return {
    filters,
    searchInput,
    setSearchInput,
    update,
    clear,
    hasFilters,
    data,
    items,
    facets,
    state,
    fetching,
    error,
    reload: () => setReloadKey((k) => k + 1),
  };
}
