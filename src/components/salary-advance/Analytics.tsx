"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    TrendingUp, DollarSign, Users, Calendar, Filter, RefreshCw,
    PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, Building,
    Activity, CheckCircle, AlertCircle, Clock, Shield
} from "lucide-react";
import CardSkeleton from "./CardSkeleton";
import ChartSkeleton from "./ChartSkeleton";
import TableSkeleton from "./TableSkeleton";
import Pagination from "./Pagination";

type OverviewMetrics = {
    total_approved: number;
    total_pending: number;
    total_rejected: number;
    total_disbursed: number;
    avg_advance_amount: number;
    unique_employees: number;
};

type RepaymentHealth = {
    total_paid_emis: number;
    total_pending_emis: number;
    total_overdue_emis: number;
    total_collected: number;
};

type MonthlyTrend = {
    month: string;
    request_count: number;
    disbursed_amount: number;
};

type DepartmentBreakdown = {
    department_name: string;
    request_count: number;
    total_amount: number;
};

type TopEmployee = {
    first_name: string;
    last_name: string;
    employee_code: string | number;
    request_count: number;
    total_borrowed: number;
    total_repaid: number;
};

type AnalyticsData = {
    overview: OverviewMetrics;
    repaymentHealth: RepaymentHealth;
    monthlyTrend: MonthlyTrend[];
    departmentBreakdown: DepartmentBreakdown[];
    topEmployees: {
        data: TopEmployee[];
        total: number;
        page: number;
        totalPages: number;
    };
};

type Department = {
    id: number;
    name: string;
};

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function SalaryAdvanceAnalytics() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]);

    // Filters
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [employeePage, setEmployeePage] = useState(1);

    // Permission state
    const [userRole, setUserRole] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [checkingPerms, setCheckingPerms] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const session = await apiClient<any>("/auth/session", { method: "GET" });
                if (session?.authenticated) {
                    setUserRole(session.role);
                    setPermissions(session.employee?.permissions || []);
                }
            } catch (_) { } finally {
                setCheckingPerms(false);
            }
        })();
    }, []);

    const isOrgAdmin = (userRole || "").toLowerCase() === "orgadmin";
    const canView = isOrgAdmin || permissions.includes("SALADV_VIEW");

    useEffect(() => {
        if (!checkingPerms && canView) {
            fetchDepartments();
        }
    }, [checkingPerms, canView]);

    useEffect(() => {
        if (!checkingPerms && canView) {
            fetchAnalytics();
        }
    }, [startDate, endDate, departmentFilter, employeePage, checkingPerms, canView]);

    const fetchDepartments = async () => {
        // if (!canView) return; // Optional check here as effect handles it
        try {
            const res = await apiClient<Department[] | { departments: Department[] }>("/organization/departments", { withAuth: true });
            if (Array.isArray(res)) {
                setDepartments(res);
            } else {
                setDepartments(res.departments || []);
            }
        } catch (error) {
            console.error("Failed to fetch departments:", error);
        }
    };

    const fetchAnalytics = async () => {
        if (!canView) return;
        setLoading(true);
        try {
            const params: any = { page: employeePage, limit: 10 };
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (departmentFilter) params.department = departmentFilter;

            const res = await apiClient<AnalyticsData>("/salary-advance/analytics/data", {
                withAuth: true,
                params
            });
            setData(res);
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    };

    if (checkingPerms) return <div className="p-8 text-center text-gray-500">Checking access...</div>;

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center text-gray-500">
                <Shield size={48} className="mb-4 text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
                <p className="mt-2">You do not have permission to view salary advance analytics.</p>
            </div>
        );
    }

    if (loading && !data) {
        return (
            <div className="min-h-screen bg-gray-50/50 p-4 lg:p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <CardSkeleton count={4} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartSkeleton type="area" />
                    <ChartSkeleton type="donut" />
                </div>
                <TableSkeleton rows={5} />
            </div>
        );
    }

    if (!data) return null;

    // Calculate repayment rate
    const totalRepayable = data.repaymentHealth.total_collected + (data.overview.total_disbursed - data.repaymentHealth.total_collected); // Simplified approximation
    const repaymentRate = data.overview.total_disbursed > 0
        ? Math.round((data.repaymentHealth.total_collected / data.overview.total_disbursed) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 lg:p-6 space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">Comprehensive insights into salary advances</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                        <Calendar size={16} className="text-gray-500" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent text-sm focus:outline-none text-gray-700"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent text-sm focus:outline-none text-gray-700"
                        />
                    </div>

                    <div className="relative min-w-[180px]">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                        >
                            <option value="">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>

                    <button
                        onClick={fetchAnalytics}
                        className="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <DollarSign size={20} />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-green-50 text-green-700 rounded-full flex items-center gap-1">
                            <ArrowUpRight size={12} /> Disbursed
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(data.overview.total_disbursed)}</div>
                    <div className="text-sm text-gray-500 mt-1">Total Amount Disbursed</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <Activity size={20} />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                            {data.overview.unique_employees} Employees
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{data.overview.total_approved}</div>
                    <div className="text-sm text-gray-500 mt-1">Approved Requests</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <PieChartIcon size={20} />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                            Avg
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(data.overview.avg_advance_amount)}</div>
                    <div className="text-sm text-gray-500 mt-1">Average Advance Size</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                            <TrendingUp size={20} />
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${repaymentRate >= 80 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                            {repaymentRate}% Rate
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(data.repaymentHealth.total_collected)}</div>
                    <div className="text-sm text-gray-500 mt-1">Total Repaid</div>
                </div>
            </div>

            {/* Repayment Health & Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Repayment Health Cards */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-700 font-medium">Paid EMIs</p>
                            <p className="text-2xl font-bold text-green-800">{data.repaymentHealth.total_paid_emis}</p>
                        </div>
                        <CheckCircle className="text-green-400 w-8 h-8" />
                    </div>
                    <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-sm text-yellow-700 font-medium">Pending EMIs</p>
                            <p className="text-2xl font-bold text-yellow-800">{data.repaymentHealth.total_pending_emis}</p>
                        </div>
                        <Clock className="text-yellow-400 w-8 h-8" />
                    </div>
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-700 font-medium">Overdue EMIs</p>
                            <p className="text-2xl font-bold text-red-800">{data.repaymentHealth.total_overdue_emis}</p>
                        </div>
                        <AlertCircle className="text-red-400 w-8 h-8" />
                    </div>
                </div>

                {/* Monthly Trend */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Disbursement Trend (Last 12 Months)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.monthlyTrend}>
                                <defs>
                                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(value) => `₹${value / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => [formatCurrency(value), 'Disbursed']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="disbursed_amount"
                                    stroke="#4F46E5"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorAmount)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Department Distribution */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Department Distribution</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.departmentBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="total_amount"
                                >
                                    {data.departmentBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value, entry: any) => (
                                        <span className="text-xs text-gray-600 ml-1">{entry.payload.department_name}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Employees Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">Top Borrowers</h3>
                    <span className="text-sm text-gray-500">Sorted by total borrowed amount</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Requests</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Borrowed</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Repaid</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.topEmployees.data.map((emp, idx) => {
                                const progress = emp.total_borrowed > 0 ? (emp.total_repaid / emp.total_borrowed) * 100 : 0;
                                return (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                                                    {emp.first_name[0]}{emp.last_name[0]}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</div>
                                                    <div className="text-xs text-gray-500">{emp.employee_code}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{emp.request_count}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(emp.total_borrowed)}</td>
                                        <td className="px-6 py-4 text-sm text-green-600">{formatCurrency(emp.total_repaid)}</td>
                                        <td className="px-6 py-4">
                                            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500 rounded-full"
                                                    style={{ width: `${Math.min(100, progress)}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">{Math.round(progress)}%</div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={employeePage}
                    totalPages={data.topEmployees.totalPages}
                    onPageChange={setEmployeePage}
                    totalItems={data.topEmployees.total}
                    itemsPerPage={10}
                />
            </div>
        </div>
    );
}
