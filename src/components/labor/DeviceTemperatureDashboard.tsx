'use client';

import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';
import { apiClient } from '@/lib/apiClient';
import { Calendar, Thermometer, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

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
                    </select>

                    <button onClick={fetchStats} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                        <Activity className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
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
                    title="Hot Alerts (>75°C)"
                    value={overall_stats?.hot_readings || 0}
                    icon={<Thermometer className="text-orange-500" />}
                    color="bg-orange-50 text-orange-700 border-orange-100"
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
                            <XAxis dataKey="time_bucket" tickFormatter={(v) => v.split(' ')[1].slice(0, 5)} />
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
