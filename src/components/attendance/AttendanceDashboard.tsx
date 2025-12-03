"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { format } from "date-fns";
import { createPortal } from "react-dom";

type AttendanceStats = {
    total: number;
    present: number;
    absent: number;
    week_off: number;
    not_started: number;
    on_leave: number;
    late: number;
    early_exit: number;
    overtime: number;
};

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
};

export default function AttendanceDashboard() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<AttendanceStats | null>(null);
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

    // Permission state
    const [role, setRole] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);

    // Modal state
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const isEmployee = (role || "").toLowerCase() === "employee";
    const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
    const canHRMode = !isEmployee || hasPerm("HR_MODE");
    const canViewAttendance = !isEmployee || ["ATTEND_VIEW", "ATTEND_ADD", "ATTEND_EDIT"].some((c) => hasPerm(c));

    // Load session and initial data
    useEffect(() => {
        (async () => {
            try {
                const session = await apiClient<{ authenticated: boolean; role?: string; employee?: { permissions?: string[] } | null }>("/auth/session", { method: "GET" });
                if (session?.authenticated) {
                    setRole((session.role || null) as string | null);
                    setPermissions(session.employee?.permissions || []);
                }
            } catch { }

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
            if (!canHRMode || allSites.length > 0) return;
            try {
                const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
                const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
                setAllSites(list as any[]);
            } catch { }
        })();
    }, [canHRMode, allSites.length]);

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

    const fetchStats = useCallback(async () => {
        if (!canViewAttendance) return;

        const effHq = hqMode && canHRMode;
        const effSite = selectedSiteId;

        if (!effHq && (!effSite || Number(effSite) <= 0)) {
            setStats(null);
            return;
        }

        setLoading(true);
        try {
            const params: any = { date };
            if (effSite) params.site_id = String(effSite);
            if (selectedDepartmentId) params.department_id = String(selectedDepartmentId);
            if (selectedRoleId) params.role_id = String(selectedRoleId);

            const res = await apiClient<any>("/attendance/stats-summary", { params, withAuth: true });
            setStats(res.stats || null);
        } catch (error) {
            console.error("Failed to fetch attendance stats:", error);
            setStats(null);
        } finally {
            setLoading(false);
        }
    }, [selectedSiteId, selectedDepartmentId, selectedRoleId, date, hqMode, canHRMode, canViewAttendance]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const fetchEmployees = useCallback(async (status: string, pageNum: number = 1) => {
        setEmployeesLoading(true);
        try {
            const params: any = { date, status, page: String(pageNum), limit: "20" };
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

    const handleCardClick = (status: string) => {
        setSelectedStatus(status);
        fetchEmployees(status, 1);
    };

    const closeModal = () => {
        setSelectedStatus(null);
        setEmployees([]);
        setPage(1);
    };

    const StatCard = ({ title, value, icon: Icon, color, status, subtitle }: { title: string; value: number; icon: any; color: string; status: string; subtitle?: string }) => (
        <div
            onClick={() => handleCardClick(status)}
            className={`rounded-xl p-4 relative overflow-hidden group transition-all duration-300 hover:shadow-lg cursor-pointer ${color}`}
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-white/20">
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                </div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-white/90 text-sm font-medium">{title}</div>
                {subtitle && <div className="text-white/70 text-xs mt-0.5">{subtitle}</div>}
            </div>
        </div>
    );

    if (isEmployee && !canViewAttendance) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/20 p-4 lg:p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                        <Shield className="w-5 h-5 text-red-600" />
                        <div className="text-red-700 font-medium">You do not have permission to view Attendance Dashboard.</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <BarChart3 className="w-8 h-8" />
                            Attendance Dashboard
                        </h1>
                        <p className="text-gray-600 mt-2">Real-time attendance insights and metrics</p>
                    </div>
                    <button
                        onClick={fetchStats}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Filters</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                            <select
                                value={selectedSiteId || ""}
                                onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {hqMode && canHRMode ? <option value="">All Sites</option> : <option value="">Select Site</option>}
                                {(canHRMode && hqMode ? allSites : inchargeSites).map((site) => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                            <select
                                value={selectedDepartmentId || ""}
                                onChange={(e) => setSelectedDepartmentId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Departments</option>
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select
                                value={selectedRoleId || ""}
                                onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Roles</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {canHRMode && (
                        <div className="mt-4 flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="hrMode"
                                checked={hqMode}
                                onChange={(e) => setHqMode(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="hrMode" className="text-sm font-medium text-gray-700">
                                HR Mode (View all sites)
                            </label>
                        </div>
                    )}
                </div>

                {/* Statistics Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <StatCard title="Total" value={stats.total} icon={Users} color="bg-gradient-to-br from-blue-600 to-blue-700" status="all" subtitle="All employees" />
                        <StatCard title="Present" value={stats.present} icon={UserCheck} color="bg-gradient-to-br from-green-600 to-green-700" status="present" subtitle="Checked in" />
                        <StatCard title="Absent" value={stats.absent} icon={UserX} color="bg-gradient-to-br from-red-600 to-red-700" status="absent" subtitle="Not present" />
                        <StatCard title="Week Off" value={stats.week_off} icon={Calendar} color="bg-gradient-to-br from-indigo-600 to-indigo-700" status="week_off" subtitle="Scheduled off" />
                        <StatCard title="On Leave" value={stats.on_leave} icon={Calendar} color="bg-gradient-to-br from-purple-600 to-purple-700" status="on_leave" subtitle="Approved leave" />
                        <StatCard title="Late" value={stats.late} icon={Clock} color="bg-gradient-to-br from-orange-600 to-orange-700" status="late" subtitle="Late entries" />
                        <StatCard title="Early Exit" value={stats.early_exit} icon={Clock} color="bg-gradient-to-br from-pink-600 to-pink-700" status="early_exit" subtitle="Left early" />
                        <StatCard title="Overtime" value={stats.overtime} icon={Clock} color="bg-gradient-to-br from-teal-600 to-teal-700" status="overtime" subtitle="Extra hours" />
                    </div>
                )}

                {/* Employee Modal */}
                {selectedStatus && createPortal(
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModal}>
                        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-xl font-bold text-gray-900 capitalize">{selectedStatus.replace('_', ' ')} Employees</h2>
                                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
                                {employeesLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                                    </div>
                                ) : employees.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No employees found</p>
                                    </div>
                                ) : (
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {employees.map((emp) => (
                                                <tr key={`${emp.id}-${String((emp as any).site || '')}`} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                                                        <div className="text-xs text-gray-500">{emp.emp_code}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.site || "-"}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.department || "-"}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.role || "-"}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {(() => {
                                                            const s = String(emp.status || '').toLowerCase();
                                                            const cls = s.includes('absent')
                                                                ? 'bg-rose-100 text-rose-700'
                                                                : s.includes('late') || s.includes('half') || s.includes('early')
                                                                    ? 'bg-yellow-100 text-yellow-700'
                                                                    : s.includes('present') || s.includes('check')
                                                                        ? 'bg-green-100 text-green-700'
                                                                        : s.includes('overtime')
                                                                            ? 'bg-indigo-100 text-indigo-700'
                                                                            : 'bg-gray-100 text-gray-700';
                                                            return (
                                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${cls}`}>
                                                                    {emp.status}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Pagination */}
                            {(employees.length > 0) && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                                    <div className="text-sm text-gray-600">
                                        Page {page} of {totalPages}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => fetchEmployees(selectedStatus, page - 1)}
                                            disabled={page <= 1}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => fetchEmployees(selectedStatus, page + 1)}
                                            disabled={page >= totalPages}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
                )}
            </div>
        </div>
    );
}
