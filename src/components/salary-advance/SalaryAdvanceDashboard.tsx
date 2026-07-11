"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Users,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Banknote,
    CreditCard,
    Activity,
    Building2,
    Eye,
    Upload,
    Plus,
} from "lucide-react";
import RequestAdvanceModal from "./RequestAdvanceModal";
import RequestDetails from "./RequestDetails";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type DashboardStats = {
    request_summary: {
        total_requests: number;
        pending: number;
        in_review: number;
        approved: number;
        rejected: number;
        cancelled: number;
        total_requested_amount: number;
        total_approved_amount: number;
        total_repaid: number;
    };
    month_stats: {
        month_total: number;
        month_approved: number;
        month_rejected: number;
        month_pending: number;
        month_requested_amount: number;
        month_approved_amount: number;
    };
    repayment_stats: {
        total_emis: number;
        overdue_emis: number;
        upcoming_emis: number;
        paid_emis: number;
        skipped_emis: number;
        total_outstanding: number;
        total_collected: number;
        due_next_30_days: number;
        due_this_month: number;
    };
    employee_stats: {
        employees_with_active_advances: number;
        employees_completed: number;
    };
    monthly_trend: Array<{
        month: string;
        month_label: string;
        requests: number;
        requested_amount: number;
        approved_amount: number;
    }>;
    monthly_repayments: Array<{
        month: string;
        month_label: string;
        collected: number;
        paid_count: number;
    }>;
    department_breakdown: Array<{
        department: string;
        total_requests: number;
        approved_amount: number;
        employees: number;
    }>;
    recent_approved: Array<{
        id: number;
        approved_amount: number;
        repayment_months: number;
        total_paid: number;
        repayment_status: string;
        created_at: string;
        first_name: string;
        last_name: string;
    }>;
};

type Eligibility = {
    eligible: boolean;
    eligibleAmount: number;
    earnedAmount: number;
    monthlySalary: number;
    daysWorked: number;
    totalWorkingDays: number;
    maxPercentage: number;
    requestsUsed: number;
    maxRequests: number;
    message?: string;
    policy?: { min_request_amount: number; max_request_amount: number };
};

type Request = {
    id: number;
    requested_amount: number;
    approved_amount: number | null;
    status: string;
    reason: string;
    created_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Count-Up Hook
// ─────────────────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900) {
    const [v, setV] = useState(0);
    useEffect(() => {
        let raf: number;
        const start = performance.now();
        const step = (ts: number) => {
            const p = Math.min((ts - start) / duration, 1);
            setV(Math.floor(p * (Number.isFinite(target) ? target : 0)));
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => { if (raf) cancelAnimationFrame(raf); };
    }, [target, duration]);
    return v;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatCurrency(amount: number) {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatFullCurrency(amount: number) {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

// Animated number stat card (currency)
function CurrencyStatCard({
    title,
    amount,
    icon: Icon,
    color,
    bgColor,
    borderColor,
    textColor,
    subLabel,
    trend,
}: {
    title: string;
    amount: number;
    icon: any;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    subLabel?: string;
    trend?: { value: number; label: string; up: boolean };
}) {
    return (
        <div className={`relative rounded-xl border ${borderColor} ${bgColor} p-5 overflow-hidden group hover:shadow-md transition-shadow duration-200`}>
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${color} mb-1`}>{title}</p>
                    <p className={`text-2xl font-bold ${textColor} leading-tight truncate`}>
                        {formatCurrency(amount)}
                    </p>
                    {subLabel && <p className="text-xs text-gray-500 mt-1">{subLabel}</p>}
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.up ? "text-emerald-600" : "text-red-500"}`}>
                            {trend.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>{trend.value}% {trend.label}</span>
                        </div>
                    )}
                </div>
                <div className={`p-2.5 rounded-lg bg-white shadow-sm ml-3 flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
            </div>
        </div>
    );
}

// Count stat card
function CountStatCard({
    title,
    count,
    icon: Icon,
    bgColor,
    borderColor,
    textColor,
    iconColor,
    subText,
}: {
    title: string;
    count: number;
    icon: any;
    bgColor: string;
    borderColor: string;
    textColor: string;
    iconColor: string;
    subText?: string;
}) {
    const animated = useCountUp(count);
    return (
        <div className={`rounded-xl border ${borderColor} ${bgColor} p-4 group hover:shadow-md transition-shadow duration-200`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${iconColor} mb-1`}>{title}</p>
                    <p className={`text-2xl font-bold ${textColor} mt-1`}>{animated}</p>
                    {subText && <p className="text-xs text-gray-500 mt-1">{subText}</p>}
                </div>
                <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
            </div>
        </div>
    );
}

// Mini bar chart (pure CSS)
function MiniBarChart({
    data,
    maxValue,
    color,
}: {
    data: number[];
    maxValue: number;
    color: string;
}) {
    return (
        <div className="flex items-end gap-1 h-16">
            {data.map((v, i) => {
                const pct = maxValue > 0 ? (v / maxValue) * 100 : 0;
                return (
                    <div
                        key={i}
                        className="flex-1 rounded-t-sm transition-all duration-500"
                        style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: color, opacity: 0.4 + (i / data.length) * 0.6 }}
                    />
                );
            })}
        </div>
    );
}

// Progress bar
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
                className={`h-2 rounded-full transition-all duration-700`}
                style={{ width: `${pct}%`, backgroundColor: color }}
            />
        </div>
    );
}

// Repayment status badge
function RepayStatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        ongoing: "bg-blue-50 text-blue-700 border-blue-200",
        completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
        overdue: "bg-red-50 text-red-700 border-red-200",
        defaulted: "bg-orange-50 text-orange-700 border-orange-200",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
            {status}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────────────────────
export default function SalaryAdvanceDashboard() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [eligibility, setEligibility] = useState<Eligibility | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [manualFormData, setManualFormData] = useState({
        employee_id: "",
        total_amount: "",
        amount_paid: "",
        repayment_months: "",
        start_month: new Date().toISOString().substring(0, 7),
        reason: "Manual Entry",
        deduct_in_current_month: false,
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsData, eligData, empData] = await Promise.allSettled([
                apiClient<DashboardStats>("/salary-advance/dashboard-stats", { withAuth: true }),
                apiClient<Eligibility>("/salary-advance/eligibility", { withAuth: true }),
                apiClient<{ data: any[] }>("/organization/employees?format=paginated&limit=1000", { withAuth: true }),
            ]);
            if (statsData.status === "fulfilled") setStats(statsData.value);
            if (eligData.status === "fulfilled") setEligibility(eligData.value);
            if (empData.status === "fulfilled") setEmployees(empData.value?.data || []);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await apiClient("/salary-advance/manual-advance", {
                method: "POST",
                withAuth: true,
                body: {
                    ...manualFormData,
                    employee_id: Number(manualFormData.employee_id),
                    total_amount: Number(manualFormData.total_amount),
                    amount_paid: Number(manualFormData.amount_paid || 0),
                    repayment_months: Number(manualFormData.repayment_months),
                },
            });
            setShowManualModal(false);
            setManualFormData({ employee_id: "", total_amount: "", amount_paid: "", repayment_months: "", start_month: new Date().toISOString().substring(0, 7), reason: "Manual Entry", deduct_in_current_month: false });
            fetchData();
        } catch (error: any) {
            alert(error?.message || "Failed to create manual advance.");
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter((emp) => {
        if (!searchQuery.trim()) return true;
        const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase()) || (emp.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Derived data for charts
    const trendMonths = stats?.monthly_trend || [];
    const maxRequested = Math.max(...trendMonths.map((m) => Number(m.requested_amount || 0)), 1);
    const repayMonths = stats?.monthly_repayments || [];
    const maxCollected = Math.max(...repayMonths.map((m) => Number(m.collected || 0)), 1);
    const depts = stats?.department_breakdown || [];
    const maxDeptAmount = Math.max(...depts.map((d) => Number(d.approved_amount || 0)), 1);

    const rs = stats?.request_summary;
    const ms = stats?.month_stats;
    const rps = stats?.repayment_stats;
    const es = stats?.employee_stats;

    const pendingCount = useCountUp(rs?.pending || 0);
    const approvedCount = useCountUp(rs?.approved || 0);
    const overdueCount = useCountUp(rps?.overdue_emis || 0);
    const activeEmpCount = useCountUp(es?.employees_with_active_advances || 0);

    return (
        <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
                            <span className="p-2 bg-indigo-600 rounded-lg">
                                <Banknote className="w-5 h-5 text-white" />
                            </span>
                            Salary Advance Dashboard
                        </h1>
                        <p className="text-sm text-gray-500 mt-1 ml-11">Organization-wide overview · Admins & HR only</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowManualModal(true)}
                            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            Import Advance
                        </button>
                        {eligibility?.eligible && (
                            <button
                                onClick={() => setShowRequestModal(true)}
                                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                New Request
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Primary KPI Row ────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <CurrencyStatCard
                        title="Total Disbursed"
                        amount={rs?.total_approved_amount || 0}
                        icon={Banknote}
                        color="text-indigo-600"
                        bgColor="bg-indigo-50"
                        borderColor="border-indigo-100"
                        textColor="text-indigo-900"
                        subLabel={`${rs?.approved || 0} active loans`}
                    />
                    <CurrencyStatCard
                        title="Total Collected"
                        amount={rps?.total_collected || 0}
                        icon={CheckCircle}
                        color="text-emerald-600"
                        bgColor="bg-emerald-50"
                        borderColor="border-emerald-100"
                        textColor="text-emerald-900"
                        subLabel={`${rps?.paid_emis || 0} EMIs paid`}
                    />
                    <CurrencyStatCard
                        title="Outstanding Balance"
                        amount={rps?.total_outstanding || 0}
                        icon={CreditCard}
                        color="text-orange-600"
                        bgColor="bg-orange-50"
                        borderColor="border-orange-100"
                        textColor="text-orange-900"
                        subLabel={`${rps?.upcoming_emis || 0} upcoming EMIs`}
                    />
                    <CurrencyStatCard
                        title="Due This Month"
                        amount={rps?.due_this_month || 0}
                        icon={Calendar}
                        color="text-rose-600"
                        bgColor="bg-rose-50"
                        borderColor="border-rose-100"
                        textColor="text-rose-900"
                        subLabel={`Next 30 days: ${formatCurrency(rps?.due_next_30_days || 0)}`}
                    />
                </div>

                {/* ── Secondary Count Cards ──────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <CountStatCard
                        title="Pending Requests"
                        count={pendingCount}
                        icon={Clock}
                        bgColor="bg-amber-50"
                        borderColor="border-amber-100"
                        textColor="text-amber-900"
                        iconColor="text-amber-600"
                        subText={`${ms?.month_pending || 0} this month`}
                    />
                    <CountStatCard
                        title="Approved Loans"
                        count={approvedCount}
                        icon={CheckCircle}
                        bgColor="bg-green-50"
                        borderColor="border-green-100"
                        textColor="text-green-900"
                        iconColor="text-green-600"
                        subText={`${ms?.month_approved || 0} this month`}
                    />
                    <CountStatCard
                        title="Overdue EMIs"
                        count={overdueCount}
                        icon={AlertTriangle}
                        bgColor="bg-red-50"
                        borderColor="border-red-100"
                        textColor="text-red-900"
                        iconColor="text-red-600"
                        subText={`${rps?.skipped_emis || 0} skipped`}
                    />
                    <CountStatCard
                        title="Active Employees"
                        count={activeEmpCount}
                        icon={Users}
                        bgColor="bg-violet-50"
                        borderColor="border-violet-100"
                        textColor="text-violet-900"
                        iconColor="text-violet-600"
                        subText={`${es?.employees_completed || 0} fully repaid`}
                    />
                </div>

                {/* ── Charts Row ─────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Monthly Disbursement Trend */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Monthly Disbursement Trend</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Last 6 months · requested vs approved</p>
                            </div>
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <BarChart3 className="w-4 h-4 text-indigo-600" />
                            </div>
                        </div>

                        {trendMonths.length === 0 ? (
                            <div className="flex items-center justify-center h-24 text-sm text-gray-400">No data yet</div>
                        ) : (
                            <>
                                <div className="flex items-end gap-1.5 h-24 mb-2">
                                    {trendMonths.map((m, i) => {
                                        const reqPct = maxRequested > 0 ? (Number(m.requested_amount) / maxRequested) * 100 : 0;
                                        const appPct = maxRequested > 0 ? (Number(m.approved_amount) / maxRequested) * 100 : 0;
                                        return (
                                            <div key={i} className="flex-1 flex items-end gap-0.5 group relative">
                                                <div
                                                    className="flex-1 rounded-t-sm bg-indigo-200 transition-all duration-500"
                                                    style={{ height: `${Math.max(reqPct, 3)}%` }}
                                                    title={`Requested: ${formatFullCurrency(Number(m.requested_amount))}`}
                                                />
                                                <div
                                                    className="flex-1 rounded-t-sm bg-indigo-600 transition-all duration-500"
                                                    style={{ height: `${Math.max(appPct, 3)}%` }}
                                                    title={`Approved: ${formatFullCurrency(Number(m.approved_amount))}`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex gap-1.5">
                                    {trendMonths.map((m, i) => (
                                        <div key={i} className="flex-1 text-center text-[10px] text-gray-400 truncate">{m.month_label?.split(" ")[0]}</div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <span className="w-3 h-3 rounded-sm bg-indigo-200 inline-block" /> Requested
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block" /> Approved
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Monthly Repayments Collected */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Repayments Collected</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Last 6 months · EMI collections</p>
                            </div>
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                            </div>
                        </div>

                        {repayMonths.length === 0 ? (
                            <div className="flex items-center justify-center h-24 text-sm text-gray-400">No repayments recorded</div>
                        ) : (
                            <>
                                <div className="flex items-end gap-2 h-24 mb-2">
                                    {repayMonths.map((m, i) => {
                                        const pct = maxCollected > 0 ? (Number(m.collected) / maxCollected) * 100 : 0;
                                        return (
                                            <div
                                                key={i}
                                                className="flex-1 rounded-t-sm transition-all duration-500"
                                                style={{
                                                    height: `${Math.max(pct, 4)}%`,
                                                    backgroundColor: `rgb(16 185 129 / ${0.35 + (i / repayMonths.length) * 0.65})`
                                                }}
                                                title={`Collected: ${formatFullCurrency(Number(m.collected))}`}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="flex gap-2">
                                    {repayMonths.map((m, i) => (
                                        <div key={i} className="flex-1 text-center text-[10px] text-gray-400 truncate">{m.month_label?.split(" ")[0]}</div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                    <div className="text-xs text-gray-500">Total collected (6mo)</div>
                                    <div className="text-sm font-semibold text-emerald-700">
                                        {formatFullCurrency(repayMonths.reduce((s, m) => s + Number(m.collected || 0), 0))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Bottom Row: Dept Breakdown + Recent Loans ─────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

                    {/* Department Breakdown */}
                    <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Department Breakdown</h3>
                                <p className="text-xs text-gray-500 mt-0.5">By approved disbursement</p>
                            </div>
                            <div className="p-2 bg-violet-50 rounded-lg">
                                <Building2 className="w-4 h-4 text-violet-600" />
                            </div>
                        </div>

                        {depts.length === 0 ? (
                            <div className="flex items-center justify-center h-24 text-sm text-gray-400">No department data</div>
                        ) : (
                            <div className="space-y-3">
                                {depts.map((d, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-700 font-medium truncate max-w-[160px]">{d.department}</span>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                                                <span>{d.employees} emp</span>
                                                <span className="font-semibold text-gray-800">{formatCurrency(Number(d.approved_amount))}</span>
                                            </div>
                                        </div>
                                        <ProgressBar
                                            value={Number(d.approved_amount)}
                                            max={maxDeptAmount}
                                            color={["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"][i % 8]}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Approved Loans */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Recent Loans</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Latest approved</p>
                            </div>
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Activity className="w-4 h-4 text-blue-600" />
                            </div>
                        </div>

                        {(stats?.recent_approved || []).length === 0 ? (
                            <div className="flex items-center justify-center h-24 text-sm text-gray-400">No approved loans</div>
                        ) : (
                            <div className="space-y-3">
                                {(stats?.recent_approved || []).map((req) => {
                                    const progress = Number(req.approved_amount) > 0
                                        ? Math.min(100, (Number(req.total_paid) / Number(req.approved_amount)) * 100)
                                        : 0;
                                    return (
                                        <div key={req.id} className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-bold text-indigo-700">
                                                    {req.first_name?.[0]}{req.last_name?.[0]}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-xs font-medium text-gray-800 truncate">
                                                        {req.first_name} {req.last_name}
                                                    </span>
                                                    <span className="text-xs font-semibold text-indigo-700 flex-shrink-0 ml-1">
                                                        {formatCurrency(Number(req.approved_amount))}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="h-1.5 rounded-full bg-indigo-500 transition-all duration-700"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 flex-shrink-0">{Math.round(progress)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── This Month Summary Banner ──────────────────────────── */}
                {ms && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <h3 className="text-sm font-semibold text-gray-900">This Month at a Glance</h3>
                            <span className="text-xs text-gray-400">
                                {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                            {[
                                { label: "Total Requests", value: ms.month_total, color: "text-gray-800" },
                                { label: "Approved", value: ms.month_approved, color: "text-emerald-700" },
                                { label: "Rejected", value: ms.month_rejected, color: "text-red-600" },
                                { label: "Pending", value: ms.month_pending, color: "text-amber-600" },
                                { label: "Amount Requested", value: formatCurrency(ms.month_requested_amount), color: "text-indigo-700" },
                                { label: "Amount Approved", value: formatCurrency(ms.month_approved_amount), color: "text-emerald-700" },
                            ].map((item, i) => (
                                <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                                    <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* ── Modals ─────────────────────────────────────────────────── */}
            {showRequestModal && eligibility && (
                <RequestAdvanceModal
                    eligibility={eligibility}
                    onClose={() => setShowRequestModal(false)}
                    onSuccess={() => { setShowRequestModal(false); fetchData(); }}
                />
            )}

            {selectedRequest && (
                <RequestDetails requestId={selectedRequest.id} onClose={() => setSelectedRequest(null)} />
            )}

            {showManualModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">Import Old Salary Advance</h2>
                            <button onClick={() => setShowManualModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <XCircle size={22} className="text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Search Employee</label>
                                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name or email"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee *</label>
                                <select value={manualFormData.employee_id}
                                    onChange={(e) => setManualFormData({ ...manualFormData, employee_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" required>
                                    <option value="">Select Employee</option>
                                    {filteredEmployees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount *</label>
                                    <input type="number" value={manualFormData.total_amount}
                                        onChange={(e) => setManualFormData({ ...manualFormData, total_amount: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                        placeholder="e.g. 10000" required min="0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                                    <input type="number" value={manualFormData.amount_paid}
                                        onChange={(e) => setManualFormData({ ...manualFormData, amount_paid: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                        placeholder="e.g. 6000" min="0" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Repayment Months *</label>
                                    <input type="number" value={manualFormData.repayment_months}
                                        onChange={(e) => setManualFormData({ ...manualFormData, repayment_months: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                        placeholder="e.g. 5" required min="1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Month *</label>
                                    <input type="month" value={manualFormData.start_month}
                                        onChange={(e) => setManualFormData({ ...manualFormData, start_month: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                <input type="text" value={manualFormData.reason}
                                    onChange={(e) => setManualFormData({ ...manualFormData, reason: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    placeholder="Reason for advance" />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="deduct_now" checked={manualFormData.deduct_in_current_month}
                                    onChange={(e) => setManualFormData({ ...manualFormData, deduct_in_current_month: e.target.checked })}
                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 accent-indigo-600 cursor-pointer" />
                                <label htmlFor="deduct_now" className="text-sm text-gray-700 cursor-pointer">
                                    Deduct from start month's salary (immediate first repayment)
                                </label>
                            </div>
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-800">
                                Remaining amount will be split equally into the specified months starting from the selected month.
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowManualModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={loading}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                                    {loading ? "Creating..." : "Create Advance"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
