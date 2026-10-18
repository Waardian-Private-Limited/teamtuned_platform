'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/myRoster.api';
import { toRosterDetail, toRosterList } from '../types/roster.mapper';
import type { MyRoster, MyRosterDetail } from '../types/roster.model';

/** The employee's rosters, running and upcoming first; more load a page at a time. Idle until `enabled`. */
export function useMyRosters(enabled: boolean) {
  const [items, setItems] = useState<MyRoster[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    api.getMyRosters(page, controller.signal)
      .then((dto) => {
        const list = toRosterList(dto);
        setTotal(list.total);
        setItems((prev) => {
          if (page === 1) return list.items;
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...list.items.filter((r) => !seen.has(r.id))];
        });
        setError(null);
      })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, page]);

  const loadMore = useCallback(() => setPage((p) => p + 1), []);
  return { items, total, loading, error, hasMore: items.length < total, loadMore };
}

/** One roster, day by day; idle while `id` is null. */
export function useMyRoster(id: number | null) {
  const [data, setData] = useState<MyRosterDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    if (id == null) return;
    const controller = new AbortController();
    setLoading(true);
    api.getMyRoster(id, controller.signal)
      .then((dto) => { setData(toRosterDetail(dto)); setError(null); })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  return { data, loading, error };
}
