"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { Calendar, Filter, MapPin, Search } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';

interface DashboardStats {
    totalConcretePlanned: number;
    totalConcreteAchieved: number;
    totalStaffPlanned: number;
    totalStaffActual: number;
    totalLabourPlanned: number;
    totalLabourActual: number;
    totalIssues: number;
    closedIssues: number;
    totalNCs: number;
    closedNCs: number;
}

export default function DpsPlanningDashboard() {
    const { role } = useAuth();
    const isOrgAdmin = (role || '').toLowerCase() === 'orgadmin';

    const [loading, setLoading] = useState(true);
    const [sites, setSites] = useState<any[]>([]);

    // Filters
    const [siteFilter, setSiteFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Data States
    const [stats, setStats] = useState<DashboardStats>({
        totalConcretePlanned: 0,
        totalConcreteAchieved: 0,
        totalStaffPlanned: 0,
        totalStaffActual: 0,
        totalLabourPlanned: 0,
        totalLabourActual: 0,
        totalIssues: 0,
        closedIssues: 0,
        totalNCs: 0,
        closedNCs: 0
    });
    const [concreteTrendData, setConcreteTrendData] = useState<any[]>([]);
    const [resourceDeploymentData, setResourceDeploymentData] = useState<any[]>([]);
    const [towerWiseData, setTowerWiseData] = useState<any[]>([]);
    const [issueByDeptData, setIssueByDeptData] = useState<any[]>([]);
    const [safetySnapshot, setSafetySnapshot] = useState<any[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // Fetch Sites
                if (isOrgAdmin && sites.length === 0) {
                    const sData = await apiClient<any>('/dps-schedule/sites', {
                        method: 'GET',
                        withAuth: true
                    });
                    setSites(sData.sites || []);
                }

                // Construct query params
                const params = new URLSearchParams({
                    limit: '200',
                    formType: 'planning'
                });

                if (siteFilter) params.append('siteId', siteFilter);
                if (dateFrom) params.append('dateFrom', dateFrom);
                if (dateTo) params.append('dateTo', dateTo);

                // We leverage the existing dynamic-assignments API to aggregate stats
                const response = await apiClient<any>(`/dps-schedule/dynamic-assignments?${params.toString()}`, {
                    method: 'GET',
                    withAuth: true
                });

                const submissions = response?.data || response || [];

                // Simple Aggregation Logic
                let concPlan = 0, concAchieved = 0;
                let staffPlan = 0, staffAct = 0;
                let labPlan = 0, labAct = 0;
                let totalIssues = 0, closedIssues = 0;
                let totalNCs = 0, closedNCs = 0;

                const cTrend: any[] = [];
                const rTrend: any[] = [];
                const towerMap: Record<string, { name: string, staff: number, labor: number }> = {};
                const deptMap: Record<string, { name: string, count: number }> = {};

                // Use due_date for sorting and display
                submissions.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

                submissions.forEach((sub: any) => {
                    const data = sub.submitted_data || sub.dynamic_schema;
                    if (!data) return;

                    let dayConcPlan = 0, dayConcAch = 0;
                    let dayStaffPlan = 0, dayStaffAct = 0;
                    let dayLabPlan = 0, dayLabAct = 0;

                    // Concrete
                    if (data.concrete_planning && data.concrete_planning.planned_total !== undefined) {
                        dayConcPlan = parseFloat(data.concrete_planning.planned_total) || 0;
                        dayConcAch = parseFloat(data.concrete_planning.achieved_total) || 0;
                        concPlan += dayConcPlan;
                        concAchieved += dayConcAch;
                    }

                    // Staff
                    if (data.staff && Array.isArray(data.staff)) {
                        data.staff.forEach((s: any) => {
                            const p = parseInt(s.planned) || 0;
                            const a = parseInt(s.actual) || 0;
                            dayStaffPlan += p;
                            dayStaffAct += a;

                            const tName = s.towerId || 'Site Overall';
                            if (!towerMap[tName]) towerMap[tName] = { name: tName, staff: 0, labor: 0 };
                            towerMap[tName].staff += a;
                        });
                        staffPlan += dayStaffPlan;
                        staffAct += dayStaffAct;
                    }

                    // Labour
                    if (data.labor && Array.isArray(data.labor)) {
                        data.labor.forEach((l: any) => {
                            const p = parseInt(l.planned) || 0;
                            const a = parseInt(l.actual) || 0;
                            dayLabPlan += p;
                            dayLabAct += a;

                            const tName = l.towerId || 'Site Overall';
                            if (!towerMap[tName]) towerMap[tName] = { name: tName, staff: 0, labor: 0 };
                            towerMap[tName].labor += a;
                        });
                        labPlan += dayLabPlan;
                        labAct += dayLabAct;
                    }

                    // Issues
                    if (data.other_issues && Array.isArray(data.other_issues)) {
                        data.other_issues.forEach((iss: any) => {
                            totalIssues++;
                            if (iss.status === 'Closed') closedIssues++;
                            const dept = iss.department || 'Unassigned';
                            if (!deptMap[dept]) deptMap[dept] = { name: dept, count: 0 };
                            deptMap[dept].count++;
                        });
                    }

                    // Safety / Quality NCs
                    if (data.safety_quality) {
                        const ncCategories = ['client_nc', 'empire_nc', 'client_safety', 'empire_safety'];
                        ncCategories.forEach(cat => {
                            if (Array.isArray(data.safety_quality[cat])) {
                                data.safety_quality[cat].forEach((nc: any) => {
                                    totalNCs += (parseInt(nc.total_count) || 1);
                                    closedNCs += (parseInt(nc.total_closed) || 0);
                                });
                            }
                        });
                    }

                    const formattedDate = new Date(sub.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                    cTrend.push({
                        date: formattedDate,
                        planned: dayConcPlan,
                        actual: dayConcAch
                    });

                    rTrend.push({
                        date: formattedDate,
                        staffPlanned: dayStaffPlan,
                        staffActual: dayStaffAct,
                        labourPlanned: dayLabPlan,
                        labourActual: dayLabAct
                    });
                });

                setStats({
                    totalConcretePlanned: isNaN(concPlan) ? 0 : concPlan,
                    totalConcreteAchieved: isNaN(concAchieved) ? 0 : concAchieved,
                    totalStaffPlanned: staffPlan,
                    totalStaffActual: staffAct,
                    totalLabourPlanned: labPlan,
                    totalLabourActual: labAct,
                    totalIssues,
                    closedIssues,
                    totalNCs,
                    closedNCs
                });

                setConcreteTrendData(cTrend);
                setResourceDeploymentData(rTrend);
                setTowerWiseData(Object.values(towerMap));
                setIssueByDeptData(Object.values(deptMap));
                setSafetySnapshot([
                    { name: 'NCs/Safety', total: totalNCs, closed: closedNCs }
                ]);

            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [siteFilter, dateFrom, dateTo, isOrgAdmin, sites.length]);

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-2xl font-black text-gray-900 tracking-tight">
                        Planning Analytics Dashboard
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-1">
                        Track concrete volumes, staff deployments, and execution trends.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                {isOrgAdmin && (
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filter by Site</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={siteFilter}
                                onChange={e => setSiteFilter(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">All Sites Overview</option>
                                {sites.map(site => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">From Date</label>
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">To Date</label>
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            min={dateFrom}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 font-medium">Aggregating analytics...</p>
                </div>
            ) : (
                <>
                    {/* Top Level Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Concrete Execution</span>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Planned (Cum)</span>
                                    <span className="text-2xl font-black text-gray-800">{stats.totalConcretePlanned.toFixed(2)}</span>
                                </div>
                                <div className="border-l border-gray-100 pl-4">
                                    <span className="text-[10px] text-blue-500 font-bold uppercase block mb-1">Achieved (Cum)</span>
                                    <span className="text-2xl font-black text-blue-600">{stats.totalConcreteAchieved.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-50">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Progress</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-1000"
                                            style={{ width: `${stats.totalConcretePlanned > 0 ? Math.min(100, (stats.totalConcreteAchieved / stats.totalConcretePlanned) * 100) : 0}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-black text-blue-600">
                                        {stats.totalConcretePlanned > 0 ? ((stats.totalConcreteAchieved / stats.totalConcretePlanned) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Labour Deployment</span>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Total Planned</span>
                                    <span className="text-2xl font-black text-gray-800">{stats.totalLabourPlanned}</span>
                                </div>
                                <div className="border-l border-gray-100 pl-4">
                                    <span className="text-[10px] text-orange-500 font-bold uppercase block mb-1">Total Actual</span>
                                    <span className="text-2xl font-black text-orange-600">{stats.totalLabourActual}</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-50">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Overall Variance</span>
                                <div className="mt-1">
                                    <span className={`text-sm font-black px-2 py-1 rounded-md ${stats.totalLabourActual < stats.totalLabourPlanned ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {stats.totalLabourActual - stats.totalLabourPlanned > 0 ? '+' : ''}{stats.totalLabourActual - stats.totalLabourPlanned}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Issues & Safety</span>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Open Issues</span>
                                    <span className="text-2xl font-black text-gray-800">{stats.totalIssues - stats.closedIssues}</span>
                                </div>
                                <div className="border-l border-gray-100 pl-4">
                                    <span className="text-[10px] text-red-500 font-bold uppercase block mb-1">Pending NCs</span>
                                    <span className="text-2xl font-black text-red-600">{stats.totalNCs - stats.closedNCs}</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-50">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Resolution Rate</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-1000"
                                            style={{ width: `${(stats.totalIssues + stats.totalNCs) > 0 ? ((stats.closedIssues + stats.closedNCs) / (stats.totalIssues + stats.totalNCs)) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-black text-emerald-600">
                                        {(stats.totalIssues + stats.totalNCs) > 0 ? (((stats.closedIssues + stats.closedNCs) / (stats.totalIssues + stats.totalNCs)) * 100).toFixed(0) : 0}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Resource & Issue Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Tower-wise Deployment */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-800 mb-6">Tower-wise Deployment Breakdown</h3>
                            <div className="h-[300px] w-full">
                                {towerWiseData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={towerWiseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} width={80} />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                                            />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                            <Bar name="Staff" dataKey="staff" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={10} />
                                            <Bar name="Labour" dataKey="labor" fill="#f97316" radius={[0, 4, 4, 0]} barSize={10} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                                        <span className="text-gray-400 font-medium text-sm">No tower-wise data available.</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Issues Distribution */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-800 mb-6">Issue Distribution by Department</h3>
                            <div className="h-[300px] w-full">
                                {issueByDeptData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={issueByDeptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                                            />
                                            <Bar name="Issues" dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                                        <span className="text-gray-400 font-medium text-sm">No issues tracked for this period.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
