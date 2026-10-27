'use client';

import { useCallback, useEffect, useState } from 'react';
import { setOrgTimezone } from '../utils/format';
import type { FilterOption } from '@/features/payroll-runs/types/payrollRuns.model';
import * as api from '../api/labour.api';
import type { Category, LabourSettings, WorkItem } from '../types/labour.types';

export interface Opt { value: number; label: string }

export function useCatalog(includeInactive = false) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      setCategories((await api.getCatalog(includeInactive)).categories || []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load categories');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);
  useEffect(() => {
    reload();
  }, [reload]);
  const categoryOptions: Opt[] = categories.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }));
  const subcategoryOptions = (categoryId: number | null): Opt[] =>
    (categories.find((c) => c.id === categoryId)?.subcategories || []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }));
  return { categories, categoryOptions, subcategoryOptions, loading, error, reload };
}

const CONTRACTOR_PAGE = 200; // the API's page size cap
const CONTRACTOR_MAX_PAGES = 50;

/** Every active contractor (paged through 200 at a time) for filters and pickers; the dropdowns search them. */
export function useContractorOptions(excludeId?: number | null) {
  const [options, setOptions] = useState<Opt[]>([]);
  useEffect(() => {
    let off = false;
    (async () => {
      const first = await api.listContractors({ status: 'active', page: 1, pageSize: CONTRACTOR_PAGE });
      const pages = Math.min(first.pages || 1, CONTRACTOR_MAX_PAGES);
      const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => api.listContractors({ status: 'active', page: i + 2, pageSize: CONTRACTOR_PAGE })));
      if (off) return;
      const items = [first, ...rest].flatMap((r) => r.items || []);
      setOptions(items.filter((c) => c.id !== excludeId).map((c) => ({ value: c.id, label: c.tradeName || c.legalName })));
    })().catch(() => {});
    return () => { off = true; };
  }, [excludeId]);
  return options;
}

/**
 * The sites to pick from on every labour screen (`GET /labour/sites`): every site for org admin / HR mode (`all`), else
 * only the signed-in person's own. Screens that need exactly one site hide "All sites" and default to `first` when `!all`.
 */
export function useLabourSites() {
  const [state, setState] = useState<{ sites: FilterOption[]; all: boolean; loaded: boolean }>({ sites: [], all: true, loaded: false });
  useEffect(() => {
    let off = false;
    api.getLabourSites()
      .then((r) => { if (!off) setState({ sites: (r.sites || []).map((s) => ({ value: s.id, label: s.name })), all: !!r.all, loaded: true }); })
      .catch(() => { if (!off) setState((x) => ({ ...x, loaded: true })); });
    return () => { off = true; };
  }, []);
  return { ...state, first: state.sites[0]?.value ?? null };
}

export function useLabourSettings() {
  const [settings, setSettings] = useState<LabourSettings | null>(null);
  useEffect(() => {
    let off = false;
    api.getSettings().then((r) => { setOrgTimezone(r.timezone); if (!off) setSettings(r.settings); }).catch(() => {});
    return () => { off = true; };
  }, []);
  return settings;
}

/**
 * The work item catalogue for pickers and filters (one page of up to 200, the API's cap; inactive ones too when asked,
 * so old entries still show their item). `reload` after a catalogue change.
 */
export function useWorkItems(includeInactive = true, enabled = true) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let off = false;
    api.listWorkItems({ includeInactive: includeInactive || undefined, page: 1, pageSize: 200 })
      .then((r) => { if (!off) { setItems(r.items || []); setUnits(r.units || []); } })
      .catch(() => {});
    return () => { off = true; };
  }, [includeInactive, enabled, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { items, units, reload };
}
