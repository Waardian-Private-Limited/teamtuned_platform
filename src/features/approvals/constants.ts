import type { Operator, StepMode } from './types/approvals';

export const MODE_LABEL: Record<StepMode, string> = {
  any: 'Any one approves',
  all: 'Everyone approves',
  quorum: 'A number of them approve',
};

export const OPERATOR_LABEL: Record<Operator, string> = {
  eq: 'is', ne: 'is not', gt: 'is more than', gte: 'is at least', lt: 'is less than', lte: 'is at most', in: 'is one of',
};

export const DIMENSION_LABEL = {
  site: 'Sites', department: 'Departments', employment_type: 'Employment types', role: 'Roles', roster_unit: 'Roster teams',
} as const;

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected', sent_back: 'Sent back', withdrawn: 'Withdrawn',
};

export const EVENT_LABEL: Record<string, string> = {
  submitted: 'Submitted', resubmitted: 'Resubmitted', step_started: 'Sent for approval', approved: 'Approved', rejected: 'Rejected',
  sent_back: 'Sent back', withdrawn: 'Withdrawn', override_approved: 'Approved by admin', override_rejected: 'Rejected by admin',
  condition_skipped: 'Step skipped (condition not met)', no_approver_skipped: 'Step skipped (nobody found)',
  no_approver_found: 'Nobody found, sent to admins', auto_skipped_duplicate: 'Step skipped (already approved)',
  escalated: 'Escalated', reassigned: 'Reassigned',
  approvers_updated: 'Approvers updated (people or flow changed)', flow_updated: 'Flow updated, request follows the new flow',
};

export const FLOW_PERMISSIONS = { VIEW: 'APPROVAL_FLOW_VIEW', MANAGE: 'APPROVAL_FLOW_MANAGE' } as const;

export const emptyStep = (n: number): import('./types/approvals').FlowStep => ({
  name: `Step ${n}`, approver: { type: 'reporting_manager', levels: 1 }, mode: 'any', quorum: null, when: null, ifNobody: 'org_admins',
});
