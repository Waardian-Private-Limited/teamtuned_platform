'use client';

import { useEffect, useState } from 'react';
import type { FilterOption } from '@/components/ui/SearchableFilterDropdown';
import { listSites } from '@/features/sites/api/sites.api';
import * as api from '../api/petty-cash.api';

interface Lists {
  wallets: FilterOption[];
  categories: FilterOption[];
  sites: FilterOption[];
}

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; promise: Promise<Lists> }>();

function fetchLists(scope: 'hr' | 'me'): Promise<Lists> {
  const hit = cache.get(scope);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise: Promise<Lists> =
    scope === 'me'
      ? api
          .getMyOverview()
          .then((o) => ({
            wallets: (o.wallets || []).map((w) => ({ value: w.id, label: w.name })),
            categories: (o.categories || []).map((c) => ({ value: c.id, label: c.name })),
            sites: [],
          }))
      : Promise.allSettled([api.listWallets({ page: 1, pageSize: 100, sort: 'name' }), api.listCategories(), listSites({ pageSize: 200 })]).then(([w, c, s]) => {
          const cats = c.status === 'fulfilled' ? (Array.isArray(c.value) ? c.value : c.value.items || []) : [];
          return {
            wallets: w.status === 'fulfilled' ? (w.value.items || []).map((x) => ({ value: x.id, label: x.name })) : [],
            categories: cats.map((x) => ({ value: x.id, label: x.name })),
            sites: s.status === 'fulfilled' ? (s.value.sites || []).map((x) => ({ value: x.id, label: x.name })) : [],
          };
        });
  // A failed load is not kept, so the next screen tries again.
  promise.catch(() => cache.delete(scope));
  cache.set(scope, { at: Date.now(), promise });
  return promise;
}

/** Drops the cached lists so the next screen reloads them (after categories change). */
export function invalidateFilterLists() {
  cache.clear();
}

/**
 * Wallet, category and site options for filters. Loaded once a minute at most across screens;
 * `enabled` false (a closed dialog) skips the call.
 */
export function useFilterLists(scope: 'hr' | 'me', enabled = true): Lists {
  const [lists, setLists] = useState<Lists>({ wallets: [], categories: [], sites: [] });
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchLists(scope)
      .then((l) => !cancelled && setLists(l))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [scope, enabled]);
  return lists;
}
