"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Users,
  Building2,
  Building,
  MapPin,
  Calendar,
  UserCog,
  Wallet,
  BarChart3,
  LayoutDashboard,
  Package,
  FileText,
  X,
  Shield,
  DollarSign,
  Coins,
  Clock,
  CheckSquare,
  AlertCircle,
  Settings,
  TrendingUp,
  ClipboardList,
  UserCheck,
  Briefcase,
  Heart,
  ListChecks,
  LayoutGrid,
  ArrowUpCircle,
  Receipt,
  Cog,
  Upload,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import TeamTunedLoader from "@/components/common/TeamTunedLoader";

export default function EmployeeSidebar({
  isCollapsed,
  setIsCollapsed,
  orgName,
  orgLogoUrl,
  onLogout,
  permissions,
  role,
  features,
}: {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  onLogout: () => void;
  permissions?: string[];
  role?: string | null;
  features?: string[];
}) {
  const pathname = usePathname();
  const [mainOpen, setMainOpen] = React.useState(true);
  const [inventoryOpen, setInventoryOpen] = React.useState(false);
  const [masterDataOpen, setMasterDataOpen] = React.useState(false);
  const [coreOpen, setCoreOpen] = React.useState(false);
  const [transactionsOpen, setTransactionsOpen] = React.useState(false);
  const [walletOpen, setWalletOpen] = React.useState(false);
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [insuranceOpen, setInsuranceOpen] = React.useState(false);
  const [salaryAdvanceOpen, setSalaryAdvanceOpen] = React.useState(false);
  const [managementOpen, setManagementOpen] = React.useState(false);
  const [attendanceOpen, setAttendanceOpen] = React.useState(true);
  const [otherOpen, setOtherOpen] = React.useState(false);
  const [isNavigating, setIsNavigating] = React.useState(false);

  // Track navigation for loading state
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Use AuthContext for immediate updates, fallback to props if context is initial loading (though context is preferred)
  const { permissions: authPermissions, role: authRole, organization } = useAuth();

  // Prefer context values over props for immediate reactivity after login
  const effectivePermissions = authPermissions && authPermissions.length > 0 ? authPermissions : (permissions || []);
  const effectiveRole = authRole || role;
  // Features might need to be fetched or passed. For now, we'll use props or if available in context (AuthContext doesn't have features explicitly in interface but we can add or assume props are okay for features if not dynamic per user)
  // Actually AuthContext has organization which might have features, or we rely on props for features. 
  // checking AuthContext definition... organization has features?

  const hasFeature = (code: string) => {
    if (!features) return false;
    return features.includes(code);
  };

  const hasAnyPerm = (codes: string[]) => {
    const list = (effectivePermissions || []).map((p) => (p || "").toUpperCase());
    return codes.some((c) => list.includes(c.toUpperCase()));
  };

  const hasPerm = (code: string) => (effectivePermissions || []).some((p: any) => (p || "").toUpperCase() === code.toUpperCase());

  const isOrgAdmin = (effectiveRole || "").toLowerCase() === "orgadmin";

  const Item = ({
    icon: Icon,
    label,
    href,
    active,
  }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    href: string;
    active: boolean;
  }) => (
    <Link
      href={href}
      onClick={() => setIsNavigating(true)}
      className={`group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 ${active
        ? "bg-black text-white font-medium shadow-md"
        : "text-black hover:bg-gray-100"
        }`}
      title={isCollapsed ? label : undefined}
    >
      <Icon size={20} className={`shrink-0 transition-colors ${active ? "text-white" : "text-black group-hover:text-gray-700"}`} />
      {!isCollapsed && (
        <span className="text-sm truncate">{label}</span>
      )}
    </Link>
  );

  const CategoryButton = ({
    label,
    isOpen,
    onClick,
  }: {
    label: string;
    isOpen: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors group mt-2 mb-1"
      title={isCollapsed ? label : undefined}
    >
      {!isCollapsed && (
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      )}
      {!isCollapsed && (
        isOpen ? (
          <ChevronDown size={14} className="text-gray-700 group-hover:text-black" />
        ) : (
          <ChevronRight size={14} className="text-gray-700 group-hover:text-black" />
        )
      )}
    </button>
  );

  const dashboardPath = "/employee";

  // Feature Flags
  const showCoreHR = hasFeature('PAYROLL_FEATURE');
  const showWallet = hasFeature('WALLET_FEATURE');
  const showTask = hasFeature('TASK_FEATURE');
  const showInventory = hasFeature('INVENTORY_FEATURE');

  // Permission gates
  const canViewOrgProfile = isOrgAdmin || hasAnyPerm(["ORGPROFILE_VIEW", "ORGPROFILE_ADD", "ORGPROFILE_EDIT", "ORGPROFILE_DELETE"]);
  const canViewSites = isOrgAdmin || hasAnyPerm(["SITE_VIEW", "SITE_ADD", "SITE_EDIT", "SITE_DELETE"]);
  const canViewDepartments = isOrgAdmin || hasAnyPerm(["DEPT_VIEW", "DEPT_ADD", "DEPT_EDIT", "DEPT_DELETE"]);
  const canViewRoles = isOrgAdmin || hasAnyPerm(["ROLE_VIEW", "ROLE_ADD", "ROLE_EDIT", "ROLE_DELETE"]);
  const canViewPolicies = isOrgAdmin || hasAnyPerm(["POLICY_VIEW", "POLICY_ADD", "POLICY_EDIT", "POLICY_DELETE"]);
  const canViewAttendanceConfig = isOrgAdmin || hasAnyPerm(["ATTENDCONFIG_VIEW", "ATTENDCONFIG_ADD", "ATTENDCONFIG_EDIT", "ATTENDCONFIG_DELETE"]);
  const canViewHoliday = isOrgAdmin || hasAnyPerm(["HOLIDAY_VIEW", "HOLIDAY_ADD", "HOLIDAY_EDIT", "HOLIDAY_DELETE"]);
  const canViewEmployeeManagement = isOrgAdmin || hasAnyPerm(["EMP_VIEW", "EMP_ADD", "EMP_EDIT", "EMP_DELETE"]);
  const canAssignEmployeeSites = isOrgAdmin || hasAnyPerm(["EMPSITE_VIEW", "EMPLOYEE_ASSIGN_SITE"]);
  const canViewLeaveRequests = isOrgAdmin || hasAnyPerm(["LEAVE_VIEW", "LEAVE_ADD", "LEAVE_EDIT", "LEAVE_APPROVE"]);
  const canViewRegularizeRequests = isOrgAdmin || hasAnyPerm(["ATTREG_VIEW", "ATTREG_APPROVE", "HR_MODE"]);
  const canViewVerificationIssues = isOrgAdmin || hasAnyPerm(["ATTVERIFY_VIEW", "ATTVERIFY_APPROVE"]);
  const canViewEmployeeAttendance = isOrgAdmin || hasAnyPerm(["ATTEND_VIEW", "ATTEND_ADD", "ATTEND_EDIT"]);
  const canViewPettyCash = isOrgAdmin || hasAnyPerm(["WALLET_ADMIN", "WALLET_VIEW", "WALLET_ADD"]);
  const canViewWalletTopups = isOrgAdmin || hasAnyPerm(["WALLET_ADMIN", "WALLET_TOPUP"]);
  const canViewWalletExpenses = isOrgAdmin || hasAnyPerm(["WALLET_ADMIN", "EXPENSE_VIEW", "EXPENSE_ADD", "EXPENSE_EDIT", "EXPENSE_DELETE"]);
  const canViewTasks = true; // Use granular perms instead

  const canViewInsurance = isOrgAdmin || hasAnyPerm(["INS_PROVIDER_VIEW", "INS_POLICY_VIEW", "INS_ENROLL_VIEW", "INS_CLAIM_VIEW"]);
  const canViewSessionRequests = isOrgAdmin || hasAnyPerm(["EMP_SESSION_VIEW", "EMP_SESSION_APPROVE"]);

  // Task Permissions
  const canViewTaskTemplates = isOrgAdmin || hasAnyPerm(["TASK_TEMPLATES", "TASK_CREATE"]);
  const canViewTaskAssignments = isOrgAdmin || hasAnyPerm(["TASK_VIEW", "TASK_ASSIGN"]);
  const canViewTaskDashboard = isOrgAdmin || hasAnyPerm(["TASK_VIEW"]);

  // Salary Advance Permissions
  const canViewSalAdvRequests = isOrgAdmin || hasAnyPerm(["SALADV_VIEW"]);
  const canViewSalAdvApprovals = isOrgAdmin || hasAnyPerm(["SALADV_APPROVE"]);
  const canViewSalAdvRepayments = isOrgAdmin || hasAnyPerm(["SALADV_VIEW"]);
  const canViewSalAdvAnalytics = isOrgAdmin || hasAnyPerm(["SALADV_VIEW"]);
  const canViewSalAdvPolicy = isOrgAdmin || hasAnyPerm(["SALADV_POLICY"]);
  const canViewSalAdvAccounts = isOrgAdmin || hasAnyPerm(["SALADV_PAY"]);


  const showOrgMain = [
    canViewOrgProfile,
    canViewSites,
    canViewDepartments,
    canViewRoles,
    canViewPolicies,
    canViewAttendanceConfig,
    canViewHoliday,
    hasPerm("SITE_BUDGET_VIEW") || hasPerm("SITE_BUDGET_REQUEST") || hasPerm("SITE_BUDGET_APPROVE"),
  ].some(Boolean);

  const showManagement = [
    canViewEmployeeManagement,
    canAssignEmployeeSites,
  ].some(Boolean);

  const showAttendanceSection = [
    canViewAttendanceConfig, // Moved from Main? No, kept config in Main usually, but user said 'all attendance related'. I'll enable Attendance section if any operational item is visible.
    canViewLeaveRequests,
    canViewRegularizeRequests,
    canViewVerificationIssues,
    canViewEmployeeAttendance,
    canViewSessionRequests,
  ].some(Boolean);

  const showOther = [
    canViewPettyCash,
    canViewWalletTopups,
    canViewWalletExpenses,
    (isOrgAdmin || hasAnyPerm(["WALLET_ADMIN"])),
  ].some(Boolean);

  const showTaskSection = showTask && [
    canViewTaskTemplates,
    canViewTaskAssignments,
    canViewTaskDashboard
  ].some(Boolean);

  const showSalaryAdvanceSection = showCoreHR && [
    canViewSalAdvRequests,
    canViewSalAdvApprovals,
    canViewSalAdvRepayments,
    canViewSalAdvAnalytics,
    canViewSalAdvPolicy,
    canViewSalAdvAccounts
  ].some(Boolean);
  const showPayroll = isOrgAdmin || hasAnyPerm(["PAYROLL_VIEW", "HR_MODE"]);

  return (
    <aside
      className={`h-screen bg-gray-50 ${isCollapsed ? "w-16" : "w-64"
        } flex flex-col transition-all duration-300 ease-in-out z-50`}
    >
      {/* Header - No top border, clean layout */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-5 pt-6 pb-4 min-h-[80px]`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 min-w-0">
            {orgLogoUrl ? (
              <img
                src={orgLogoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-cover shadow-sm ring-1 ring-gray-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-sm">
                <Building2 size={20} className="text-gray-400" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-black leading-tight break-words">
                {orgName || "Organization"}
              </span>
              <span className="text-xs text-gray-500 truncate">
                {isOrgAdmin ? "Organization Portal" : "Employee Portal"}
              </span>
            </div>
          </div>
        )}
        {/* Navigation Loader */}
        {isNavigating && <TeamTunedLoader />}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-2 rounded-xl hover:bg-gray-100 text-black hover:text-black transition-all ${isCollapsed ? '' : 'ml-2'}`}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">

        {/* Dashboard */}
        <Item
          icon={Home}
          label="Dashboard"
          href={dashboardPath}
          active={pathname === dashboardPath}
        />

        {/* Main Section */}
        {showCoreHR && showOrgMain && (
          <div className="mt-4">
            {!isCollapsed && (
              <CategoryButton
                label="Main"
                isOpen={mainOpen}
                onClick={() => setMainOpen(!mainOpen)}
              />
            )}
            {mainOpen && (
              <div className={`space-y-1 ${isCollapsed ? "" : "pl-0"}`}>
                <div className={`relative ${isCollapsed ? "" : "ml-3 pl-3 border-l border-gray-100"}`}>
                  {canViewOrgProfile && (
                    <Item
                      icon={Building2}
                      label="Organization Profile"
                      href="/employee/orgProfile"
                      active={pathname?.startsWith("/employee/orgProfile") || false}
                    />
                  )}
                  {canViewSites && (
                    <Item
                      icon={MapPin}
                      label="Sites"
                      href="/employee/sites"
                      active={pathname === "/employee/sites"}
                    />
                  )}
                  {(hasPerm("SITE_BUDGET_VIEW") || hasPerm("SITE_BUDGET_REQUEST") || hasPerm("SITE_BUDGET_APPROVE")) && (
                    <Item
                      icon={DollarSign}
                      label="Budget Requests"
                      href="/employee/site-budget-requests"
                      active={pathname === "/employee/site-budget-requests"}
                    />
                  )}
                  {canViewDepartments && (
                    <Item
                      icon={Building}
                      label="Departments"
                      href="/employee/departments"
                      active={pathname?.startsWith("/employee/departments") || false}
                    />
                  )}
                  {canViewRoles && (
                    <Item
                      icon={UserCog}
                      label="Roles"
                      href="/employee/roles"
                      active={pathname?.startsWith("/employee/roles") || false}
                    />
                  )}
                  {canViewPolicies && (
                    <Item
                      icon={ClipboardList}
                      label="Policies"
                      href="/employee/attendance-rules"
                      active={pathname?.startsWith("/employee/attendance-rules") || false}
                    />
                  )}
                  {canViewAttendanceConfig && (
                    <Item
                      icon={Settings}
                      label="Configuration"
                      href="/employee/attendance-config"
                      active={pathname?.startsWith("/employee/attendance-config") || false}
                    />
                  )}
                  {canViewHoliday && (
                    <Item
                      icon={Calendar}
                      label="Holiday Calendar"
                      href="/employee/holiday-calendar"
                      active={pathname?.startsWith("/employee/holiday-calendar") || false}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attendance Section */}
        {showCoreHR && showAttendanceSection && (
          <div className="mt-2">
            {!isCollapsed && (
              <CategoryButton
                label="Attendance"
                isOpen={attendanceOpen}
                onClick={() => setAttendanceOpen(!attendanceOpen)}
              />
            )}
            {attendanceOpen && (
              <div className={`space-y-1 ${isCollapsed ? "" : "pl-0"}`}>
                <div className={`relative ${isCollapsed ? "" : "ml-3 pl-3 border-l border-gray-100"}`}>
                  {canViewEmployeeAttendance && (
                    <Item
                      icon={BarChart3}
                      label="Dashboard"
                      href="/employee/attendance-dashboard"
                      active={pathname?.startsWith("/employee/attendance-dashboard") || false}
                    />
                  )}
                  {canViewEmployeeAttendance && (
                    <Item
                      icon={ClipboardList}
                      label="Attendance Logs"
                      href="/employee/attendance"
                      active={pathname === "/employee/attendance" || (pathname?.startsWith("/employee/attendance") && !pathname?.includes("attendance-dashboard") && !pathname?.includes("sessions")) || false}
                    />
                  )}
                  {canViewSessionRequests && (
                    <Item
                      icon={Clock}
                      label="Session Requests"
                      href="/employee/attendance/sessions"
                      active={pathname?.startsWith("/employee/attendance/sessions") || false}
                    />
                  )}
                  {canViewRegularizeRequests && (
                    <Item
                      icon={CheckSquare}
                      label="Regularizations"
                      href="/employee/regularize-requests"
                      active={pathname?.startsWith("/employee/regularize-requests") || false}
                    />
                  )}
                  {canViewVerificationIssues && (
                    <Item
                      icon={AlertCircle}
                      label="Verification Issues"
                      href="/employee/verification-issues"
                      active={pathname?.startsWith("/employee/verification-issues") || false}
                    />
                  )}
                  {canViewLeaveRequests && (
                    <Item
                      icon={Calendar}
                      label="Leave Requests"
                      href="/employee/leave-requests"
                      active={pathname?.startsWith("/employee/leave-requests") || false}
                    />
                  )}
                  {canViewLeaveRequests && (
                    <Item
                      icon={Clock}
                      label="Comp-Off Requests"
                      href="/employee/comp-offs"
                      active={pathname?.startsWith("/employee/comp-offs") || false}
                    />
                  )}
                  {showPayroll && (
                    <Item
                      icon={DollarSign}
                      label="Payroll"
                      href="/employee/payroll"
                      active={pathname?.startsWith("/employee/payroll") || false}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Management Section */}
        {showCoreHR && showManagement && (
          <div className="mt-2">
            {!isCollapsed && (
              <CategoryButton
                label="Management"
                isOpen={managementOpen}
                onClick={() => setManagementOpen(!managementOpen)}
              />
            )}
            {managementOpen && (
              <div className={`space-y-1 ${isCollapsed ? "" : "pl-0"}`}>
                <div className={`relative ${isCollapsed ? "" : "ml-3 pl-3 border-l border-gray-100"}`}>
                  {canViewEmployeeManagement && (
                    <Item
                      icon={Users}
                      label="Employees"
                      href="/employee/employee-management"
                      active={pathname?.startsWith("/employee/employee-management") || false}
                    />
                  )}
                  {(isOrgAdmin || hasAnyPerm(['EMP_ADD'])) && (
                    <>
                      <Item
                        icon={Upload}
                        label="Import Employees"
                        href="/employee/employees/import"
                        active={pathname?.startsWith("/employee/employees/import") || false}
                      />
                      <Item
                        icon={Clock}
                        label="Shift Management"
                        href="/employee/employees/shifts"
                        active={pathname?.startsWith("/employee/employees/shifts") || false}
                      />
                    </>
                  )}
                  {canAssignEmployeeSites && (
                    <>
                      <Item
                        icon={MapPin}
                        label="Employee Sites"
                        href="/employee/employee-sites"
                        active={pathname?.startsWith("/employee/employee-sites") || false}
                      />
                      <Item
                        icon={MapPin}
                        label="Other Locations"
                        href="/employee/other-locations"
                        active={pathname?.startsWith("/employee/other-locations") || false}
                      />
                    </>
                  )}
                  {(isOrgAdmin || hasAnyPerm(['EMP_ADD'])) && (
                    <>
                      <Item
                        icon={Coins}
                        label="Salary Components"
                        href="/employee/salary-components"
                        active={pathname?.startsWith("/employee/salary-components") || false}
                      />
                      <Item
                        icon={ListChecks}
                        label="Debit Rules"
                        href="/employee/debit-rules"
                        active={pathname?.startsWith("/employee/debit-rules") || false}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Insurance Section */}
        {showCoreHR && canViewInsurance && (
          <div className="mt-2">
            {!isCollapsed && (
              <CategoryButton
                label="Insurance"
                isOpen={insuranceOpen}
                onClick={() => setInsuranceOpen(!insuranceOpen)}
              />
            )}
            {insuranceOpen && (
              <div className={`space-y-1 ${isCollapsed ? "" : "pl-0"}`}>
                <div className={`relative ${isCollapsed ? "" : "ml-3 pl-3 border-l border-gray-100"}`}>
                  {(isOrgAdmin || hasAnyPerm(['INS_POLICY_STATS'])) && (
                    <Item
                      icon={LayoutGrid}
                      label="Dashboard"
                      href="/employee/insurance/dashboard"
                      active={pathname?.startsWith("/employee/insurance/dashboard") || false}
                    />
                  )}
                  {(isOrgAdmin || hasAnyPerm(['INS_PROVIDER_VIEW', 'INS_PROVIDER_ADD', 'INS_PROVIDER_EDIT', 'INS_PROVIDER_DELETE'])) && (
                    <Item
                      icon={Building2}
                      label="Providers"
                      href="/employee/insurance/providers"
                      active={pathname?.startsWith("/employee/insurance/providers") || false}
                    />
                  )}
                  {(isOrgAdmin || hasAnyPerm(['INS_POLICY_VIEW', 'INS_POLICY_ADD', 'INS_POLICY_EDIT', 'INS_POLICY_DELETE'])) && (
                    <Item
                      icon={Shield}
                      label="Policies"
                      href="/employee/insurance/policies"
                      active={pathname?.startsWith("/employee/insurance/policies") || false}
                    />
                  )}
                  {(isOrgAdmin || hasAnyPerm(['INS_ENROLL_VIEW', 'INS_ENROLL_ADD', 'INS_ENROLL_EDIT', 'INS_ENROLL_APPROVE'])) && (
                    <Item
                      icon={UserCheck}
                      label="Enrollment"
                      href="/employee/insurance/enrollment"
                      active={pathname?.startsWith("/employee/insurance/enrollment") || false}
                    />
                  )}
                  {(isOrgAdmin || hasAnyPerm(['INS_POLICY_STATS'])) && (
                    <>
                      <Item
                        icon={Users}
                        label="Dependents"
                        href="/employee/insurance/dependents"
                        active={pathname?.startsWith("/employee/insurance/dependents") || false}
                      />
                      <Item
                        icon={Heart}
                        label="Beneficiaries"
                        href="/employee/insurance/beneficiaries"
                        active={pathname?.startsWith("/employee/insurance/beneficiaries") || false}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Salary Advance Section */}
        {showSalaryAdvanceSection && (
          <div className="mt-2">
            {!isCollapsed && (
              <CategoryButton
                label="Salary Advance"
                isOpen={salaryAdvanceOpen}
                onClick={() => setSalaryAdvanceOpen(!salaryAdvanceOpen)}
              />
            )}
            {salaryAdvanceOpen && (
              <div className={`space-y-1 ${isCollapsed ? "" : "pl-0"}`}>
                <div className={`relative ${isCollapsed ? "" : "ml-3 pl-3 border-l border-gray-100"}`}>
                  {canViewSalAdvRequests && (
                    <Item
                      icon={ClipboardList}
                      label="All Requests"
                      href="/employee/salary-advance/requests"
                      active={pathname?.startsWith("/employee/salary-advance/requests") || false}
                    />
                  )}
                  {canViewSalAdvApprovals && (
                    <Item
                      icon={CheckSquare}
                      label="Approval Queue"
                      href="/employee/salary-advance/approvals"
                      active={pathname?.startsWith("/employee/salary-advance/approvals") || false}
                    />
                  )}
                  {canViewSalAdvRepayments && (
                    <Item
                      icon={Calendar}
                      label="Repayment Schedule"
                      href="/employee/salary-advance/repayments"
                      active={pathname?.startsWith("/employee/salary-advance/repayments") || false}
                    />
                  )}
                  {canViewSalAdvAnalytics && (
                    <Item
                      icon={TrendingUp}
                      label="Analytics"
                      href="/employee/salary-advance/analytics"
                      active={pathname?.startsWith("/employee/salary-advance/analytics") || false}
                    />
                  )}
                  {canViewSalAdvPolicy && (
                    <Item
                      icon={Settings}
                      label="Policy Configuration"
                      href="/employee/salary-advance/policy"
                      active={pathname?.startsWith("/employee/salary-advance/policy") || false}
                    />
                  )}
                  {canViewSalAdvAccounts && (
                    <Item
                      icon={Users}
                      label="Accounts"
                      href="/employee/salary-advance/accounts"
                      active={pathname?.startsWith("/employee/salary-advance/accounts") || false}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}


        {/* Petty Cash Section */}
        {showWallet && showOther && (
          <div className="mt-2">
            {!isCollapsed && (
              <CategoryButton
                label="Petty Cash"
                isOpen={otherOpen}
                onClick={() => setOtherOpen(!otherOpen)}
              />
            )}
            {otherOpen && (
              <div className={`space-y-1 ${isCollapsed ? "" : "pl-0"}`}>
                <div className={`relative ${isCollapsed ? "" : "ml-3 pl-3 border-l border-gray-100"}`}>
                  {canViewPettyCash && (
                    <Item
                      icon={DollarSign}
                      label="Wallets"
                      href="/employee/petty-cash"
                      active={pathname?.startsWith("/employee/petty-cash") || false}
                    />
                  )}
                  {canViewWalletExpenses && (
                    <Item
                      icon={Receipt}
                      label="Wallet Expenses"
                      href="/employee/wallet-overview"
                      active={pathname?.startsWith("/employee/wallet-overview") || false}
                    />
                  )}
                  {(isOrgAdmin || hasAnyPerm(["WALLET_ADMIN"])) && (
                    <Item
                      icon={Cog}
                      label="Wallet Config"
                      href="/employee/wallet-config"
                      active={pathname?.startsWith("/employee/wallet-config") || false}
                    />
                  )}
                  {canViewWalletTopups && (
                    <Item
                      icon={ArrowUpCircle}
                      label="Wallet Topups"
                      href="/employee/wallet-topups"
                      active={pathname?.startsWith("/employee/wallet-topups") || false}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Inventory Section */}
        {showInventory && (
          <div className="mt-2">
            {!isCollapsed && (
              <CategoryButton
                label="Inventory"
                isOpen={inventoryOpen}
                onClick={() => setInventoryOpen(!inventoryOpen)}
              />
            )}
            {inventoryOpen && (
              <div className={`space-y-1 ${isCollapsed ? "" : "pl-0"}`}>
                <div className={`relative ${isCollapsed ? "" : "ml-3 pl-3 border-l border-gray-100"}`}>
                  {/* Master Data Submenu */}
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setMasterDataOpen(!masterDataOpen)}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {masterDataOpen ? (
                          <ChevronDown size={16} className="text-gray-600" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-600" />
                        )}
                        {!isCollapsed && (
                          <span className="text-gray-700 font-medium">Master Data</span>
                        )}
                      </div>
                    </button>

                    {masterDataOpen && (
                      <div className={`mt-0.5 space-y-0.5 ${isCollapsed ? "pl-0" : "pl-4"}`}>
                        <div className={`relative ${isCollapsed ? "" : "ml-2 pl-2 border-l border-gray-100"}`}>
                          <Item icon={Package} label="Onboarding" href="/employee/inventory/onboarding" active={pathname?.startsWith("/employee/inventory/onboarding") || false} />
                          <Item icon={Building2} label="Site Config" href="/employee/inventory/sites" active={pathname?.startsWith("/employee/inventory/sites") || false} />
                          <Item icon={Package} label="Categories" href="/employee/inventory/categories" active={pathname?.startsWith("/employee/inventory/categories") || false} />
                          <Item icon={Package} label="Subcategories" href="/employee/inventory/subcategories" active={pathname?.startsWith("/employee/inventory/subcategories") || false} />
                          <Item icon={Building2} label="Vendors" href="/employee/inventory/vendors" active={pathname?.startsWith("/employee/inventory/vendors") || false} />
                          <Item icon={Package} label="Items" href="/employee/inventory/items" active={pathname?.startsWith("/employee/inventory/items") || false} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CORE Submenu */}
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setCoreOpen(!coreOpen)}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {coreOpen ? (
                          <ChevronDown size={16} className="text-gray-600" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-600" />
                        )}
                        {!isCollapsed && (
                          <span className="text-gray-700 font-medium">CORE</span>
                        )}
                      </div>
                    </button>

                    {coreOpen && (
                      <div className={`mt-0.5 space-y-0.5 ${isCollapsed ? "pl-0" : "pl-4"}`}>
                        <div className={`relative ${isCollapsed ? "" : "ml-2 pl-2 border-l border-gray-100"}`}>
                          <Item icon={Package} label="Store Selection" href="/employee/inventory/stores" active={pathname?.startsWith("/employee/inventory/stores") || false} />
                          <Item icon={Package} label="Store Stock" href="/employee/inventory/stock" active={pathname?.startsWith("/employee/inventory/stock") || false} />
                          <Item icon={Package} label="Store Batch" href="/employee/inventory/batches" active={pathname?.startsWith("/employee/inventory/batches") || false} />
                          <Item icon={Package} label="Store Serials" href="/employee/inventory/serials" active={pathname?.startsWith("/employee/inventory/serials") || false} />
                          <Item icon={Package} label="Stock Ledger" href="/employee/inventory/ledger" active={pathname?.startsWith("/employee/inventory/ledger") || false} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Transactions Submenu */}
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setTransactionsOpen(!transactionsOpen)}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {transactionsOpen ? (
                          <ChevronDown size={16} className="text-gray-600" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-600" />
                        )}
                        {!isCollapsed && (
                          <span className="text-gray-700 font-medium">Transactions</span>
                        )}
                      </div>
                    </button>

                    {transactionsOpen && (
                      <div className={`mt-0.5 space-y-0.5 ${isCollapsed ? "pl-0" : "pl-4"}`}>
                        <div className={`relative ${isCollapsed ? "" : "ml-2 pl-2 border-l border-gray-100"}`}>
                          <Item icon={Package} label="GRN" href="/employee/inventory/grn" active={pathname?.startsWith("/employee/inventory/grn") || false} />
                          <Item icon={FileText} label="RFQ" href="/employee/rfq" active={pathname?.startsWith("/employee/rfq") || false} />
                          <Item icon={FileText} label="Purchase Request" href="/employee/pr" active={pathname?.startsWith("/employee/pr") || false} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Task Section */}
        {showTaskSection && (
          <div className="mt-2">
            {!isCollapsed && (
              <CategoryButton
                label="Task"
                isOpen={taskOpen}
                onClick={() => setTaskOpen(!taskOpen)}
              />
            )}
            {taskOpen && (
              <div className={`space-y-1 ${isCollapsed ? "" : "pl-0"}`}>
                <div className={`relative ${isCollapsed ? "" : "ml-3 pl-3 border-l border-gray-100"}`}>
                  {canViewTaskTemplates && (
                    <Item
                      icon={FileText}
                      label="Templates"
                      href="/employee/tasks"
                      active={pathname?.startsWith("/employee/tasks") || false}
                    />
                  )}
                  {canViewTaskAssignments && (
                    <Item
                      icon={ListChecks}
                      label="Assignments"
                      href="/employee/task-assignments"
                      active={pathname?.startsWith("/employee/task-assignments") || false}
                    />
                  )}
                  {canViewTaskDashboard && (
                    <Item
                      icon={LayoutGrid}
                      label="Dashboard"
                      href="/employee/task-dashboard"
                      active={pathname?.startsWith("/employee/task-dashboard") || false}
                    />
                  )}
                  {/* <Item
                    icon={Settings}
                    label="Builder"
                    href="/employee/dashboard-builder"
                    active={pathname?.startsWith("/employee/dashboard-builder") || false}
                  /> */}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4">
        <button
          type="button"
          onClick={onLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg transition-all duration-200 group ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut size={20} className="shrink-0 text-white" />
          {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
