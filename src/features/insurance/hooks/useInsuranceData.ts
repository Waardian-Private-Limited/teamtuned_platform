'use client';

import { useRemote } from '@/features/reimbursement/hooks/useRemote';
import * as api from '../api/insurance.api';
import type { CoverFilters } from '../types/insurance.types';

export function useSummary(subOrgId: number | null) {
  return useRemote(() => api.getSummary(subOrgId), `summary:${subOrgId ?? 'all'}`);
}

export function usePlans(subOrgId: number | null, status?: 'active' | 'archived') {
  const remote = useRemote(() => api.listPlans({ status, subOrgId }), `plans:${subOrgId ?? 'all'}:${status ?? 'all'}`);
  return { ...remote, plans: remote.data?.items ?? [] };
}

export function useEnrollments(filters: CoverFilters, page: number, pageSize: number) {
  const key = `cover:${filters.planId}:${filters.status}:${filters.search}:${filters.subOrgId}:${page}:${pageSize}`;
  const remote = useRemote(
    () => api.listEnrollments({ planId: filters.planId, status: filters.status, search: filters.search, subOrgId: filters.subOrgId, page, pageSize }),
    key
  );
  return { ...remote, rows: remote.data?.items ?? [], total: remote.data?.total ?? 0 };
}

export function useEnrollment(id: number | null) {
  return useRemote(id ? () => api.getEnrollment(id) : null, `enrollment:${id ?? 'none'}`);
}

export function useMyCover() {
  const remote = useRemote(() => api.myCover(), 'me');
  return { ...remote, items: remote.data?.items ?? [] };
}
