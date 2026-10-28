import type {
  ExitStatus, ExitType, OfferKind, OfferStatus, ReasonCategory, RehireEligibility, ShortfallAction, ExitDocType, ClearanceOwnerType, ClearanceStatus, SettlementStatus,
} from '../types/exits';

export const EXIT_PERMISSIONS = { VIEW: 'EXIT_VIEW', MANAGE: 'EXIT_MANAGE', APPROVE: 'EXIT_APPROVE', SETTLE: 'EXIT_SETTLE' } as const;
/** Anyone holding one of these (or HR mode / org admin) may open the exits desk. */
export const EXIT_DESK_PERMISSIONS = ['EXIT_VIEW', 'EXIT_MANAGE', 'HR_MODE'];
/** Org feature that gates self-service resignation. Matched exactly by the nav, so both spellings are listed. */
export const EXIT_FEATURES = ['EXIT_FEATURE', 'exit'];

export const ApprovalRequestType = 'exit_case';

export const TYPE_LABEL: Record<ExitType, string> = {
  resignation: 'Resignation', termination: 'Termination', contract_end: 'Contract end', retirement: 'Retirement',
  absconding: 'Absconding', mutual: 'Mutual separation', death: 'Death',
};

/** Types HR can start (an employee starts a resignation herself). */
export const HR_TYPES: ExitType[] = ['termination', 'contract_end', 'retirement', 'absconding', 'mutual', 'death'];

export const REASON_LABEL: Record<ReasonCategory, string> = {
  better_opportunity: 'Better opportunity', compensation: 'Compensation', career_growth: 'Career growth', manager: 'Manager',
  work_culture: 'Work culture', relocation: 'Relocation', higher_studies: 'Higher studies', health: 'Health', personal: 'Personal reasons',
  contract_end: 'Contract ended', performance: 'Performance', misconduct: 'Misconduct', absconding: 'Absconding',
  retirement: 'Retirement', death: 'Death', other: 'Other',
};

/** Reasons an employee can choose when resigning. */
export const RESIGN_REASONS: ReasonCategory[] = [
  'better_opportunity', 'compensation', 'career_growth', 'manager', 'work_culture', 'relocation', 'higher_studies', 'health', 'personal', 'other',
];

/** Sensible reason choices per HR-started exit type. */
export const HR_REASONS: Record<string, ReasonCategory[]> = {
  termination: ['performance', 'misconduct', 'other'],
  contract_end: ['contract_end', 'other'],
  retirement: ['retirement'],
  absconding: ['absconding'],
  mutual: ['better_opportunity', 'compensation', 'career_growth', 'personal', 'other'],
  death: ['death'],
};

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const STATUS_META: Record<ExitStatus, { label: string; tone: Tone }> = {
  submitted: { label: 'Awaiting approval', tone: 'warning' },
  retention: { label: 'Retention offer', tone: 'info' },
  accepted: { label: 'Accepted', tone: 'info' },
  serving_notice: { label: 'Serving notice', tone: 'info' },
  clearance: { label: 'Clearance', tone: 'warning' },
  settlement: { label: 'Settlement', tone: 'warning' },
  exited: { label: 'Exited', tone: 'neutral' },
  retained: { label: 'Retained', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' },
};

export const OPEN_STATUSES: ExitStatus[] = ['submitted', 'retention', 'accepted', 'serving_notice', 'clearance', 'settlement'];
export const isOpen = (s: ExitStatus) => OPEN_STATUSES.includes(s);

export const TONE_CLASS: Record<Tone, string> = {
  neutral: 'border-line bg-bg-subtle text-fg-muted',
  info: 'border-[var(--tt-primary)]/25 bg-[var(--tt-accent-soft)] text-fg',
  success: 'border-[var(--tt-success)]/25 bg-[var(--tt-success-soft)] text-[var(--tt-success)]',
  warning: 'border-[var(--tt-warning)]/25 bg-[var(--tt-warning)]/10 text-[var(--tt-warning)]',
  danger: 'border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]',
};

export const SHORTFALL_LABEL: Record<ShortfallAction, string> = {
  recover: 'Recover from final settlement', waive: 'Waive the shortfall', buyout_by_employee: 'Employee buys out the notice',
};

export const REHIRE_LABEL: Record<RehireEligibility, string> = { yes: 'Eligible to rejoin', no: 'Not eligible', conditional: 'Conditional' };

export const OFFER_KIND_LABEL: Record<OfferKind, string> = {
  hike: 'Salary hike', retention_bonus: 'Retention bonus', hike_and_bonus: 'Hike and retention bonus', role_change: 'Role change', other: 'Other',
};

export const OFFER_STATUS_META: Record<OfferStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' }, sent: { label: 'Sent', tone: 'info' }, accepted: { label: 'Accepted', tone: 'success' },
  declined: { label: 'Declined', tone: 'danger' }, expired: { label: 'Expired', tone: 'neutral' }, withdrawn: { label: 'Withdrawn', tone: 'neutral' },
};

export const DOC_TYPES: { value: ExitDocType; label: string }[] = [
  { value: 'resignation_acceptance', label: 'Resignation acceptance letter' },
  { value: 'relieving_letter', label: 'Relieving letter' },
  { value: 'experience_letter', label: 'Experience letter' },
  { value: 'noc', label: 'No objection certificate' },
  { value: 'fnf_statement', label: 'Full and final statement' },
];

export const TIMELINE_KIND_LABEL: Record<string, string> = {
  submitted: 'Exit submitted', accepted: 'Accepted', rejected: 'Rejected', withdrawn: 'Withdrawn', retention_started: 'Retention started',
  offer_created: 'Offer created', offer_sent: 'Offer sent', offer_accepted: 'Offer accepted', offer_declined: 'Offer declined',
  offer_withdrawn: 'Offer withdrawn', offer_expired: 'Offer expired', retained: 'Retained', last_day_changed: 'Last working day changed',
  flags_changed: 'Flags updated', document_generated: 'Document generated', exited: 'Exited', started: 'Exit started',
  withdraw_requested: 'Withdrawal requested',
};

/** List tabs of the HR desk. `status` is sent as a comma separated list. */
export const LIST_TABS = [
  { value: 'requests', label: 'Requests', status: 'submitted,retention', count: ['submitted', 'retention'] },
  { value: 'notice', label: 'Notice', status: 'accepted,serving_notice', count: ['serving_notice'] },
  { value: 'clearance', label: 'Clearance', status: 'clearance', count: ['clearance'] },
  { value: 'fnf', label: 'F&F', status: 'settlement', count: ['settlement'] },
  { value: 'exited', label: 'Exited', status: 'exited', count: ['exited'] },
] as const;
export type ListTab = (typeof LIST_TABS)[number]['value'];

export const CLEARANCE_STATUS_META: Record<ClearanceStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: 'warning' }, cleared: { label: 'Cleared', tone: 'success' }, waived: { label: 'Waived', tone: 'neutral' },
};
export const OWNER_TYPE_LABEL: Record<ClearanceOwnerType, string> = {
  role: 'A role', permission: 'A permission holder', manager: 'Reporting manager', employee: 'The employee',
};
export const SETTLEMENT_STATUS_META: Record<SettlementStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' }, pending_approval: { label: 'Awaiting approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'info' }, paid: { label: 'Paid', tone: 'success' },
};
export const PAY_MODE_LABEL = { next_run: 'In the next payroll run', off_cycle: 'Off-cycle payment' } as const;
export const SettlementRequestType = 'exit_settlement';

export const INSIGHT_PERMISSIONS = ['EXIT_VIEW', 'EXIT_MANAGE', 'HR_MODE'];
