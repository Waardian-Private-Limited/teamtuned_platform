import {
  ShieldCheck,
  UsersRound,
  MessageSquare,
  LayoutDashboard,
  UserCheck,
  Settings,
  Calendar,
  ListChecks,
  Target,
  ClipboardList,
  Clock,
  AlertCircle,
  Activity,
  FileText,
  MinusCircle,
  Users,
  UserCog,
  Shield,
  Building,
  MapPin,
  Building2,
  Link2,
  DollarSign,
  Coins,
  Wallet,
  Receipt,
  CheckSquare,
  ListTodo,
  UserPlus,
  PlusCircle,
  Package,
  LayoutGrid,
  Layers,
  Briefcase,
  HardHat,
  Thermometer,
  Camera,
  Award,
  Cog,
  ArrowUpCircle,
  BarChart3,
  List,
  CalendarRange,
  Repeat,
  Inbox,
  Wrench,
  Navigation,
  Route,
  CalendarCheck,
  MessagesSquare,
  GraduationCap,
  Grid3x3,
  Flag,
  Heart,
  Tags,
  Smartphone,
  CalendarClock,
  FileSignature,
  HeartPulse,
  Gift,
  HandCoins,
  UserSearch,
  ReceiptText,
  ClipboardCheck,
  Landmark,
  FileCheck,
  ChartPie,
  Timer,
  TrendingUp,
  Gauge,
} from 'lucide-react';
import type { NavNode } from '../types/nav.model';

/**
 * Org admin nav tree — transcribed from the legacy
 * src/components/org/OrgSidebar.tsx (~100 items, 14 sections).
 *
 * Two behavior changes from the legacy version, both deliberate:
 *
 * 1. Inventory used `hasFeature("INVENTORY")` — every other feature check in
 *    the app uses the `_FEATURE`-suffixed code, and `hasFeature` does an exact
 *    match, so the section was almost certainly hidden for every organization.
 *    Fixed to `INVENTORY_FEATURE` here. (The legacy "Wallet" section that had
 *    the same bug was removed; employee expenses and wallets now live in the
 *    "Expenses" group, gated by REIMBURSEMENT_FEATURE / EXPENSE_WALLET_FEATURE.)
 * 2. "Settings" was a `CategoryButton` wired to `isOpen={false}` and
 *    `onClick={() => {}}` — permanently inert decoration — while its one item
 *    rendered unconditionally underneath regardless. It's a real, working
 *    group here.
 */
export const orgNav: NavNode[] = [
  { kind: 'link', label: 'Approvals', href: '/org-admin/approvals', icon: Inbox, match: 'prefix' },
  {
    kind: 'group', id: 'attendance', label: 'Attendance',
    children: [
      { kind: 'link', label: 'Dashboard', href: '/org-admin/attendance/dashboard', icon: LayoutDashboard },
      { kind: 'link', label: 'Workforce Insights', href: '/org-admin/attendance/insights', icon: TrendingUp, match: 'prefix' },
      { kind: 'link', label: 'Approval Audit', href: '/org-admin/attendance/approval-audit', icon: Timer },
      { kind: 'link', label: 'Detailed Attendance', href: '/org-admin/attendance/employee', icon: UserCheck },
      { kind: 'link', label: 'Approvals', href: '/org-admin/attendance/approvals', icon: CheckSquare },
      { kind: 'link', label: 'Holidays', href: '/org-admin/holidays', icon: Calendar },
      { kind: 'link', label: 'Leave', href: '/org-admin/leave', icon: ClipboardList },
    ],
  },
  {
    kind: 'group', id: 'payroll', label: 'Payroll',
    children: [
      { kind: 'link', label: 'Payroll', href: '/org-admin/payroll', icon: ListChecks, match: 'prefix' },
      { kind: 'link', label: 'Salary Slips', href: '/org-admin/salary-slips', icon: FileText },
      { kind: 'link', label: 'Payouts', href: '/org-admin/payouts', icon: Wallet },
      { kind: 'link', label: 'Other Deductions', href: '/org-admin/other-deductions', icon: MinusCircle, match: 'prefix' },
      { kind: 'link', label: 'Payroll Setup', href: '/org-admin/payroll-setup', icon: Coins },
      {
        kind: 'group', id: 'payroll-tds', label: 'Income Tax (TDS)', icon: Landmark, gate: { anyPerm: ['DEBIT_RULE_VIEW'] },
        children: [
          { kind: 'link', label: 'Overview', href: '/org-admin/tds', icon: LayoutDashboard },
          { kind: 'link', label: 'Settings', href: '/org-admin/tds/settings', icon: Settings },
          { kind: 'link', label: 'Employee declarations', href: '/org-admin/tds/declarations', icon: ClipboardList },
          { kind: 'link', label: 'Proof review', href: '/org-admin/tds/proofs', icon: FileCheck },
          { kind: 'link', label: 'Deposits & returns', href: '/org-admin/tds/returns', icon: Receipt },
          { kind: 'link', label: 'Form 16', href: '/org-admin/tds/form16', icon: FileText },
        ],
      },
      { kind: 'link', label: 'Increments & Promotions', href: '/org-admin/salary-revisions', icon: ArrowUpCircle },
      { kind: 'link', label: 'Compensation', href: '/org-admin/compensation', icon: Award, match: 'prefix' },
  { kind: 'link', label: 'Insurance', href: '/org-admin/insurance', icon: HeartPulse, match: 'prefix', gate: { feature: 'INSURANCE_FEATURE' } },
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
      { kind: 'link', label: 'Employee Onboarding', href: '/org-admin/employee-onboarding', icon: UserPlus },
      { kind: 'link', label: 'Onboarding Settings', href: '/org-admin/onboarding-settings', icon: Cog },
      { kind: 'link', label: 'Departments', href: '/org-admin/departments', icon: Building },
      { kind: 'link', label: 'Teams', href: '/org-admin/teams', icon: UsersRound, match: 'prefix' },
      { kind: 'link', label: 'Roles', href: '/org-admin/roles', icon: UserCog },
      { kind: 'link', label: 'Grades / Bands', href: '/org-admin/grades', icon: Layers },
      { kind: 'link', label: 'Cost Centres', href: '/org-admin/cost-centres', icon: ChartPie },
      { kind: 'link', label: 'Approval Flows', href: '/org-admin/approval-flows', icon: ListChecks, match: 'prefix' },
    ],
  },
  {
    kind: 'group', id: 'tools', label: 'Tools',
    children: [
      { kind: 'link', label: 'Site-Sub-Org Mapper', href: '/org-admin/site-sub-org-mapper', icon: Link2 },
      { kind: 'link', label: 'Site Assignment', href: '/org-admin/employee-sites', icon: MapPin },
      { kind: 'link', label: 'Employee Devices', href: '/org-admin/device-management', icon: Smartphone },
    ],
  },
  {
    kind: 'group', id: 'salary-advance', label: 'Salary Advance', icon: HandCoins,
    children: [
      { kind: 'link', label: 'Overview', href: '/org-admin/salary-advance', icon: LayoutDashboard },
      { kind: 'link', label: 'Advances', href: '/org-admin/salary-advance/advances', icon: ClipboardList, match: 'prefix' },
      { kind: 'link', label: 'Advance types', href: '/org-admin/salary-advance/types', icon: Layers, match: 'prefix' },
    ],
  },
  {
    kind: 'group', id: 'recruitment', label: 'Recruitment', icon: UserSearch,
    children: [
      { kind: 'link', label: 'Overview', href: '/org-admin/recruitment', icon: LayoutDashboard },
      { kind: 'link', label: 'Positions', href: '/org-admin/recruitment/positions', icon: Briefcase, match: 'prefix' },
      { kind: 'link', label: 'Candidates', href: '/org-admin/recruitment/candidates', icon: Users, match: 'prefix' },
      { kind: 'link', label: 'Interviews', href: '/org-admin/recruitment/interviews', icon: CalendarClock, match: 'prefix' },
      { kind: 'link', label: 'Offers', href: '/org-admin/recruitment/offers', icon: FileSignature, match: 'prefix' },
      { kind: 'link', label: 'Referral rewards', href: '/org-admin/recruitment/referral-rewards', icon: Gift, match: 'prefix' },
      { kind: 'link', label: 'Document Centre', href: '/org-admin/recruitment/documents', icon: FileText, match: 'prefix' },
      { kind: 'link', label: 'Settings', href: '/org-admin/recruitment/settings', icon: Settings, match: 'prefix' },
    ],
  },
  {
    kind: 'group', id: 'expenses', label: 'Expenses', icon: ReceiptText, gate: { anyFeature: ['REIMBURSEMENT_FEATURE', 'EXPENSE_WALLET_FEATURE'] },
    children: [
      { kind: 'link', label: 'Overview', href: '/org-admin/expenses', icon: LayoutDashboard },
      { kind: 'link', label: 'Claims', href: '/org-admin/expenses/claims', icon: ClipboardList, match: 'prefix' },
      { kind: 'link', label: 'Wallets', href: '/org-admin/expenses/wallets', icon: Wallet, match: 'prefix', gate: { feature: 'EXPENSE_WALLET_FEATURE' } },
      { kind: 'link', label: 'Categories', href: '/org-admin/expenses/categories', icon: Tags, match: 'prefix' },
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
    kind: 'group', id: 'data-collection', label: 'Data Collection', icon: ClipboardCheck, gate: { feature: 'DATA_COLLECTION_FEATURE' },
    children: [
      { kind: 'link', label: 'Overview', href: '/org-admin/data-collection', icon: LayoutDashboard },
      { kind: 'link', label: 'Forms', href: '/org-admin/data-collection/forms', icon: FileText, match: 'prefix' },
      { kind: 'link', label: 'Assignments', href: '/org-admin/data-collection/assignments', icon: UserPlus, match: 'prefix' },
      { kind: 'link', label: 'Submissions', href: '/org-admin/data-collection/submissions', icon: ClipboardList, match: 'prefix' },
    ],
  },
  {
    kind: 'group', id: 'tasks', label: 'Tasks', icon: ListChecks, gate: { feature: 'TASK_MANAGEMENT_FEATURE' },
    children: [
      { kind: 'link', label: 'Dashboard', href: '/org-admin/tasks/dashboard', icon: LayoutDashboard },
      { kind: 'link', label: 'All tasks', href: '/org-admin/tasks/list', icon: List },
    ],
  },
  {
    kind: 'group', id: 'performance', label: 'Performance', icon: Target, gate: { feature: 'PERFORMANCE_FEATURE' },
    children: [
      { kind: 'link', label: 'Dashboard', href: '/org-admin/performance/dashboard', icon: Gauge },
      { kind: 'link', label: 'OKRs', href: '/org-admin/performance/okrs', icon: Flag, match: 'prefix' },
      { kind: 'link', label: 'Team goals', href: '/org-admin/performance/team-goals', icon: Users, match: 'prefix' },
      { kind: 'link', label: 'Feedback to give', href: '/org-admin/performance/feedback', icon: MessageSquare, match: 'prefix' },
      { kind: 'link', label: 'One-on-ones', href: '/org-admin/performance/one-on-ones', icon: CalendarCheck, match: 'prefix' },
      { kind: 'link', label: 'Kudos', href: '/org-admin/performance/kudos', icon: Heart, match: 'prefix' },
      { kind: 'link', label: 'Improvement plans', href: '/org-admin/performance/improvement-plans', icon: ClipboardList, match: 'prefix' },
      { kind: 'link', label: 'Talent', href: '/org-admin/performance/talent', icon: Grid3x3, match: 'prefix' },
      { kind: 'link', label: 'Cycles', href: '/org-admin/performance/cycles', icon: CalendarRange, match: 'prefix' },
      { kind: 'link', label: 'Setup', href: '/org-admin/performance', icon: Settings },
    ],
  },
  { kind: 'link', label: 'Learning', href: '/org-admin/learning', icon: GraduationCap, match: 'prefix', gate: { feature: 'LEARNING_FEATURE' } },
  { kind: 'link', label: 'Surveys', href: '/org-admin/surveys', icon: MessagesSquare, match: 'prefix', gate: { feature: 'ENGAGEMENT_FEATURE' } },
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
    kind: 'group', id: 'mom', label: 'Minutes of Meeting', gate: { feature: 'MOM_FEATURE' },
    children: [
      { kind: 'link', label: 'Team actions', href: '/org-admin/mom', icon: LayoutDashboard },
      { kind: 'link', label: 'Meetings', href: '/org-admin/mom/meetings', icon: List, match: 'prefix' },
      { kind: 'link', label: 'Audit', href: '/org-admin/mom/audit', icon: ShieldCheck, match: 'prefix' },
    ],
  },
  {
    kind: 'group', id: 'settings', label: 'Settings',
    children: [
      { kind: 'link', label: 'Organization', href: '/org-admin/settings', icon: Cog },
    ],
  },
];
