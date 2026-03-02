"use client";

import React, { useEffect, useState } from 'react';
import {
    ArrowLeft,
    Calendar,
    ClipboardCheck,
    Building,
    User,
    Clock,
    ChevronRight,
    Search,
    RefreshCw,
    FileText
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';

interface DpsPlannedSchedulesProps {
    siteId: string;
    unitId: string;
    unitName: string;
    backPath: string;
}

export default function DpsPlannedSchedules({ siteId, unitId, unitName, backPath }: DpsPlannedSchedulesProps) {
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [siteName, setSiteName] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const planType = searchParams.get('type') || 'planning';

    useEffect(() => {
        fetchSchedules();
    }, [siteId, unitId]);

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const [schedRes, siteRes] = await Promise.all([
                apiClient<any>(`/dps-schedule?siteId=${siteId}&unitId=${unitId}&type=${planType}`, { method: 'GET', withAuth: true }),
                apiClient<any>(`/sites/${siteId}`, { method: 'GET', withAuth: true })
            ]);

            setSchedules(schedRes.schedules || []);
            if (siteRes?.site) setSiteName(siteRes.site.name);
        } catch {
            toast.error('Failed to load schedules');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (d: string) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="max-w-7xl mx-auto p-5 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-gray-900">{unitName} — {planType === 'cbd' ? 'CBD' : 'Planning'} Schedule History</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{siteName} • Site ID: {siteId}</p>
                </div>
                <button
                    onClick={fetchSchedules}
                    className="ml-auto p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Validity Period</th>
                            <th className="px-6 py-4 text-center">Version</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Last Updated</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-48 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-gray-100 rounded w-12 mx-auto animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-gray-100 rounded w-20 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32 animate-pulse" /></td>
                                    <td className="px-6 py-4 text-right"><div className="h-8 bg-gray-100 rounded w-24 ml-auto animate-pulse" /></td>
                                </tr>
                            ))
                        ) : schedules.length > 0 ? (
                            schedules.map(sched => (
                                <tr key={sched.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-4 h-4 text-blue-500" />
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">
                                                    {formatDate(sched.schedule_valid_from)} — {formatDate(sched.schedule_valid_till)}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
                                                    ID: #{sched.id}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                                            v{sched.version || 1}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {sched.status === 'active' ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase">Active</span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 uppercase">{sched.status}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                                            {new Date(sched.updated_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => router.push(`${backPath}/schedule/${siteId}?unitId=${unitId}&unitName=${encodeURIComponent(unitName)}&scheduleId=${sched.id}&type=${planType}`)}
                                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded text-xs font-bold hover:bg-blue-100 transition-colors"
                                        >
                                            View Plan
                                            <ChevronRight size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-20 text-center">
                                    <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                                    <p className="text-gray-500 font-medium">No planned schedules found for this unit</p>
                                    <button
                                        onClick={() => router.push(`${backPath}/schedule/${siteId}?unitId=${unitId}&unitName=${encodeURIComponent(unitName)}&type=${planType}`)}
                                        className="mt-4 px-5 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 transition-colors"
                                    >
                                        Create First Plan
                                    </button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
