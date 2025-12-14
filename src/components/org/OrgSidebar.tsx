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
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import TeamTunedLoader from "@/components/common/TeamTunedLoader";

export default function OrgSidebar({
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
    const [dashboardOpen, setDashboardOpen] = React.useState(false);
    const [managementOpen, setManagementOpen] = React.useState(false);
    const [attendanceOpen, setAttendanceOpen] = React.useState(true);
    const [isNavigating, setIsNavigating] = React.useState(false);

    // Track navigation for loading state
    useEffect(() => {
        setIsNavigating(false);
    }, [pathname]);

    const hasFeature = (code: string) => {
        // If undefined, assume true? Or strict? 
        // Strict: if features provided, must match. If not provided (old parent), maybe default true or false.
        // Given we are migrating, let's strictly check if features array exists.
        // But for "Core HR" which is base, maybe we assume it's there?
        if (!features) return false;
        return features.includes(code);
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

    const dashboardPath = "/org-admin";

    // Feature Flags
    const showCoreHR = hasFeature('PAYROLL_FEATURE');
    const showWallet = hasFeature('WALLET_FEATURE');
    const showTask = hasFeature('TASK_FEATURE');
    const showInventory = hasFeature('INVENTORY_FEATURE');

    return (
        <>
            <aside
                className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-40 flex flex-col ${isCollapsed ? "w-20" : "w-64"
                    }`}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    {!isCollapsed && (
                        <div className="flex items-center gap-3">
                            {orgLogoUrl ? (
                                <img
                                    src={orgLogoUrl}
                                    alt={orgName || "Organization"}
                                    className="w-8 h-8 rounded object-cover"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                                    <Building2 size={18} className="text-white" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-sm font-bold text-gray-900 truncate">
                                    {orgName || "TeamTuned"}
                                </h2>
                                <p className="text-xs text-gray-500">Organization</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Scrollable Navigation */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {/* Main Section */}
                    <CategoryButton label="Main" isOpen={mainOpen} onClick={() => setMainOpen(!mainOpen)} />
                    {mainOpen && (
                        <div className="space-y-1 ml-2">
                            <Item icon={Home} label="Dashboard" href="/org-admin" active={pathname === "/org-admin"} />
                        </div>
                    )}

                    {/* Attendance Section */}
                    <CategoryButton label="Attendance" isOpen={attendanceOpen} onClick={() => setAttendanceOpen(!attendanceOpen)} />
                    {attendanceOpen && (
                        <div className="space-y-1 ml-2">
                            <Item icon={LayoutDashboard} label="Dashboard" href="/org-admin/attendance/dashboard" active={pathname === "/org-admin/attendance/dashboard"} />
                            <Item icon={UserCheck} label="Employee Attendance" href="/org-admin/attendance/employee" active={pathname === "/org-admin/attendance/employee"} />
                            <Item icon={ClipboardList} label="Leave Requests" href="/org-admin/requests/leaves" active={pathname === "/org-admin/requests/leaves"} />
                            <Item icon={Calendar} label="Comp-Off Requests" href="/org-admin/requests/comp-offs" active={pathname === "/org-admin/requests/comp-offs"} />
                            <Item icon={Clock} label="Regularization" href="/org-admin/requests/regularization" active={pathname === "/org-admin/requests/regularization"} />
                            <Item icon={AlertCircle} label="Verification Issues" href="/org-admin/requests/verification" active={pathname === "/org-admin/requests/verification"} />
                            <Item icon={ListChecks} label="Session Requests" href="/org-admin/requests/sessions" active={pathname === "/org-admin/requests/sessions"} />
                        </div>
                    )}

                    {/* Management Section */}
                    <CategoryButton label="Management" isOpen={managementOpen} onClick={() => setManagementOpen(!managementOpen)} />
                    {managementOpen && (
                        <div className="space-y-1 ml-2">
                            <Item icon={Users} label="Employees" href="/org-admin/employees" active={pathname === "/org-admin/employees"} />
                            <Item icon={UserCog} label="Roles" href="/org-admin/roles" active={pathname === "/org-admin/roles"} />
                            <Item icon={Building} label="Departments" href="/org-admin/departments" active={pathname === "/org-admin/departments"} />
                            <Item icon={MapPin} label="Sites" href="/org-admin/sites" active={pathname === "/org-admin/sites"} />
                            <Item icon={Heart} label="Dependents" href="/org-admin/dependents" active={pathname === "/org-admin/dependents"} />
                            {hasFeature("INSURANCE") && (
                                <Item icon={Shield} label="Insurance" href="/org-admin/insurance" active={pathname.startsWith("/org-admin/insurance")} />
                            )}
                        </div>
                    )}

                    {/* Wallet Section */}
                    {hasFeature("WALLET") && (
                        <>
                            <CategoryButton label="Wallet" isOpen={walletOpen} onClick={() => setWalletOpen(!walletOpen)} />
                            {walletOpen && (
                                <div className="space-y-1 ml-2">
                                    <Item icon={Wallet} label="Wallet Requests" href="/org-admin/wallet/requests" active={pathname === "/org-admin/wallet/requests"} />
                                    <Item icon={Receipt} label="Expense Requests" href="/org-admin/wallet/expenses" active={pathname === "/org-admin/wallet/expenses"} />
                                    <Item icon={DollarSign} label="Transactions" href="/org-admin/wallet/transactions" active={pathname === "/org-admin/wallet/transactions"} />
                                </div>
                            )}
                        </>
                    )}

                    {/* Salary Advance Section */}
                    {hasFeature("SALARY_ADVANCE") && (
                        <>
                            <CategoryButton label="Salary Advance" isOpen={salaryAdvanceOpen} onClick={() => setSalaryAdvanceOpen(!salaryAdvanceOpen)} />
                            {salaryAdvanceOpen && (
                                <div className="space-y-1 ml-2">
                                    <Item icon={ArrowUpCircle} label="Requests" href="/org-admin/salary-advance/requests" active={pathname === "/org-admin/salary-advance/requests"} />
                                </div>
                            )}
                        </>
                    )}

                    {/* Inventory Section */}
                    {hasFeature("INVENTORY") && (
                        <>
                            <CategoryButton label="Inventory" isOpen={inventoryOpen} onClick={() => setInventoryOpen(!inventoryOpen)} />
                            {inventoryOpen && (
                                <div className="space-y-1 ml-2">
                                    <Item icon={Package} label="Items" href="/org-admin/inventory/items" active={pathname === "/org-admin/inventory/items"} />
                                    <Item icon={FileText} label="Requests" href="/org-admin/inventory/requests" active={pathname === "/org-admin/inventory/requests"} />
                                </div>
                            )}
                        </>
                    )}

                    {/* Task Section */}
                    {hasFeature("TASK") && (
                        <>
                            <CategoryButton label="Tasks" isOpen={taskOpen} onClick={() => setTaskOpen(!taskOpen)} />
                            {taskOpen && (
                                <div className="space-y-1 ml-2">
                                    <Item icon={CheckSquare} label="All Tasks" href="/org-admin/tasks" active={pathname === "/org-admin/tasks"} />
                                </div>
                            )}
                        </>
                    )}

                    {/* Settings */}
                    <CategoryButton label="Settings" isOpen={false} onClick={() => { }} />
                    <div className="space-y-1 ml-2">
                        <Item icon={Cog} label="Organization" href="/org-admin/settings" active={pathname === "/org-admin/settings"} />
                    </div>
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

            {/* Navigation Loader */}
            {isNavigating && <TeamTunedLoader />}
        </>
    );
    src = { orgLogoUrl }
