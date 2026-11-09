'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { getScorecard, getScorecards } from '../api/scorecard.api';
import type { ScorecardFilters, ScorecardListDto, ScorecardPersonDto, ScorecardSort } from '../types/scorecard.dto';

export const PAGE_SIZE = 25;

/**
 * The scorecard list under the filters, and one person's card (the opened row, or the viewer's own when
 * they can only see themselves). Any filter change goes back to page 1.
 */
export function useScorecard() {
  const [filters, setFilters] = useState<ScorecardFilters>({ period: 'month', date: '', yearStart: 1, siteId: null, departmentId: null });
  const [sort, setSort] = useState<{ key: ScorecardSort; dir: 'asc' | 'desc' }>({ key: 'score', dir: 'desc' });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ScorecardListDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [personId, setPersonId] = useState<number | null>(null);
  const [person, setPerson] = useState<ScorecardPersonDto | null>(null);
  const [personError, setPersonError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const key = JSON.stringify({ filters, sort, search, page });
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getScorecards(filters, { sort: sort.key, dir: sort.dir, search, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }, controller.signal)
      .then((d) => { setData(d); setError(null); })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // A self viewer has no list to open from: their own card is the page.
  const selfId = data?.mode === 'self' ? data.me : null;
  const shownId = personId ?? selfId;
  const personKey = JSON.stringify({ shownId, period: filters.period, date: filters.date, yearStart: filters.yearStart });
  useEffect(() => {
    if (!shownId) { setPerson(null); return undefined; }
    const controller = new AbortController();
    setPerson(null);
    setPersonError(null);
    getScorecard(filters, shownId, controller.signal)
      .then(setPerson)
      .catch((e) => { if (!controller.signal.aborted) setPersonError(messageOf(e)); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personKey]);

  const update = useCallback((patch: Partial<ScorecardFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); }, []);
  const toggleSort = useCallback((k: ScorecardSort) => {
    setSort((s) => (s.key === k ? { key: k, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key: k, dir: k === 'name' ? 'asc' : 'desc' }));
    setPage(1);
  }, []);
  const reset = useCallback(() => { setFilters((f) => ({ ...f, date: '', siteId: null, departmentId: null })); setSearchInput(''); setPage(1); }, []);

  return {
    filters, update, reset, sort, toggleSort, searchInput, setSearchInput, page, setPage,
    data, loading: loading && !data, refreshing: loading, error,
    personId, openPerson: setPersonId, closePerson: () => setPersonId(null), person, personError,
  };
}
