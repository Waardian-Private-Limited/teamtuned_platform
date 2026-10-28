/**
 * Where a notification opens on the web. The server sends a fixed `screen` key; this is the one place that
 * knows the page for each, in each area. An unknown key opens the area's home, never a dead end.
 */
export type Area = 'employee' | 'org-admin';

type Params = Record<string, string | undefined>;
type Page = (p: Params) => string;

const both = (employee: string | Page, orgAdmin: string | Page): Record<Area, Page> => ({
  employee: typeof employee === 'function' ? employee : () => employee,
  'org-admin': typeof orgAdmin === 'function' ? orgAdmin : () => orgAdmin,
});

const PERF_PAGE: Record<string, string> = { goals: 'my-goals', team: 'team-goals', feedback: 'feedback', plans: 'improvement-plans', kudos: 'kudos', one_on_ones: 'one-on-ones', okrs: 'okrs', talent: 'talent' };

const PAGES: Record<string, Record<Area, Page>> = {
  'notifications': both('/employee/notifications', '/org-admin/notifications'),
  'leave.mine': both('/employee/leave', '/org-admin/leave'),
  'leave.review': both('/employee/leave-requests', '/org-admin/leave'),
  'compoff.mine': both('/employee/leave', '/org-admin/leave'),
  'regularize.mine': both('/employee/my-attendance', '/org-admin/attendance/approvals'),
  'regularize.review': both('/employee/approvals', '/org-admin/approvals'),
  'holiday.list': both('/employee/holidays', '/org-admin/holidays'),
  'advance.list': both('/employee/my-advances', '/org-admin/salary-advance'),
  'advance.detail': both('/employee/my-advances', '/org-admin/salary-advance'),
  'expense.claim': both((p) => (p.claim_id ? `/employee/my-expenses/${p.claim_id}` : '/employee/my-expenses'), '/org-admin/expenses'),
  'wallet.statement': both('/employee/my-expenses/wallet', '/org-admin/expenses/wallets'),
  'petty_cash.expense': both(
    (p) => (p.expense_id ? `/employee/my-petty-cash/expenses/${p.expense_id}` : '/employee/my-petty-cash?tab=expenses'),
    (p) => (p.expense_id ? `/org-admin/petty-cash/expenses/${p.expense_id}` : '/org-admin/petty-cash/expenses')
  ),
  'petty_cash.wallet': both(
    (p) => (p.wallet_id ? `/employee/my-petty-cash/wallets/${p.wallet_id}` : '/employee/my-petty-cash'),
    (p) => (p.wallet_id ? `/org-admin/petty-cash/wallets/${p.wallet_id}` : '/org-admin/petty-cash/wallets')
  ),
  'exit.mine': both('/employee/my-exit', '/org-admin/exits'),
  'exit.case': both((p) => (p.id ? `/employee/exits/${p.id}` : '/employee/approvals'), (p) => (p.id ? `/org-admin/exits/${p.id}` : '/org-admin/exits')),
  'exit.review': both('/employee/approvals', '/org-admin/approvals'),
  'approvals.inbox': both('/employee/approvals', '/org-admin/approvals'),
  // Approver pushes for petty cash expenses and fund requests.
  'petty_cash.approvals': both('/employee/approvals', '/org-admin/approvals'),
  'birthday.wall': both((p) => `/employee/birthdays${p.employee_id ? `?e=${p.employee_id}` : ''}`, (p) => `/org-admin/birthdays${p.employee_id ? `?e=${p.employee_id}` : ''}`),
  'roster.mine': both('/employee/roster', '/org-admin/roster'),
  'recruitment.interview': both('/employee/my-interviews', '/org-admin/recruitment'),
  'recruitment.review': both('/employee/my-reviews', '/org-admin/recruitment'),
  'recruitment.referrals': both('/employee/refer', '/org-admin/recruitment/referral-rewards'),
  'meeting.home': both('/employee/mom', '/org-admin/mom'),
  'meeting.detail': both((p) => `/employee/mom/meetings/${p.id}`, (p) => `/org-admin/mom/meetings/${p.id}`),
  'meeting.point': both((p) => `/employee/mom/meetings/${p.id}?point=${p.point_id}`, (p) => `/org-admin/mom/meetings/${p.id}?point=${p.point_id}`),
  'dpr.home': both((p) => (p.site_id ? (p.tab === 'plan' ? `/employee/dpr/planning/${p.site_id}?tab=plan` : `/employee/dpr/dashboard?site=${p.site_id}`) : '/employee/dpr/daily'), (p) => (p.site_id ? (p.tab === 'plan' ? `/org-admin/dpr/planning/${p.site_id}?tab=plan` : `/org-admin/dpr/dashboard?site=${p.site_id}`) : '/org-admin/dpr/daily')),
  'dpr.report': both((p) => `/employee/dpr/daily/${p.site_id}/${p.date}?kind=${p.kind || 'progress'}`, (p) => `/org-admin/dpr/daily/${p.site_id}/${p.date}?kind=${p.kind || 'progress'}`),
  // `tab` picks the page: my goals, team goals, 360 feedback, improvement plans.
  'learning': both((p) => `/employee/learning?tab=${p.tab === 'team' ? 'team' : 'mine'}`, (p) => `/org-admin/learning?tab=${p.tab === 'team' ? 'team' : 'mine'}`),
  'surveys': both('/employee/surveys', '/org-admin/surveys'),
  'appraisal.team': both('/employee/team-appraisals', '/org-admin/compensation?tab=appraisals'),
  'performance': both((p) => `/employee/performance/${PERF_PAGE[p.tab ?? ''] ?? 'my-goals'}`, (p) => `/org-admin/performance/${p.tab === 'goals' ? 'team-goals' : PERF_PAGE[p.tab ?? ''] ?? 'team-goals'}`),
  'employee.detail': both(
    (p) => `/employee/employee-management${p.id ? `/${p.id}` : ''}`,
    (p) => `/org-admin/employees${p.id ? `/${p.id}` : ''}`
  ),
};

const HOME: Record<Area, string> = { employee: '/employee', 'org-admin': '/org-admin' };

export function linkFor(screen: string, params: Params | undefined, area: Area): string {
  return PAGES[screen]?.[area](params ?? {}) ?? HOME[area];
}

export const areaOfRole = (role: string | null | undefined): Area => (role === 'OrgAdmin' ? 'org-admin' : 'employee');
