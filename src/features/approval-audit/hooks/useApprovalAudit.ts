'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { getFilterOptions } from '@/features/attendance-dashboard/api/dashboard.api';
import type { FilterOptionsDto } from '@/features/attendance-dashboard/types/dashboard.dto';
import { getApprovalAudit, getPendingRequests } from '../api/approvalAudit.api';
import { presetRange } from '../utils/format';
import type { ApprovalAuditDto, AuditFilters, PendingNarrow, PendingPageDto, RangePreset } from '../types/audit.dto';

const EMPTY: AuditFilters = { preset: '30d', from: '', to: '', subOrgId: null, siteId: null, departmentId: null, requestType: null };

/**
 * The audit page's state: filters (a period preset or custom dates, sub-org, site, department,
 * type), the report for them, and the pending list under it with its own narrowing and page.
 * Options reload when the sub-org changes; the report and the list reload on any filter change.
 */
export function useApprovalAudit() {
  const [filters, setFilters] = useState<AuditFilters>(EMPTY);
  const [options, setOptions] = useState<FilterOptionsDto | null>(null);
  const [audit, setAudit] = useState<ApprovalAuditDto | null>(null);
  const [pending, setPending] = useState<PendingPageDto | null>(null);
  const [narrow, setNarrow] = useState<PendingNarrow | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getFilterOptions(filters.subOrgId, null, controller.signal)
      .then((o) => {
        setOptions(o);
        setFilters((f) => {
          const next = f.from ? { ...f } : { ...f, ...presetRange('30d', o.today) };
          if (next.siteId && !o.sites.some((s) => s.id === next.siteId)) next.siteId = null;
          if (next.departmentId && !o.departments.some((d) => d.id === next.departmentId)) next.departmentId = null;
          return next;
        });
      })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); });
    return () => controller.abort();
  }, [filters.subOrgId]);

  const ready = !!filters.from;
  const key = JSON.stringify(filters);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setLoading(true);
    getApprovalAudit(filters, controller.signal)
      .then((d) => { setAudit(d); setError(null); })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready, version]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setLoadingPending(true);
    getPendingRequests(filters, narrow, page, pageSize, controller.signal)
      .then((d) => { setPending(d); setPendingError(null); })
      .catch((e) => { if (!controller.signal.aborted) setPendingError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoadingPending(false); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready, narrow, page, pageSize, version]);

  const update = useCallback((patch: Partial<AuditFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const setPreset = useCallback((preset: RangePreset) => {
    if (preset === 'custom' || !options) { update({ preset }); return; }
    update({ preset, ...presetRange(preset, options.today) });
  }, [options, update]);

  const narrowTo = useCallback((n: PendingNarrow | null) => { setNarrow(n); setPage(1); }, []);

  const reset = useCallback(() => {
    if (!options) return;
    setFilters({ ...EMPTY, ...presetRange('30d', options.today) });
    setNarrow(null);
    setPage(1);
  }, [options]);

  const narrowed = !!(filters.siteId || filters.departmentId || filters.requestType || filters.subOrgId || filters.preset !== '30d');

  return {
    filters, options, audit, pending, narrow, page, pageSize, error, pendingError, loading, loadingPending, narrowed,
    update, setPreset, narrowTo, reset,
    setPage,
    setPageSize: (n: number) => { setPageSize(n); setPage(1); },
    reload: () => setVersion((v) => v + 1),
  };
}
