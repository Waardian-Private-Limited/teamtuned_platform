"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import {
    BarChart3,
    Users,
    UserCheck,
    UserX,
    Clock,
    Calendar,
    Filter,
    RefreshCw,
    Shield,
    X,
    ChevronLeft,
    ChevronRight,
    Briefcase,
    Building2,
    TrendingUp,
    TrendingDown,
    Search,
    AlertTriangle,
    MapPin,
    ArrowUpRight,
    ArrowDownRight,
    MoreHorizontal,
    PieChart as PieChartIcon,
    Activity,
    CalendarOff,
    LogOut,
    Coffee
} from "lucide-react";
import { format } from "date-fns";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend
} from "recharts";

const CHART_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#a78bfa"];

interface AttendanceStats {
    total: number;
    present: number;
    absent: number;
    week_off: number;
    not_started: number;
    on_leave: number;
    late: number;
    early_exit: number;
    overtime: number;
    outside_work: number;
    on_break: number;
    working_employees: number;
    avg_logged_in_duration: number;
    trends: {
        present: number;
    };
}

interface DashboardAnalytics {
    trend: { attendance_date: string; present_count: number }[];
    clock_in_distribution: { hour_of_day: number; count: number }[];
    leave_distribution: Array<{ leave_type: string; count: number }>;
    site_performance: Array<{ site_name: string; total_employees: number; present_count: number }>;
    overtime_breakdown: Array<{ name: string; value: number }>;
    leaderboard: {
        early_arrivals: Array<{ first_name: string; last_name: string; punch_in_time: string; site_name: string }>;
        most_hours: Array<{ first_name: string; last_name: string; total_work_minutes: number; site_name: string }>;
    };
    issues: {
        late_comers: Array<{ first_name: string; last_name: string; late_by_minutes: number; site_name: string }>;
    };
}

type Employee = {
    id: number;
    name: string;
    emp_code: string;
    email: string;
    phone: string;
    site: string;
    department: string;
    role: string;
    status: string;
    check_in: string | null;
    check_out: string | null;
    late_minutes: number;
    early_exit_minutes: number;
    total_work_minutes: number;
    summary: string;
    punch_in_image?: string;
    punch_out_image?: string;
};

export default function AttendanceDashboard() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<AttendanceStats | null>(null);
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

    // Filters
    const [hqMode, setHqMode] = useState(false);
    const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

    // Filter options
    const [inchargeSites, setInchargeSites] = useState<any[]>([]);
    const [allSites, setAllSites] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);

    // Use centralized auth
    const { role, permissions, organization } = useAuth();

    // Modal state
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isEmployee = (role || "").toLowerCase() === "employee";
    const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
    const canHRMode = !isEmployee || hasPerm("HR_MODE");
    const canViewAttendance = !isEmployee || ["ATTEND_VIEW", "ATTEND_ADD", "ATTEND_EDIT"].some((c) => hasPerm(c));

    // Load initial data
    useEffect(() => {
        (async () => {

            try {
                const res = await apiClient<{ sites?: any[] }>("/attendance/incharge-sites", { withAuth: true });
                const list = Array.isArray(res?.sites) ? res!.sites! : [];
                setInchargeSites(list as any[]);
                if (list.length > 0 && selectedSiteId == null) {
                    const sid = list[0]?.id;
                    setSelectedSiteId(typeof sid === "number" ? sid : parseInt(String(sid)) || null);
                }
            } catch (e) { }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            // Load all sites for org admin, otherwise load only if canHRMode
            const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
            if ((!canHRMode && !isOrgAdmin) || allSites.length > 0) return;
            try {
                const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
                const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
                setAllSites(list as any[]);
            } catch { }
        })();
    }, [canHRMode, role, allSites.length]);

    useEffect(() => {
        (async () => {
            try {
                const deptRes = await apiClient<any>("/organization/departments", { method: "GET", withAuth: true });
                const deptList = Array.isArray(deptRes) ? deptRes : (deptRes?.data || deptRes?.departments || []);
                setDepartments(deptList);

                const rolesRes = await apiClient<any>("/organization/roles", { method: "GET", withAuth: true });
                const rolesList = Array.isArray(rolesRes) ? rolesRes : (rolesRes?.data || rolesRes?.roles || []);
                setRoles(rolesList);
            } catch (error) {
                console.error("Failed to fetch filter options:", error);
            }
        })();
    }, []);

    const fetchData = useCallback(async () => {
        if (!canViewAttendance) return;

        const effHq = hqMode && canHRMode;
        const effSite = selectedSiteId;

        if (!effHq && (!effSite || Number(effSite) <= 0)) {
            setStats(null);
            setAnalytics(null);
            return;
        }

        setLoading(true);
        try {
            const params: any = { date };
            if (effSite) params.site_id = String(effSite);
            if (selectedDepartmentId) params.department_id = String(selectedDepartmentId);
            if (selectedRoleId) params.role_id = String(selectedRoleId);

            const [statsRes, analyticsRes] = await Promise.all([
                apiClient<any>("/attendance/stats-summary", { params, withAuth: true }),
                apiClient<any>("/attendance/dashboard-analytics", { params, withAuth: true })
            ]);

            setStats(statsRes.stats || null);
            setAnalytics(analyticsRes.analytics || null);
        } catch (error) {
            console.error("Failed to fetch attendance data:", error);
            setStats(null);
            setAnalytics(null);
        } finally {
            setLoading(false);
        }
    }, [selectedSiteId, selectedDepartmentId, selectedRoleId, date, hqMode, canHRMode, canViewAttendance]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const fetchEmployees = useCallback(async (status: string, pageNum: number = 1, search: string = "") => {
        setEmployeesLoading(true);
        try {
            const params: any = { date, status, page: String(pageNum), limit: "10", q: search };
            if (selectedSiteId) params.site_id = String(selectedSiteId);
            if (selectedDepartmentId) params.department_id = String(selectedDepartmentId);
            if (selectedRoleId) params.role_id = String(selectedRoleId);

            const res = await apiClient<any>("/attendance/employees-by-status", { params, withAuth: true });
            setEmployees(res.employees || []);
            setTotalPages(res.pagination?.totalPages || 1);
            setPage(pageNum);
        } catch (error) {
            console.error("Failed to fetch employees:", error);
            setEmployees([]);
        } finally {
            setEmployeesLoading(false);
        }
    }, [selectedSiteId, selectedDepartmentId, selectedRoleId, date]);

    // Debounced search handler
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);

        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Set new timeout for 500ms
        searchTimeoutRef.current = setTimeout(() => {
            if (selectedStatus) {
                fetchEmployees(selectedStatus, 1, value);
            }
        }, 500);
    };

    const handleCardClick = (status: string) => {
        setSelectedStatus(status);
        setSearchQuery("");
        fetchEmployees(status, 1, "");
    };

    const closeModal = () => {
        setSelectedStatus(null);
        setEmployees([]);
        setPage(1);
        setSearchQuery("");
    };

    // Stats Configuration
    const statsConfig = [
        {
            title: 'Total Employees',
            statKey: 'total',
            value: stats?.total || 0,
            icon: Users,
            color: 'from-blue-500 to-blue-600',
            trend: null
        },
        {
            title: 'Present Today',
            statKey: 'present',
            value: stats?.present || 0,
            icon: UserCheck,
            color: 'from-emerald-500 to-emerald-600',
            trend: stats?.trends?.present ? (stats.trends.present > 0 ? `+${stats.trends.present}` : `${stats.trends.present}`) : null
        },
        {
            title: 'Absent',
            statKey: 'absent',
            value: stats?.absent || 0,
            icon: UserX,
            color: 'from-red-500 to-red-600',
            trend: null
        },
        {
            title: 'Week Off',
            statKey: 'week_off',
            value: stats?.week_off || 0,
            icon: Calendar,
            color: 'from-indigo-500 to-indigo-600',
            trend: null
        },
        {
            title: 'On Leave',
            statKey: 'on_leave',
            value: stats?.on_leave || 0,
            icon: CalendarOff,
            color: 'from-orange-500 to-orange-600',
            trend: null
        },
        {
            title: 'Late Arrivals',
            statKey: 'late',
            value: stats?.late || 0,
            icon: Clock,
            color: 'from-yellow-500 to-yellow-600',
            trend: null
        },
        {
            title: 'Early Exits',
            statKey: 'early_exit',
            value: stats?.early_exit || 0,
            icon: LogOut,
            color: 'from-purple-500 to-purple-600',
            trend: null
        },
        {
            title: 'Outside Work',
            statKey: 'outside_work',
            value: stats?.outside_work || 0,
            icon: Briefcase,
            color: 'from-indigo-500 to-indigo-600',
            trend: null
        },
        {
            title: 'On Break',
            statKey: 'on_break',
            value: stats?.on_break || 0,
            icon: Coffee,
            color: 'from-pink-500 to-pink-600',
            trend: null
        },
        {
            title: 'Working Now',
            statKey: 'working_employees',
            value: stats?.working_employees || 0,
            icon: Activity,
            color: 'from-teal-500 to-teal-600',
            trend: null
        }
    ];

    // Prepare Chart Data
    const trendData = useMemo(() => {
        return (analytics?.trend || []).map(d => ({
            date: new Date(d.attendance_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            present: d.present_count
        }));
    }, [analytics]);

    const clockInData = useMemo(() => {
        return (analytics?.clock_in_distribution || []).map(d => ({
            hour: `${d.hour_of_day}:00`,
            count: d.count
        }));
    }, [analytics]);

    const StatCard = ({ title, value, icon: Icon, color, subtitle, trend, onClick }: { title: string; value: number; icon: any; color: string; subtitle?: string; trend?: number | string | null; onClick?: () => void }) => (
        <div
            onClick={onClick}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-1 shadow-lg cursor-pointer transition-all hover:scale-[1.02]`}
        >
            <div className="relative h-full bg-white/95 backdrop-blur-xl rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-gray-100">
                        <Icon className="w-5 h-5 text-gray-700" />
                    </div>
                    {trend !== undefined && trend !== 0 && (
                        <div className={`flex items-center gap-1 text-xs font-medium ${trend && Number(trend) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {trend && Number(trend) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span>{Math.abs(Number(trend))}</span>
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-sm font-medium text-gray-600 mt-1">{title}</p>
                    {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
                </div>
            </div>
        </div>
    );

    if (isEmployee && !canViewAttendance) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
                    <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-600">You do not have permission to view the Attendance Dashboard.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Background Effects */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl opacity-10 -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400 rounded-full filter blur-3xl opacity-10 translate-x-1/3 translate-y-1/3" />
            </div>

            <div className="min-h-screen p-4 lg:p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent flex items-center gap-2">
                                <BarChart3 className="w-6 h-6 text-blue-600" />
                                Attendance Dashboard
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">Real-time workforce insights & analytics</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="pl-10 pr-4 py-2.5 border-none text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 bg-transparent cursor-pointer"
                                />
                            </div>
                            <button
                                onClick={fetchData}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                                <span>Refresh</span>
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Site</label>
                                <select
                                    value={selectedSiteId || ""}
                                    onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    {hqMode && canHRMode ? <option value="">All Sites</option> : <option value="">Select Site</option>}
                                    {(canHRMode && hqMode ? allSites : (role || "").toLowerCase() === "orgadmin" ? allSites : inchargeSites).map((site) => (
                                        <option key={site.id} value={site.id}>{site.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Department</label>
                                <select
                                    value={selectedDepartmentId || ""}
                                    onChange={(e) => setSelectedDepartmentId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    <option value="">All Departments</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Role</label>
                                <select
                                    value={selectedRoleId || ""}
                                    onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    <option value="">All Roles</option>
                                    {roles.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                            {canHRMode && (
                                <div className="flex items-end pb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={hqMode}
                                            onChange={(e) => setHqMode(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">HR Mode (All Sites)</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 p-1 shadow-lg animate-pulse">
                                    <div className="relative h-full bg-white/95 backdrop-blur-xl rounded-xl p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="p-2.5 rounded-xl bg-gray-100 w-10 h-10"></div>
                                        </div>
                                        <div>
                                            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : stats && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {statsConfig.map((stat, index) => (
                                <StatCard key={index} {...stat} onClick={() => handleCardClick(stat.statKey)} />
                            ))}
                        </div>
                    )}

                    {/* Analytics Section */}
                    {loading ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Site Attendance Overview Skeleton */}
                            <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                                    </div>
                                    <div className="p-2 bg-gray-100 rounded-lg w-9 h-9"></div>
                                </div>
                                <div className="h-56 bg-gray-100 rounded-xl"></div>
                            </div>

                            {/* Overtime Breakdown Skeleton */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <div className="h-6 bg-gray-200 rounded w-40 mb-2"></div>
                                        <div className="h-4 bg-gray-200 rounded w-36"></div>
                                    </div>
                                    <div className="p-2 bg-gray-100 rounded-lg w-9 h-9"></div>
                                </div>
                                <div className="h-52 bg-gray-100 rounded-xl"></div>
                            </div>
                        </div>
                    ) : analytics && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Site Attendance Overview */}
                            <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Site Attendance Overview</h3>
                                        <p className="text-sm text-gray-500">Presence by site</p>
                                    </div>
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <BarChart3 className="w-5 h-5 text-blue-600" />
                                    </div>
                                </div>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics?.site_performance || []} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="#f0f0f0" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="site_name" type="category" width={100} tick={{ fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                cursor={{ fill: '#f8fafc' }}
                                            />
                                            <Bar dataKey="present_count" name="Present" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Overtime Breakdown */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Overtime Breakdown</h3>
                                        <p className="text-sm text-gray-500">Distribution of overtime hours</p>
                                    </div>
                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                        <Clock className="w-5 h-5 text-indigo-600" />
                                    </div>
                                </div>
                                <div className="h-52">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics?.overtime_breakdown || []}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                nameKey="name"
                                            >
                                                {(analytics?.overtime_breakdown || []).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}
                    {loading ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Attendance Trend Skeleton */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <div className="h-6 bg-gray-200 rounded w-40 mb-2"></div>
                                        <div className="h-4 bg-gray-200 rounded w-36"></div>
                                    </div>
                                    <div className="p-2 bg-gray-100 rounded-lg w-9 h-9"></div>
                                </div>
                                <div className="h-56 bg-gray-100 rounded-xl"></div>
                            </div>

                            {/* Clock-in Distribution Skeleton */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <div className="h-6 bg-gray-200 rounded w-44 mb-2"></div>
                                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                                    </div>
                                    <div className="p-2 bg-gray-100 rounded-lg w-9 h-9"></div>
                                </div>
                                <div className="h-56 bg-gray-100 rounded-xl"></div>
                            </div>
                        </div>
                    ) : analytics && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Attendance Trend</h3>
                                        <p className="text-sm text-gray-500">Present count over time</p>
                                    </div>
                                    <div className="p-2 bg-emerald-50 rounded-lg">
                                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                                    </div>
                                </div>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={trendData} margin={{ left: 10, right: 10 }}>
                                            <defs>
                                                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                            <Area type="monotone" dataKey="present" stroke="#10b981" fillOpacity={1} fill="url(#colorPresent)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Clock-in Distribution</h3>
                                        <p className="text-sm text-gray-500">Punch-ins by hour (Today)</p>
                                    </div>
                                    <div className="p-2 bg-sky-50 rounded-lg">
                                        <Clock className="w-5 h-5 text-sky-600" />
                                    </div>
                                </div>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={clockInData} margin={{ left: 10, right: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                            <Bar dataKey="count" name="Punch-ins" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Leaderboards & Issues */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Early Birds Skeleton */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse">
                                <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                                                <div>
                                                    <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                                                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                                                </div>
                                            </div>
                                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Late Arrivals Skeleton */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse">
                                <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                                                <div>
                                                    <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                                                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                                                </div>
                                            </div>
                                            <div className="h-6 bg-gray-200 rounded-full w-12"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : analytics && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Top Early Arrivals */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                    Early Birds
                                </h3>
                                <div className="space-y-3">
                                    {analytics?.leaderboard?.early_arrivals?.map((emp: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                                                    {emp.first_name[0]}{emp.last_name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{emp.first_name} {emp.last_name}</p>
                                                    <p className="text-xs text-gray-500">{emp.site_name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900">{format(new Date(emp.punch_in_time), "hh:mm a")}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {analytics?.leaderboard?.early_arrivals?.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No data available</p>}
                                </div>
                            </div>

                            {/* Late Comers */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    Late Arrivals
                                </h3>
                                <div className="space-y-3">
                                    {analytics?.issues?.late_comers?.map((emp: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
                                                    {emp.first_name[0]}{emp.last_name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{emp.first_name} {emp.last_name}</p>
                                                    <p className="text-xs text-gray-500">{emp.site_name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                                                    +{emp.late_by_minutes}m
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {analytics?.issues?.late_comers?.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No late arrivals today</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>


                {/* Employee Modal */}
                {
                    selectedStatus && createPortal(
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeModal}>
                            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 capitalize flex items-center gap-2">
                                            {selectedStatus.replace('_', ' ')} Employees
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                {typeof stats?.[selectedStatus as keyof AttendanceStats] === 'number' ? stats[selectedStatus as keyof AttendanceStats] as number : 0}
                                            </span>
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Search className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                placeholder="Search by name, email, or phone..."
                                                value={searchQuery}
                                                onChange={(e) => handleSearchChange(e.target.value)}
                                                className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-72 placeholder:text-gray-400 placeholder:font-medium transition-all"
                                            />
                                        </div>
                                        <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                            <X className="w-5 h-5 text-gray-900" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-0 bg-gray-50/50">
                                    {employeesLoading ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                                            {[...Array(6)].map((_, i) => (
                                                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm animate-pulse">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                                                            <div>
                                                                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                                                                <div className="h-3 bg-gray-200 rounded w-16"></div>
                                                            </div>
                                                        </div>
                                                        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                                                    </div>
                                                    <div className="space-y-2 mb-3">
                                                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                                                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50">
                                                        <div className="bg-gray-100 rounded-lg p-2">
                                                            <div className="h-2 bg-gray-200 rounded w-12 mb-1"></div>
                                                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                                                        </div>
                                                        <div className="bg-gray-100 rounded-lg p-2">
                                                            <div className="h-2 bg-gray-200 rounded w-12 mb-1"></div>
                                                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : employees.length === 0 ? (
                                        <div className="text-center py-20">
                                            <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                            <p className="text-gray-500 font-medium">No employees found</p>
                                            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                                            {employees.map((emp) => (
                                                <div key={emp.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all group">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            {emp.punch_in_image ? (
                                                                <img
                                                                    src={emp.punch_in_image}
                                                                    alt={emp.name}
                                                                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-100"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                                                    {emp.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <h4 className="text-sm font-bold text-gray-900">{emp.name}</h4>
                                                                <p className="text-xs text-gray-900">{emp.role}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${emp.status.includes('Present') ? 'bg-emerald-100 text-emerald-700' :
                                                            emp.status.includes('Absent') ? 'bg-rose-100 text-rose-700' :
                                                                emp.status.includes('Late') ? 'bg-amber-100 text-amber-700' :
                                                                    emp.status.includes('Leave') ? 'bg-orange-100 text-orange-700' :
                                                                        emp.status.includes('Week Off') ? 'bg-teal-100 text-teal-700' :
                                                                            emp.status.includes('Holiday') ? 'bg-purple-100 text-purple-700' :
                                                                                emp.status.includes('Half') ? 'bg-yellow-100 text-yellow-700' :
                                                                                    emp.status.includes('Outside') ? 'bg-indigo-100 text-indigo-700' :
                                                                                        emp.status.includes('Break') ? 'bg-pink-100 text-pink-700' :
                                                                                            'bg-gray-100 text-gray-700'
                                                            }`}>
                                                            {emp.status}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2 text-xs text-gray-900 mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className="w-3.5 h-3.5 text-gray-900" />
                                                            <span className="truncate">{emp.site}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Briefcase className="w-3.5 h-3.5 text-gray-900" />
                                                            <span className="truncate">{emp.department}</span>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50">
                                                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Check In</p>
                                                            <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                                                {emp.check_in ? format(new Date(emp.check_in), "hh:mm a") : "--:--"}
                                                            </p>
                                                        </div>
                                                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Check Out</p>
                                                            <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                                                {emp.check_out ? format(new Date(emp.check_out), "hh:mm a") : "--:--"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Pagination */}
                                {employees.length > 0 && (
                                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
                                        <div className="text-sm text-gray-600 font-medium">
                                            Page <span className="font-bold text-gray-900">{page}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => fetchEmployees(selectedStatus || '', page - 1, searchQuery)}
                                                disabled={page <= 1}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm text-sm font-medium transition-all disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:shadow-none"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => fetchEmployees(selectedStatus || '', page + 1, searchQuery)}
                                                disabled={page >= totalPages}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 text-sm font-medium transition-all disabled:hover:bg-blue-600"
                                            >
                                                Next
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>,
                        document.body
                    )
                }
            </div>
        </>
    );
}
