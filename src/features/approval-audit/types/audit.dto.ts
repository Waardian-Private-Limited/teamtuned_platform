export type RangePreset = '7d' | '30d' | 'quarter' | 'year' | 'custom';
export type AgingKey = 'under_1d' | 'd1_3' | 'd3_7' | 'over_7d';

export interface AuditFilters {
  preset: RangePreset;
  from: string;
  to: string;
  subOrgId: number | null;
  siteId: number | null;
  departmentId: number | null;
  requestType: string | null;
}

export interface Durations {
  count?: number;
  avg: number | null;
  median: number | null;
  p90: number | null;
}

export interface AuditTotalsDto {
  raised: number;
  approved: number;
  rejected: number;
  withdrawn: number;
  sent_back: number;
  pending: number;
  approval_rate: number | null;
  decided: number;
  turnaround: Durations;
}

export interface AuditBacklogDto {
  pending: number;
  overdue: number;
  oldest_minutes: number | null;
  aging: Array<{ key: AgingKey; label: string; count: number }>;
}

export interface AuditTrendDto {
  unit: 'day' | 'week' | 'month';
  points: Array<{ start: string; raised: number; decided: number; approved: number; rejected: number }>;
}

export interface AuditGroupDto {
  id: number | string | null;
  name: string | null;
  raised: number;
  approved: number;
  rejected: number;
  approval_rate: number | null;
  decided: number;
  turnaround: Durations;
  pending: number;
  overdue: number;
  oldest_minutes: number | null;
}

export interface AuditApproverDto {
  key: string;
  name: string;
  kind: 'employee' | 'permission';
  pending: number;
  overdue: number;
  oldest_minutes: number | null;
  approved: number;
  rejected: number;
  decided: number;
  late: number;
  escalated: number;
  response: Durations;
}

export interface ApprovalAuditDto {
  from: string;
  to: string;
  today: string;
  timezone: string;
  access: { all_types: boolean; open_requests: boolean };
  types: Array<{ type: string; label: string }>;
  totals: AuditTotalsDto;
  backlog: AuditBacklogDto;
  trend: AuditTrendDto;
  by_type: AuditGroupDto[];
  by_site: AuditGroupDto[];
  by_department: AuditGroupDto[];
  by_approver: AuditApproverDto[];
}

export interface PendingItemDto {
  id: number;
  request_type: string;
  type_label: string;
  requester: { id: number | null; name: string | null; code: string | null } | null;
  summary: { title?: string; start?: string; end?: string } | null;
  step_name: string | null;
  step_number: number | null;
  step_count: number | null;
  site: { id: number; name: string } | null;
  department: { id: number; name: string } | null;
  created_at: string | null;
  age_minutes: number | null;
  overdue: boolean;
  waiting_on: Array<{ kind: 'employee' | 'permission'; id?: number; code?: string; name: string | null }>;
}

export interface PendingPageDto {
  total: number;
  items: PendingItemDto[];
  limit: number;
  offset: number;
  timezone: string;
  access: { open_requests: boolean };
}

/** What narrows the pending list beyond the page filters (an age bucket, overdue, one approver). */
export interface PendingNarrow {
  aging?: AgingKey;
  overdue?: boolean;
  approver?: string;
  label: string;
}
