import {
  Banknote,
  NotebookPen,
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
  UserPlus,
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
  Ruler,
} from 'lucide-react';
import type { NavNode } from '../types/nav.model';
import { ANY_LABOUR_PERM, LABOUR_MEAS_PAGE_PERMS, LABOUR_PAYABLE_PERMS, LABOUR_SETTINGS_PAGE_PERMS, LABOUR_VIEW_PERMS, LP } from '@/features/labour/constants/labour.constants';

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
      { kind: 'link', label: 'Detailed Attendance', href: '/org-admin/attendance/employee', icon: UserCheck },
      { kind: 'link', label: 'Approvals', href: '/org-admin/attendance/approvals', icon: CheckSquare },
      { kind: 'link', label: 'Leave Management', href: '/org-admin/leave', icon: ClipboardList },
      { kind: 'link', label: 'Workforce Insights', href: '/org-admin/attendance/insights', icon: TrendingUp, match: 'prefix' },
      { kind: 'link', label: 'Approval Audit', href: '/org-admin/attendance/approval-audit', icon: Timer },
      { kind: 'link', label: 'Holidays', href: '/org-admin/holidays', icon: Calendar },
    ],
  },
  {
    kind: 'group', id: 'payroll', label: 'Payroll', icon: Banknote,
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
    kind: 'group', id: 'dpr', label: 'DPR', icon: HardHat, gate: { feature: 'DPR_FEATURE' },
    children: [
      { kind: 'link', label: 'Planning', href: '/org-admin/dpr/planning', icon: Calendar, match: 'prefix', altHrefs: ['/org-admin/dpr/lists'] },
      { kind: 'link', label: 'Daily Forms', href: '/org-admin/dpr/daily', icon: ClipboardList, match: 'prefix' },
      { kind: 'link', label: 'Dashboard', href: '/org-admin/dpr/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    kind: 'group', id: 'petty-cash', label: 'Petty Cash', icon: Coins, gate: { feature: 'PETTY_CASH_FEATURE' },
    children: [
      { kind: 'link', label: 'Overview', href: '/org-admin/petty-cash', icon: LayoutDashboard, gate: { anyPerm: ['PC_VIEW', 'PC_ADMIN'] } },
      { kind: 'link', label: 'Wallets', href: '/org-admin/petty-cash/wallets', icon: Wallet, match: 'prefix', gate: { anyPerm: ['PC_VIEW', 'PC_ADMIN', 'PC_FUND'] } },
      { kind: 'link', label: 'Expenses', href: '/org-admin/petty-cash/expenses', icon: Receipt, match: 'prefix', gate: { anyPerm: ['PC_VIEW', 'PC_ADMIN', 'PC_APPROVE', 'PC_FUND', 'PC_INWARD'] } },
      { kind: 'link', label: 'Fund requests', href: '/org-admin/petty-cash/fund-requests', icon: ArrowUpCircle, match: 'prefix', gate: { anyPerm: ['PC_VIEW', 'PC_ADMIN', 'PC_FUND'] } },
      { kind: 'link', label: 'Inward register', href: '/org-admin/petty-cash/inward', icon: Inbox, match: 'prefix', gate: { anyPerm: ['PC_INWARD', 'PC_VIEW', 'PC_ADMIN'] } },
      { kind: 'link', label: 'Categories', href: '/org-admin/petty-cash/categories', icon: Tags, match: 'prefix', gate: { anyPerm: ['PC_ADMIN'] } },
      { kind: 'link', label: 'Settings', href: '/org-admin/petty-cash/settings', icon: Cog, match: 'prefix', gate: { anyPerm: ['PC_VIEW', 'PC_ADMIN'] } },
    ],
  },
  {
    kind: 'group', id: 'labour', label: 'Labour', icon: HardHat, gate: { feature: 'LABOUR_FEATURE', anyPerm: ANY_LABOUR_PERM },
    children: [
      { kind: 'link', label: 'Dashboard', href: '/org-admin/labour', icon: LayoutDashboard, gate: { anyPerm: LABOUR_VIEW_PERMS } },
      { kind: 'link', label: 'Attendance', href: '/org-admin/labour/days', icon: ClipboardList, match: 'prefix', gate: { anyPerm: LABOUR_VIEW_PERMS } },
      { kind: 'link', label: 'Regularization', href: '/org-admin/labour/regularization', icon: Clock, match: 'prefix', gate: { anyPerm: LABOUR_VIEW_PERMS } },
      { kind: 'link', label: 'Labourers', href: '/org-admin/labour/labourers', icon: HardHat, match: 'prefix', gate: { anyPerm: LABOUR_VIEW_PERMS } },
      { kind: 'link', label: 'Contractors', href: '/org-admin/labour/contractors', icon: Briefcase, match: 'prefix', gate: { anyPerm: LABOUR_VIEW_PERMS } },
      { kind: 'link', label: 'Measurement book', href: '/org-admin/labour/measurements', icon: Ruler, match: 'prefix', gate: { anyPerm: LABOUR_MEAS_PAGE_PERMS } },
      { kind: 'link', label: 'Payable', href: '/org-admin/labour/payable', icon: HandCoins, match: 'prefix', gate: { anyPerm: LABOUR_PAYABLE_PERMS } },
      { kind: 'link', label: 'Categories', href: '/org-admin/labour/categories', icon: LayoutGrid, match: 'prefix', gate: { anyPerm: LABOUR_VIEW_PERMS } },
      { kind: 'link', label: 'Devices', href: '/org-admin/labour/devices', icon: Activity, match: 'prefix', gate: { anyPerm: LABOUR_VIEW_PERMS } },
      { kind: 'link', label: 'Billing', href: '/org-admin/labour/billing', icon: Receipt, match: 'prefix', gate: { anyPerm: [LP.BILLING] } },
      { kind: 'link', label: 'Compliance forms', href: '/org-admin/labour/compliance', icon: FileText, match: 'prefix', gate: { anyPerm: [LP.COMPLIANCE] } },
      { kind: 'link', label: 'Settings', href: '/org-admin/labour/settings', icon: Settings, match: 'prefix', gate: { anyPerm: LABOUR_SETTINGS_PAGE_PERMS } },
      { kind: 'link', label: 'Site Logins', href: '/org-admin/site-logins', icon: Shield, match: 'prefix', gate: { anyPerm: ['SITE_EDIT', 'SITE_ADD'] } },
    ],
  },
  {
    kind: 'group', id: 'mom', label: 'Minutes of Meeting', icon: NotebookPen, gate: { feature: 'MOM_FEATURE' },
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
