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
                            <span className="text-sm font-bold text-black truncate leading-tight">
                                {orgName || "Organization"}
                            </span>
                            <span className="text-xs text-gray-500 truncate">
                                Organization Portal
                            </span>
                        </div>
                    </div>
                )}
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
                {showCoreHR && (
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
                                    <Item
                                        icon={Building2}
                                        label="Organization Profile"
                                        href="/org-admin/orgProfile"
                                        active={pathname?.startsWith("/org-admin/orgProfile") || false}
                                    />
                                    <Item
                                        icon={MapPin}
                                        label="Sites"
                                        href="/org-admin/sites"
                                        active={pathname?.startsWith("/org-admin/sites") || false}
                                    />
                                    <Item
                                        icon={Building}
                                        label="Departments"
                                        href="/org-admin/departments"
                                        active={pathname?.startsWith("/org-admin/departments") || false}
                                    />
                                    <Item
                                        icon={UserCog}
                                        label="Roles"
                                        href="/org-admin/roles"
                                        active={pathname?.startsWith("/org-admin/roles") || false}
                                    />
                                    <Item
                                        icon={ClipboardList}
                                        label="Policies"
                                        href="/org-admin/attendance-rules"
                                        active={pathname?.startsWith("/org-admin/attendance-rules") || false}
                                    />
                                    <Item
                                        icon={Settings}
                                        label="Configuration"
                                        href="/org-admin/attendance-config"
                                        active={pathname?.startsWith("/org-admin/attendance-config") || false}
                                    />
                                    <Item
                                        icon={Calendar}
                                        label="Holiday Calendar"
                                        href="/org-admin/holiday-calendar"
                                        active={pathname?.startsWith("/org-admin/holiday-calendar") || false}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Attendance Section */}
                {showCoreHR && (
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
                                    <Item
                                        icon={BarChart3}
                                        label="Dashboard"
                                        href="/org-admin/attendance-dashboard"
                                        active={pathname?.startsWith("/org-admin/attendance-dashboard") || false}
                                    />
                                    <Item
                                        icon={Clock}
                                        label="Session Requests"
                                        href="/org-admin/attendance/sessions"
                                        active={pathname?.startsWith("/org-admin/attendance/sessions") || false}
                                    />
                                    <Item
                                        icon={CheckSquare}
                                        label="Regularize Requests"
                                        href="/org-admin/regularize-requests"
                                        active={pathname?.startsWith("/org-admin/regularize-requests") || false}
                                    />
                                    <Item
                                        icon={AlertCircle}
                                        label="Verification Issues"
                                        href="/org-admin/verification-issues"
                                        active={pathname?.startsWith("/org-admin/verification-issues") || false}
                                    />
                                    <Item
                                        icon={Calendar}
                                        label="Leave Requests"
                                        href="/org-admin/leave-requests"
                                        active={pathname?.startsWith("/org-admin/leave-requests") || false}
                                    />
                                    <Item
                                        icon={ClipboardList}
                                        label="Attendance Logs"
                                        href="/org-admin/attendance"
                                        active={pathname === "/org-admin/attendance" || (pathname?.startsWith("/org-admin/attendance") && !pathname?.includes("attendance-dashboard") && !pathname?.includes("attendance-rules") && !pathname?.includes("attendance-config") && !pathname?.includes("sessions")) || false}
                                    />
                                    <Item
                                        icon={DollarSign}
                                        label="Payroll"
                                        href="/org-admin/payroll"
                                        active={pathname?.startsWith("/org-admin/payroll") || false}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Management Section */}
                {showCoreHR && (
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
                                    <Item
                                        icon={Users}
                                        label="Employees"
                                        href="/org-admin/employee-management"
                                        active={pathname?.startsWith("/org-admin/employee-management") || false}
                                    />
                                    <Item
                                        icon={MapPin}
                                        label="Employee Sites"
                                        href="/org-admin/employee-sites"
                                        active={pathname?.startsWith("/org-admin/employee-sites") || false}
                                    />

                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Insurance Section */}
                {showCoreHR && (
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
                                    <Item
                                        icon={LayoutGrid}
                                        label="Dashboard"
                                        href="/org-admin/insurance/dashboard"
                                        active={pathname?.startsWith("/org-admin/insurance/dashboard") || false}
                                    />
                                    <Item
                                        icon={Building2}
                                        label="Providers"
                                        href="/org-admin/insurance/providers"
                                        active={pathname?.startsWith("/org-admin/insurance/providers") || false}
                                    />
                                    <Item
                                        icon={Shield}
                                        label="Policies"
                                        href="/org-admin/insurance/policies"
                                        active={pathname?.startsWith("/org-admin/insurance/policies") || false}
                                    />
                                    <Item
                                        icon={UserCheck}
                                        label="Enrollment"
                                        href="/org-admin/insurance/enrollment"
                                        active={pathname?.startsWith("/org-admin/insurance/enrollment") || false}
                                    />
                                    <Item
                                        icon={Users}
                                        label="Dependents"
                                        href="/org-admin/insurance/dependents"
                                        active={pathname?.startsWith("/org-admin/insurance/dependents") || false}
                                    />
                                    <Item
                                        icon={Heart}
                                        label="Beneficiaries"
                                        href="/org-admin/insurance/beneficiaries"
                                        active={pathname?.startsWith("/org-admin/insurance/beneficiaries") || false}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Salary Advance Section */}
                {showCoreHR && (
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
                                    <Item
                                        icon={ClipboardList}
                                        label="All Requests"
                                        href="/org-admin/salary-advance/requests"
                                        active={pathname?.startsWith("/org-admin/salary-advance/requests") || false}
                                    />
                                    <Item
                                        icon={CheckSquare}
                                        label="Approval Queue"
                                        href="/org-admin/salary-advance/approvals"
                                        active={pathname?.startsWith("/org-admin/salary-advance/approvals") || false}
                                    />
                                    <Item
                                        icon={Calendar}
                                        label="Repayment Schedule"
                                        href="/org-admin/salary-advance/repayments"
                                        active={pathname?.startsWith("/org-admin/salary-advance/repayments") || false}
                                    />
                                    <Item
                                        icon={TrendingUp}
                                        label="Analytics"
                                        href="/org-admin/salary-advance/analytics"
                                        active={pathname?.startsWith("/org-admin/salary-advance/analytics") || false}
                                    />
                                    <Item
                                        icon={Settings}
                                        label="Policy Configuration"
                                        href="/org-admin/salary-advance/policy"
                                        active={pathname?.startsWith("/org-admin/salary-advance/policy") || false}
                                    />
                                    <Item
                                        icon={Users}
                                        label="Accounts"
                                        href="/org-admin/salary-advance/accounts"
                                        active={pathname?.startsWith("/org-admin/salary-advance/accounts") || false}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Wallets Section */}
                {showWallet && (
                    <div className="mt-2">
                        {!isCollapsed && (
                            <CategoryButton
                                label="Wallets"
                                isOpen={walletOpen}
                                onClick={() => setWalletOpen(!walletOpen)}
                            />
                        )}
                        {walletOpen && (
                            <div className={`space-y-1 ${isCollapsed ? "" : "pl-0"}`}>
                                <div className={`relative ${isCollapsed ? "" : "ml-3 pl-3 border-l border-gray-100"}`}>
                                    <Item
                                        icon={DollarSign}
                                        label="Petty Cash"
                                        href="/org-admin/petty-cash"
                                        active={pathname?.startsWith("/org-admin/petty-cash") || false}
                                    />
                                    <Item
                                        icon={Receipt}
                                        label="Wallet Expenses"
                                        href="/org-admin/wallet-overview"
                                        active={pathname?.startsWith("/org-admin/wallet-overview") || false}
                                    />
                                    <Item
                                        icon={Cog}
                                        label="Wallet Config"
                                        href="/org-admin/wallet-config"
                                        active={pathname?.startsWith("/org-admin/wallet-config") || false}
                                    />
                                    <Item
                                        icon={ArrowUpCircle}
                                        label="Wallet Topups"
                                        href="/org-admin/wallet-topups"
                                        active={pathname?.startsWith("/org-admin/wallet-topups") || false}
                                    />
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
                                                    <Item icon={Package} label="Onboarding" href="/org-admin/inventory/onboarding" active={pathname?.startsWith("/org-admin/inventory/onboarding") || false} />
                                                    <Item icon={Building2} label="Site Config" href="/org-admin/inventory/sites" active={pathname?.startsWith("/org-admin/inventory/sites") || false} />
                                                    <Item icon={Package} label="Categories" href="/org-admin/inventory/categories" active={pathname?.startsWith("/org-admin/inventory/categories") || false} />
                                                    <Item icon={Package} label="Subcategories" href="/org-admin/inventory/subcategories" active={pathname?.startsWith("/org-admin/inventory/subcategories") || false} />
                                                    <Item icon={Building2} label="Vendors" href="/org-admin/inventory/vendors" active={pathname?.startsWith("/org-admin/inventory/vendors") || false} />
                                                    <Item icon={Package} label="Items" href="/org-admin/inventory/items" active={pathname?.startsWith("/org-admin/inventory/items") || false} />
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
                                                    <Item icon={Package} label="Store Selection" href="/org-admin/inventory/stores" active={pathname?.startsWith("/org-admin/inventory/stores") || false} />
                                                    <Item icon={Package} label="Store Stock" href="/org-admin/inventory/stock" active={pathname?.startsWith("/org-admin/inventory/stock") || false} />
                                                    <Item icon={Package} label="Store Batch" href="/org-admin/inventory/batches" active={pathname?.startsWith("/org-admin/inventory/batches") || false} />
                                                    <Item icon={Package} label="Store Serials" href="/org-admin/inventory/serials" active={pathname?.startsWith("/org-admin/inventory/serials") || false} />
                                                    <Item icon={Package} label="Stock Ledger" href="/org-admin/inventory/ledger" active={pathname?.startsWith("/org-admin/inventory/ledger") || false} />
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
                                                    <Item icon={Package} label="GRN" href="/org-admin/inventory/grn" active={pathname?.startsWith("/org-admin/inventory/grn") || false} />
                                                    <Item icon={FileText} label="RFQ" href="/org-admin/rfq" active={pathname?.startsWith("/org-admin/rfq") || false} />
                                                    <Item icon={FileText} label="Purchase Request" href="/org-admin/pr" active={pathname?.startsWith("/org-admin/pr") || false} />
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
                {showTask && (
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
                                    <Item
                                        icon={FileText}
                                        label="Templates"
                                        href="/org-admin/tasks"
                                        active={pathname?.startsWith("/org-admin/tasks") || false}
                                    />
                                    <Item
                                        icon={ListChecks}
                                        label="Assignments"
                                        href="/org-admin/task-assignments"
                                        active={pathname?.startsWith("/org-admin/task-assignments") || false}
                                    />
                                    <Item
                                        icon={LayoutGrid}
                                        label="Dashboard"
                                        href="/org-admin/task-dashboard"
                                        active={pathname?.startsWith("/org-admin/task-dashboard") || false}
                                    />
                                    {/* <Item
                                        icon={Settings}
                                        label="Builder"
                                        href="/org-admin/dashboard-builder"
                                        active={pathname?.startsWith("/org-admin/dashboard-builder") || false}
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
