"use client";

import React, { useEffect } from "react";
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

export default function OrgSidebar({
  isCollapsed,
  setIsCollapsed,
  orgName,
  orgLogoUrl,
  features,
  role,
  permissions,
  onLogout,
}: {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  features?: { id: number; code: string; name: string }[];
  role?: string | null;
  permissions?: string[];
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const [mainOpen, setMainOpen] = React.useState(true);
  const [managementOpen, setManagementOpen] = React.useState(true);
  const [walletOpen, setWalletOpen] = React.useState(true);
  const [taskOpen, setTaskOpen] = React.useState(true);

  // ✅ Log all allowed features
  useEffect(() => {
    console.group("✅ Allowed Features for this Organization");
    if (features && features.length > 0) {
      features.forEach((f) => {
        console.log(`• ${f.code} — ${f.name}`);
      });
    } else {
      console.log("No features assigned to this organization.");
    }
    console.groupEnd();
  }, [features]);

  const hasFeature = (code: string) => {
    const lc = code.toLowerCase();
    return (features || []).some((f) => (f.code || "").toLowerCase() === lc);
  };
  const isEmployee = (role || "") === "Employee";
  const hasPerm = (code: string) => {
    const lc = code.toLowerCase();
    return (permissions || []).some((p) => (p || "").toLowerCase() === lc);
  };

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
        active
          ? "bg-indigo-50 ring-1 ring-indigo-100"
          : "hover:bg-slate-100"
      }`}
      title={label}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        size={18}
        className={`shrink-0 ${active ? "text-indigo-600" : "text-slate-700"}`}
      />
      {!isCollapsed && (
        <span
          className={`text-sm font-medium truncate ${
            active ? "text-indigo-700" : "text-slate-800"
          }`}
        >
          {label}
        </span>
      )}
    </Link>
  );

  const dashboardPath = role === "OrgAdmin" ? "/org-admin" : "/employee";
  const showEmployeeManagement = (isEmployee ? hasPerm("EMPLOYEE_VIEW") : true) && hasFeature("payroll_system");
  const canViewSites = isEmployee ? hasPerm("SITE_VIEW") : true;
  const canViewDepartments = isEmployee ? hasPerm("DEPT_VIEW") : true;
  const canViewRoles = isEmployee ? hasPerm("ROLE_VIEW") : true;
  const canViewPolicies = isEmployee ? hasPerm("POLICY_VIEW") : true;
  const canViewAttendanceConfig = (role || "") === "OrgAdmin";
  const canAssignEmployeeSites = isEmployee ? hasPerm("EMPLOYEE_ASSIGN_SITE") : true;
  const canViewWallet = (role || "") === "OrgAdmin";
  const canViewEmployeeAttendance = (role || "") === "OrgAdmin" || hasPerm("ATTEND_VIEW") || hasPerm("ATTEND_ADD") || hasPerm("ATTEND_EDIT");
  const canViewVerificationIssues = (role || "") === "OrgAdmin" || hasPerm("ATTVERIFY_VIEW") || hasPerm("ATTVERIFY_APPROVE");
  const canViewFormBuilder = (role || "") === "OrgAdmin";
  const showTask = canViewFormBuilder;

  return (
    <aside
      className={`h-screen border-r border-slate-200 bg-white ${
        isCollapsed ? "w-16" : "w-64"
      } flex flex-col justify-between overflow-y-auto shadow-sm`}
    >
      <div>
        <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-white/70 backdrop-blur">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              {orgLogoUrl ? (
                <img
                  src={orgLogoUrl}
                  alt="Org Logo"
                  className="w-8 h-8 rounded-md object-cover shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-md bg-slate-200" />
              )}
              <span
                className="text-sm font-semibold text-slate-900 truncate"
                title={orgName || "Organization"}
              >
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
          <Item
            icon={Home}
            label="Dashboard"
            href={dashboardPath}
            active={pathname === dashboardPath}
          />
        </div>

        {/* Organization Main */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => setMainOpen(!mainOpen)}
            className="flex items-center justify-between w-full px-2 py-2 rounded-md hover:bg-slate-100"
            aria-expanded={mainOpen}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-black">
              {mainOpen ? (
                <ChevronDown size={18} className="text-slate-800" />
              ) : (
                <ChevronRight size={18} className="text-slate-800" />
              )}
              {!isCollapsed && "Main"}
            </span>
          </button>

          {mainOpen && (
            <div className="mt-2 space-y-1.5 relative pl-4 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-px before:bg-slate-200">
              {canViewSites && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Building2}
                    label="Organization Profile"
                    href="/org-admin/profile"
                    active={pathname?.startsWith("/org-admin/profile") || false}
                  />
                </div>
              )}
              {canViewSites && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={MapPin}
                    label="Sites"
                    href="/org-admin/sites"
                    active={pathname?.startsWith("/org-admin/sites") || false}
                  />
                </div>
              )}
              {canViewDepartments && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Building}
                    label="Departments"
                    href="/org-admin/departments"
                    active={pathname?.startsWith("/org-admin/departments") || false}
                  />
                </div>
              )}
              {canViewRoles && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={UserCog}
                    label="Roles"
                    href="/org-admin/roles"
                    active={pathname?.startsWith("/org-admin/roles") || false}
                  />
                </div>
              )}
              {canViewPolicies && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Calendar}
                    label="Policies"
                    href="/org-admin/attendance-rules"
                    active={pathname?.startsWith("/org-admin/attendance-rules") || false}
                  />
                </div>
              )}
              {canViewAttendanceConfig && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={MapPin}
                    label="Attendance Configuration"
                    href="/org-admin/attendance-config"
                    active={pathname?.startsWith("/org-admin/attendance-config") || false}
                  />
                </div>
              )}
              {(role || "") === "OrgAdmin" && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Calendar}
                    label="Holiday Calendar"
                    href="/org-admin/holiday-calendar"
                    active={pathname?.startsWith("/org-admin/holiday-calendar") || false}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Management */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => setManagementOpen(!managementOpen)}
            className="flex items-center justify-between w-full px-2 py-2 rounded-md hover:bg-slate-100"
            aria-expanded={managementOpen}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-black">
              {managementOpen ? (
                <ChevronDown size={18} className="text-slate-800" />
              ) : (
                <ChevronRight size={18} className="text-slate-800" />
              )}
              {!isCollapsed && "Management"}
            </span>
          </button>

          {managementOpen && (
            <div className="mt-2 space-y-1.5 relative pl-4 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-px before:bg-slate-200">
              {showEmployeeManagement && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Users}
                    label="Employee Management"
                    href="/org-admin/employee-management"
                    active={pathname?.startsWith("/org-admin/employee-management") || false}
                  />
                </div>
              )}
              {canAssignEmployeeSites && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Users}
                    label="Employee Sites"
                    href="/org-admin/employee-sites"
                    active={pathname?.startsWith("/org-admin/employee-sites") || false}
                  />
                </div>
              )}
              {(role || "") === "OrgAdmin" && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Calendar}
                    label="Employee Leaves Request"
                    href="/org-admin/leave-requests"
                    active={pathname?.startsWith("/org-admin/leave-requests") || false}
                  />
                </div>
              )}
              {(role || "") === "OrgAdmin" && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Users}
                    label="Regularize Requests"
                    href="/org-admin/regularize-requests"
                    active={pathname?.startsWith("/org-admin/regularize-requests") || false}
                  />
                </div>
              )}
              {canViewEmployeeAttendance && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Calendar}
                    label="Employee Attendance"
                    href="/org-admin/employee-attendance"
                    active={pathname?.startsWith("/org-admin/employee-attendance") || false}
                  />
                </div>
              )}
              {canViewVerificationIssues && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={UserCog}
                    label="Verification Issues"
                    href="/org-admin/verification-issues"
                    active={pathname?.startsWith("/org-admin/verification-issues") || false}
                  />
                </div>
              )}
              
            </div>
          )}
        </div>

        {/* Task Category */}
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
                    href="/org-admin/tasks"
                    active={pathname?.startsWith("/org-admin/tasks") || false}
                  />
                </div>
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Calendar}
                    label="Task Assignments"
                    href="/org-admin/task-assignments"
                    active={pathname?.startsWith("/org-admin/task-assignments") || false}
                  />
                </div>
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Calendar}
                    label="Task Dashboard"
                    href="/org-admin/task-dashboard"
                    active={pathname?.startsWith("/org-admin/task-dashboard") || false}
                  />
                </div>
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={BarChart3}
                    label="Dashboard Builder"
                    href="/org-admin/dashboard-builder"
                    active={pathname?.startsWith("/org-admin/dashboard-builder") || false}
                  />
                </div>
                {/* Generate Task link removed per request; use Task Assignments button/modal instead */}
              </div>
            )}
          </div>
        )}

        {/* Wallet Category */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => setWalletOpen(!walletOpen)}
            className="flex items-center justify-between w-full px-2 py-2 rounded-md hover:bg-slate-100"
            aria-expanded={walletOpen}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-black">
              {walletOpen ? (
                <ChevronDown size={18} className="text-slate-800" />
              ) : (
                <ChevronRight size={18} className="text-slate-800" />
              )}
              {!isCollapsed && "Wallet"}
            </span>
          </button>

          {walletOpen && (
            <div className="mt-2 space-y-1.5 relative pl-4 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-px before:bg-slate-200">
              {canViewWallet && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Wallet}
                    label="Wallet list"
                    href="/org-admin/petty-cash"
                    active={pathname?.startsWith("/org-admin/petty-cash") || false}
                  />
                </div>
              )}
              {canViewWallet && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Wallet}
                    label="Wallet expenses"
                    href="/org-admin/wallet-expenses"
                    active={pathname?.startsWith("/org-admin/wallet-expenses") || false}
                  />
                </div>
              )}
              {canViewWallet && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Wallet}
                    label="Wallet topup"
                    href="/org-admin/wallet-topups"
                    active={pathname?.startsWith("/org-admin/wallet-topups") || false}
                  />
                </div>
              )}
              {canViewWallet && (
                <div className="relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-3 before:h-px before:bg-slate-200">
                  <Item
                    icon={Wallet}
                    label="Wallet Config"
                    href="/org-admin/wallet-config"
                    active={pathname?.startsWith("/org-admin/wallet-config") || false}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Optional: show allowed features list visually */}
        {/* {!isCollapsed && features && (
          <div className="px-3 py-2 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Allowed Features
            </h4>
            <ul className="text-xs text-gray-700 space-y-0.5">
              {features.map((f) => (
                <li key={f.id}>
                  • <span className="font-medium">{f.name}</span> ({f.code})
                </li>
              ))}
            </ul>
          </div>
        )} */}
      </div>

      <div className="p-3 border-t border-gray-200">
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-gray-100"
          title="Logout"
        >
          <LogOut size={20} className="text-black" />
          {!isCollapsed && (
            <span className="text-sm font-medium text-black">Logout</span>
          )}
        </button>
      </div>
    </aside>
  );
}
