"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import {
    Users,
    UserCheck,
    RefreshCw,
    Briefcase,
    Building2,
} from "lucide-react";
import { format } from "date-fns";
import TeamTunedLoader from "@/components/common/TeamTunedLoader";

interface ContractorStats {
    contractor_id: number;
    contractor_name: string;
    total_laborers: number;
    present_count: number;
    active_count: number;
    absent_count: number;
    overtime_count: number;
}

export default function ContractorAttendanceDashboard() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<ContractorStats[]>([]);

    // Filters
    const { role, permissions } = useAuth();
    const isEmployee = (role || "").toLowerCase() === "employee";
    const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
    const canHRMode = !isEmployee || hasPerm("HR_MODE");

    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);

    // Options
    const [inchargeSites, setInchargeSites] = useState<any[]>([]);
    const [allSites, setAllSites] = useState<any[]>([]);

    // 1. Load Sites
    useEffect(() => {
        (async () => {
            try {
                // Incharge Sites
                const res = await apiClient<{ sites?: any[] }>("/attendance/incharge-sites", { withAuth: true });
                const list = Array.isArray(res?.sites) ? res!.sites! : [];
                setInchargeSites(list);

                // Default Site Selection
                if (list.length > 0 && selectedSiteId == null && !canHRMode) {
                    const sid = list[0]?.id;
                    setSelectedSiteId(typeof sid === "number" ? sid : parseInt(String(sid)) || null);
                }

                // HR Mode Sites
                if (canHRMode) {
                    const res2 = await apiClient<{ sites?: any[], data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
                    const list2 = Array.isArray(res2?.sites) ? res2!.sites! : (Array.isArray(res2?.data) ? res2!.data! : []);
                    setAllSites(list2);
                }
            } catch (e) { }
        })();
    }, [canHRMode]);

    // 2. Fetch Stats
    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { date };
            if (selectedSiteId) params.site_id = String(selectedSiteId);

            const res = await apiClient<{ stats: ContractorStats[] }>("/labor/attendance/contractor-stats", { params, withAuth: true });
            setStats(res.stats || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [date, selectedSiteId]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // --- RENDER ---

    const ContractorCard = ({ item }: { item: ContractorStats }) => {
        const attendanceRate = item.total_laborers > 0 ? (item.present_count / item.total_laborers) * 100 : 0;

        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4 gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 line-clamp-1" title={item.contractor_name}>
                            {item.contractor_name}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">Contractor</p>
                    </div>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Briefcase size={20} />
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                        <span>Attendance Rate</span>
                        <span>{Math.round(attendanceRate)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${attendanceRate}%` }}
                        />
                    </div>
                </div>

                {/* Grid Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <Users size={14} className="text-gray-400" />
                            <span className="text-xs text-gray-500">Total</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">{item.total_laborers}</p>
                    </div>

                    <div className="p-2 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <UserCheck size={14} className="text-green-600" />
                            <span className="text-xs text-green-700 font-medium">Present</span>
                        </div>
                        <p className="text-lg font-bold text-green-700">{item.present_count}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-50 min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-indigo-600" />
                            Contractor Attendance
                        </h1>
                        <p className="text-sm text-gray-500">Real-time presence by contractor</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="pl-3 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        />
                        <select
                            value={selectedSiteId || ""}
                            onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : null)}
                            className="pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        >
                            <option value="">All Sites</option>
                            {(canHRMode ? allSites : inchargeSites).map((site) => (
                                <option key={site.id} value={site.id}>{site.name}</option>
                            ))}
                        </select>
                        <button onClick={() => fetchStats()} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-colors">
                            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading && stats.length === 0 ? (
                    <div className="h-64 flex items-center justify-center">
                        <TeamTunedLoader />
                    </div>
                ) : (
                    <>
                        {/* Summary Bar */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-6 items-center">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Contractors</span>
                                <span className="text-2xl font-bold text-gray-900">{stats.length}</span>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Laborers</span>
                                <span className="text-2xl font-bold text-blue-600">
                                    {stats.reduce((acc, curr) => acc + Number(curr.total_laborers || 0), 0)}
                                </span>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Present</span>
                                <span className="text-2xl font-bold text-green-600">
                                    {stats.reduce((acc, curr) => acc + Number(curr.present_count || 0), 0)}
                                </span>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {stats.map((item) => (
                                <ContractorCard key={item.contractor_id} item={item} />
                            ))}
                        </div>

                        {stats.length === 0 && !loading && (
                            <div className="text-center py-12 text-gray-400">
                                No contractor data found for this selection.
                            </div>
                        )}
                    </>
                )}

            </div>
        </div>
    );
}
