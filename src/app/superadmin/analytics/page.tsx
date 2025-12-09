'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { fetchGlobalShiftAnalytics, fetchGlobalAttendanceAnalytics, fetchOrgStats } from '@/lib/superadmincontroller';
import { Building2, Clock, Users } from 'lucide-react';

export default function AnalyticsDashboard() {
    const [loading, setLoading] = useState(true);
    const [shiftData, setShiftData] = useState<any[]>([]);
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [orgStats, setOrgStats] = useState<any[]>([]);

    const [shiftStats, setShiftStats] = useState<any>(null);
    const [attendanceStats, setAttendanceStats] = useState<any>(null);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const [shifts, attendance, orgs] = await Promise.all([
                    fetchGlobalShiftAnalytics(),
                    fetchGlobalAttendanceAnalytics(),
                    fetchOrgStats()
                ]);

                setShiftStats(shifts.stats);
                setAttendanceStats(attendance.stats);

                // Process Shift Data (Hour 0-23)
                const sData = [];
                for (let i = 0; i < 24; i++) {
                    sData.push({
                        hour: `${i}:00`,
                        starts: shifts.shiftStart[i] || 0,
                        ends: shifts.shiftEnd[i] || 0
                    });
                }
                setShiftData(sData);

                // Process Attendance Data
                const aData = [];
                for (let i = 0; i < 24; i++) {
                    aData.push({
                        hour: `${i}:00`,
                        punches: attendance.hourlyPunchIns[i] || 0,
                        outs: attendance.hourlyPunchOuts[i] || 0
                    });
                }
                setAttendanceData(aData);

                setOrgStats(orgs);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div className="p-8">Loading analytics...</div>;

    const StatCard = ({ label, value, subValue, icon: Icon, color }: any) => (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
            <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{value || 'N/A'}</p>
                {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
            </div>
            <div className={`p-2 rounded-lg ${color}`}>
                <Icon size={20} className="text-white" />
            </div>
        </div>
    );

    return (
        <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Avg Shift Start"
                    value={shiftStats?.avgStart}
                    subValue={`Peak: ${shiftStats?.peakStart}`}
                    icon={Clock}
                    color="bg-blue-500"
                />
                <StatCard
                    label="Avg Shift End"
                    value={shiftStats?.avgEnd}
                    subValue={`Peak: ${shiftStats?.peakEnd}`}
                    icon={Clock}
                    color="bg-green-500"
                />
                <StatCard
                    label="Avg Check-In"
                    value={attendanceStats?.avgIn}
                    subValue={`Peak: ${attendanceStats?.peakIn}`}
                    icon={Users}
                    color="bg-indigo-500"
                />
                <StatCard
                    label="Avg Check-Out"
                    value={attendanceStats?.avgOut}
                    subValue={`Peak: ${attendanceStats?.peakOut}`}
                    icon={Users}
                    color="bg-purple-500"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Shift Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="text-blue-600" size={20} />
                        <h2 className="text-lg font-semibold text-gray-700">Employee Shift Distribution</h2>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={shiftData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="hour" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f3f4f6' }}
                                />
                                <Legend />
                                <Bar dataKey="starts" name="Shift Starts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="ends" name="Shift Ends" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Attendance Peak Hours */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="text-indigo-600" size={20} />
                        <h2 className="text-lg font-semibold text-gray-700">Attendance Activity (Last 30 Days)</h2>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="hour" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f3f4f6' }}
                                />
                                <Legend />
                                <Bar dataKey="punches" name="Check-In" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="outs" name="Check-Out" fill="#a855f7" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Org Stats Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                    <Building2 className="text-orange-500" size={20} />
                    <h2 className="text-lg font-semibold text-gray-700">Organization Statistics</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Organization Name</th>
                                <th className="px-6 py-3">Total Employees</th>
                                <th className="px-6 py-3 text-right">Scale Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orgStats.map((org) => (
                                <tr key={org.orgId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{org.orgName}</td>
                                    <td className="px-6 py-4">{org.employeeCount}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${org.employeeCount > 100 ? 'bg-green-100 text-green-700' :
                                            org.employeeCount > 20 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {org.employeeCount > 100 ? 'High Scale' : org.employeeCount > 20 ? 'Medium Scale' : 'Start Up'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {orgStats.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No organization data available</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
