import { apiClient } from '@/lib/apiClient';
import type { ApprovalAuditDto, AuditFilters, PendingNarrow, PendingPageDto } from '../types/audit.dto';

const auth = { withAuth: true } as const;

const params = (f: AuditFilters) => ({
  from: f.from || undefined,
  to: f.to || undefined,
  subOrgId: f.subOrgId ?? undefined,
  site_id: f.siteId ?? undefined,
  department_id: f.departmentId ?? undefined,
  request_type: f.requestType ?? undefined,
});

/** Outcomes, turnaround, backlog and the breakdowns for the period and filters. */
export function getApprovalAudit(filters: AuditFilters, signal?: AbortSignal) {
  return apiClient.get<ApprovalAuditDto>('/attendance-dashboard/approval-audit', params(filters), { ...auth, signal });
}

/** The pending requests behind the backlog, oldest first. */
export function getPendingRequests(filters: AuditFilters, narrow: PendingNarrow | null, page: number, pageSize: number, signal?: AbortSignal) {
  return apiClient.get<PendingPageDto>(
    '/attendance-dashboard/approval-audit/pending',
    {
      ...params(filters),
      aging: narrow?.aging,
      overdue: narrow?.overdue ? 1 : undefined,
      approver: narrow?.approver,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    },
    { ...auth, signal },
  );
}
