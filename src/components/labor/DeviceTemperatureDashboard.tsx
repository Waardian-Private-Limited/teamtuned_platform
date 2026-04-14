'use client';

import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';
import { apiClient } from '@/lib/apiClient';
import { Calendar, Thermometer, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#10B981', '#F59E0B', '#EF4444']; // Safe, Warm, Hot
const SITE_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#06B6D4'];

export default function DeviceTemperatureDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [dateRange, setDateRange] = useState('7days'); // 24h, 7days
    const [siteId, setSiteId] = useState('all');
    const [sites, setSites] = useState<any[]>([]);

    useEffect(() => {
        fetchSites();
    }, []);

    useEffect(() => {
        fetchStats();
    }, [dateRange, siteId]);

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

    const fetchStats = async () => {
        setLoading(true);
        try {
            let start_date = '';
            let end_date = '';

            if (dateRange === '24h') {
                const d = new Date();
                d.setHours(d.getHours() - 24);
                start_date = d.toISOString().split('T')[0];
            } else if (dateRange === '7days') {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                start_date = d.toISOString().split('T')[0];
            } else if (dateRange === '30days') {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                start_date = d.toISOString().split('T')[0];
            }

            const res = await apiClient.get('/labor/attendance/device-stats', { start_date, site_id: siteId });

            if (res.success) {
                setStats(res);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            toast.error('Failed to load temperature data');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !stats) return <div className="p-8 text-center">Loading Dashboard...</div>;

    const { time_series, site_stats, overall_stats, scatter_data } = stats || {};

    const pieData = [
        { name: 'Cool (<50°C)', value: overall_stats?.cool_readings || 0, color: '#00C49F' },
        { name: 'Warm (50-75°C)', value: overall_stats?.warm_readings || 0, color: '#FFBB28' },
        { name: 'Hot (>75°C)', value: overall_stats?.hot_readings || 0, color: '#FF8042' },
    ];

    return (
        <div className="space-y-6">
            {/* Header / Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Thermometer className="w-6 h-6 text-red-500" />
                    Device Health Monitor
                </h2>

                <div className="flex gap-2">
                    <select
                        value={siteId}
                        onChange={(e) => setSiteId(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="all">All Sites</option>
                        {sites.map(site => (
                            <option key={site.id} value={site.id}>{site.name}</option>
                        ))}
                    </select>

                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="24h">Last 24 Hours</option>
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                    </select>

                    <button onClick={fetchStats} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                        <Activity className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Analytical Row 1: Distribution & Site Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Health Distribution */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Thermometer className="h-5 w-5 text-blue-500" />
                        Fleet Health Distribution
                    </h3>
                    <div className="h-[250px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Healthy (<50°C)', value: Number(overall_stats?.cool_readings || 0) },
                                        { name: 'Warm (50-75°C)', value: Number(overall_stats?.warm_readings || 0) },
                                        { name: 'Critical (>75°C)', value: Number(overall_stats?.hot_readings || 0) }
                                    ]}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell fill="#10B981" />
                                    <Cell fill="#F59E0B" />
                                    <Cell fill="#EF4444" />
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Site-wise Comparison */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm col-span-1 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-500" />
                        Avg Temperature by Site (°C)
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.site_stats} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                <XAxis type="number" domain={[0, 80]} stroke="#9CA3AF" fontSize={10} />
                                <YAxis dataKey="site_name" type="category" stroke="#9CA3AF" fontSize={10} width={100} />
                                <Tooltip cursor={{ fill: '#F3F4F6' }} />
                                <Bar dataKey="avg_temp" radius={[0, 4, 4, 0]} barSize={20} name="Avg Temperature">
                                    {stats?.site_stats?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={SITE_COLORS[index % SITE_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Analytical Row 2: Peak Heat Profile */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-orange-500" />
                        24-Hour Temperature Profile
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-2">Hourly Avg Pattern</span>
                    </h3>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={Array.from({ length: 24 }).map((_, i) => ({
                            hour: `${String(i).padStart(2, '0')}:00`,
                            temp: stats?.scatter_data?.filter((d: any) => d.hour === i).reduce((acc: number, cur: any) => acc + cur.temp, 0) / 
                                  (stats?.scatter_data?.filter((d: any) => d.hour === i).length || 1)
                        }))}>
                            <defs>
                                <linearGradient id="colorPattern" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={10} />
                            <YAxis domain={[30, 80]} stroke="#9CA3AF" fontSize={10} unit="°C" />
                            <Tooltip />
                            <Area 
                                type="monotone" 
                                dataKey="temp" 
                                stroke="#F97316" 
                                fillOpacity={1} 
                                fill="url(#colorPattern)" 
                                strokeWidth={2}
                                name="Average"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Site Status Grid (NEW) */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {stats?.connectivity_summary?.map((site: any) => {
                    const isOnline = site.mins_ago < 60;
                    return (
                        <div key={site.site_id} className={`p-3 rounded-lg border bg-white shadow-sm flex flex-col justify-between ${isOnline ? 'border-emerald-100' : 'border-gray-100'}`}>
                            <div className="flex items-start justify-between">
                                <span className="text-[10px] font-bold text-gray-500 truncate uppercase tracking-tighter" title={site.site_name}>{site.site_name}</span>
                                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
                            </div>
                            
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className={`text-lg font-black ${isOnline ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {isOnline ? `${parseFloat(site.current_temp || 0).toFixed(0)}°` : 'OFF'}
                                </span>
                                {isOnline && <span className="text-[9px] text-gray-400 font-medium">CPU: {parseFloat(site.current_cpu || 0).toFixed(0)}%</span>}
                            </div>

                            <div className="mt-1 text-[9px] text-gray-400 truncate italic">
                                {site.last_seen ? `${site.mins_ago}m ago` : 'Never seen'}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    title="Max Temperature"
                    value={`${overall_stats?.max_temp || 0}°C`}
                    icon={<AlertTriangle className="text-red-500" />}
                    color="bg-red-50 text-red-700 border-red-100"
                />
                <StatCard
                    title="Avg Temperature"
                    value={`${parseFloat(overall_stats?.avg_temp || 0).toFixed(1)}°C`}
                    icon={<Activity className="text-blue-500" />}
                    color="bg-blue-50 text-blue-700 border-blue-100"
                />
                <StatCard
                    title="Total Readings"
                    value={overall_stats?.readings_count || 0}
                    icon={<TrendingUp className="text-green-500" />}
                    color="bg-green-50 text-green-700 border-green-100"
                />
                <StatCard
                    title="Devices Active"
                    value={stats?.connectivity_summary?.filter((s: any) => s.mins_ago < 60).length || 0}
                    icon={<Activity className="text-emerald-500" />}
                    color="bg-emerald-50 text-emerald-700 border-emerald-100"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Temperature Trend */}
                <ChartContainer title="Temperature Trends (Avg/Max)">
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={time_series}>
                            <defs>
                                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ff0000" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#ff0000" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="time_bucket" tickFormatter={(v) => {
                                const parts = v.split(' ');
                                return parts.length > 1 ? parts[1].slice(0, 5) : v.split('-').slice(1).join('/');
                            }} />
                            <YAxis domain={[30, 90]} /> // Temp usually 30-80
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="avg_temp" stroke="#8884d8" fillOpacity={1} fill="url(#colorAvg)" name="Avg Temp" />
                            <Area type="monotone" dataKey="max_temp" stroke="#ff0000" fillOpacity={1} fill="url(#colorMax)" name="Max Temp" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartContainer>

                {/* Site Comparison */}
                <ChartContainer title="Avg Temperature by Site">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={site_stats} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} />
                            <YAxis dataKey="site_name" type="category" width={100} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="avg_temp" fill="#82ca9d" name="Avg Temp" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Temperature Zones (Pie) */}
                <ChartContainer title="Temperature Zones">
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>

                {/* Scatter Plot (Time of Day) */}
                <ChartContainer title="Temp vs Hour of Day" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={250}>
                        <ScatterChart>
                            <CartesianGrid />
                            <XAxis type="number" dataKey="hour" name="Hour" unit="h" domain={[0, 23]} />
                            <YAxis type="number" dataKey="temp" name="Temp" unit="°C" domain={[30, 90]} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="Readings" data={scatter_data} fill="#8884d8" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </ChartContainer>

            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: any) {
    return (
        <div className={`p-4 rounded-xl border ${color} flex items-center justify-between`}>
            <div>
                <p className="text-sm font-medium opacity-80">{title}</p>
                <h3 className="text-2xl font-bold mt-1">{value}</h3>
            </div>
            <div className="p-3 bg-white/50 rounded-lg backdrop-blur-sm">
                {icon}
            </div>
        </div>
    );
}

function ChartContainer({ title, children, className = '' }: any) {
    return (
        <div className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 ${className}`}>
            <h3 className="text-md font-semibold mb-4 text-gray-700">{title}</h3>
            {children}
        </div>
    );
}
