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
    Thermometer,
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
    QrCode,
    Heart,
    ListChecks,
    LayoutGrid,
    ArrowUpCircle,
    Receipt,
    Cog,
    Upload,
    ListTodo,
    UserPlus,
    PlusCircle,
    ShoppingCart,
    Zap,
    CreditCard,
    PieChart,
    Phone,
    HardHat,
    Layers,
    Activity,
    Link2,
    Award,
    Layout,
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

    const hasPerm = (code: string) => (permissions || []).some((p: any) => (p || "").toUpperCase() === code.toUpperCase());

    const [mainOpen, setMainOpen] = React.useState(true);
    const [inventoryOpen, setInventoryOpen] = React.useState(false);
    const [masterDataOpen, setMasterDataOpen] = React.useState(false);
    const [coreOpen, setCoreOpen] = React.useState(false);
    const [transactionsOpen, setTransactionsOpen] = React.useState(false);
    const [walletOpen, setWalletOpen] = React.useState(false);
    const [taskOpen, setTaskOpen] = React.useState(false);
    const [insuranceOpen, setInsuranceOpen] = React.useState(false);
    const [pettyCashOpen, setPettyCashOpen] = React.useState(false);
    const [salaryAdvanceOpen, setSalaryAdvanceOpen] = React.useState(false);
    const [dashboardOpen, setDashboardOpen] = React.useState(false);
    const [managementOpen, setManagementOpen] = React.useState(false);
    const [attendanceOpen, setAttendanceOpen] = React.useState(true);
    const [laborOpen, setLaborOpen] = React.useState(false);
    const [hrOperationOpen, setHrOperationOpen] = React.useState(true);
    const [formBuilderOpen, setFormBuilderOpen] = React.useState(true);
    const [isNavigating, setIsNavigating] = React.useState(false);

    // Auto-collapse on hover state
    const [isHovered, setIsHovered] = React.useState(false);
    const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);


    // Auto-collapse effect
    useEffect(() => {
        if (isHovered) {
            // Clear any pending collapse and expand immediately
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
            setIsCollapsed(false);
        } else {
            // Collapse after 500ms when not hovered
            hoverTimeoutRef.current = setTimeout(() => {
                setIsCollapsed(true);
                // Auto-open all categories when collapsed to prevent lag
                setMainOpen(true);
                setAttendanceOpen(true);
                setManagementOpen(true);
                setInsuranceOpen(true);
                setSalaryAdvanceOpen(true);
                setPettyCashOpen(true);
                setInventoryOpen(true);
                setTaskOpen(true);
                setDashboardOpen(true);
                setLaborOpen(true);
                setHrOperationOpen(true);
                setFormBuilderOpen(true);
            }, 500);
        }

        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, [isHovered, setIsCollapsed]);

    // Track navigation for loading state
    useEffect(() => {
        setIsNavigating(false);

        // Failsafe: if navigation takes too long or hangs, hide loader after 10s
        const timer = setTimeout(() => {
            setIsNavigating(false);
        }, 10000);

        return () => clearTimeout(timer);
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
            onClick={() => {
                if (href !== pathname) {
                    setIsNavigating(true);
                }
            }}
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
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`h-screen bg-white border-r border-gray-200 transition-all duration-300 flex flex-col ${isCollapsed ? "w-20" : "w-64"
                    }`}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    {!isCollapsed && (
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            {orgLogoUrl ? (
                                <img
                                    src={orgLogoUrl}
                                    alt={orgName || "Organization"}
                                    className="w-8 h-8 rounded object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                                    <Building2 size={18} className="text-white" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-sm font-bold text-gray-900 leading-tight break-words">
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

                    {/* Form Builder Section */}
                    <>
                        <CategoryButton label="Form Builder" isOpen={formBuilderOpen} onClick={() => setFormBuilderOpen(!formBuilderOpen)} />
                        {formBuilderOpen && (
                            <div className="space-y-1 ml-2">
                                <Item icon={Upload} label="Upload Template" href="/org-admin/form-builder/upload" active={pathname === "/org-admin/form-builder/upload"} />
                                <Item icon={Layout} label="Forms Library" href="/org-admin/form-builder/library" active={pathname === "/org-admin/form-builder/library"} />
                            </div>
                        )}
                    </>

                    {/* Attendance Section */}
                    <CategoryButton label="Attendance" isOpen={attendanceOpen} onClick={() => setAttendanceOpen(!attendanceOpen)} />
                    {attendanceOpen && (
                        <div className="space-y-1 ml-2">
                            <Item icon={LayoutDashboard} label="Dashboard" href="/org-admin/attendance/dashboard" active={pathname === "/org-admin/attendance/dashboard"} />
                            <Item icon={UserCheck} label="Employee Attendance" href="/org-admin/attendance/employee" active={pathname === "/org-admin/attendance/employee"} />
                            <Item icon={Settings} label="Attendance Config" href="/org-admin/attendance-config" active={pathname === "/org-admin/attendance-config"} />
                            <Item icon={Settings} label="Attendance Rules" href="/org-admin/attendance-rules" active={pathname === "/org-admin/attendance-rules"} />
                            <Item icon={Calendar} label="Holiday Calendar" href="/org-admin/holiday-calendar" active={pathname === "/org-admin/holiday-calendar"} />
                            <Item icon={ListChecks} label="Approval Workflows" href="/org-admin/approval-workflows" active={pathname === "/org-admin/approval-workflows"} />
                            <Item icon={ClipboardList} label="Leave Requests" href="/org-admin/requests/leaves" active={pathname === "/org-admin/requests/leaves"} />
                            <Item icon={Calendar} label="Comp-Off Requests" href="/org-admin/requests/comp-offs" active={pathname === "/org-admin/requests/comp-offs"} />
                            <Item icon={Clock} label="Regularization" href="/org-admin/requests/regularization" active={pathname === "/org-admin/requests/regularization"} />
                            <Item icon={Clock} label="Night OT Requests" href="/org-admin/requests/night-ot" active={pathname === "/org-admin/requests/night-ot"} />
                            <Item icon={AlertCircle} label="Verification Issues" href="/org-admin/requests/verification" active={pathname === "/org-admin/requests/verification"} />
                            <Item icon={ListChecks} label="Session Requests" href="/org-admin/requests/sessions" active={pathname === "/org-admin/requests/sessions"} />
                            <Item icon={ListChecks} label="Payroll" href="/org-admin/payroll" active={pathname === "/org-admin/payroll"} />
                            <Item icon={FileText} label="Salary Slips" href="/org-admin/salary-slips" active={pathname === "/org-admin/salary-slips"} />
                        </div>
                    )}

                    {/* Management Section */}
                    <CategoryButton label="Management" isOpen={managementOpen} onClick={() => setManagementOpen(!managementOpen)} />
                    {managementOpen && (
                        <div className="space-y-1 ml-2">
                            <Item icon={Users} label="Employees" href="/org-admin/employees" active={pathname === "/org-admin/employees"} />
                            <Item icon={UserCog} label="Team Mapper" href="/org-admin/assignments" active={pathname === "/org-admin/assignments"} />
                            <Item icon={Shield} label="Policy Mapper" href="/org-admin/policy-mapper" active={pathname === "/org-admin/policy-mapper"} />
                            <Item icon={Phone} label="Emergency Contacts" href="/org-admin/emergency-contacts" active={pathname === "/org-admin/emergency-contacts"} />
                            <Item icon={Upload} label="Import Employees" href="/org-admin/employees/import" active={pathname === "/org-admin/employees/import"} />
                            <Item icon={Clock} label="Shift Management" href="/org-admin/employees/shifts" active={pathname === "/org-admin/employees/shifts"} />
                            <Item icon={UserCog} label="Roles" href="/org-admin/roles" active={pathname === "/org-admin/roles"} />
                            <Item icon={Building} label="Departments" href="/org-admin/departments" active={pathname === "/org-admin/departments"} />
                            <Item icon={MapPin} label="Sites" href="/org-admin/sites" active={pathname === "/org-admin/sites"} />
                            <Item icon={Building2} label="Sub Organizations" href="/org-admin/sub-organizations" active={pathname === "/org-admin/sub-organizations"} />
                            <Item icon={Link2} label="Site-Sub-Org Mapper" href="/org-admin/site-sub-org-mapper" active={pathname === "/org-admin/site-sub-org-mapper"} />
                            <Item icon={MapPin} label="Employee Sites" href="/org-admin/employee-sites" active={pathname === "/org-admin/employee-sites"} />
                            <Item icon={MapPin} label="Other Locations" href="/org-admin/other-locations" active={pathname === "/org-admin/other-locations"} />
                            <Item icon={DollarSign} label="Budget Requests" href="/org-admin/site-budget-requests" active={pathname === "/org-admin/site-budget-requests"} />
                            <Item icon={Coins} label="Salary Components" href="/org-admin/salary-components" active={pathname === "/org-admin/salary-components"} />
                            <Item icon={ListChecks} label="Debit Rules" href="/org-admin/debit-rules" active={pathname === "/org-admin/debit-rules"} />
                            <Item icon={Upload} label="Salary Import" href="/org-admin/salary-import" active={pathname === "/org-admin/salary-import"} />
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
                    <CategoryButton label="Salary Advance" isOpen={salaryAdvanceOpen} onClick={() => setSalaryAdvanceOpen(!salaryAdvanceOpen)} />
                    {salaryAdvanceOpen && (
                        <div className="ml-4 space-y-1">
                            <Item icon={ClipboardList} label="All Requests" href="/org-admin/salary-advance/requests" active={pathname === "/org-admin/salary-advance/requests"} />
                            <Item icon={CheckSquare} label="Approval Queue" href="/org-admin/salary-advance/approvals" active={pathname === "/org-admin/salary-advance/approvals"} />
                            <Item icon={Calendar} label="Repayment Schedule" href="/org-admin/salary-advance/repayments" active={pathname === "/org-admin/salary-advance/repayments"} />
                            <Item icon={TrendingUp} label="Analytics" href="/org-admin/salary-advance/analytics" active={pathname === "/org-admin/salary-advance/analytics"} />
                            <Item icon={Settings} label="Policy Configuration" href="/org-admin/salary-advance/policy" active={pathname === "/org-admin/salary-advance/policy"} />
                            <Item icon={Users} label="Accounts" href="/org-admin/salary-advance/accounts" active={pathname === "/org-admin/salary-advance/accounts"} />
                        </div>
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
                    <CategoryButton label="Tasks" isOpen={taskOpen} onClick={() => setTaskOpen(!taskOpen)} />
                    {taskOpen && (
                        <div className="space-y-1 ml-2">
                            <Item icon={CheckSquare} label="All Tasks" href="/org-admin/tasks" active={pathname === "/org-admin/tasks"} />
                            <Item icon={ListTodo} label="Task Dashboard" href="/org-admin/task-dashboard" active={pathname === "/org-admin/task-dashboard"} />
                            <Item icon={UserPlus} label="Task Assignments" href="/org-admin/task-assignments" active={pathname === "/org-admin/task-assignments"} />
                            <Item icon={PlusCircle} label="Create Task" href="/org-admin/task-create" active={pathname === "/org-admin/task-create"} />
                        </div>
                    )}

                    {/* Insurance Section */}
                    <>
                        <CategoryButton label="Insurance" isOpen={insuranceOpen} onClick={() => setInsuranceOpen(!insuranceOpen)} />
                        {insuranceOpen && (
                            <div className="space-y-1 ml-2">
                                <Item icon={LayoutGrid} label="Dashboard" href="/org-admin/insurance/dashboard" active={pathname === "/org-admin/insurance/dashboard"} />
                                <Item icon={Building2} label="Providers" href="/org-admin/insurance/providers" active={pathname === "/org-admin/insurance/providers"} />
                                <Item icon={Shield} label="Policies" href="/org-admin/insurance/policies" active={pathname === "/org-admin/insurance/policies"} />
                                <Item icon={UserCheck} label="Enrollment" href="/org-admin/insurance/enrollment" active={pathname === "/org-admin/insurance/enrollment"} />
                                <Item icon={Users} label="Dependents" href="/org-admin/insurance/dependents" active={pathname === "/org-admin/insurance/dependents"} />
                                <Item icon={Heart} label="Beneficiaries" href="/org-admin/insurance/beneficiaries" active={pathname === "/org-admin/insurance/beneficiaries"} />
                                <Item icon={ClipboardList} label="Claims" href="/org-admin/insurance/claims" active={pathname === "/org-admin/insurance/claims"} />
                                <Item icon={FileText} label="Reports" href="/org-admin/insurance/reports" active={pathname === "/org-admin/insurance/reports"} />
                            </div>
                        )}
                    </>


                    {/* Petty Cash Section */}
                    <>
                        <CategoryButton label="Petty Cash" isOpen={pettyCashOpen} onClick={() => setPettyCashOpen(!pettyCashOpen)} />
                        {pettyCashOpen && (
                            <div className="space-y-1 ml-2">
                                <Item icon={DollarSign} label="Wallets" href="/org-admin/petty-cash" active={pathname === "/org-admin/petty-cash"} />
                                <Item icon={Receipt} label="Wallet Expenses" href="/org-admin/wallet-overview" active={pathname === "/org-admin/wallet-overview"} />
                                <Item icon={Cog} label="Wallet Config" href="/org-admin/wallet-config" active={pathname === "/org-admin/wallet-config"} />
                                <Item icon={ArrowUpCircle} label="Wallet Topups" href="/org-admin/wallet-topups" active={pathname === "/org-admin/wallet-topups"} />
                            </div>
                        )}
                    </>

                    {/* Labor Management Section */}
                    <>
                        <CategoryButton label="Labor Management" isOpen={laborOpen} onClick={() => setLaborOpen(!laborOpen)} />
                        {laborOpen && (
                            <div className="space-y-1 ml-2">
                                <Item icon={LayoutDashboard} label="Attendance Dashboard" href="/org-admin/labor-attendance/dashboard" active={pathname === "/org-admin/labor-attendance/dashboard"} />
                                <Item icon={BarChart3} label="Contractor Dashboard" href="/org-admin/labor-attendance/contractor-dashboard" active={pathname === "/org-admin/labor-attendance/contractor-dashboard"} />
                                <Item icon={ClipboardList} label="Attendance Logs" href="/org-admin/labor-attendance/logs" active={pathname === "/org-admin/labor-attendance/logs"} />
                                <Item icon={LayoutGrid} label="Categories" href="/org-admin/labor/categories" active={pathname === "/org-admin/labor/categories"} />
                                <Item icon={Layers} label="Subcategories" href="/org-admin/labor/subcategories" active={pathname === "/org-admin/labor/subcategories"} />
                                <Item icon={Briefcase} label="Contractors" href="/org-admin/labor/contractors" active={pathname === "/org-admin/labor/contractors"} />
                                <Item icon={HardHat} label="Laborers" href="/org-admin/labor/laborers" active={pathname === "/org-admin/labor/laborers"} />
                                <Item icon={DollarSign} label="Rate Cards" href="/org-admin/labor/rate-cards" active={pathname === "/org-admin/labor/rate-cards"} />
                                <Item icon={Shield} label="Site Logins" href="/org-admin/site-logins" active={pathname === "/org-admin/site-logins"} />
                                <Item icon={Settings} label="Settings" href="/org-admin/labor/settings" active={pathname === "/org-admin/labor/settings"} />
                                <Item icon={Activity} label="Device Health" href="/org-admin/labor-attendance/temperature-dashboard" active={pathname === "/org-admin/labor-attendance/temperature-dashboard"} />
                                <Item icon={Thermometer} label="Device Logs" href="/org-admin/labor-attendance/device-logs" active={pathname === "/org-admin/labor-attendance/device-logs"} />
                            </div>
                        )}
                    </>

                    {/* HR Operation Section */}
                    <>
                        <CategoryButton label="HR Operation" isOpen={hrOperationOpen} onClick={() => setHrOperationOpen(!hrOperationOpen)} />
                        {hrOperationOpen && (
                            <div className="space-y-1 ml-2">
                                <Item icon={Link2} label="Department Mapper" href="/org-admin/department-mapper" active={pathname === "/org-admin/department-mapper"} />
                                <Item icon={FileText} label="Technical Questions" href="/org-admin/hr-operation/technical-questions" active={pathname === "/org-admin/hr-operation/technical-questions"} />
                                <Item icon={Award} label="Technical Assessments" href="/org-admin/hr-operation/technical-assessments" active={pathname === "/org-admin/hr-operation/technical-assessments"} />
                                <Item icon={Briefcase} label="Applied Positions" href="/org-admin/hr-operation/applied-positions" active={pathname === "/org-admin/hr-operation/applied-positions"} />
                                <Item icon={QrCode} label="Interview Management" href="/org-admin/hr-operation/interviews" active={pathname === "/org-admin/hr-operation/interviews"} />
                                <Item icon={UserCheck} label="Operation Round" href="/org-admin/hr-operation/operation-round" active={pathname === "/org-admin/hr-operation/operation-round"} />
                                <Item icon={TrendingUp} label="Final Round" href="/org-admin/hr-operation/final-round" active={pathname === "/org-admin/hr-operation/final-round"} />
                                <Item icon={UserPlus} label="Onboarding" href="/org-admin/hr-operation/onboarding" active={pathname === "/org-admin/hr-operation/onboarding"} />
                                <Item icon={Briefcase} label="Onboarding Status" href="/org-admin/hr-operation/onboarding/status" active={pathname === "/org-admin/hr-operation/onboarding/status"} />
                            </div>
                        )}
                    </>


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
}
