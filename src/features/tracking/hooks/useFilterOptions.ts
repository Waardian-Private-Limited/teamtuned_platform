'use client';

import { useEffect, useState } from 'react';
import { listDepartments } from '@/features/departments/api/departments.api';
import { listRoles } from '@/features/roles/api/roles.api';
import { listSites } from '@/features/sites/api/sites.api';
import { messageOf } from '@/lib/api/errors';

export interface Option {
  value: number;
  label: string;
}

interface Options {
  departments: Option[];
  roles: Option[];
  sites: Option[];
}

const PAGE = 200;
const EMPTY: Options = { departments: [], roles: [], sites: [] };
const cache: { value?: Options } = {};

// Every page of a list, not just the first PAGE rows.
async function all<T>(fetchPage: (page: number) => Promise<{ items: T[]; total: number }>): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; ; page += 1) {
    const { items, total } = await fetchPage(page);
    out.push(...items);
    // The server may cap the page size, so stop on the total, not on a short page.
    if (!items.length || out.length >= total) return out;
  }
}

/** Departments, roles and sites for the filter bars; loaded once per page load (a failed load retries on the next mount). */
export function useFilterOptions() {
  const [options, setOptions] = useState<Options>(cache.value ?? EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache.value) return;
    let alive = true;
    Promise.all([
      all((page) => listDepartments({ page, pageSize: PAGE }).then((r) => ({ items: r.departments, total: r.total }))),
      all((page) => listRoles({ page, pageSize: PAGE }).then((r) => ({ items: r.roles, total: r.total }))),
      all((page) => listSites({ page, pageSize: PAGE }).then((r) => ({ items: r.sites, total: r.total }))),
    ])
      .then(([d, r, s]) => {
        const next = {
          departments: d.map((x) => ({ value: x.id, label: x.name })),
          roles: r.map((x) => ({ value: x.id, label: x.name })),
          sites: s.map((x) => ({ value: x.id, label: x.name })),
        };
        cache.value = next;
        if (alive) {
          setOptions(next);
          setError(null);
        }
      })
      .catch((err) => {
        if (alive) setError(`Filter lists could not be loaded: ${messageOf(err)}`);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { ...options, error };
}
