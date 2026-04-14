'use client';
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Loader2, Thermometer, RefreshCw, Activity, Calendar, AlertTriangle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

interface DeviceLog {
    id: number;
    site_id: number;
    site_name?: string;
    device_temperature: string;
    cpu_usage: string | null;
    created_at: string;
}

const COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#EF4444'];

export default function DeviceHealthLogs() {
    const [logs, setLogs] = useState<DeviceLog[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sites, setSites] = useState<any[]>([]);
    const [siteId, setSiteId] = useState<string>('all');
    const [limit, setLimit] = useState<string>('100');
    const [dateRange, setDateRange] = useState('7days');

    useEffect(() => {
        fetchSites();
    }, []);

    useEffect(() => {
        fetchData();
    }, [siteId, limit, dateRange]);

    const fetchSites = async () => {
        try {
            const res = await apiClient.get('/sites');
            if (res.success) {
                setSites(res.sites);
            }
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Calculate start date
            let startDate = subDays(new Date(), 7).toISOString().split('T')[0];
            if (dateRange === '24h') startDate = subDays(new Date(), 1).toISOString().split('T')[0];
            if (dateRange === '30days') startDate = subDays(new Date(), 30).toISOString().split('T')[0];

            const [logsRes, statsRes] = await Promise.all([
                apiClient.get('/labor/attendance/device-health-logs', { site_id: siteId, limit }),
                apiClient.get('/labor/attendance/device-health-stats', { site_id: siteId, start_date: startDate })
            ]);

            if (logsRes.success) setLogs(logsRes.logs);
            if (statsRes.success) setStats(statsRes);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSiteName = (id: number, logSiteName?: string) => {
        if (logSiteName) return logSiteName;
        const site = sites.find(s => s.id === id);
        return site ? site.name : `Site #${id}`;
    };

    return (
        // Force WHITE theme wrapper
        <div className="space-y-6 max-w-[1600px] mx-auto bg-gray-50 min-h-screen text-gray-900 font-sans p-6 rounded-xl">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <Thermometer className="h-8 w-8 text-blue-600" />
                        Device Health Logs
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Monitoring heartbeat & temperature from site kiosks.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="h-10 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="24h">Last 24 Hours</option>
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                    </select>

                    <select
                        value={siteId}
                        onChange={(e) => setSiteId(e.target.value)}
                        className="h-10 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Sites</option>
                        {sites.map((site) => (
                            <option key={site.id} value={String(site.id)}>
                                {site.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="inline-flex items-center justify-center h-10 px-4 py-2 rounded-md bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Charts Section */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Temperature Trend */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm col-span-1 md:col-span-2">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            Temperature Trends ({dateRange})
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.time_series}>
                                    <defs>
                                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="time_bucket"
                                        tickFormatter={(t) => format(new Date(t), 'MM/dd HH:mm')}
                                        stroke="#9CA3AF"
                                        fontSize={12}
                                    />
                                    <YAxis stroke="#9CA3AF" fontSize={12} unit="°C" domain={['dataMin - 5', 'dataMax + 5']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        labelFormatter={(t) => format(new Date(t), 'MMM dd, HH:mm')}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="avg_temp"
                                        stroke="#2563EB"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorTemp)"
                                        name="Avg Temp"
                                    />
                                    <Line type="monotone" dataKey="max_temp" stroke="#EF4444" strokeWidth={1} dot={false} name="Max Temp" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* CPU Usage Trend */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm col-span-1 md:col-span-2">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-emerald-500" />
                            CPU Utilization (%)
                        </h3>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.time_series}>
                                    <defs>
                                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="time_bucket"
                                        tickFormatter={(t) => {
                                            const d = new Date(t);
                                            return isNaN(d.getTime()) ? t : (dateRange === '30days' ? format(d, 'MM/dd') : format(d, 'HH:mm'));
                                        }}
                                        stroke="#9CA3AF"
                                        fontSize={10}
                                    />
                                    <YAxis stroke="#9CA3AF" fontSize={10} unit="%" domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="avg_cpu"
                                        stroke="#10B981"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorCpu)"
                                        name="Avg CPU"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Connectivity Summary */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                            Device Status
                            <div className="flex gap-1.5 items-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                <span className="text-xs text-gray-500 font-normal">{stats.connectivity_summary?.filter((s: any) => s.mins_ago < 60).length || 0} Online</span>
                            </div>
                        </h3>
                        <div className="space-y-3 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                            {stats.connectivity_summary?.map((s: any) => {
                                const isOnline = s.mins_ago < 60; // Active in last hour
                                return (
                                    <div key={s.site_id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <div>
                                            <p className="font-semibold text-sm text-gray-800">{s.site_name}</p>
                                            <p className="text-[10px] text-gray-500">
                                                {s.last_seen ? `Last seen ${s.mins_ago}m ago` : 'No heartbeat recorded'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-xs font-bold ${isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                {isOnline ? 'ONLINE' : 'OFFLINE'}
                                            </div>
                                            {isOnline && (
                                                <div className="text-[10px] text-gray-400 flex items-center justify-end gap-1 mt-0.5">
                                                    <Thermometer className="w-2.5 h-2.5" /> {parseFloat(s.current_temp || 0).toFixed(0)}°C
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* NEW: CPU Load Site Comparison */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm col-span-1 md:col-span-2">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            Avg CPU Load by Site (%)
                        </h3>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.site_stats} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                    <XAxis type="number" domain={[0, 100]} stroke="#9CA3AF" fontSize={10} unit="%" />
                                    <YAxis dataKey="site_name" type="category" stroke="#9CA3AF" fontSize={10} width={100} />
                                    <Tooltip cursor={{ fill: '#F3F4F6' }} />
                                    <Bar dataKey="avg_cpu" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} name="Avg CPU Load" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* NEW: Status Health Distribution */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Health Distribution
                        </h3>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Critical', value: Number(stats.overall_stats?.hot_readings || 0) },
                                            { name: 'Warm', value: Number(stats.overall_stats?.warm_readings || 0) },
                                            { name: 'Healthy', value: Number(stats.overall_stats?.cool_readings || 0) }
                                        ]}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        <Cell fill="#EF4444" />
                                        <Cell fill="#F59E0B" />
                                        <Cell fill="#10B981" />
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Logs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Recent Heartbeats</h3>
                        <p className="text-sm text-gray-500">Raw 15-minute interval logs.</p>
                    </div>
                    <select
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                        className="h-9 px-2 rounded-md border border-gray-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="50">50 Rows</option>
                        <option value="100">100 Rows</option>
                        <option value="500">500 Rows</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 font-medium border-b border-gray-200 uppercase text-xs tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Timestamp</th>
                                <th className="px-6 py-3">Site</th>
                                <th className="px-6 py-3">Temperature</th>
                                <th className="px-6 py-3">CPU Usage</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No logs found using the current filters.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const temp = parseFloat(log.device_temperature);
                                    let tempColor = "text-green-600 font-bold";
                                    let rowBg = "hover:bg-gray-50";

                                    if (temp > 75) {
                                        tempColor = "text-red-600 font-bold";
                                        rowBg = "bg-red-50 hover:bg-red-100";
                                    } else if (temp > 60) {
                                        tempColor = "text-yellow-600 font-bold";
                                    }

                                    return (
                                        <tr key={log.id} className={`${rowBg} transition-colors duration-150`}>
                                            <td className="px-6 py-4 font-mono text-gray-500">
                                                {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {getSiteName(log.site_id, log.site_name)}
                                            </td>
                                            <td className={`px-6 py-4 ${tempColor}`}>
                                                {log.device_temperature}°C
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 font-mono">
                                                {log.cpu_usage ? `${log.cpu_usage}%` : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                                    Active
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
