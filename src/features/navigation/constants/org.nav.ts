import {
  Home, LayoutDashboard, UserCheck, Settings, Calendar, ListChecks, ClipboardList,
  Clock, AlertCircle, Activity, FileText, MinusCircle, Users, UserCog, Shield,
  Phone, Building, MapPin, Building2, Link2, DollarSign, Coins, Wallet,
  Receipt, CheckSquare, ListTodo, UserPlus, PlusCircle, Package, LayoutGrid,
  Layers, Briefcase, HardHat, Thermometer, Camera, QrCode, Award, Cog,
  ArrowUpCircle, BarChart3, List, Heart, CalendarRange, Repeat, Inbox, Wrench, Navigation, Route,
  User,
} from 'lucide-react';
import type { NavNode } from '../types/nav.model';

/**
 * Org admin nav tree — transcribed from the legacy
 * src/components/org/OrgSidebar.tsx (~100 items, 14 sections).
 *
 * Two behavior changes from the legacy version, both deliberate:
 *
 * 1. Wallet and Inventory used `hasFeature("WALLET")` / `hasFeature("INVENTORY")`
 *    — every other feature check in the app uses the `_FEATURE`-suffixed code,
 *    and `hasFeature` does an exact match, so these two sections were almost
 *    certainly hidden for every organization. Fixed to `WALLET_FEATURE` /
 *    `INVENTORY_FEATURE` here, which makes them appear for orgs that actually
 *    have the feature — the working version of what the legacy code intended.
 * 2. "Settings" was a `CategoryButton` wired to `isOpen={false}` and
 *    `onClick={() => {}}` — permanently inert decoration — while its one item
 *    rendered unconditionally underneath regardless. It's a real, working
 *    group here.
 */
export const orgNav: NavNode[] = [
  {
    kind: 'group', id: 'self', label: 'Self', icon: User,
    children: [
      { kind: 'link', label: 'Dashboard', href: '/org-admin', icon: Home },
      { kind: 'link', label: 'Approvals', href: '/org-admin/approvals', icon: Inbox, match: 'prefix' },
    ],
  },
  {
    kind: 'group', id: 'attendance', label: 'Attendance',
    children: [
      { kind: 'link', label: 'Dashboard', href: '/org-admin/attendance/dashboard', icon: LayoutDashboard },
      { kind: 'link', label: 'Employee Attendance', href: '/org-admin/attendance/employee', icon: UserCheck },
      { kind: 'link', label: 'Holidays', href: '/org-admin/holidays', icon: Calendar },
      { kind: 'link', label: 'Leave', href: '/org-admin/leave', icon: ClipboardList },
      { kind: 'link', label: 'Payroll', href: '/org-admin/payroll', icon: ListChecks },
      { kind: 'link', label: 'Salary Slips', href: '/org-admin/salary-slips', icon: FileText },
      { kind: 'link', label: 'Other Deductions', href: '/org-admin/other-deductions', icon: MinusCircle, match: 'prefix' },
    ],
  },
  {
    kind: 'group', id: 'roster', label: 'Roster', gate: { feature: 'ROSTER_FEATURE' },
    children: [
      { kind: 'link', label: 'Insights', href: '/org-admin/roster/insights', icon: BarChart3, match: 'prefix' },
      { kind: 'link', label: 'Requests', href: '/org-admin/roster/requests', icon: Inbox, match: 'prefix' },
      { kind: 'link', label: 'Planner', href: '/org-admin/roster', icon: CalendarRange, activeTest: (p) => p === '/org-admin/roster' || /^\/org-admin\/roster\/\d+/.test(p) },
      { kind: 'link', label: 'Teams', href: '/org-admin/roster/teams', icon: Users, match: 'prefix' },
      { kind: 'link', label: 'Patterns', href: '/org-admin/roster/patterns', icon: Repeat, match: 'prefix' },
      { kind: 'link', label: 'Skills', href: '/org-admin/roster/skills', icon: Wrench, match: 'prefix' },
      { kind: 'link', label: 'Shifts', href: '/org-admin/shift-templates', icon: Clock },
    ],
  },
  {
    kind: 'group', id: 'live-tracking', label: 'Live Tracking', gate: { feature: 'LIVE_TRACKING_FEATURE' },
    children: [
      { kind: 'link', label: 'Live Map', href: '/org-admin/tracking/live', icon: Navigation, match: 'prefix', gate: { perm: 'TRACKING_VIEW' } },
      { kind: 'link', label: 'Timeline', href: '/org-admin/tracking/timeline', icon: Route, match: 'prefix', gate: { perm: 'TRACKING_VIEW' } },
      { kind: 'link', label: 'Day Summary', href: '/org-admin/tracking/days', icon: BarChart3, match: 'prefix', gate: { perm: 'TRACKING_VIEW' } },
      { kind: 'link', label: 'Field Visits', href: '/org-admin/tracking/visits', icon: Route, match: 'prefix', gate: { anyPerm: ['TRACKING_TRIP_REVIEW', 'TRACKING_VIEW'] } },
      { kind: 'link', label: 'Employees', href: '/org-admin/tracking/employees', icon: Users, match: 'prefix', gate: { anyPerm: ['TRACKING_ASSIGN', 'TRACKING_VIEW'] } },
      { kind: 'link', label: 'Policies', href: '/org-admin/tracking/policies', icon: Shield, match: 'prefix', gate: { anyPerm: ['TRACKING_POLICY_MANAGE', 'TRACKING_ASSIGN'] } },
    ],
  },
  {
    kind: 'group', id: 'management', label: 'Management',
    children: [
      { kind: 'link', label: 'Employees', href: '/org-admin/employees', icon: Users },
      { kind: 'link', label: 'Policies', href: '/org-admin/policies', icon: Shield, match: 'prefix' },
      { kind: 'link', label: 'Shifts', href: '/org-admin/shift-templates', icon: Clock },
      { kind: 'link', label: 'Sites', href: '/org-admin/sites', icon: MapPin },
      { kind: 'link', label: 'Other Locations', href: '/org-admin/other-locations', icon: MapPin },
      { kind: 'link', label: 'Sub Organizations', href: '/org-admin/sub-organizations', icon: Building2 },
      { kind: 'link', label: 'Payroll Setup', href: '/org-admin/payroll-setup', icon: Coins },
      { kind: 'link', label: 'Increments & Promotions', href: '/org-admin/salary-revisions', icon: ArrowUpCircle },
      { kind: 'link', label: 'Compensation', href: '/org-admin/compensation', icon: Award, match: 'prefix' },
      { kind: 'link', label: 'Employee Onboarding', href: '/org-admin/employee-onboarding', icon: UserPlus },
      { kind: 'link', label: 'Onboarding Settings', href: '/org-admin/onboarding-settings', icon: Cog },
      { kind: 'link', label: 'Departments', href: '/org-admin/departments', icon: Building },
      { kind: 'link', label: 'Roles', href: '/org-admin/roles', icon: UserCog },
      { kind: 'link', label: 'Approval Flows', href: '/org-admin/approval-flows', icon: ListChecks, match: 'prefix' },
    ],
  },
  {
    kind: 'group', id: 'tools', label: 'Tools',
    children: [
      { kind: 'link', label: 'Team Mapper', href: '/org-admin/assignments', icon: UserCog },
      { kind: 'link', label: 'Policy Mapper', href: '/org-admin/policy-mapper', icon: Shield },
      { kind: 'link', label: 'Emergency Contacts', href: '/org-admin/emergency-contacts', icon: Phone },
      { kind: 'link', label: 'Site-Sub-Org Mapper', href: '/org-admin/site-sub-org-mapper', icon: Link2 },
      { kind: 'link', label: 'Employee Sites', href: '/org-admin/employee-sites', icon: MapPin },
      { kind: 'link', label: 'Budget Requests', href: '/org-admin/site-budget-requests', icon: DollarSign },
      { kind: 'link', label: 'Employee Devices', href: '/org-admin/device-management', icon: Users },
    ],
  },
  {
    kind: 'group', id: 'wallet', label: 'Wallet', gate: { feature: 'WALLET_FEATURE' },
    children: [
      { kind: 'link', label: 'Wallet Requests', href: '/org-admin/wallet/requests', icon: Wallet },
      { kind: 'link', label: 'Expense Requests', href: '/org-admin/wallet/expenses', icon: Receipt },
      { kind: 'link', label: 'Transactions', href: '/org-admin/wallet/transactions', icon: DollarSign },
    ],
  },
  {
    kind: 'group', id: 'salary-advance', label: 'Salary Advance',
    children: [
      { kind: 'link', label: 'Dashboard', href: '/org-admin/salary-advance/dashboard', icon: LayoutDashboard },
      { kind: 'link', label: 'All Requests', href: '/org-admin/salary-advance/requests', icon: ClipboardList },
      { kind: 'link', label: 'Approval Queue', href: '/org-admin/salary-advance/approvals', icon: CheckSquare },
      { kind: 'link', label: 'Repayment Schedule', href: '/org-admin/salary-advance/repayments', icon: Calendar },
      { kind: 'link', label: 'Policy Configuration', href: '/org-admin/salary-advance/policy', icon: Settings },
      { kind: 'link', label: 'Accounts', href: '/org-admin/salary-advance/accounts', icon: Users },
    ],
  },
  {
    kind: 'group', id: 'inventory', label: 'Inventory', gate: { feature: 'INVENTORY_FEATURE' },
    children: [
      { kind: 'link', label: 'Items', href: '/org-admin/inventory/items', icon: Package },
      { kind: 'link', label: 'Requests', href: '/org-admin/inventory/requests', icon: FileText },
    ],
  },
  {
    kind: 'group', id: 'tasks', label: 'Tasks',
    children: [
      { kind: 'link', label: 'All Tasks', href: '/org-admin/tasks', icon: CheckSquare },
      { kind: 'link', label: 'Task Dashboard', href: '/org-admin/task-dashboard', icon: ListTodo },
      { kind: 'link', label: 'Task Assignments', href: '/org-admin/task-assignments', icon: UserPlus },
      { kind: 'link', label: 'Create Task', href: '/org-admin/task-create', icon: PlusCircle },
    ],
  },
  {
    kind: 'group', id: 'dpr', label: 'DPR',
    children: [
      {
        kind: 'link', label: 'Planning', href: '/org-admin/dps/schedule', icon: Calendar, match: 'prefix',
        altHrefs: ['/org-admin/dps/planned-schedules'],
      },
      { kind: 'link', label: 'Daily Forms', href: '/org-admin/dps/assignments', icon: UserPlus },
      { kind: 'link', label: 'Planning Dashboard', href: '/org-admin/dps/planning-dashboard', icon: LayoutDashboard },
      { kind: 'link', label: 'CBD Dashboard', href: '/org-admin/dps/cbd-dashboard', icon: LayoutDashboard },
    ],
  },
  {
    kind: 'group', id: 'insurance', label: 'Insurance',
    children: [
      { kind: 'link', label: 'Dashboard', href: '/org-admin/insurance/dashboard', icon: LayoutGrid },
      { kind: 'link', label: 'Providers', href: '/org-admin/insurance/providers', icon: Building2 },
      { kind: 'link', label: 'Policies', href: '/org-admin/insurance/policies', icon: Shield },
      { kind: 'link', label: 'Enrollment', href: '/org-admin/insurance/enrollment', icon: UserCheck },
      { kind: 'link', label: 'Dependents', href: '/org-admin/insurance/dependents', icon: Users },
      { kind: 'link', label: 'Beneficiaries', href: '/org-admin/insurance/beneficiaries', icon: Heart },
      { kind: 'link', label: 'Claims', href: '/org-admin/insurance/claims', icon: ClipboardList },
      { kind: 'link', label: 'Reports', href: '/org-admin/insurance/reports', icon: FileText },
    ],
  },
  {
    kind: 'group', id: 'petty-cash', label: 'Petty Cash',
    children: [
      { kind: 'link', label: 'Wallets', href: '/org-admin/petty-cash', icon: DollarSign },
      { kind: 'link', label: 'Wallet Expenses', href: '/org-admin/wallet-overview', icon: Receipt },
      { kind: 'link', label: 'Wallet Config', href: '/org-admin/wallet-config', icon: Cog },
      { kind: 'link', label: 'Wallet Topups', href: '/org-admin/wallet-topups', icon: ArrowUpCircle },
    ],
  },
  {
    kind: 'group', id: 'labor-management', label: 'Labor Management',
    children: [
      { kind: 'link', label: 'Attendance Dashboard', href: '/org-admin/labor-attendance/dashboard', icon: LayoutDashboard },
      { kind: 'link', label: 'Contractor Dashboard', href: '/org-admin/labor-attendance/contractor-dashboard', icon: BarChart3 },
      { kind: 'link', label: 'Attendance Logs', href: '/org-admin/labor-attendance/logs', icon: ClipboardList },
      { kind: 'link', label: 'Punch Regularization', href: '/org-admin/labor-attendance/regularization', icon: Clock },
      { kind: 'link', label: 'Categories', href: '/org-admin/labor/categories', icon: LayoutGrid },
      { kind: 'link', label: 'Subcategories', href: '/org-admin/labor/subcategories', icon: Layers },
      { kind: 'link', label: 'Contractors', href: '/org-admin/labor/contractors', icon: Briefcase },
      { kind: 'link', label: 'Laborers', href: '/org-admin/labor/laborers', icon: HardHat },
      { kind: 'link', label: 'Rate Cards', href: '/org-admin/labor/rate-cards', icon: DollarSign },
      {
        kind: 'link', label: 'Billing Config', href: '/org-admin/labor/billing-config', icon: DollarSign,
        gate: { perm: 'LABOR_ADMIN' },
      },
      { kind: 'link', label: 'Wallet Ledger', href: '/org-admin/labor/wallet-ledger', icon: Wallet },
      { kind: 'link', label: 'Site Logins', href: '/org-admin/site-logins', icon: Shield },
      { kind: 'link', label: 'Settings', href: '/org-admin/labor/settings', icon: Settings },
      { kind: 'link', label: 'Device Health', href: '/org-admin/labor-attendance/temperature-dashboard', icon: Activity },
      { kind: 'link', label: 'Device Logs', href: '/org-admin/labor-attendance/device-logs', icon: Thermometer },
      { kind: 'link', label: 'Biometric Punch', href: '/org-admin/labor-attendance/biometric', icon: Camera },
    ],
  },
  {
    kind: 'group', id: 'hr-operation', label: 'HR Operation',
    children: [
      { kind: 'link', label: 'Applied Positions', href: '/org-admin/hr-operation/applied-positions', icon: Briefcase },
      { kind: 'link', label: 'Interview Management', href: '/org-admin/hr-operation/interviews', icon: QrCode },
      { kind: 'link', label: 'Technical Assessments', href: '/org-admin/hr-operation/technical-assessments', icon: Award },
      { kind: 'link', label: 'Technical Questions', href: '/org-admin/hr-operation/technical-questions', icon: FileText },
      {
        kind: 'link', label: 'Operation / Final Round', href: '/org-admin/hr-operation/operation-round', icon: UserCheck,
        altHrefs: ['/org-admin/hr-operation/final-round'],
      },
      { kind: 'link', label: 'Onboarding', href: '/org-admin/hr-operation/onboarding', icon: UserPlus },
      { kind: 'link', label: 'Onboarding Status', href: '/org-admin/hr-operation/onboarding/status', icon: Briefcase },
      { kind: 'link', label: 'Document Center', href: '/org-admin/hr-operation/document-center', icon: FileText },
    ],
  },
  {
    kind: 'group', id: 'reimbursements', label: 'Reimbursements',
    children: [
      { kind: 'link', label: 'Reimbursements', href: '/org-admin/reimbursements', icon: Wallet },
      { kind: 'link', label: 'Advances', href: '/org-admin/advances', icon: Wallet },
      { kind: 'link', label: 'Employee Wallets', href: '/org-admin/reimbursements/wallets', icon: Wallet },
      { kind: 'link', label: 'Reimbursement Config', href: '/org-admin/reimbursements/categories', icon: Cog },
    ],
  },
  {
    kind: 'group', id: 'mom', label: 'Minutes of Meeting',
    children: [
      { kind: 'link', label: 'Dashboard', href: '/org-admin/mom', icon: LayoutDashboard },
      { kind: 'link', label: 'Overview', href: '/org-admin/mom/overview', icon: BarChart3 },
      { kind: 'link', label: 'Meeting List', href: '/org-admin/mom/list', icon: List },
    ],
  },
  {
    kind: 'group', id: 'settings', label: 'Settings',
    children: [
      { kind: 'link', label: 'Organization', href: '/org-admin/settings', icon: Cog },
    ],
  },
];
