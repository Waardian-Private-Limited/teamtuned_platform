import type { PipStatus, FeedbackStatus, Relation, AckStatus, FinalStatus, Aggregation, CheckIn, CycleStatus, ScoreBasis, CycleType, SheetStatus, Direction, EntryBy, GoalMode, ScoringMethod, Source, Unit } from '../types/perf.types';

export const PERF_FEATURE = 'PERFORMANCE_FEATURE';
export const PERF_PERMISSIONS = { CONFIGURE: 'PERF_CONFIGURE', VIEW: 'PERF_VIEW_ALL', CYCLES: 'PERF_CYCLE_MANAGE', CALIBRATE: 'PERF_CALIBRATE', PIP: 'PERF_PIP_MANAGE', OKR: 'PERF_OKR_MANAGE', TALENT: 'PERF_TALENT_MANAGE' } as const;

export const TABS = [
  { value: 'templates', label: 'Templates' },
  { value: 'kpis', label: 'KPIs' },
  { value: 'kras', label: 'KRAs' },
  { value: 'competencies', label: 'Competencies' },
  { value: 'scales', label: 'Rating scales' },
  { value: 'rules', label: 'Who gets what' },
  { value: 'settings', label: 'Settings' },
  { value: 'presets', label: 'Starter packs' },
] as const;
export type TabKey = (typeof TABS)[number]['value'];

export const UNIT_LABEL: Record<Unit, string> = { number: 'Number', percent: 'Percent', currency: 'Money', duration_minutes: 'Minutes', count: 'Count', yes_no: 'Yes / No', rating: 'Rating' };
export const DIRECTION_LABEL: Record<Direction, string> = { higher_better: 'Higher is better', lower_better: 'Lower is better', binary: 'Met or not met' };
export const AGGREGATION_LABEL: Record<Aggregation, string> = { sum: 'Total', avg: 'Average', min: 'Lowest', max: 'Highest', count: 'Count', last: 'Latest value' };
export const SCORING_LABEL: Record<ScoringMethod, string> = {
  linear: 'Proportional to target', threshold: 'Proportional, zero below a minimum', binary: 'All or nothing', range: 'Full marks inside a range', slab: 'Score bands',
};
export const ENTRY_LABEL: Record<EntryBy, string> = { self: 'Employee', manager: 'Manager', hr: 'HR' };
export const GOAL_MODE_LABEL: Record<GoalMode, string> = { manager_sets: 'Manager sets goals', employee_proposes: 'Employee proposes goals', both: 'Both can add goals' };
export const SOURCE_LABEL: Record<Source, string> = {
  manual: 'Typed in', import: 'Uploaded from a file', data_collection: 'Data Collection form', tasks: 'Tasks', attendance: 'Attendance', leave: 'Leave', recruitment: 'Recruitment', formula: 'Calculated from other KPIs',
};
export const MEASURE_LABEL: Record<string, string> = {
  completed_count: 'Tasks completed', on_time_rate: 'On-time rate', avg_review_rating: 'Average review rating', avg_cycle_hours: 'Average hours to finish', time_spent_hours: 'Hours worked on tasks',
  present_rate: 'Attendance rate', present_days: 'Days present', absent_days: 'Days absent', late_count: 'Late arrivals', late_minutes: 'Minutes late', worked_hours: 'Hours worked', overtime_hours: 'Overtime hours', night_ot_hours: 'Night OT hours', night_ot_days: 'Night OT days', off_day_worked_days: 'Days off worked', punctuality_rate: 'Punctuality', consistency_score: 'Consistency score',
  leave_days: 'Leave days', unplanned_leave_days: 'Unplanned leave days', leave_count: 'Leave applications', hires_owned: 'Hires closed', referrals_hired: 'Referrals hired',
  // Same measure name, different source: keyed source.measure.
  'tasks.late_count': 'Tasks finished late',
  'data_collection.field_value': 'A tracked number field', 'data_collection.submission_count': 'Times the form was filled', 'data_collection.approval_rate': '% of submissions approved', 'data_collection.on_time_rate': '% filled on time',
};
export const measureLabel = (source: string, measure: string) => MEASURE_LABEL[`${source}.${measure}`] || MEASURE_LABEL[measure] || measure;
export const TASK_PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' } as const;
export const DIMENSION_LABEL = {
  site_ids: 'Sites', department_ids: 'Departments', role_ids: 'Roles', grade_ids: 'Grades', employment_type_ids: 'Employment types', cost_centre_ids: 'Cost centres',
} as const;
export const SECTION_LABEL = { kpi: 'KPIs', competency: 'Competencies', feedback: '360 feedback' } as const;

export const CYCLE_STATUS_LABEL: Record<CycleStatus, string> = {
  draft: 'Draft', goal_setting: 'Setting goals', in_progress: 'In progress', review: 'In review', calibration: 'Calibration', released: 'Released', closed: 'Closed',
};
export const CYCLE_TYPE_LABEL: Record<CycleType, string> = { annual: 'Yearly', half_yearly: 'Half-yearly', quarterly: 'Quarterly', monthly: 'Monthly', custom: 'Custom' };
export const CHECK_IN_LABEL: Record<CheckIn, string> = { none: 'One block, no breaks', monthly: 'Monthly breaks', quarterly: 'Quarterly breaks', half_yearly: 'Half-yearly breaks', custom: 'Custom breaks' };
export const SCORE_BASIS_LABEL: Record<ScoreBasis, string> = {
  whole_cycle: 'Whole year against the yearly target', average: 'Average of the breaks', weighted: 'Weighted by break', last: 'Latest break',
};
export const SCORE_BASIS_HINT: Record<ScoreBasis, string> = {
  whole_cycle: 'Each goal is scored once, on its whole-cycle value. Breaks are check-ins only.',
  average: 'Each goal is scored in every break against that break\'s target; the year-end score is the plain average.',
  weighted: 'Each break is scored against its own target; the year-end score weights them (for example Q4 counts more).',
  last: 'The year-end score is the score of the latest break that has one. Useful for running totals.',
};
/** The stages a cycle moves through, in order. */
export const CYCLE_STAGES: { status: CycleStatus; label: string; hint: string }[] = [
  { status: 'draft', label: 'Draft', hint: 'Set dates, breaks and who is invited. Create goal sheets.' },
  { status: 'goal_setting', label: 'Goal setting', hint: 'Managers and employees agree goals; sheets go for approval.' },
  { status: 'in_progress', label: 'In progress', hint: 'Values come in from typing, files and the system. Check-ins per break.' },
  { status: 'review', label: 'Review', hint: 'Self review, then the manager\'s final review and rating.' },
  { status: 'calibration', label: 'Calibration', hint: 'Optional. Compare ratings across groups and adjust with a reason.' },
  { status: 'released', label: 'Released', hint: 'Employees see their rating, acknowledge it or dispute it.' },
  { status: 'closed', label: 'Closed', hint: 'Read only. Ratings can feed salary revisions.' },
];
export const SHEET_STATUS_LABEL: Record<SheetStatus, string> = { draft: 'Draft', submitted: 'Waiting for approval', approved: 'Approved', revision_requested: 'Changes needed' };
export const ELIGIBILITY_LABEL = { employment_type_ids: 'Employment types', department_ids: 'Departments', site_ids: 'Sites', role_ids: 'Roles', grade_ids: 'Grades' } as const;

export const FINAL_STATUS_LABEL: Record<FinalStatus, string> = { pending: 'Not reviewed', submitted: 'Review waiting for approval', approved: 'Review approved', revision_requested: 'Review needs changes' };
export const ACK_LABEL: Record<AckStatus, string> = {
  none: '', pending: 'Waiting for the employee', acknowledged: 'Acknowledged', disputed: 'Disputed', dispute_upheld: 'Dispute upheld', dispute_rejected: 'Dispute rejected',
};

export const RELATION_LABEL: Record<Relation, string> = { peer: 'Colleague', subordinate: 'Reports to them', cross_team: 'Other team', external: 'Outside the company' };
export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = { proposed: 'Waiting for the reviewer to approve', pending: 'Asked', declined: 'Declined', submitted: 'Answered' };

export const PIP_STATUS_LABEL: Record<PipStatus, string> = { draft: 'Draft', pending_start: 'Waiting for approval to start', active: 'Active', pending_outcome: 'Outcome waiting for approval', closed: 'Closed' };
