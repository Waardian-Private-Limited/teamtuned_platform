"use client";

import React, { useEffect, useState } from 'react';
import { ClipboardList, Building, Calendar, Info, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DpsSubmissionsProps {
    basePath: string; // e.g., "/org-admin/dps" or "/employee/dps"
}

export default function DpsSubmissions({ basePath }: DpsSubmissionsProps) {
    const router = useRouter();
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const { apiClient } = await import('@/lib/apiClient');
            const res = await apiClient<any>('/dps-schedule', {
                method: 'GET',
                withAuth: true
            });
            if (res && res.schedules) {
                setSchedules(res.schedules);
            }
        } catch (error) {
            console.error('Failed to fetch schedules', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (siteId: number) => {
        router.push(`${basePath}/schedule/${siteId}`);
    };

    return (
        <div className="max-w-7xl mx-auto p-8 space-y-10">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                        <ClipboardList className="text-blue-600" size={40} />
                        DPR Plan Submissions
                    </h1>
                    <p className="text-gray-500 text-lg font-medium">View the planned Daily Progress Reporting schedules.</p>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 p-6 bg-gray-50/50 border-b border-gray-100 font-bold text-xs text-gray-400 uppercase tracking-wider">
                    <div className="pl-4">Site Name</div>
                    <div>From Date</div>
                    <div>To Date</div>
                    <div>Last Updated</div>
                    <div className="w-10"></div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : schedules.length === 0 ? (
                    <div className="text-center p-20 text-gray-400 font-medium flex flex-col items-center gap-4">
                        <FileText size={48} className="text-gray-200" />
                        <p>No schedules have been submitted yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {schedules.map(schedule => (
                            <div
                                key={schedule.id}
                                onClick={() => handleRowClick(schedule.site_id)}
                                className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 p-6 hover:bg-blue-50/50 transition-colors cursor-pointer group items-center"
                            >
                                <div className="pl-4">
                                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                        <Building size={16} className="text-gray-400 group-hover:text-blue-500" />
                                        {schedule.site_name || `Site #${schedule.site_id}`}
                                    </h3>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600 flex items-center gap-2">
                                        <Calendar size={14} className="text-gray-400" />
                                        {schedule.schedule_valid_from ? new Date(schedule.schedule_valid_from).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600 flex items-center gap-2">
                                        <Calendar size={14} className="text-gray-400" />
                                        {schedule.schedule_valid_till ? new Date(schedule.schedule_valid_till).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-500 text-sm">
                                        {new Date(schedule.updated_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Info size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
