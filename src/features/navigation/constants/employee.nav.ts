import {
  Home, Building2, MapPin, Link2, DollarSign, Building, UserCog, BarChart3,
  ClipboardList, Cog, Shield, Calendar, Settings, Clock, CheckSquare,
  AlertCircle, FileText, MinusCircle, Users, LayoutDashboard,
  ListChecks, LayoutGrid, Wallet, Receipt, ArrowUpCircle,
  Package, Coins, Briefcase, HardHat, Layers, Award, UserPlus, List,
  CalendarRange, Repeat, Inbox, Wrench, CalendarDays, CalendarCheck, User, TreePalm, UserRound, Tags,
  Smartphone, CalendarClock, ClipboardCheck, FileSignature, Share2, HeartPulse,
} from 'lucide-react';
import type { NavNode } from '../types/nav.model';

/**
 * Employee-area nav tree — transcribed from the legacy
 * src/components/employee/EmployeeSidebar.tsx (~110 items, 13 sections plus
 * the 3-level-deep Inventory tree).
 *
 * The ~55 `canView*`/`hasAnyPerm` checks in the legacy file become per-node
 * `gate`s here. Where a legacy section header was wrapped in an explicit
 * boolean (`showOrgMain`, `canViewMOM`, ...) whose items are NOT all
 * conditional — so an empty-children check alone wouldn't reproduce it — the
 * same gate is set explicitly on the group. Where every item in a section
 * carries its own condition and those conditions union to exactly the
 * legacy section boolean, the group is left ungated and
 * `filterNav`'s "hide an empty group" rule reproduces it, which also fixes
 * the one real gap this creates: a permission that only unlocks a role in
 * one section can no longer leave a dead, empty header for a different
 * section (see e.g. the Main-vs-Attendance overlap in the legacy source).
 */
export const employeeNav: NavNode[] = [
  {
    kind: 'group', id: 'self', label: 'Self', icon: User,
    children: [
      { kind: 'link', label: 'Dashboard', href: '/employee', icon: Home },
      { kind: 'link', label: 'My profile', href: '/employee/my-profile', icon: UserRound },
      { kind: 'link', label: 'My Attendance', href: '/employee/my-attendance', icon: CalendarCheck },
      { kind: 'link', label: 'My Leave', href: '/employee/leave', icon: TreePalm, match: 'prefix' },
      { kind: 'link', label: 'My payslips', href: '/employee/my-payslips', icon: Receipt, gate: { feature: 'PAYROLL_FEATURE' } },
      { kind: 'link', label: 'My advances', href: '/employee/my-advances', icon: Wallet, gate: { feature: 'PAYROLL_FEATURE' } },
      { kind: 'link', label: 'My insurance', href: '/employee/my-insurance', icon: HeartPulse, gate: { feature: 'INSURANCE_FEATURE' } },
      { kind: 'link', label: 'Approvals', href: '/employee/approvals', icon: Inbox, match: 'prefix' },
      { kind: 'link', label: 'My interviews', href: '/employee/my-interviews', icon: CalendarClock, match: 'prefix', gate: { recruitmentRole: 'interviewer' } },
      { kind: 'link', label: 'My reviews', href: '/employee/my-reviews', icon: ClipboardCheck, match: 'prefix', gate: { recruitmentRole: 'reviewer' } },
      // Hiring managers without recruitment permissions: their own positions (the page defaults to "Mine").
      { kind: 'link', label: 'My hiring', href: '/employee/recruitment/positions', icon: Briefcase, match: 'prefix', gate: { recruitmentRole: 'hiring_manager', noneOfPerms: ['RECRUIT_VIEW', 'RECRUIT_MANAGE', 'RECRUIT_OFFER', 'RECRUIT_HIRE', 'RECRUIT_SETTINGS'] } },
      { kind: 'link', label: 'Refer a candidate', href: '/employee/refer', icon: Share2, match: 'prefix' },
    ],
  },

  {
    kind: 'group', id: 'attendance', label: 'Attendance', gate: { feature: 'PAYROLL_FEATURE' },
    children: [
      { kind: 'link', label: 'Approvals', href: '/employee/attendance/approvals', icon: CheckSquare },
      { kind: 'link', label: 'Dashboard', href: '/employee/attendance-dashboard', icon: BarChart3, match: 'prefix', gate: { anyPerm: ['ATTEND_VIEW', 'ATTEND_ADD', 'ATTEND_EDIT'] } },
      {
        kind: 'link', label: 'Detailed Attendance', href: '/employee/attendance', icon: ClipboardList,
        activeTest: (p) => p === '/employee/attendance' || (p.startsWith('/employee/attendance/') && !p.startsWith('/employee/attendance-') && !p.startsWith('/employee/attendance/approvals')),
        gate: { anyPerm: ['ATTEND_VIEW', 'ATTEND_ADD', 'ATTEND_EDIT'] },
      },
      { kind: 'link', label: 'Holidays', href: '/employee/holidays', icon: Calendar, match: 'prefix' },
      { kind: 'link', label: 'Leave Management', href: '/employee/leave-requests', icon: Calendar, match: 'prefix', gate: { anyPerm: ['LEAVE_VIEW', 'LEAVE_ADD', 'LEAVE_EDIT', 'LEAVE_APPROVE'] } },
    ],
  },

  {
    kind: 'group', id: 'payroll', label: 'Payroll', gate: { feature: 'PAYROLL_FEATURE' },
    children: [
      { kind: 'link', label: 'Payroll', href: '/employee/payroll', icon: DollarSign, match: 'prefix', gate: { anyPerm: ['PAYROLL_VIEW', 'HR_MODE'] } },
      { kind: 'link', label: 'Salary Slips', href: '/employee/salary-slips', icon: FileText, match: 'prefix', gate: { anyPerm: ['PAYROLL_VIEW', 'HR_MODE'] } },
      { kind: 'link', label: 'Payouts', href: '/employee/payouts', icon: Wallet, gate: { anyPerm: ['PAYOUTS_VIEW', 'PAYOUTS_PAY'] } },
      { kind: 'link', label: 'Other Deductions', href: '/employee/other-deductions', icon: MinusCircle, match: 'prefix', gate: { anyPerm: ['HR_MODE', 'COMP_VIEW', 'COMP_ADD', 'COMP_DELETE'] } },
      { kind: 'link', label: 'Payroll Setup', href: '/employee/payroll-setup', icon: Coins, match: 'prefix', gate: { anyPerm: ['SALARY_CONFIG_VIEW', 'SALARY_CONFIG_ADD', 'DEBIT_RULE_VIEW', 'DEBIT_RULE_ADD', 'HR_MODE', 'PAYROLL_ADMIN'] } },
      { kind: 'link', label: 'Increments & Promotions', href: '/employee/salary-revisions', icon: ArrowUpCircle, match: 'prefix', gate: { anyPerm: ['COMP_VIEW', 'COMP_ADD', 'COMP_EDIT', 'COMP_APPROVE', 'HR_MODE'] } },
      { kind: 'link', label: 'Compensation', href: '/employee/compensation', icon: Award, match: 'prefix', gate: { anyPerm: ['COMP_VIEW', 'COMP_ADD', 'COMP_EDIT', 'COMP_APPROVE', 'HR_MODE'] } },
  { kind: 'link', label: 'Insurance', href: '/employee/insurance', icon: HeartPulse, match: 'prefix', gate: { feature: 'INSURANCE_FEATURE', anyPerm: ['INS_VIEW', 'INS_MANAGE_PLANS', 'INS_MANAGE_ENROLLMENTS'] } },
    ],
  },

  {
    kind: 'group', id: 'roster', label: 'Roster', gate: { feature: 'ROSTER_FEATURE' },
    children: [
      { kind: 'link', label: 'My Roster', href: '/employee/roster/my', icon: CalendarDays, match: 'prefix' },
      { kind: 'link', label: 'Shift Requests', href: '/employee/roster/requests', icon: Inbox, match: 'prefix' },
      { kind: 'link', label: 'Insights', href: '/employee/roster/insights', icon: BarChart3, match: 'prefix', gate: { anyPerm: ['ROSTER_VIEW', 'ROSTER_ADD', 'ROSTER_EDIT', 'ROSTER_PUBLISH', 'ROSTER_APPROVE', 'ROSTER_DELETE'] } },
      { kind: 'link', label: 'Planner', href: '/employee/roster', icon: CalendarRange, activeTest: (p) => p === '/employee/roster' || /^\/employee\/roster\/\d+/.test(p), gate: { anyPerm: ['ROSTER_VIEW', 'ROSTER_ADD', 'ROSTER_EDIT', 'ROSTER_PUBLISH', 'ROSTER_APPROVE', 'ROSTER_DELETE'] } },
      { kind: 'link', label: 'Teams', href: '/employee/roster/teams', icon: Users, match: 'prefix', gate: { anyPerm: ['ROSTER_VIEW', 'ROSTER_ADD', 'ROSTER_EDIT', 'ROSTER_PUBLISH', 'ROSTER_APPROVE', 'ROSTER_DELETE'] } },
      { kind: 'link', label: 'Patterns', href: '/employee/roster/patterns', icon: Repeat, match: 'prefix', gate: { anyPerm: ['ROSTER_VIEW', 'ROSTER_ADD', 'ROSTER_EDIT', 'ROSTER_PUBLISH', 'ROSTER_APPROVE', 'ROSTER_DELETE'] } },
      { kind: 'link', label: 'Skills', href: '/employee/roster/skills', icon: Wrench, match: 'prefix', gate: { anyPerm: ['ROSTER_VIEW', 'ROSTER_ADD', 'ROSTER_EDIT', 'ROSTER_PUBLISH', 'ROSTER_APPROVE', 'ROSTER_DELETE'] } },
      { kind: 'link', label: 'Shifts', href: '/employee/shift-templates', icon: Clock, match: 'prefix', gate: { anyPerm: ['ATTENDCONFIG_VIEW', 'ATTENDCONFIG_ADD', 'ATTENDCONFIG_EDIT', 'ATTENDCONFIG_DELETE'] } },
    ],
  },

  {
    kind: 'group', id: 'management', label: 'Management', gate: { feature: 'PAYROLL_FEATURE' },
    children: [
      { kind: 'link', label: 'Employees', href: '/employee/employee-management', icon: Users, match: 'prefix', gate: { anyPerm: ['EMP_VIEW', 'EMP_ADD', 'EMP_EDIT', 'EMP_DELETE'] } },
      { kind: 'link', label: 'Policies', href: '/employee/policies', icon: Shield, match: 'prefix', gate: { anyPerm: ['POLICY_VIEW', 'POLICY_ADD', 'POLICY_EDIT', 'POLICY_DELETE'] } },
      { kind: 'link', label: 'Shifts', href: '/employee/shift-templates', icon: Clock, match: 'prefix', gate: { anyPerm: ['ATTENDCONFIG_VIEW', 'ATTENDCONFIG_ADD', 'ATTENDCONFIG_EDIT', 'ATTENDCONFIG_DELETE'] } },
      { kind: 'link', label: 'Sites', href: '/employee/sites', icon: MapPin, gate: { anyPerm: ['SITE_VIEW', 'SITE_ADD', 'SITE_EDIT', 'SITE_DELETE'] } },
      { kind: 'link', label: 'Other Locations', href: '/employee/other-locations', icon: MapPin, match: 'prefix', gate: { anyPerm: ['EMPSITE_VIEW', 'EMPLOYEE_ASSIGN_SITE'] } },
      { kind: 'link', label: 'Sub Organizations', href: '/employee/sub-organizations', icon: Building2, gate: { anyPerm: ['SITE_VIEW', 'SITE_ADD', 'SITE_EDIT', 'SITE_DELETE'] } },
      { kind: 'link', label: 'Departments', href: '/employee/departments', icon: Building, match: 'prefix', gate: { anyPerm: ['DEPT_VIEW', 'DEPT_ADD', 'DEPT_EDIT', 'DEPT_DELETE'] } },
      { kind: 'link', label: 'Roles', href: '/employee/roles', icon: UserCog, match: 'prefix', gate: { anyPerm: ['ROLE_VIEW', 'ROLE_ADD', 'ROLE_EDIT', 'ROLE_DELETE'] } },
      { kind: 'link', label: 'Approval Flows', href: '/employee/approval-flows', icon: ListChecks, match: 'prefix', gate: { anyPerm: ['APPROVAL_FLOW_VIEW', 'APPROVAL_FLOW_MANAGE', 'HR_MODE'] } },
    ],
  },

  {
    kind: 'group', id: 'tools', label: 'Tools', gate: { feature: 'PAYROLL_FEATURE' },
    children: [
      { kind: 'link', label: 'Organization Profile', href: '/employee/orgProfile', icon: Building2, match: 'prefix', gate: { anyPerm: ['ORGPROFILE_VIEW', 'ORGPROFILE_ADD', 'ORGPROFILE_EDIT', 'ORGPROFILE_DELETE'] } },
      { kind: 'link', label: 'Site-Sub-Org Mapper', href: '/employee/site-sub-org-mapper', icon: Link2, gate: { anyPerm: ['SITE_VIEW', 'SITE_ADD', 'SITE_EDIT', 'SITE_DELETE'] } },
      { kind: 'link', label: 'Site Assignment', href: '/employee/employee-sites', icon: MapPin, match: 'prefix', gate: { anyPerm: ['EMPSITE_VIEW', 'EMPLOYEE_ASSIGN_SITE'] } },
      { kind: 'link', label: 'Site Logins', href: '/employee/site-logins', icon: Shield, match: 'prefix', gate: { perm: 'LABOR_ADMIN' } },
      { kind: 'link', label: 'Employee Devices', href: '/employee/device-management', icon: Smartphone, match: 'prefix', gate: { perm: 'EMP_DEVICE_MANAGEMENT' } },
    ],
  },

  {
    kind: 'group', id: 'salary-advance', label: 'Salary Advance', gate: {
      feature: 'PAYROLL_FEATURE',
      anyPerm: ['SALADV_VIEW', 'SALADV_PAY', 'SALADV_CREATE', 'SALADV_POLICY'],
    },
    children: [
      { kind: 'link', label: 'Overview', href: '/employee/salary-advance', icon: LayoutDashboard, gate: { anyPerm: ['SALADV_VIEW'] } },
      { kind: 'link', label: 'Advances', href: '/employee/salary-advance/advances', icon: ClipboardList, match: 'prefix', gate: { anyPerm: ['SALADV_VIEW', 'SALADV_PAY', 'SALADV_CREATE'] } },
      { kind: 'link', label: 'Advance types', href: '/employee/salary-advance/types', icon: Layers, match: 'prefix', gate: { anyPerm: ['SALADV_POLICY'] } },
    ],
  },

  {
    kind: 'group', id: 'recruitment', label: 'Recruitment',
    gate: { anyPerm: ['RECRUIT_VIEW', 'RECRUIT_MANAGE', 'RECRUIT_OFFER', 'RECRUIT_HIRE', 'RECRUIT_SETTINGS'] },
    children: [
      { kind: 'link', label: 'Overview', href: '/employee/recruitment', icon: LayoutDashboard },
      { kind: 'link', label: 'Positions', href: '/employee/recruitment/positions', icon: Briefcase, match: 'prefix' },
      { kind: 'link', label: 'Candidates', href: '/employee/recruitment/candidates', icon: Users, match: 'prefix' },
      { kind: 'link', label: 'Interviews', href: '/employee/recruitment/interviews', icon: CalendarClock, match: 'prefix' },
      { kind: 'link', label: 'Offers', href: '/employee/recruitment/offers', icon: FileSignature, match: 'prefix' },
      { kind: 'link', label: 'Document Centre', href: '/employee/recruitment/documents', icon: FileText, match: 'prefix', gate: { anyPerm: ['DOC_GENERATE', 'DOC_TEMPLATES_MANAGE', 'HR_MODE'] } },
      { kind: 'link', label: 'Settings', href: '/employee/recruitment/settings', icon: Settings, match: 'prefix', gate: { perm: 'RECRUIT_SETTINGS' } },
    ],
  },

  {
    kind: 'group', id: 'expenses', label: 'Expenses', gate: { anyFeature: ['REIMBURSEMENT_FEATURE', 'EXPENSE_WALLET_FEATURE'] },
    children: [
      { kind: 'link', label: 'My expenses', href: '/employee/my-expenses', icon: Receipt, match: 'prefix' },
      { kind: 'link', label: 'Overview', href: '/employee/expenses', icon: LayoutDashboard, gate: { anyPerm: ['REIMB_VIEW', 'EMP_WALLET_VIEW'] } },
      { kind: 'link', label: 'Claims', href: '/employee/expenses/claims', icon: ClipboardList, match: 'prefix', gate: { anyPerm: ['REIMB_VIEW', 'REIMB_APPROVE', 'REIMB_DISBURSE', 'REIMB_PHYSICAL_COLLECT'] } },
      {
        kind: 'link', label: 'Wallets', href: '/employee/expenses/wallets', icon: Wallet, match: 'prefix',
        gate: { feature: 'EXPENSE_WALLET_FEATURE', anyPerm: ['EMP_WALLET_VIEW', 'EMP_WALLET_CREATE', 'EMP_WALLET_TOPUP', 'EMP_WALLET_LOCK'] },
      },
      { kind: 'link', label: 'Categories', href: '/employee/expenses/categories', icon: Tags, match: 'prefix', gate: { perm: 'REIMB_ADMIN' } },
    ],
  },

  {
    kind: 'group', id: 'petty-cash', label: 'Petty Cash', gate: { feature: 'WALLET_FEATURE' },
    children: [
      { kind: 'link', label: 'Wallets', href: '/employee/petty-cash', icon: DollarSign, match: 'prefix', gate: { anyPerm: ['WALLET_ADMIN', 'WALLET_VIEW', 'WALLET_ADD'] } },
      { kind: 'link', label: 'Wallet Expenses', href: '/employee/wallet-overview', icon: Receipt, match: 'prefix', gate: { anyPerm: ['WALLET_ADMIN', 'EXPENSE_VIEW', 'EXPENSE_ADD', 'EXPENSE_EDIT', 'EXPENSE_DELETE'] } },
      { kind: 'link', label: 'Wallet Config', href: '/employee/wallet-config', icon: Cog, match: 'prefix', gate: { anyPerm: ['WALLET_ADMIN'] } },
      { kind: 'link', label: 'Wallet Topups', href: '/employee/wallet-topups', icon: ArrowUpCircle, match: 'prefix', gate: { anyPerm: ['WALLET_ADMIN', 'WALLET_TOPUP'] } },
    ],
  },

  {
    kind: 'group', id: 'inventory', label: 'Inventory', gate: { feature: 'INVENTORY_FEATURE' },
    children: [
      {
        kind: 'group', id: 'inventory-master-data', label: 'Master Data',
        children: [
          { kind: 'link', label: 'Onboarding', href: '/employee/inventory/onboarding', icon: Package, match: 'prefix' },
          { kind: 'link', label: 'Site Config', href: '/employee/inventory/sites', icon: Building2, match: 'prefix' },
          { kind: 'link', label: 'Categories', href: '/employee/inventory/categories', icon: Package, match: 'prefix' },
          { kind: 'link', label: 'Subcategories', href: '/employee/inventory/subcategories', icon: Package, match: 'prefix' },
          { kind: 'link', label: 'Vendors', href: '/employee/inventory/vendors', icon: Building2, match: 'prefix' },
          { kind: 'link', label: 'Items', href: '/employee/inventory/items', icon: Package, match: 'prefix' },
        ],
      },
      {
        kind: 'group', id: 'inventory-core', label: 'CORE',
        children: [
          { kind: 'link', label: 'Store Selection', href: '/employee/inventory/stores', icon: Package, match: 'prefix' },
          { kind: 'link', label: 'Store Stock', href: '/employee/inventory/stock', icon: Package, match: 'prefix' },
          { kind: 'link', label: 'Store Batch', href: '/employee/inventory/batches', icon: Package, match: 'prefix' },
          { kind: 'link', label: 'Store Serials', href: '/employee/inventory/serials', icon: Package, match: 'prefix' },
          { kind: 'link', label: 'Stock Ledger', href: '/employee/inventory/ledger', icon: Package, match: 'prefix' },
        ],
      },
      {
        kind: 'group', id: 'inventory-transactions', label: 'Transactions',
        children: [
          { kind: 'link', label: 'GRN', href: '/employee/inventory/grn', icon: Package, match: 'prefix' },
          { kind: 'link', label: 'RFQ', href: '/employee/rfq', icon: FileText, match: 'prefix' },
          { kind: 'link', label: 'Purchase Request', href: '/employee/pr', icon: FileText, match: 'prefix' },
        ],
      },
    ],
  },

  {
    kind: 'group', id: 'task', label: 'Task', gate: { feature: 'TASK_FEATURE' },
    children: [
      { kind: 'link', label: 'Templates', href: '/employee/tasks', icon: FileText, match: 'prefix', gate: { anyPerm: ['TASK_TEMPLATES', 'TASK_CREATE'] } },
      { kind: 'link', label: 'Assignments', href: '/employee/task-assignments', icon: ListChecks, match: 'prefix', gate: { anyPerm: ['TASK_VIEW', 'TASK_ASSIGN'] } },
      { kind: 'link', label: 'Dashboard', href: '/employee/task-dashboard', icon: LayoutGrid, match: 'prefix', gate: { anyPerm: ['TASK_VIEW'] } },
    ],
  },

  {
    kind: 'group', id: 'dpr', label: 'DPR',
    children: [
      {
        kind: 'link', label: 'Planning', href: '/employee/dps/schedule', icon: Calendar, match: 'prefix',
        altHrefs: ['/employee/dps/planned-schedules'],
        gate: { anyPerm: ['DPR_ADMIN', 'DPR_PLAN', 'DPR_CONFIG', 'DPR_EDIT'] },
      },
      { kind: 'link', label: 'Daily Forms', href: '/employee/dps/assignments', icon: UserPlus, gate: { anyPerm: ['DPR_ADMIN', 'DPR_FILL', 'DPR_ADD', 'DPR_VIEW'] } },
      { kind: 'link', label: 'Planning Dashboard', href: '/employee/dps/planning-dashboard', icon: LayoutDashboard, gate: { anyPerm: ['DPR_ADMIN', 'DPR_VIEW'] } },
      { kind: 'link', label: 'CBD Dashboard', href: '/employee/dps/cbd-dashboard', icon: LayoutDashboard, gate: { anyPerm: ['DPR_ADMIN', 'DPR_VIEW'] } },
    ],
  },

  {
    kind: 'group', id: 'labor-management', label: 'Labor Management', gate: {
      feature: 'PAYROLL_FEATURE',
      anyPerm: [
        'LABOR_CAT_VIEW', 'LABOR_CAT_ADD', 'LABOR_CAT_EDIT',
        'LABOR_CONTRACTOR_VIEW', 'LABOR_CONTRACTOR_ADD', 'LABOR_CONTRACTOR_EDIT',
        'LABORER_VIEW', 'LABORER_ADD', 'LABORER_EDIT',
        'LABOR_RATE_VIEW', 'LABOR_RATE_ADD', 'LABOR_RATE_EDIT',
        'LABOR_SETTINGS_VIEW', 'LABOR_SETTINGS_EDIT',
        'LABOR_ADMIN',
      ],
    },
    children: [
      { kind: 'link', label: 'Dashboard', href: '/employee/labor-attendance/dashboard', icon: LayoutDashboard },
      { kind: 'link', label: 'Attendance Logs', href: '/employee/labor-attendance/logs', icon: ClipboardList },
      { kind: 'link', label: 'Contractor Dashboard', href: '/employee/labor-attendance/contractor-dashboard', icon: BarChart3, match: 'prefix', gate: { anyPerm: ['LABOR_ATTEND_VIEW', 'LABOR_ATTENDANCE_ADD', 'LABOR_ATTENDANCE_EDIT'] } },
      { kind: 'link', label: 'Categories', href: '/employee/labor/categories', icon: LayoutGrid, match: 'prefix', gate: { anyPerm: ['LABOR_CAT_VIEW', 'LABOR_CAT_ADD', 'LABOR_CAT_EDIT'] } },
      { kind: 'link', label: 'Subcategories', href: '/employee/labor/subcategories', icon: Layers, match: 'prefix', gate: { anyPerm: ['LABOR_CAT_VIEW', 'LABOR_CAT_ADD', 'LABOR_CAT_EDIT'] } },
      { kind: 'link', label: 'Contractors', href: '/employee/labor/contractors', icon: Briefcase, match: 'prefix', gate: { anyPerm: ['LABOR_CONTRACTOR_VIEW', 'LABOR_CONTRACTOR_ADD', 'LABOR_CONTRACTOR_EDIT'] } },
      { kind: 'link', label: 'Laborers', href: '/employee/labor/laborers', icon: HardHat, match: 'prefix', gate: { anyPerm: ['LABORER_VIEW', 'LABORER_ADD', 'LABORER_EDIT'] } },
      { kind: 'link', label: 'Rate Cards', href: '/employee/labor/rate-cards', icon: DollarSign, match: 'prefix', gate: { anyPerm: ['LABOR_RATE_VIEW', 'LABOR_RATE_ADD', 'LABOR_RATE_EDIT'] } },
      { kind: 'link', label: 'Labor Billing Config', href: '/employee/labor/billing-config', icon: DollarSign, match: 'prefix', gate: { perm: 'LABOR_ADMIN' } },
      { kind: 'link', label: 'Wallet Ledger', href: '/employee/labor/wallet-ledger', icon: Wallet, match: 'prefix', gate: { perm: 'LABOR_ADMIN' } },
      { kind: 'link', label: 'Settings', href: '/employee/labor/settings', icon: Settings, match: 'prefix', gate: { anyPerm: ['LABOR_SETTINGS_VIEW', 'LABOR_SETTINGS_EDIT'] } },
    ],
  },

  {
    kind: 'group', id: 'mom', label: 'Minutes of Meeting',
    gate: {
      anyPerm: ['MOM_VIEW', 'MOM_ADD', 'MOM_EDIT', 'MOM_DELETE', 'MOM_MEETING_VIEW', 'MOM_MEETING_CREATE', 'MOM_MEETING_EDIT', 'MOM_MEETING_DELETE', 'MOM_ADMIN', 'MOM_POINT_VIEW', 'HR_MODE'],
      permPrefix: 'MOM_',
    },
    children: [
      { kind: 'link', label: 'Dashboard', href: '/employee/mom', icon: LayoutDashboard },
      { kind: 'link', label: 'Overview', href: '/employee/mom/overview', icon: BarChart3, gate: { anyPerm: ['HR_MODE', 'MOM_ADMIN'] } },
      { kind: 'link', label: 'Meeting List', href: '/employee/mom/list', icon: List },
    ],
  },
];
