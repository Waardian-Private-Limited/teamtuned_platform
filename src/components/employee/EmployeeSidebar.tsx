"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

export default function EmployeeSidebar({
  isCollapsed,
  setIsCollapsed,
  orgName,
  orgLogoUrl,
  onLogout,
  permissions,
  role,
}: {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  onLogout: () => void;
  permissions?: string[];
  role?: string | null;
}) {
  const pathname = usePathname();
  const [mainOpen, setMainOpen] = React.useState(true);
  const [managementOpen, setManagementOpen] = React.useState(true);
  const [taskOpen, setTaskOpen] = React.useState(true);

  const hasAnyPerm = (codes: string[]) => {
    const list = (permissions || []).map((p) => (p || "").toUpperCase());
    return codes.some((c) => list.includes(c.toUpperCase()));
  };
  // Treat role case-insensitively and align with other components
  const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";

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
      className={`group flex items-center gap-3 w-full px-2.5 py-2 rounded-lg transition-all duration-150 ${
        active ? "bg-indigo-50 ring-1 ring-indigo-100" : "hover:bg-slate-100"
      }`}
      title={label}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={18} className={`shrink-0 ${active ? "text-indigo-600" : "text-slate-700"}`} />
      {!isCollapsed && (
        <span className={`text-sm font-medium truncate ${active ? "text-indigo-700" : "text-slate-800"}`}>{label}</span>
      )}
    </Link>
  );

  const dashboardPath = "/employee";

  // Permission gates (OrgAdmin bypasses all)
  const canViewOrgProfile = isOrgAdmin || hasAnyPerm(["ORGPROFILE_VIEW", "ORGPROFILE_ADD", "ORGPROFILE_EDIT", "ORGPROFILE_DELETE"]);
  const canViewSites = isOrgAdmin || hasAnyPerm(["SITE_VIEW", "SITE_ADD", "SITE_EDIT", "SITE_DELETE"]);
  const canViewDepartments = isOrgAdmin || hasAnyPerm(["DEPT_VIEW", "DEPT_ADD", "DEPT_EDIT", "DEPT_DELETE"]);
  const canViewRoles = isOrgAdmin || hasAnyPerm(["ROLE_VIEW", "ROLE_ADD", "ROLE_EDIT", "ROLE_DELETE"]);
  const canViewPolicies = isOrgAdmin || hasAnyPerm(["POLICY_VIEW", "POLICY_ADD", "POLICY_EDIT", "POLICY_DELETE"]);
  const canViewAttendanceConfig = isOrgAdmin || hasAnyPerm(["ATTENDCONFIG_VIEW", "ATTENDCONFIG_ADD", "ATTENDCONFIG_EDIT", "ATTENDCONFIG_DELETE"]);
  const canViewHoliday = isOrgAdmin || hasAnyPerm(["HOLIDAY_VIEW", "HOLIDAY_ADD", "HOLIDAY_EDIT", "HOLIDAY_DELETE"]);
  // Employee Management visibility: OrgAdmin or EMP_* permissions
  const canViewEmployeeManagement = isOrgAdmin || hasAnyPerm(["EMP_VIEW", "EMP_ADD", "EMP_EDIT", "EMP_DELETE"]);
  // Employee Sites: OrgAdmin OR users with EMPSITE_VIEW or EMPLOYEE_ASSIGN_SITE
  const canAssignEmployeeSites = isOrgAdmin || hasAnyPerm(["EMPSITE_VIEW", "EMPLOYEE_ASSIGN_SITE"]);
  const canViewLeaveRequests = isOrgAdmin || hasAnyPerm(["LEAVE_VIEW", "LEAVE_ADD", "LEAVE_EDIT", "LEAVE_APPROVE"]);
  const canViewRegularizeRequests = isOrgAdmin || hasAnyPerm(["ATTREG_VIEW", "ATTREG_APPROVE", "HR_MODE"]);
  const canViewVerificationIssues = isOrgAdmin || hasAnyPerm(["ATTVERIFY_VIEW", "ATTVERIFY_APPROVE"]);
  const canViewEmployeeAttendance = isOrgAdmin || hasAnyPerm(["ATTEND_VIEW", "ATTEND_ADD", "ATTEND_EDIT"]);
  // Wallet / Petty Cash: visible if OrgAdmin OR WALLET_ADMIN OR has any of WALLET_VIEW/WALLET_ADD
  const canViewPettyCash = isOrgAdmin || hasAnyPerm(["WALLET_ADMIN", "WALLET_VIEW", "WALLET_ADD"]);
  // Wallet Topups: visible if OrgAdmin OR WALLET_ADMIN OR WALLET_TOPUP
  const canViewWalletTopups = isOrgAdmin || hasAnyPerm(["WALLET_ADMIN", "WALLET_TOPUP"]);
  // Wallet Expenses: visible if OrgAdmin OR WALLET_ADMIN OR any EXPENSE_* perms
  const canViewWalletExpenses = isOrgAdmin || hasAnyPerm(["WALLET_ADMIN", "EXPENSE_VIEW", "EXPENSE_ADD", "EXPENSE_EDIT", "EXPENSE_DELETE"]);
  // Tasks visibility: make visible to employees without crossing into org-admin routes
  const canViewTasks = true;

  // Compute section visibility (hide heading if no child permissions)
  const showOrgMain = [
    canViewOrgProfile,
    canViewSites,
    canViewDepartments,
    canViewRoles,
    canViewPolicies,
    canViewAttendanceConfig,
    canViewHoliday,
  ].some(Boolean);

  const showManagement = [
    canViewEmployeeManagement,
    canAssignEmployeeSites,
    canViewLeaveRequests,
    canViewRegularizeRequests,
    canViewVerificationIssues,
    canViewEmployeeAttendance,
    canViewPettyCash,
    canViewWalletTopups,
    canViewWalletExpenses,
  ].some(Boolean);

  const showTask = [canViewTasks].some(Boolean);

  return (
    <aside
      className={`h-screen border-r border-slate-200 bg-white ${isCollapsed ? "w-16" : "w-64"} flex flex-col justify-between overflow-y-auto shadow-sm`}
    >
      <div>
        <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-white/70 backdrop-blur">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              {orgLogoUrl ? (
                <img src={orgLogoUrl} alt="Org Logo" className="w-8 h-8 rounded-md object-cover shadow-sm" />
              ) : (
                <div className="w-8 h-8 rounded-md bg-slate-200" />
              )}
              <span className="text-sm font-semibold text-slate-900 truncate" title={orgName || "Organization"}>
                {orgName || "Organization"}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-md hover:bg-slate-100 transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            <Menu size={18} className="text-slate-800" />
          </button>
        </div>

        {/* Dashboard (top-level) */}
        <div className="p-3">
          <Item icon={Home} label="Dashboard" href={dashboardPath} active={pathname === dashboardPath} />
        </div>

        {/* Organization Main */}
        {showOrgMain && (
          <div className="p-3">
            <button
              type="button"
              onClick={() => setMainOpen(!mainOpen)}
              className="flex items-center justify-between w-full px-2 py-2 rounded-md hover:bg-slate-100"
              aria-expanded={mainOpen}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-black">
                {mainOpen ? <ChevronDown size={18} className="text-slate-800" /> : <ChevronRight size={18} className="text-slate-800" />}
                {!isCollapsed && "Main"}
              </span>
            </button>

            {mainOpen && (
              <div className="mt-2 space-y-1.5 relative pl-4 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-px before:bg-slate-200">
                {canViewOrgProfile && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item icon={Building2} label="Organization Profile" href="/employee/orgProfile" active={pathname?.startsWith("/employee/orgProfile") || false} />
                  </div>
                )}
                {canViewSites && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item icon={MapPin} label="Sites" href="/employee/sites" active={pathname?.startsWith("/employee/sites") || false} />
                  </div>
                )}
                {canViewDepartments && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item icon={Building} label="Departments" href="/employee/departments" active={pathname?.startsWith("/employee/departments") || false} />
                  </div>
                )}
                {canViewRoles && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item icon={UserCog} label="Roles" href="/employee/roles" active={pathname?.startsWith("/employee/roles") || false} />
                  </div>
                )}
                {canViewPolicies && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item icon={Calendar} label="Policies" href="/employee/attendance-rules" active={pathname?.startsWith("/employee/attendance-rules") || false} />
                  </div>
                )}
                {canViewAttendanceConfig && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item icon={MapPin} label="Attendance Configuration" href="/employee/attendance-config" active={pathname?.startsWith("/employee/attendance-config") || false} />
                  </div>
                )}
                {canViewHoliday && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item
                      icon={Calendar}
                      label="Holiday Calendar"
                      href={isOrgAdmin ? "/org-admin/holiday-calendar" : "/employee/holiday-calendar"}
                      active={pathname?.startsWith(isOrgAdmin ? "/org-admin/holiday-calendar" : "/employee/holiday-calendar") || false}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Management */}
        {showManagement && (
          <div className="p-3">
            <button
              type="button"
              onClick={() => setManagementOpen(!managementOpen)}
              className="flex items-center justify-between w-full px-2 py-2 rounded-md hover:bg-slate-100"
              aria-expanded={managementOpen}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-black">
                {managementOpen ? <ChevronDown size={18} className="text-slate-800" /> : <ChevronRight size={18} className="text-slate-800" />}
                {!isCollapsed && "Management"}
              </span>
            </button>

            {managementOpen && (
              <div className="mt-2 space-y-1.5 relative pl-4 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-px before:bg-slate-200">
                {canViewEmployeeManagement && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item icon={Users} label="Employee Management" href="/employee/employee-management" active={pathname?.startsWith("/employee/employee-management") || false} />
                  </div>
                )}
                {canAssignEmployeeSites && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item
                      icon={Users}
                      label="Employee Sites"
                      href={isOrgAdmin ? "/org-admin/employee-sites" : "/employee/employee-sites"}
                      active={pathname?.startsWith(isOrgAdmin ? "/org-admin/employee-sites" : "/employee/employee-sites") || false}
                    />
                  </div>
                )}
                {canViewLeaveRequests && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item
                      icon={Calendar}
                      label="Leave Requests"
                      href={isOrgAdmin ? "/org-admin/leave-requests" : "/employee/leave-requests"}
                      active={pathname?.startsWith(isOrgAdmin ? "/org-admin/leave-requests" : "/employee/leave-requests") || false}
                    />
                  </div>
                )}
                {canViewRegularizeRequests && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item
                      icon={Users}
                      label="Regularize Requests"
                      href={isOrgAdmin ? "/org-admin/regularize-requests" : "/employee/regularize-requests"}
                      active={pathname?.startsWith(isOrgAdmin ? "/org-admin/regularize-requests" : "/employee/regularize-requests") || false}
                    />
                  </div>
                )}
                {canViewEmployeeAttendance && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item
                      icon={Calendar}
                      label="Attendance"
                      href={isOrgAdmin ? "/org-admin/employee-attendance" : "/employee/attendance"}
                      active={pathname?.startsWith(isOrgAdmin ? "/org-admin/employee-attendance" : "/employee/attendance") || false}
                    />
                  </div>
                )}
                {canViewPettyCash && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item
                      icon={Wallet}
                      label="Petty Cash"
                      href={isOrgAdmin ? "/org-admin/petty-cash" : "/employee/petty-cash"}
                      active={pathname?.startsWith(isOrgAdmin ? "/org-admin/petty-cash" : "/employee/petty-cash") || false}
                    />
                  </div>
                )}
                {canViewWalletExpenses && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item
                      icon={Wallet}
                      label="Wallet Expenses"
                      href={isOrgAdmin ? "/org-admin/wallet-expenses" : "/employee/wallet-expenses"}
                      active={pathname?.startsWith(isOrgAdmin ? "/org-admin/wallet-expenses" : "/employee/wallet-expenses") || false}
                    />
                  </div>
                )}
                {(isOrgAdmin || hasAnyPerm(["WALLET_ADMIN"])) && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item
                      icon={Wallet}
                      label="Wallet Config"
                      href={isOrgAdmin ? "/org-admin/wallet-config" : "/employee/wallet-config"}
                      active={pathname?.startsWith(isOrgAdmin ? "/org-admin/wallet-config" : "/employee/wallet-config") || false}
                    />
                  </div>
                )}
                {canViewWalletTopups && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item
                      icon={Wallet}
                      label="Wallet Topups"
                      href={isOrgAdmin ? "/org-admin/wallet-topups" : "/employee/wallet-topups"}
                      active={pathname?.startsWith(isOrgAdmin ? "/org-admin/wallet-topups" : "/employee/wallet-topups") || false}
                    />
                  </div>
                )}
                {canViewVerificationIssues && (
                  <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                    <Item icon={UserCog} label="Verification Issues" href="/employee/verification-issues" active={pathname?.startsWith("/employee/verification-issues") || false} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Task (new category) */}
        {showTask && (
          <div className="p-3">
            <button
              type="button"
              onClick={() => setTaskOpen(!taskOpen)}
              className="flex items-center justify-between w-full px-2 py-2 rounded-md hover:bg-slate-100"
              aria-expanded={taskOpen}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-black">
                {taskOpen ? (
                  <ChevronDown size={18} className="text-slate-800" />
                ) : (
                  <ChevronRight size={18} className="text-slate-800" />
                )}
                {!isCollapsed && "Task"}
              </span>
            </button>

            {taskOpen && (
              <div className="mt-2 space-y-1.5 relative pl-4 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-px before:bg-slate-200">
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Calendar}
                    label="Task Templates"
                    href="/employee/tasks"
                    active={pathname?.startsWith("/employee/tasks") || false}
                  />
                </div>
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Calendar}
                    label="Task Assignments"
                    href="/employee/task-assignments"
                    active={pathname?.startsWith("/employee/task-assignments") || false}
                  />
                </div>
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Calendar}
                    label="Task Dashboard"
                    href="/employee/task-dashboard"
                    active={pathname?.startsWith("/employee/task-dashboard") || false}
                  />
                </div>
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={BarChart3}
                    label="Dashboard Builder"
                    href="/employee/dashboard-builder"
                    active={pathname?.startsWith("/employee/dashboard-builder") || false}
                  />
                </div>
                {/* Generate Task link removed per request; modal is available in Task Assignments */}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200">
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-gray-100"
          title="Logout"
        >
          <LogOut size={20} className="text-black" />
          {!isCollapsed && <span className="text-sm font-medium text-black">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
