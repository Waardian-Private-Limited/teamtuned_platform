"use client";

import React, { useEffect, useState } from "react";
import { 
    Activity, 
    ShieldCheck, 
    ShieldAlert, 
    TrendingUp, 
    Search, 
    ChevronLeft, 
    ChevronRight,
    RefreshCw,
    Info,
    Eye,
    X as CloseIcon
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Cell
} from 'recharts';

export default function LivenessDashboard() {
    const [data, setData] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response: any = await apiClient.get(`/attendance/liveness-results?page=${page}&search=${search}`);
            if (response.success) {
                setData(response.data);
                setStats(response.stats);
                setTotalPages(response.pagination.totalPages);
            }
        } catch (error) {
            console.error("Failed to fetch liveness results:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, search]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const getScoreColor = (score: number) => {
        if (score >= 0.8) return "#10b981"; // Emerald
        if (score >= 0.5) return "#f59e0b"; // Amber
        return "#ef4444"; // Red
    };

    // Prepare chart data (Score distribution)
    const chartData = [
        { range: '0-20%', count: data.filter(d => d.score < 0.2).length },
        { range: '21-40%', count: data.filter(d => d.score >= 0.2 && d.score < 0.4).length },
        { range: '41-60%', count: data.filter(d => d.score >= 0.4 && d.score < 0.6).length },
        { range: '61-80%', count: data.filter(d => d.score >= 0.6 && d.score < 0.8).length },
        { range: '81-100%', count: data.filter(d => d.score >= 0.8).length },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Activity className="text-blue-600" />
                        AI Face Liveness Monitoring
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Track and analyze biometric liveness verification results in shadow mode.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search employee..."
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all w-64 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"
                        title="Refresh data"
                    >
                        <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Modal for Image Preview */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setSelectedImage(null)}
                >
                    <div 
                        className="relative bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">Verification Capture</h3>
                            <button 
                                onClick={() => setSelectedImage(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                            >
                                <CloseIcon size={20} />
                            </button>
                        </div>
                        <div className="aspect-video bg-gray-100 flex items-center justify-center">
                            <img 
                                src={selectedImage} 
                                alt="Capture" 
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                        <div className="p-4 bg-gray-50 flex justify-end">
                            <button 
                                onClick={() => setSelectedImage(null)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    icon={Activity} 
                    label="Total Checks" 
                    value={stats?.total_checks || 0} 
                    color="blue" 
                />
                <StatCard 
                    icon={ShieldCheck} 
                    label="Live Detected" 
                    value={stats?.live_count || 0} 
                    color="emerald" 
                    subtext={`${((stats?.live_count / stats?.total_checks) * 100 || 0).toFixed(1)}% Accuracy`}
                />
                <StatCard 
                    icon={ShieldAlert} 
                    label="Spoof Detected" 
                    value={stats?.spoof_count || 0} 
                    color="rose" 
                    subtext={`${((stats?.spoof_count / stats?.total_checks) * 100 || 0).toFixed(1)}% Alert Rate`}
                />
                <StatCard 
                    icon={TrendingUp} 
                    label="Avg Liveness Score" 
                    value={`${(stats?.avg_score * 100 || 0).toFixed(1)}%`} 
                    color="amber" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Distribution Chart */}
                <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 mb-6 uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-500" />
                        Score Distribution
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="range" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index > 3 ? '#10b981' : index > 1 ? '#f59e0b' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-4 text-[10px] uppercase font-bold tracking-widest text-gray-400">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Low</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Medium</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> High</span>
                    </div>
                </div>

                {/* Data Table */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                            <Activity size={16} className="text-blue-500" />
                            Recent Liveness Logs
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 text-[11px] uppercase tracking-wider font-bold text-gray-500">
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Score</th>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-6 py-4"><div className="h-10 bg-gray-100 rounded-xl"></div></td>
                                        </tr>
                                    ))
                                ) : data.length > 0 ? (
                                    data.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">{item.employee_name}</span>
                                                    <span className="text-[10px] text-gray-400">ID: {item.employee_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                                    item.is_live 
                                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                                    : "bg-rose-50 text-rose-600 border border-rose-100"
                                                }`}>
                                                    {item.is_live ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                                                    {item.is_live ? "Live" : "Spoof"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-12 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{ 
                                                                width: `${item.score * 100}%`, 
                                                                backgroundColor: getScoreColor(item.score) 
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs font-mono text-gray-600">{(item.score * 100).toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-gray-700">{new Date(item.created_at).toLocaleDateString()}</span>
                                                    <span className="text-[10px] text-gray-400">{new Date(item.created_at).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-1 text-[11px] text-gray-500 truncate max-w-[80px]">
                                                        {item.message === "SUCCESS" ? (
                                                            <span className="text-emerald-500 font-medium">Verified</span>
                                                        ) : item.message === "AI_SERVER_OFFLINE" ? (
                                                            <span className="text-amber-500 flex items-center gap-1 font-medium"><Info size={12}/> Offline</span>
                                                        ) : (
                                                            <span>{item.message}</span>
                                                        )}
                                                    </div>
                                                    {item.image_url && (
                                                        <button 
                                                            onClick={() => setSelectedImage(item.image_url)}
                                                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                            title="View Capture"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                                            No liveness records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-gray-50 flex items-center justify-between bg-gray-50/30">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(prev => prev - 1)}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={14} /> Previous
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(prev => prev + 1)}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, subtext }: any) {
    const colors: any = {
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
        rose: "text-rose-600 bg-rose-50 border-rose-100",
        amber: "text-amber-600 bg-amber-50 border-amber-100",
    };

    return (
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-start gap-4 hover:border-blue-200 transition-colors group">
            <div className={`p-3 rounded-2xl border transition-colors ${colors[color]}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <h4 className="text-2xl font-bold text-gray-900 mt-1">{value}</h4>
                {subtext && <p className="text-[10px] font-medium text-gray-500 mt-0.5">{subtext}</p>}
            </div>
        </div>
    );
}
