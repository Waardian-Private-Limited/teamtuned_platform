'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { listPool, type PoolQuery } from '../api/pool.api';
import type { PoolList, PoolSort, PoolTab } from '../types/pool.types';

const DEFAULT: Omit<PoolQuery, 'search'> = { tab: '', leadSource: '', mine: false, sort: 'recent', page: 1, pageSize: 25 };

/** The pool under the filters; any filter change goes back to page 1, `reload` keeps the page. */
export function usePoolList() {
  const [query, setQuery] = useState(DEFAULT);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<PoolList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setQuery((q) => ({ ...q, page: 1 })); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const key = JSON.stringify({ query, search, tick });
  useEffect(() => {
    let alive = true;
    setLoading(true);
    listPool({ ...query, search })
      .then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((e) => { if (alive) setError(messageOf(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(<K extends keyof typeof DEFAULT>(k: K, v: (typeof DEFAULT)[K]) => {
    setQuery((q) => ({ ...q, [k]: v, page: k === 'page' ? (v as number) : 1 }));
  }, []);

  return {
    query,
    setTab: (t: PoolTab) => set('tab', t),
    setLeadSource: (s: string) => set('leadSource', s),
    setMine: (m: boolean) => set('mine', m),
    setSort: (s: PoolSort) => set('sort', s),
    setPage: (p: number) => set('page', p),
    setPageSize: (n: number) => set('pageSize', n),
    searchInput,
    setSearchInput,
    data,
    loading: loading && !data,
    refreshing: loading,
    error,
    reload: useCallback(() => setTick((t) => t + 1), []),
    filtered: Boolean(search || query.tab || query.leadSource || query.mine),
    clear: () => { setQuery(DEFAULT); setSearchInput(''); },
  };
}
