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

const PAGES: Record<string, Record<Area, Page>> = {
  'notifications': both('/employee/notifications', '/org-admin/notifications'),
  'leave.mine': both('/employee/leave', '/org-admin/my-leave'),
  'leave.review': both('/employee/leave-requests', '/org-admin/leave'),
  'compoff.mine': both('/employee/leave', '/org-admin/my-leave'),
  'regularize.mine': both('/employee/my-attendance', '/org-admin/my-attendance'),
  'regularize.review': both('/employee/approvals', '/org-admin/approvals'),
  'holiday.list': both('/employee/holidays', '/org-admin/holidays'),
  'advance.list': both('/employee/my-advances', '/org-admin/salary-advance'),
  'advance.detail': both('/employee/my-advances', '/org-admin/salary-advance'),
  'expense.claim': both((p) => (p.claim_id ? `/employee/my-expenses/${p.claim_id}` : '/employee/my-expenses'), '/org-admin/expenses'),
  'wallet.statement': both('/employee/my-expenses/wallet', '/org-admin/wallet-overview'),
  'approvals.inbox': both('/employee/approvals', '/org-admin/approvals'),
  'birthday.wall': both((p) => `/employee/birthdays${p.employee_id ? `?e=${p.employee_id}` : ''}`, (p) => `/org-admin/birthdays${p.employee_id ? `?e=${p.employee_id}` : ''}`),
  'roster.mine': both('/employee/roster', '/org-admin/roster'),
  'recruitment.interview': both('/employee/my-interviews', '/org-admin/recruitment'),
  'recruitment.review': both('/employee/my-reviews', '/org-admin/recruitment'),
  'recruitment.referrals': both('/employee/refer', '/org-admin/recruitment/referral-rewards'),
  'meeting.point': both('/employee/mom', '/org-admin/mom'),
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
