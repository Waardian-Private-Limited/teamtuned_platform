"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import {
    Users,
    UserCheck,
    UserX,
    Clock,
    RefreshCw,
    Search,
    AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import {
    BarChart,
    Bar,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid,
    AreaChart,
    Area
} from "recharts";

interface LaborDashboardStats {
    total: number;
    present: number;
    absent: number;
    working_employees: number; // active
    pending_employees: number;
    overtime: number;
    trends: { present: number };
}

interface LaborDashboardAnalytics {
    trend: { attendance_date: string; present_count: number }[];
    site_performance: Array<{ site_name: string; present_count: number }>;
}

export default function LaborAttendanceDashboard() {
    const [loadingStats, setLoadingStats] = useState(false);
    const [stats, setStats] = useState<LaborDashboardStats | null>(null);
    const [analytics, setAnalytics] = useState<LaborDashboardAnalytics | null>(null);

    // Filters
    const { role, permissions } = useAuth();
    const isEmployee = (role || "").toLowerCase() === "employee";
    const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
    const canHRMode = !isEmployee || hasPerm("HR_MODE");
    const isLaborAdmin = (role || "").toLowerCase() === "labor admin" || hasPerm("LABOR_ADMIN");
    const isOrgAdmin = (role || "").toLowerCase() === "org admin" || (role || "").toLowerCase() === "orgadmin" || hasPerm("OrgAdmin");
    const canViewAll = canHRMode || hasPerm("MULTISITE_MANAGER") || isOrgAdmin || isLaborAdmin;

    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [hqMode, setHqMode] = useState(false);
    const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
    const [selectedContractorId, setSelectedContractorId] = useState<number | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null);

    // Options
    const [inchargeSites, setInchargeSites] = useState<any[]>([]);
    const [allSites, setAllSites] = useState<any[]>([]);
    const [contractors, setContractors] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [subcategories, setSubcategories] = useState<any[]>([]);

    // Load initial data
    useEffect(() => {
        (async () => {
            try {
                const res = await apiClient<{ sites?: any[] }>("/attendance/incharge-sites", { withAuth: true });
                const list = Array.isArray(res?.sites) ? res!.sites! : [];
                setInchargeSites(list);

                // If not Admin/HR/LaborAdmin, default to first incharge site
                if (!canViewAll && list.length > 0 && selectedSiteId == null) {
                    const sid = list[0]?.id;
                    setSelectedSiteId(typeof sid === "number" ? sid : parseInt(String(sid)) || null);
                }
            } catch (e) { }
        })();
    }, [canViewAll]);

    useEffect(() => {
        (async () => {
            if (!canViewAll) return;

            // If already loaded, just return
            if (allSites.length > 0) {
                return;
            }

            try {
                const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
                const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
                setAllSites(list);
            } catch { }
        })();
    }, [canViewAll, allSites.length]);

    // Fetch Filters Data (Categories)
    useEffect(() => {
        (async () => {
            try {
                const cats = await apiClient<any>("/labor/categories", { withAuth: true });
                setCategories(cats.categories || []);
            } catch (error) {
                console.error("Failed to fetch categories", error);
            }
        })();
    }, []);

    // Fetch Contractors (Filtered by Site)
    useEffect(() => {
        (async () => {
            try {
                const params: any = {};
                if (selectedSiteId) params.site_id = selectedSiteId;
                const res = await apiClient<any>("/labor/contractors", { withAuth: true, params });
                setContractors(res.contractors || []);
            } catch (error) {
                console.error("Failed to fetch contractors", error);
            }
        })();
    }, [selectedSiteId]);

    // Fetch Subcategories when Category changes
    useEffect(() => {
        if (selectedCategoryId) {
            (async () => {
                try {
                    const res = await apiClient<any>(`/labor/categories/${selectedCategoryId}/subcategories`, { withAuth: true });
                    setSubcategories(res.subcategories || []);
                } catch { setSubcategories([]); }
            })();
        } else {
            setSubcategories([]);
        }
    }, [selectedCategoryId]);


    // Fetch Stats
    const fetchStats = useCallback(async () => {
        const effHq = hqMode && canHRMode;
        const effSite = selectedSiteId;

        if (!effHq && (!effSite || Number(effSite) <= 0) && !canViewAll) {
            setStats(null);
            setAnalytics(null);
            return;
        }

        setLoadingStats(true);
        try {
            const params: any = { date };
            if (effSite) params.site_id = String(effSite);
            if (selectedContractorId) params.contractor_id = String(selectedContractorId);
            if (selectedCategoryId) params.category_id = String(selectedCategoryId);
            if (selectedSubcategoryId) params.subcategory_id = String(selectedSubcategoryId);

            const res = await apiClient<any>("/labor/attendance/dashboard-stats", { params, withAuth: true });
            setStats(res.stats);
            setAnalytics(res.analytics);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingStats(false);
        }
    }, [date, selectedSiteId, hqMode, canHRMode, selectedContractorId, selectedCategoryId, selectedSubcategoryId, canViewAll]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // --- RENDER HELPERS ---

    const StatCard = ({ title, value, icon: Icon, color }: any) => (
        <div className={`p-1 rounded-2xl bg-gradient-to-br ${color} shadow-sm`}>
            <div className="bg-white rounded-xl p-4 h-full">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-gray-50 rounded-lg">
                        <Icon className="w-5 h-5 text-gray-700" />
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                    <p className="text-xs text-gray-500 font-medium">{title}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-6 h-6 text-blue-600" />
                            Labor Attendance Dashboard
                        </h1>
                        <p className="text-sm text-gray-500">Track Daily Laborer Presence</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="pl-3 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <button onClick={() => { fetchStats(); }} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm">
                            <RefreshCw className={`w-4 h-4 text-gray-600 ${loadingStats ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">

                        {/* HQ Mode Toggle */}
                        {canHRMode && (
                            <div className="flex items-center pb-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={hqMode}
                                        onChange={(e) => setHqMode(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">HR Mode</span>
                                </label>
                            </div>
                        )}

                        {/* Site Filter */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Site</label>
                            <select
                                value={selectedSiteId || ""}
                                onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                            >
                                {canViewAll && <option value="">All Sites</option>}
                                {(canViewAll ? allSites : inchargeSites).map((site) => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Contractor Filter */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Contractor</label>
                            <select
                                value={selectedContractorId || ""}
                                onChange={(e) => setSelectedContractorId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                            >
                                <option value="">All Contractors</option>
                                {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Category Filter */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                            <select
                                value={selectedCategoryId || ""}
                                onChange={(e) => {
                                    setSelectedCategoryId(e.target.value ? Number(e.target.value) : null);
                                    setSelectedSubcategoryId(null);
                                }}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                            >
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Subcategory Filter */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Subcategory</label>
                            <select
                                value={selectedSubcategoryId || ""}
                                onChange={(e) => setSelectedSubcategoryId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                disabled={!selectedCategoryId}
                            >
                                <option value="">All Subcategories</option>
                                {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <StatCard title="Total Laborers" value={stats.total} icon={Users} color="from-blue-500 to-blue-600" />
                        <StatCard title="Present Today" value={stats.present} icon={UserCheck} color="from-emerald-500 to-emerald-600" />
                        <StatCard title="Currently Active" value={stats.working_employees} icon={Clock} color="from-teal-500 to-teal-600" />
                        <StatCard title="Pending Out" value={stats.pending_employees} icon={Clock} color="from-orange-500 to-orange-600" />
                        <StatCard title="Absent" value={stats.absent} icon={UserX} color="from-red-500 to-red-600" />
                        <StatCard title="Overtime (>8h)" value={stats.overtime} icon={AlertTriangle} color="from-amber-500 to-amber-600" />
                    </div>
                )}

                {/* Charts Area */}
                {analytics && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Trend */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Attendance Trend (7 Days)</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analytics.trend || []}>
                                        <defs>
                                            <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="attendance_date" tickFormatter={(v) => format(new Date(v), 'dd MMM')} tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="present_count" stroke="#10b981" fillOpacity={1} fill="url(#colorTrend)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        {/* Site Breakdown */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Site Distribution From Biometric</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.site_performance || []} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="site_name" type="category" width={100} tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Bar dataKey="present_count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
