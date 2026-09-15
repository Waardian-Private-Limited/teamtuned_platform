import {
  Home, Building2, MapPin, Link2, DollarSign, Building, UserCog, BarChart3,
  ClipboardList, Cog, Shield, Calendar, Settings, Clock, CheckSquare,
  AlertCircle, FileText, MinusCircle, Users, Phone, Upload, LayoutDashboard,
  ListChecks, LayoutGrid, Heart, UserCheck, Wallet, Receipt, ArrowUpCircle,
  Package, Coins, Briefcase, HardHat, Layers, QrCode, Award, UserPlus, List,
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
  { kind: 'link', label: 'Dashboard', href: '/employee', icon: Home },

  {
    kind: 'group', id: 'main', label: 'Main', gate: { feature: 'PAYROLL_FEATURE' },
    children: [
      { kind: 'link', label: 'Organization Profile', href: '/employee/orgProfile', icon: Building2, match: 'prefix', gate: { anyPerm: ['ORGPROFILE_VIEW', 'ORGPROFILE_ADD', 'ORGPROFILE_EDIT', 'ORGPROFILE_DELETE'] } },
      { kind: 'link', label: 'Sites', href: '/employee/sites', icon: MapPin, gate: { anyPerm: ['SITE_VIEW', 'SITE_ADD', 'SITE_EDIT', 'SITE_DELETE'] } },
      { kind: 'link', label: 'Sub Organizations', href: '/employee/sub-organizations', icon: Building2, gate: { anyPerm: ['SITE_VIEW', 'SITE_ADD', 'SITE_EDIT', 'SITE_DELETE'] } },
      { kind: 'link', label: 'Site-Sub-Org Mapper', href: '/employee/site-sub-org-mapper', icon: Link2, gate: { anyPerm: ['SITE_VIEW', 'SITE_ADD', 'SITE_EDIT', 'SITE_DELETE'] } },
      { kind: 'link', label: 'Budget Requests', href: '/employee/site-budget-requests', icon: DollarSign, gate: { anyPerm: ['SITE_BUDGET_VIEW', 'SITE_BUDGET_REQUEST', 'SITE_BUDGET_APPROVE'] } },
      { kind: 'link', label: 'Departments', href: '/employee/departments', icon: Building, match: 'prefix', gate: { anyPerm: ['DEPT_VIEW', 'DEPT_ADD', 'DEPT_EDIT', 'DEPT_DELETE'] } },
      { kind: 'link', label: 'Roles', href: '/employee/roles', icon: UserCog, match: 'prefix', gate: { anyPerm: ['ROLE_VIEW', 'ROLE_ADD', 'ROLE_EDIT', 'ROLE_DELETE'] } },
    ],
  },

  {
    kind: 'group', id: 'attendance', label: 'Attendance', gate: { feature: 'PAYROLL_FEATURE' },
    children: [
      { kind: 'link', label: 'Dashboard', href: '/employee/attendance-dashboard', icon: BarChart3, match: 'prefix', gate: { anyPerm: ['ATTEND_VIEW', 'ATTEND_ADD', 'ATTEND_EDIT'] } },
      {
        kind: 'link', label: 'Attendance Logs', href: '/employee/attendance', icon: ClipboardList,
        activeTest: (p) => p === '/employee/attendance' || (p.startsWith('/employee/attendance/') && !p.startsWith('/employee/attendance-')),
        gate: { anyPerm: ['ATTEND_VIEW', 'ATTEND_ADD', 'ATTEND_EDIT'] },
      },
      { kind: 'link', label: 'Configuration', href: '/employee/attendance-config', icon: Cog, match: 'prefix', gate: { anyPerm: ['ATTENDCONFIG_VIEW', 'ATTENDCONFIG_ADD', 'ATTENDCONFIG_EDIT', 'ATTENDCONFIG_DELETE'] } },
      { kind: 'link', label: 'Policies', href: '/employee/attendance-rules', icon: Shield, match: 'prefix', gate: { anyPerm: ['POLICY_VIEW', 'POLICY_ADD', 'POLICY_EDIT', 'POLICY_DELETE'] } },
      { kind: 'link', label: 'Holiday Calendar', href: '/employee/holiday-calendar', icon: Calendar, match: 'prefix', gate: { anyPerm: ['HOLIDAY_VIEW', 'HOLIDAY_ADD', 'HOLIDAY_EDIT', 'HOLIDAY_DELETE'] } },
      { kind: 'link', label: 'Approval Workflows', href: '/employee/approval-workflows', icon: Settings, match: 'prefix', gate: { perm: 'HR_MODE' } },
      { kind: 'link', label: 'Session Requests', href: '/employee/attendance/sessions', icon: Clock, match: 'prefix', gate: { anyPerm: ['EMP_SESSION_VIEW', 'EMP_SESSION_APPROVE'] } },
      { kind: 'link', label: 'Regularizations', href: '/employee/regularize-requests', icon: CheckSquare, match: 'prefix', gate: { anyPerm: ['ATTREG_VIEW', 'ATTREG_APPROVE', 'HR_MODE'] } },
      { kind: 'link', label: 'Verification Issues', href: '/employee/verification-issues', icon: AlertCircle, match: 'prefix', gate: { anyPerm: ['ATTVERIFY_VIEW', 'ATTVERIFY_APPROVE'] } },
      { kind: 'link', label: 'Night OT Requests', href: '/employee/night-ot-requests', icon: Clock, match: 'prefix', gate: { anyPerm: ['ATTEND_VIEW', 'ATTVERIFY_APPROVE'] } },
      { kind: 'link', label: 'Leave Requests', href: '/employee/leave-requests', icon: Calendar, match: 'prefix', gate: { anyPerm: ['LEAVE_VIEW', 'LEAVE_ADD', 'LEAVE_EDIT', 'LEAVE_APPROVE'] } },
      { kind: 'link', label: 'Comp-Off Requests', href: '/employee/comp-offs', icon: Clock, match: 'prefix', gate: { anyPerm: ['LEAVE_VIEW', 'LEAVE_ADD', 'LEAVE_EDIT', 'LEAVE_APPROVE'] } },
      { kind: 'link', label: 'Payroll', href: '/employee/payroll', icon: DollarSign, match: 'prefix', gate: { anyPerm: ['PAYROLL_VIEW', 'HR_MODE'] } },
      { kind: 'link', label: 'Salary Slips', href: '/employee/salary-slips', icon: FileText, match: 'prefix', gate: { anyPerm: ['PAYROLL_VIEW', 'HR_MODE'] } },
      { kind: 'link', label: 'Other Deductions', href: '/employee/other-deductions', icon: MinusCircle, match: 'prefix', gate: { anyPerm: ['HR_MODE', 'PAYROLL_ADMIN'] } },
    ],
  },

  {
    kind: 'group', id: 'management', label: 'Management', gate: { feature: 'PAYROLL_FEATURE' },
    children: [
      { kind: 'link', label: 'Organization Profile', href: '/employee/orgProfile', icon: Building2, match: 'prefix', gate: { anyPerm: ['ORGPROFILE_VIEW', 'ORGPROFILE_ADD', 'ORGPROFILE_EDIT', 'ORGPROFILE_DELETE'] } },
      { kind: 'link', label: 'Sites', href: '/employee/sites', icon: MapPin, gate: { anyPerm: ['SITE_VIEW', 'SITE_ADD', 'SITE_EDIT', 'SITE_DELETE'] } },
      { kind: 'link', label: 'Sub Organizations', href: '/employee/sub-organizations', icon: Building2, gate: { anyPerm: ['SITE_VIEW', 'SITE_ADD', 'SITE_EDIT', 'SITE_DELETE'] } },
      { kind: 'link', label: 'Site-Sub-Org Mapper', href: '/employee/site-sub-org-mapper', icon: Link2, gate: { anyPerm: ['SITE_VIEW', 'SITE_ADD', 'SITE_EDIT', 'SITE_DELETE'] } },
      { kind: 'link', label: 'Budget Requests', href: '/employee/site-budget-requests', icon: DollarSign, gate: { anyPerm: ['SITE_BUDGET_VIEW', 'SITE_BUDGET_REQUEST', 'SITE_BUDGET_APPROVE'] } },
      { kind: 'link', label: 'Departments', href: '/employee/departments', icon: Building, match: 'prefix', gate: { anyPerm: ['DEPT_VIEW', 'DEPT_ADD', 'DEPT_EDIT', 'DEPT_DELETE'] } },
      { kind: 'link', label: 'Roles', href: '/employee/roles', icon: UserCog, match: 'prefix', gate: { anyPerm: ['ROLE_VIEW', 'ROLE_ADD', 'ROLE_EDIT', 'ROLE_DELETE'] } },
      { kind: 'link', label: 'Employees', href: '/employee/employee-management', icon: Users, match: 'prefix', gate: { anyPerm: ['EMP_VIEW', 'EMP_ADD', 'EMP_EDIT', 'EMP_DELETE'] } },
      { kind: 'link', label: 'Emergency Contacts', href: '/employee/emergency-contacts', icon: Phone, match: 'prefix', gate: { anyPerm: ['EMP_VIEW', 'EMP_ADD', 'EMP_EDIT', 'EMP_DELETE'] } },
      { kind: 'link', label: 'Team Mapper', href: '/employee/assignments', icon: UserCog, gate: { perm: 'HR_MODE' } },
      { kind: 'link', label: 'Policy Mapper', href: '/employee/policy-mapper', icon: Shield, gate: { perm: 'HR_MODE' } },
      { kind: 'link', label: 'Import Employees', href: '/employee/employees/import', icon: Upload, match: 'prefix', gate: { perm: 'EMP_ADD' } },
      { kind: 'link', label: 'Shift Management', href: '/employee/employees/shifts', icon: Clock, match: 'prefix', gate: { perm: 'EMP_ADD' } },
      { kind: 'link', label: 'Employee Sites', href: '/employee/employee-sites', icon: MapPin, match: 'prefix', gate: { anyPerm: ['EMPSITE_VIEW', 'EMPLOYEE_ASSIGN_SITE'] } },
      { kind: 'link', label: 'Other Locations', href: '/employee/other-locations', icon: MapPin, match: 'prefix', gate: { anyPerm: ['EMPSITE_VIEW', 'EMPLOYEE_ASSIGN_SITE'] } },
      { kind: 'link', label: 'Salary Components', href: '/employee/salary-components', icon: Coins, match: 'prefix', gate: { anyPerm: ['SALARY_CONFIG_VIEW', 'SALARY_CONFIG_ADD', 'HR_MODE', 'PAYROLL_ADMIN'] } },
      { kind: 'link', label: 'Site Logins', href: '/employee/site-logins', icon: Shield, match: 'prefix', gate: { perm: 'LABOR_ADMIN' } },
      { kind: 'link', label: 'Debit Rules', href: '/employee/debit-rules', icon: ListChecks, match: 'prefix', gate: { anyPerm: ['DEBIT_RULE_VIEW', 'DEBIT_RULE_ADD', 'HR_MODE', 'PAYROLL_ADMIN'] } },
      { kind: 'link', label: 'Salary Import', href: '/employee/salary-import', icon: Upload, match: 'prefix', gate: { perm: 'EMP_ADD' } },
      { kind: 'link', label: 'Employee Devices', href: '/employee/device-management', icon: Users, match: 'prefix', gate: { perm: 'EMP_DEVICE_MANAGEMENT' } },
    ],
  },

  {
    kind: 'group', id: 'insurance', label: 'Insurance', gate: {
      feature: 'PAYROLL_FEATURE',
      anyPerm: ['INS_PROVIDER_VIEW', 'INS_POLICY_VIEW', 'INS_ENROLL_VIEW', 'INS_CLAIM_VIEW'],
    },
    children: [
      { kind: 'link', label: 'Dashboard', href: '/employee/insurance/dashboard', icon: LayoutGrid, match: 'prefix', gate: { anyPerm: ['INS_POLICY_STATS'] } },
      { kind: 'link', label: 'Providers', href: '/employee/insurance/providers', icon: Building2, match: 'prefix', gate: { anyPerm: ['INS_PROVIDER_VIEW', 'INS_PROVIDER_ADD', 'INS_PROVIDER_EDIT', 'INS_PROVIDER_DELETE'] } },
      { kind: 'link', label: 'Policies', href: '/employee/insurance/policies', icon: Shield, match: 'prefix', gate: { anyPerm: ['INS_POLICY_VIEW', 'INS_POLICY_ADD', 'INS_POLICY_EDIT', 'INS_POLICY_DELETE'] } },
      { kind: 'link', label: 'Enrollment', href: '/employee/insurance/enrollment', icon: UserCheck, match: 'prefix', gate: { anyPerm: ['INS_ENROLL_VIEW', 'INS_ENROLL_ADD', 'INS_ENROLL_EDIT', 'INS_ENROLL_APPROVE'] } },
      { kind: 'link', label: 'Dependents', href: '/employee/insurance/dependents', icon: Users, match: 'prefix', gate: { anyPerm: ['INS_POLICY_STATS'] } },
      { kind: 'link', label: 'Beneficiaries', href: '/employee/insurance/beneficiaries', icon: Heart, match: 'prefix', gate: { anyPerm: ['INS_POLICY_STATS'] } },
    ],
  },

  {
    kind: 'group', id: 'salary-advance', label: 'Salary Advance', gate: {
      feature: 'PAYROLL_FEATURE',
      anyPerm: ['SALADV_VIEW', 'SALADV_APPROVE', 'SALADV_POLICY', 'SALADV_PAY'],
    },
    children: [
      { kind: 'link', label: 'Dashboard', href: '/employee/salary-advance/dashboard', icon: LayoutDashboard },
      { kind: 'link', label: 'All Requests', href: '/employee/salary-advance/requests', icon: ClipboardList, match: 'prefix', gate: { anyPerm: ['SALADV_VIEW'] } },
      { kind: 'link', label: 'Approval Queue', href: '/employee/salary-advance/approvals', icon: CheckSquare, match: 'prefix', gate: { anyPerm: ['SALADV_APPROVE'] } },
      { kind: 'link', label: 'Repayment Schedule', href: '/employee/salary-advance/repayments', icon: Calendar, match: 'prefix', gate: { anyPerm: ['SALADV_VIEW'] } },
      { kind: 'link', label: 'Policy Configuration', href: '/employee/salary-advance/policy', icon: Settings, match: 'prefix', gate: { anyPerm: ['SALADV_POLICY'] } },
      { kind: 'link', label: 'Accounts', href: '/employee/salary-advance/accounts', icon: Users, match: 'prefix', gate: { anyPerm: ['SALADV_PAY'] } },
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
    kind: 'group', id: 'hr-operation', label: 'HR Operation',
    gate: { anyPerm: ['HR_VIEW', 'RECRUITER_MODE', 'HR_MODE', 'ONBOARD_VIEW'] },
    children: [
      { kind: 'link', label: 'Applied Positions', href: '/employee/hr-operation/applied-positions', icon: Briefcase },
      { kind: 'link', label: 'Interview Management', href: '/employee/hr-operation/interviews', icon: QrCode },
      { kind: 'link', label: 'Technical Assessments', href: '/employee/hr-operation/technical-assessments', icon: Award },
      { kind: 'link', label: 'Technical Questions', href: '/employee/hr-operation/technical-questions', icon: FileText },
      { kind: 'link', label: 'Operation / Final Round', href: '/employee/hr-operation/operation-round', icon: UserCheck, altHrefs: ['/employee/hr-operation/final-round'] },
      { kind: 'link', label: 'Onboarding', href: '/employee/hr-operation/onboarding', icon: UserPlus },
      { kind: 'link', label: 'Onboarding Status', href: '/employee/hr-operation/onboarding/status', icon: Briefcase },
      { kind: 'link', label: 'Document Center', href: '/employee/hr-operation/document-center', icon: FileText },
    ],
  },

  {
    kind: 'group', id: 'reimbursements', label: 'Reimbursements',
    children: [
      { kind: 'link', label: 'Reimbursements', href: '/employee/reimbursements', icon: Wallet, gate: { perm: 'REIMBUSMENT_VIEW' } },
      { kind: 'link', label: 'Advances', href: '/employee/advances', icon: Wallet, gate: { perm: 'REIMBUSMENT_VIEW' } },
      { kind: 'link', label: 'Employee Wallets', href: '/employee/reimbursements/wallets', icon: Wallet, gate: { perm: 'REIMBUSMENT_WALLET_VIEW' } },
      { kind: 'link', label: 'Reimbursement Config', href: '/employee/reimbursements/categories', icon: Cog, gate: { perm: 'REIMBUSMENT_CONFIG' } },
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
