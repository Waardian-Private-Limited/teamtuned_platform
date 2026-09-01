"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    Calendar,
    CalendarRange,
    ClipboardCheck,
    Clock,
    ChevronRight,
    Plus,
    RefreshCw
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';

interface DpsPlannedSchedulesProps {
    siteId: string;
    unitId: string;
    unitName: string;
    /** Root of the DPS section — e.g. "/org-admin/dps" or "/employee/dps" */
    basePath: string;
}

/**
 * The list of planning cycles for one department.
 *
 * A plan is a period — normally a month — that is set up once and then filled
 * in daily. This screen used to be called "Version History" and was ordered by
 * last-touched, which made a straightforward month-by-month list read like an
 * audit log of revisions.
 */
export default function DpsPlannedSchedules({ siteId, unitId, unitName, basePath }: DpsPlannedSchedulesProps) {
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [siteName, setSiteName] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const planType = searchParams.get('type') || 'planning';

    const unitQuery = `unitId=${unitId}&unitName=${encodeURIComponent(unitName)}&type=${planType}`;
    const deptListPath = `${basePath}/schedule?siteId=${siteId}`;
    const planPath = (extra = '') => `${basePath}/schedule/${siteId}?${unitQuery}${extra}`;

    useEffect(() => {
        fetchSchedules();
    }, [siteId, unitId, planType]);

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

    const activePlan = useMemo(() => schedules.find(s => s.status === 'active'), [schedules]);
    // Plans prepared for a period that has not started yet. They sit alongside the
    // running plan and are promoted by the nightly rollover on their start date.
    const scheduledPlans = useMemo(
        () => schedules.filter(s => s.status === 'scheduled'),
        [schedules]
    );

    const formatDate = (d: string) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    /**
     * Plans are cut per month, so name the row by its month. A plan that spans
     * more than one month keeps the full range as its label instead.
     */
    const periodLabel = (sched: any) => {
        const from = sched.schedule_valid_from ? new Date(sched.schedule_valid_from) : null;
        const till = sched.schedule_valid_till ? new Date(sched.schedule_valid_till) : null;
        if (!from || isNaN(from.getTime())) return 'No period set';

        const month = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        if (!till || isNaN(till.getTime())) return month(from);
        if (from.getFullYear() === till.getFullYear() && from.getMonth() === till.getMonth()) return month(from);
        return `${month(from)} — ${month(till)}`;
    };

    const isCurrentPeriod = (sched: any) => {
        if (!sched.schedule_valid_from || !sched.schedule_valid_till) return false;
        const today = new Date().setHours(0, 0, 0, 0);
        return new Date(sched.schedule_valid_from).setHours(0, 0, 0, 0) <= today &&
            new Date(sched.schedule_valid_till).setHours(23, 59, 59, 999) >= today;
    };

    return (
        <div className="max-w-7xl mx-auto p-5 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push(deptListPath)}
                    className="p-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    title="Back to departments"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-gray-900">
                        {unitName} — {planType === 'cbd' ? 'CBD' : 'DPR'} Schedules
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {siteName} • One plan per cycle, normally a month. Only one is active at a time — a plan
                        for a later period waits and takes over on its start date.
                    </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={fetchSchedules}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => router.push(planPath('&new=1'))}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={16} />
                        Create Plan
                    </button>
                </div>
            </div>

            {/* What is running now, and what is already queued behind it. */}
            {(activePlan || scheduledPlans.length > 0) && (
                <div className="flex items-start gap-2 px-4 py-3 bg-blue-50/60 border border-blue-200 rounded">
                    <CalendarRange size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-900 leading-relaxed space-y-1">
                        {activePlan && (
                            <p>
                                <span className="font-semibold">{periodLabel(activePlan)}</span> is the active plan.
                                A new plan for the same period replaces it; its daily reports stay attached to it
                                and keep their progress.
                            </p>
                        )}
                        {scheduledPlans.map(plan => (
                            <p key={plan.id}>
                                <span className="font-semibold">{periodLabel(plan)}</span> is prepared and takes over
                                on {formatDate(plan.schedule_valid_from)} — the running plan continues until then.
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <th className="px-6 py-4">Plan Period</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Daily Reports</th>
                                <th className="px-6 py-4">Last Updated</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-48 animate-pulse" /></td>
                                        <td className="px-6 py-4"><div className="h-5 bg-gray-100 rounded w-20 animate-pulse" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24 animate-pulse" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32 animate-pulse" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-8 bg-gray-100 rounded w-24 ml-auto animate-pulse" /></td>
                                    </tr>
                                ))
                            ) : schedules.length > 0 ? (
                                schedules.map(sched => {
                                    const total = Number(sched.forms_total) || 0;
                                    const submitted = Number(sched.forms_submitted) || 0;
                                    const isActive = sched.status === 'active';
                                    const isScheduled = sched.status === 'scheduled';
                                    return (
                                        <tr key={sched.id} className={`hover:bg-gray-50 transition-colors group ${isActive ? 'bg-green-50/30' : isScheduled ? 'bg-indigo-50/20' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Calendar className={`w-4 h-4 ${isActive ? 'text-green-600' : isScheduled ? 'text-indigo-600' : 'text-gray-400'}`} />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-gray-900">{periodLabel(sched)}</span>
                                                            {isActive && isCurrentPeriod(sched) && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-bold uppercase tracking-wider">
                                                                    Current
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                                                            {formatDate(sched.schedule_valid_from)} — {formatDate(sched.schedule_valid_till)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isActive ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase">Active</span>
                                                ) : isScheduled ? (
                                                    <div>
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase">Scheduled</span>
                                                        {sched.schedule_valid_from && (
                                                            <div className="text-[10px] text-gray-400 mt-1">
                                                                Starts {formatDate(sched.schedule_valid_from)}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 uppercase">Closed</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {total > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-gray-900 tabular-nums">{submitted}/{total}</span>
                                                        <span className="text-[11px] text-gray-400">filled</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">None yet</span>
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
                                                    onClick={() => router.push(planPath(`&scheduleId=${sched.id}`))}
                                                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded text-xs font-bold hover:bg-blue-100 transition-colors"
                                                >
                                                    {isActive || isScheduled ? 'Open Plan' : 'View Plan'}
                                                    <ChevronRight size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                                        <p className="text-gray-500 font-medium">No plans yet for this department</p>
                                        <p className="text-xs text-gray-400 mt-1">Create one at the start of the month, then fill the daily report against it.</p>
                                        <button
                                            onClick={() => router.push(planPath('&new=1'))}
                                            className="mt-4 inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 transition-colors"
                                        >
                                            <Plus size={15} />
                                            Create First Plan
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
