"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import {
    Calendar, MapPin, Loader2, Plus, Users, HardHat,
    Target, Truck, Package, ShieldCheck, AlertCircle,
    History, CheckCircle2, XCircle, Info, ChevronRight,
    CircleDot, Wrench, Paperclip, User, Building, Download, FileDown,
    MessageSquare, AlertTriangle, ChevronDown, FileSpreadsheet
} from 'lucide-react';

interface SiteConfig {
    site_id: number;
    total_concrete_planned: number;
    concrete_cumulative_till_date: number;
    current_site_achieved?: number;
    towers?: any[];
}

const formatDate = (dateString: string) => {
    if (!dateString) return '---';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateString;
    }
};

function DpsPlanningDashboard() {
    const { role } = useAuth();
    const userRole = (role || '').toLowerCase();
    const isPowerUser = ['orgadmin', 'superadmin', 'admin', 'system_admin'].includes(userRole);

    const [loading, setLoading] = useState(true);
    const [sites, setSites] = useState<any[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [latestSubmission, setLatestSubmission] = useState<any>(null);
    const [siteConfig, setSiteConfig] = useState<any>(null);
    const [targetHistory, setTargetHistory] = useState<any[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // 1. Initialize Sites
    useEffect(() => {
        const fetchSites = async () => {
            try {
                const sData = await apiClient<any>('/dps-schedule/sites', { method: 'GET', withAuth: true });
                const sitesList = sData.sites || [];
                setSites(sitesList);

                if (sitesList.length > 0 && !selectedSiteId) {
                    setSelectedSiteId(sitesList[0].id.toString());
                }
            } catch (error) {
                console.error("Failed to fetch sites", error);
            }
        };
        if (sites.length === 0) fetchSites();
    }, [sites.length]);

    // 2. Data Fetching depend on Site/Date
    useEffect(() => {
        if (!selectedSiteId) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Site Config
                const config = await apiClient<any>(`/dps-schedule/${selectedSiteId}/config`, { method: 'GET', withAuth: true });
                setSiteConfig(config.config);

                // 2. Fetch Latest Submission for that date
                const params = new URLSearchParams({
                    siteId: selectedSiteId,
                    dateFrom: selectedDate,
                    dateTo: selectedDate,
                    formType: 'planning',
                    status: 'submitted'
                });
                const response = await apiClient<any>(`/dps-schedule/dynamic-assignments?${params.toString()}`, { method: 'GET', withAuth: true });
                const submissions = response?.data || response || [];

                if (submissions.length > 0) {
                    const sorted = [...submissions].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                    setLatestSubmission(sorted[0]);
                } else {
                    setLatestSubmission(null);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedSiteId, selectedDate, sites.length]);
    /* The day the dashboard is describing.
       Everything below is "as at" this date, not as at now. A report for the
       20th opened on the 22nd was being measured against today — so tower
       progress, overdue milestones and everything else read two days ahead of
       the report they sat beside. */
    const reportDate = (latestSubmission?.report_date || selectedDate || '')
        .toString().split('T')[0];
    /** "Tower A 5 · Tower B 7" — how the plan asked for this row. */
    const planScope = (row: any) => {
        const byScope = row?.planned_by_scope || {};
        const parts = Object.entries(byScope).filter(([, n]) => Number(n) > 0);
        if (parts.length > 0) return parts.map(([k, n]) => `${k} ${n}`).join(' · ');
        const scopes = (row?.scopes || []).filter(Boolean);
        return scopes.length > 0 ? scopes.join(' · ') : '';
    };

    /** How the reported cumulative was split across towers, if it was. */
    const splitOf = (row: any) => {
        const split = row?.split || {};
        const parts = Object.entries(split).filter(([, n]) => Number(n) > 0);
        return parts.length > 0 ? parts.map(([k, n]) => `${k} ${n}`).join(' · ') : '';
    };

    const asAt = React.useMemo(() => {
        const d = new Date(reportDate);
        d.setHours(0, 0, 0, 0);
        return isNaN(d.getTime()) ? new Date() : d;
    }, [reportDate]);

    // 3. Fetch target history when modal opens
    useEffect(() => {
        if (!showHistoryModal) {
            setTargetHistory([]);
            return;
        }

        const fetchHistory = async () => {
            try {
                const res = await apiClient<any>(`/dps-schedule/dynamic-assignments/target-history/${showHistoryModal}`, { method: 'GET', withAuth: true });
                setTargetHistory(res.history || []);
            } catch (error) {
                console.error("Failed to fetch target history", error);
            }
        };

        fetchHistory();
    }, [showHistoryModal]);

    const formData = latestSubmission?.submitted_data || null;

    /* Tower columns for the deployment tables. The cumulative stays the first
       number — it is the figure attendance actually produces — and the towers
       follow it. A tower the site did not split against reads "-", which is
       not the same as a reported zero. */
    const towerNames: string[] = React.useMemo(() => {
        const fromConfig = (Array.isArray(siteConfig?.towers) ? siteConfig!.towers : [])
            .map((t: any, i: number) => String(t?.name || t?.tower_name || `T${i + 1}`).trim())
            .filter(Boolean);
        // Anything a report split against that the config does not list still
        // deserves a column, rather than being silently dropped.
        const fromRows = new Set<string>();
        [...(formData?.staff || []), ...(formData?.labor || [])].forEach((row: any) => {
            Object.keys(row?.split || {}).forEach(k => {
                const name = String(k).trim();
                if (name && name.toLowerCase() !== 'overall') fromRows.add(name);
            });
        });
        const seen = new Set(fromConfig.map((n: string) => n.toLowerCase()));
        fromRows.forEach(n => { if (!seen.has(n.toLowerCase())) fromConfig.push(n); });
        return fromConfig;
    }, [siteConfig, formData]);

    /** The count a row recorded against one tower, or null when it never was. */
    const towerCount = (row: any, tower: string): number | null => {
        const split = row?.split || {};
        const key = Object.keys(split).find(k => String(k).trim().toLowerCase() === tower.toLowerCase());
        if (key === undefined) return null;
        const n = Number(split[key]);
        return Number.isFinite(n) ? n : null;
    };


    const [showAllMilestones, setShowAllMilestones] = useState(false);

    const dayOnly = (d: any) => (d ? String(d).split('T')[0] : '');

    /** Every milestone in the schedule, merged with today's submitted data. */
    const allMilestones = React.useMemo(() => {
        const fromSchema = latestSubmission?.dynamic_schema?.monthly_schedule_all;
        if (Array.isArray(fromSchema) && fromSchema.length > 0) {
            const submittedToday = formData?.monthly_schedule_today || [];
            return fromSchema.map((m: any) => {
                const sub = submittedToday.find((s: any) => String(s.id) === String(m.id));
                if (sub) {
                    return {
                        ...m,
                        ...sub,
                        target_date: m.target_date || m.planned_target_date || sub.target_date,
                        planned_target_date: m.planned_target_date || m.target_date || sub.planned_target_date,
                    };
                }
                return m;
            });
        }
        return (siteConfig?.monthly_schedules as any[]) || formData?.monthly_schedule_today || [];
    }, [latestSubmission, siteConfig, formData]);

    /* What the report actually spoke to: every milestone reported on this day,
       or milestones due on this day from the schedule if no report exists. */
    const daysMilestones = React.useMemo(() => {
        const rows = formData?.monthly_schedule_today || [];
        if (rows.length > 0) return rows;
        return (allMilestones || []).filter((m: any) => {
            const target = dayOnly(m.target_date || m.planned_date || m.planned_target_date);
            const revised = dayOnly(m.revised_date);
            const achieved = dayOnly(m.achieved_date);
            return target === reportDate || revised === reportDate || achieved === reportDate
                || (target && target < reportDate && !(m.achieved === true || m.is_achieved === true));
        });
    }, [formData, allMilestones, reportDate]);


    // Helper for Table Status badges
    const StatusBadge = ({ status }: { status: string }) => {
        const s = status?.trim().toLowerCase();
        let colorClass = 'bg-slate-500 text-white border-black'; // Default gray

        if (s === 'open' || s === 'assigned' || s === 'unassigned') colorClass = 'bg-blue-600 text-white border-black';
        if (s === 'acknowledged') colorClass = 'bg-amber-500 text-white border-black';
        if (s === 'completed' || s === 'approved' || s === 'closed' || s === 'achieved') colorClass = 'bg-emerald-600 text-white border-black';
        if (s === 'rejected' || s === 'missed') colorClass = 'bg-rose-600 text-white border-black';
        if (s === 'revised' || s === 'delayed') colorClass = 'bg-amber-600 text-white border-black';
        if (s === 'reverted' || s === 'pending') colorClass = 'bg-blue-900 text-white border-black';

        return (
            <span className={`px-2 py-0.5 rounded-none text-[8px] font-black uppercase tracking-wider border ${colorClass}`}>
                {status || '---'}
            </span>
        );
    };

    // Backend Export Logic
    const handleExport = async (format: 'pdf' | 'excel') => {
        if (!latestSubmission?.id) return;

        try {
            const url = `/dps-schedule/dynamic-assignments/${latestSubmission.id}/export?format=${format}`;
            // Use window.open for direct download if the API supports it, 
            // or fetch as blob if auth headers are required.
            // Since apiClient handles auth, let's use it for the download URL if possible.
            const response = await apiClient<any>(url, {
                method: 'GET',
                withAuth: true,
                responseType: 'blob'
            } as any);

            const blob = new Blob([response], {
                type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            // Named for the day it reports on, so a file filed late is still
            // filed under the right day.
            link.setAttribute('download', `${latestSubmission.form_type}_report_${reportDate}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setShowExportMenu(false);
        } catch (error) {
            console.error('Export Failed:', error);
            alert('Export failed. Please try again.');
        }
    };

    if (loading && !sites.length) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-white">
                <Loader2 className="animate-spin text-black" size={32} />
                <p className="text-black font-bold uppercase tracking-widest text-xs">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 px-4 md:px-6 pt-0 pb-6 space-y-3 max-w-[1600px] mx-auto font-sans antialiased text-black">
            {/* Extreme Minimal Square Header */}
            <header className="flex flex-col md:flex-row justify-between items-center gap-2 py-1 bg-white border-b border-black mb-2 -mx-4 md:-mx-6 px-4 md:px-6">
                <div className="flex items-baseline gap-2">
                    <h1 className="text-sm font-black tracking-tighter text-black">DPR ANALYTICS</h1>
                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-black">Daily Report Snapshot</span>
                </div>

                <div className="flex items-center gap-0 h-7 text-black">
                    {sites.length > 0 && (
                        <div className="relative h-full border border-black border-r-0">
                            <select
                                value={selectedSiteId}
                                onChange={e => setSelectedSiteId(e.target.value)}
                                className="h-full px-2 pr-6 bg-white rounded-none text-[10px] font-bold text-black focus:ring-0 outline-none cursor-pointer appearance-none min-w-[150px] border-none"
                            >
                                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none text-black">
                                <ChevronRight size={10} className="rotate-90" />
                            </div>
                        </div>
                    )}

                    <div className="h-full border border-black">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="h-full px-2 bg-white rounded-none text-[10px] font-bold text-black focus:ring-0 outline-none cursor-pointer border-none"
                        />
                    </div>
                    <div className="h-full border border-black border-l-0 relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="h-full px-4 flex items-center gap-1.5 bg-black text-white hover:bg-slate-900 transition-colors uppercase font-black text-[9px] tracking-widest"
                        >
                            <Download size={10} /> EXPORT <ChevronDown size={10} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showExportMenu && (
                            <div className="absolute top-full right-0 w-48 bg-white border border-black shadow-xl z-50">
                                <button
                                    onClick={() => handleExport('excel')}
                                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                                >
                                    <FileSpreadsheet size={14} className="text-emerald-600" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-black">Excel Report</span>
                                        <span className="text-[7px] text-slate-500 font-bold">Microsoft Excel Format</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleExport('pdf')}
                                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-t border-slate-100"
                                >
                                    <FileDown size={14} className="text-rose-600" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-black">PDF Report</span>
                                        <span className="text-[7px] text-slate-500 font-bold">Standard PDF Format</span>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white border border-black rounded-none text-black">
                    <Loader2 className="animate-spin text-black mb-4" size={24} />
                    <p className="font-bold uppercase tracking-widest text-[9px]">Fetching Daily Report...</p>
                </div>
            ) : !latestSubmission ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white border border-black rounded-none">
                    <div className="bg-slate-50 p-4 rounded-none border border-black mb-4">
                        <AlertCircle size={32} className="text-black" />
                    </div>
                    <h2 className="text-lg font-black text-black">No Data Found</h2>
                    <p className="font-bold mt-1 text-xs text-black">No DPR has been submitted for the selected date and site.</p>
                </div>
            ) : (
                <div id="planning-dashboard-report" className="space-y-4 p-1">
                    {/* TOP SECTION: TOWER SCHEDULE & CONCRETE PROGRESS */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 lg:col-span-8 bg-white border border-black rounded-none overflow-hidden flex flex-col">
                            <div className="px-4 py-2 border-b border-black bg-slate-50">
                                <h3 className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={12} className="text-black" />
                                    Tower Schedule status
                                </h3>
                            </div>
                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50">
                                        <tr className="text-[9px] font-black text-black uppercase tracking-widest border-b border-black">
                                            <th className="py-2 px-4">Tower Name</th>
                                            <th className="py-2 px-3">Start</th>
                                            <th className="py-2 px-3">End</th>
                                            <th className="py-2 px-3 text-center">Total</th>
                                            <th className="py-2 px-3 text-center">Rem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/10">
                                        {(siteConfig?.towers && Array.isArray(siteConfig.towers) ? siteConfig.towers : []).map((t: any, idx: number) => {
                                            const start = t.startDate || t.start_date;
                                            const end = t.endDate || t.end_date;
                                            let total = 0, remaining = 0;
                                            if (start && end) {
                                                const sDate = new Date(start);
                                                const eDate = new Date(end);
                                                // As at the reported day, not as at now.
                                                const today = new Date(asAt);
                                                total = Math.ceil((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
                                                remaining = Math.ceil((eDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                            }
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-2 px-4 text-[10px] font-bold text-black uppercase tracking-tight">{t.name || t.tower_name || `T${idx + 1}`}</td>
                                                    <td className="py-2 px-3 text-[9px] font-medium text-black font-mono">{formatDate(start)}</td>
                                                    <td className="py-2 px-3 text-[9px] font-medium text-black font-mono">{formatDate(end)}</td>
                                                    <td className="py-2 px-3 text-center text-[10px] font-black text-black">{total}d</td>
                                                    <td className={`py-2 px-3 text-center text-[10px] font-black ${remaining < 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-700'}`}>
                                                        {remaining < 0 ? `Overdue ${Math.abs(remaining)}d` : `${remaining}d`}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* PREMIUM CONCRETE PROGRESS CARD */}
                        <div className="col-span-12 lg:col-span-4 bg-white border border-black rounded-none p-4 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[9px] font-black text-black uppercase tracking-[0.2em]">CONCRETE PROGRESS</h3>
                                    <div className="w-6 h-6 rounded-none bg-black flex items-center justify-center text-white">
                                        <CircleDot size={14} strokeWidth={3} />
                                    </div>
                                </div>
                                <div className="mb-6">
                                    <p className="text-[8px] font-black text-black/60 uppercase tracking-widest mb-1">TOTAL PROJECT SCOPE</p>
                                    <div className="flex items-baseline justify-between mb-2">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-black text-black leading-none">{(siteConfig?.current_site_achieved || siteConfig?.concrete_cumulative_till_date || 0).toLocaleString()}</span>
                                            <span className="text-[9px] font-bold text-black/60">/ {(siteConfig?.total_concrete_planned ?? 0).toLocaleString()} m³</span>
                                        </div>
                                        <span className="text-[10px] font-black text-black">
                                            {siteConfig?.total_concrete_planned ? Math.round(((siteConfig?.current_site_achieved || siteConfig?.concrete_cumulative_till_date || 0) / siteConfig.total_concrete_planned) * 100) : 0}%
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-none overflow-hidden border border-black">
                                        <div
                                            className="h-full bg-blue-600 transition-all duration-1000"
                                            style={{ width: `${siteConfig?.total_concrete_planned ? Math.min(100, ((siteConfig?.current_site_achieved || siteConfig?.concrete_cumulative_till_date || 0) / siteConfig.total_concrete_planned) * 100) : 0}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="mb-6 pl-3 border-l-2 border-black">
                                    <p className="text-[8px] font-black text-black/60 uppercase tracking-widest mb-1">MONTHLY STATUS</p>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-lg font-black text-black leading-none">{formData?.concrete_planning?.monthly_achieved_sum || 0} m³</span>
                                        <span className="text-[8px] font-bold text-black/60 uppercase tracking-widest">TGT: {formData?.concrete_planning?.planned_total || 0}</span>
                                    </div>
                                    <div className="h-1 bg-slate-100 rounded-none overflow-hidden w-full border border-black">
                                        <div
                                            className="h-full bg-emerald-600 transition-all duration-1000"
                                            style={{ width: `${formData?.concrete_planning?.planned_total > 0 ? Math.min(100, (Number(formData.concrete_planning.monthly_achieved_sum) / Number(formData.concrete_planning.planned_total)) * 100) : 0}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="pl-3 border-l-2 border-black bg-slate-50 py-1">
                                    <p className="text-[8px] font-black text-black/60 uppercase tracking-widest mb-1">TODAY'S ACHIEVED</p>
                                    <div>
                                        <span className="text-2xl font-black text-black leading-none">{formData?.concrete_planning?.achieved_total || 0} m³</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* 1. TOP SUMMARY CARDS */}
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                            {[
                                { label: 'Int. Safety', val: formData?.safety_quality?.tower_observations?.reduce((a: number, c: any) => a + (Number(c.internal_safety) || 0), 0), color: 'text-blue-600' },
                                { label: 'Cli. Safety', val: formData?.safety_quality?.tower_observations?.reduce((a: number, c: any) => a + (Number(c.client_safety) || 0), 0), color: 'text-indigo-600' },
                                { label: 'Safety NC', val: formData?.safety_quality?.tower_observations?.reduce((a: number, c: any) => a + (Number(c.safety_nc) || 0), 0), color: 'text-orange-600' },
                                { label: 'Int. Quality', val: formData?.safety_quality?.tower_observations?.reduce((a: number, c: any) => a + (Number(c.internal_quality) || 0), 0), color: 'text-emerald-600' },
                                { label: 'Cli. Quality', val: formData?.safety_quality?.tower_observations?.reduce((a: number, c: any) => a + (Number(c.client_quality) || 0), 0), color: 'text-teal-600' },
                                { label: 'Quality NC', val: formData?.safety_quality?.tower_observations?.reduce((a: number, c: any) => a + (Number(c.quality_nc) || 0), 0), color: 'text-red-600' }
                            ].map((card, i) => (
                                <div key={i} className="p-2 border border-black bg-white flex flex-col items-center justify-center">
                                    <div className={`text-[7px] font-black uppercase tracking-tighter opacity-100 leading-none mb-1 ${card.color}`}>{card.label}</div>
                                    <div className="text-sm font-black leading-none text-black">{card.val}</div>
                                </div>
                            ))}
                        </div>


                        {/* 2. MAIN GRID CONTAINER */}
                        <div className="grid grid-cols-12 gap-4">
                            {/* FIRST ROW: Staff & Targets */}
                            <div className="col-span-12 md:col-span-4">
                                <div className="bg-white rounded-none overflow-hidden border border-black flex flex-col w-full h-fit">
                                    <div className="px-4 py-1.5 border-b border-black flex items-center justify-between bg-black">
                                        <div className="flex items-center gap-2">
                                            <Users size={12} className="text-white" />
                                            <h3 className="text-[9px] font-black text-white uppercase tracking-widest">Staff Deployment</h3>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto max-h-[300px] overflow-y-auto relative scrollbar-thin scrollbar-thumb-black/10 scrollbar-track-transparent">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 border-b border-black/10 sticky top-0 z-10 shadow-sm">
                                                <tr className="text-[8px] font-bold text-black uppercase tracking-widest">
                                                    <th className="py-1.5 px-3">Role</th>
                                                    <th className="py-1.5 px-2 text-center">Pln</th>
                                                    <th className="py-1.5 px-2 text-center">Cum</th>
                                                    {towerNames.map(t => (
                                                        <th key={t} className="py-1.5 px-2 text-center whitespace-nowrap">{t}</th>
                                                    ))}
                                                    <th className="py-1.5 px-2 text-center">Var</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5">
                                                {formData?.staff?.map((s: any, i: number) => {
                                                    const variance = (Number(s.actual) || 0) - (Number(s.planned) || 0);
                                                    const isNew = s.is_manual === true;
                                                    return (
                                                        <tr key={i} className={`text-[10px] ${isNew ? 'bg-amber-50' : ''}`}>
                                                            <td className="py-1.5 px-3">
                                                                <div className="text-black font-bold truncate max-w-[120px]">{s.role}</div>
                                                                {/* However the plan was written — per tower, per day, or
                                                                    overall — say so, then show the one cumulative figure
                                                                    that was actually reported against it. */}
                                                                {planScope(s) && (
                                                                    <div className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter truncate max-w-[140px]" title={planScope(s)}>
                                                                        {planScope(s)}
                                                                    </div>
                                                                )}
                                                                {isNew && <span className="text-[6px] font-black text-amber-600 uppercase tracking-tighter">New Requirement</span>}
                                                            </td>
                                                            <td className="py-1.5 px-2 text-center text-black">{s.planned || 0}</td>
                                                            <td className="py-1.5 px-2 text-center font-black text-black">{s.actual ?? 0}</td>
                                                            {towerNames.map(t => {
                                                                const n = towerCount(s, t);
                                                                return (
                                                                    <td key={t} className={`py-1.5 px-2 text-center ${n === null ? 'text-slate-300' : 'font-bold text-black'}`}>
                                                                        {n === null ? '-' : n}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className={`py-1.5 px-2 text-center font-black ${variance !== 0 ? 'text-rose-600' : 'text-black'}`}>
                                                                {variance !== 0 ? Math.abs(variance) : 0}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-slate-50 border-t border-black/10 font-bold text-[9px] sticky bottom-0 z-10 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                                                <tr>
                                                    <td className="py-1.5 px-3 text-black">TOTAL</td>
                                                    <td className="py-1.5 px-2 text-center text-black">{formData?.staff?.reduce((a: number, c: any) => a + (Number(c.planned) || 0), 0)}</td>
                                                    <td className="py-1.5 px-2 text-center text-black">{formData?.staff?.reduce((a: number, c: any) => a + (Number(c.actual) || 0), 0)}</td>
                                                    {towerNames.map(t => {
                                                        const rows = (formData?.staff || []).map((c: any) => towerCount(c, t));
                                                        const any = rows.some((n: number | null) => n !== null);
                                                        return (
                                                            <td key={t} className={`py-1.5 px-2 text-center ${any ? 'text-black' : 'text-slate-300'}`}>
                                                                {any ? rows.reduce((a: number, n: number | null) => a + (n || 0), 0) : '-'}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className={`py-1.5 px-2 text-center font-black ${formData?.staff?.reduce((a: number, c: any) => a + ((Number(c.actual) || 0) - (Number(c.planned) || 0)), 0) !== 0 ? 'text-rose-600' : 'text-black'}`}>
                                                        {Math.abs(formData?.staff?.reduce((a: number, c: any) => a + ((Number(c.actual) || 0) - (Number(c.planned) || 0)), 0))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-8">
                                <div className="bg-white rounded-none overflow-hidden border border-black flex flex-col w-full h-full">
                                    <div className="px-4 py-2 border-b border-black bg-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-black text-white rounded-none">
                                                <Target size={14} strokeWidth={2.5} />
                                            </div>
                                            <h3 className="text-[10px] font-black text-black uppercase tracking-widest">Schedule Targets</h3>
                                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                                                Due or achieved on {reportDate}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowAllMilestones(true)}
                                            className="px-2 py-1 border border-black text-[8px] font-black uppercase tracking-widest text-black hover:bg-black hover:text-white transition-colors"
                                        >
                                            View all
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 border-b border-black">
                                                <tr className="text-[9px] font-bold text-black uppercase tracking-widest">
                                                    <th className="py-2 px-4">Tower / Floor</th>
                                                    <th className="py-2 px-4">Purpose / Delay</th>
                                                    <th className="py-2 px-4 text-center">Status</th>
                                                    <th className="py-2 px-4 text-center">Log</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/10">
                                                {daysMilestones.length > 0 ? (
                                                    daysMilestones.map((item: any, i: number) => {
                                                        const isAchieved = item.isAchieved === true || item.isAchieved === 'Yes' || item.is_achieved === 'Yes' || item.achieved === true;
                                                        const delayReason = item.missed_reason || item.delay_reason;
                                                        const revisedDate = item.revised_date || item.new_target_date;
                                                        const achievedDate = item.achievedDate || item.achieved_date;
                                                        const isRevised = !isAchieved && !!(revisedDate || delayReason);

                                                        let status = 'Pending';
                                                        if (isAchieved) {
                                                            status = 'Achieved';
                                                        } else if (isRevised) {
                                                            status = 'Revised';
                                                        } else {
                                                            const targetDateStr = item.target_date || item.planned_date || item.planned_target_date;
                                                            if (targetDateStr) {
                                                                const targetDate = new Date(targetDateStr);
                                                                const selDate = new Date(selectedDate);
                                                                targetDate.setHours(0, 0, 0, 0);
                                                                selDate.setHours(0, 0, 0, 0);
                                                                if (targetDate < selDate) {
                                                                    status = 'Missed';
                                                                }
                                                            }
                                                        }

                                                        return (
                                                            <tr key={i} className="group hover:bg-slate-50 transition-colors">
                                                                <td className="py-2 px-4">
                                                                    <div className="font-bold text-black text-[11px]">{item.tower_name || item.towerName || item.tower_id || 'Site'}</div>
                                                                    <div className="text-[8px] font-bold text-black uppercase">{item.floor || 'Execution'}</div>
                                                                </td>
                                                                <td className="py-2 px-4">
                                                                    <div className="text-[10px] font-bold text-black truncate max-w-[200px]">{item.purpose}</div>
                                                                    {isAchieved && achievedDate && (
                                                                        <div className="text-[8px] font-black text-emerald-600 mt-0.5 uppercase tracking-tighter flex items-center gap-1">
                                                                            <CheckCircle2 size={8} /> Done on {formatDate(achievedDate)}
                                                                        </div>
                                                                    )}
                                                                    {delayReason && (
                                                                        <div className="text-[8px] font-medium text-rose-600 mt-0.5">
                                                                            DELAY: {delayReason}
                                                                            {revisedDate && <span className="ml-1 text-black font-black"> → NEW TARGET: {formatDate(revisedDate)}</span>}
                                                                        </div>
                                                                    )}
                                                                    {!delayReason && revisedDate && (
                                                                        <div className="text-[8px] font-black text-blue-600 mt-0.5">
                                                                            NEW TARGET: {formatDate(revisedDate)}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="py-2 px-4 text-center">
                                                                    <StatusBadge status={status} />
                                                                </td>
                                                                <td className="py-2 px-4 text-center">
                                                                    <button onClick={() => setShowHistoryModal(item.id)} className="text-black hover:text-black">
                                                                        <History size={12} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    <tr><td colSpan={4} className="py-6 text-center text-black font-medium italic text-xs">
                                                        No milestone was due or achieved on this day.
                                                    </td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* SECOND ROW: Labour (Full Width Horizontal) */}
                            <div className="col-span-12">
                                <div className="bg-white rounded-none overflow-hidden border border-black flex flex-col w-full h-fit">
                                    <div className="px-4 py-1.5 border-b border-black flex items-center justify-between bg-black">
                                        <div className="flex items-center gap-2">
                                            <HardHat size={12} className="text-white" />
                                            <h3 className="text-[9px] font-black text-white uppercase tracking-widest">Labour Deployment</h3>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        {/* Cumulative first — attendance is taken at the gate, so that is
                                            the figure that actually exists — then the split across towers.
                                            A tower with no split recorded reads "-", which is deliberately
                                            not the same as a reported zero. */}
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 border-b border-black/10">
                                                <tr className="text-[8px] font-bold text-black uppercase tracking-widest">
                                                    <th className="py-1.5 px-3">Category</th>
                                                    <th className="py-1.5 px-2 text-center">Pln</th>
                                                    <th className="py-1.5 px-2 text-center">Cum</th>
                                                    {towerNames.map(t => (
                                                        <th key={t} className="py-1.5 px-2 text-center whitespace-nowrap">{t}</th>
                                                    ))}
                                                    <th className="py-1.5 px-2 text-center">Var</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5">
                                                {(formData?.labor || []).length === 0 ? (
                                                    <tr><td colSpan={4 + towerNames.length} className="py-6 text-center text-black font-medium italic text-xs">No labour reported.</td></tr>
                                                ) : (formData?.labor || []).map((l: any, i: number) => {
                                                    const variance = (Number(l.actual) || 0) - (Number(l.planned) || 0);
                                                    return (
                                                        <tr key={i} className="text-[10px]">
                                                            <td className="py-1.5 px-3">
                                                                <div className="text-black font-bold truncate max-w-[160px]">{l.type || l.name}</div>
                                                                {planScope(l) && (
                                                                    <div className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter truncate max-w-[180px]" title={planScope(l)}>
                                                                        {planScope(l)}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="py-1.5 px-2 text-center text-black">{l.planned || 0}</td>
                                                            <td className="py-1.5 px-2 text-center font-black text-black">{l.actual ?? 0}</td>
                                                            {towerNames.map(t => {
                                                                const n = towerCount(l, t);
                                                                return (
                                                                    <td key={t} className={`py-1.5 px-2 text-center ${n === null ? 'text-slate-300' : 'font-bold text-black'}`}>
                                                                        {n === null ? '-' : n}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className={`py-1.5 px-2 text-center font-black ${variance !== 0 ? 'text-rose-600' : 'text-black'}`}>
                                                                {variance !== 0 ? Math.abs(variance) : 0}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-slate-50 border-t border-black/10 font-bold text-[9px]">
                                                <tr>
                                                    <td className="py-1.5 px-3 text-black">TOTAL</td>
                                                    <td className="py-1.5 px-2 text-center text-black">{(formData?.labor || []).reduce((a: number, c: any) => a + (Number(c.planned) || 0), 0)}</td>
                                                    <td className="py-1.5 px-2 text-center text-black">{(formData?.labor || []).reduce((a: number, c: any) => a + (Number(c.actual) || 0), 0)}</td>
                                                    {towerNames.map(t => {
                                                        const rows = (formData?.labor || []).map((c: any) => towerCount(c, t));
                                                        const any = rows.some((n: number | null) => n !== null);
                                                        return (
                                                            <td key={t} className={`py-1.5 px-2 text-center ${any ? 'text-black' : 'text-slate-300'}`}>
                                                                {any ? rows.reduce((a: number, n: number | null) => a + (n || 0), 0) : '-'}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="py-1.5 px-2 text-center text-black">
                                                        {Math.abs((formData?.labor || []).reduce((a: number, c: any) => a + ((Number(c.actual) || 0) - (Number(c.planned) || 0)), 0))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* THIRD ROW: Equipment, Materials, Issues */}
                            <div className="col-span-12 md:col-span-4">
                                <div className="bg-white rounded-none overflow-hidden border border-black flex flex-col w-full h-full">
                                    <div className="px-3 py-1.5 border-b border-black bg-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Wrench size={12} className="text-black" />
                                            <h3 className="text-[9px] font-black text-black uppercase tracking-widest">Equipment</h3>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto flex-1">
                                        <table className="w-full text-left border-collapse">
                                            <tbody className="divide-y divide-black/5">
                                                {formData?.equipments?.map((eq: any, i: number) => {
                                                    /* A shortfall is the thing worth seeing here, so the whole
                                                       row goes red and carries why — per machine where the
                                                       report named them, otherwise the row's own reason. */
                                                    const short = (Number(eq.planned) || 0) - (Number(eq.actual) || 0);
                                                    const isShort = short > 0;
                                                    const units = Array.isArray(eq.units) ? eq.units : [];
                                                    const reasons = units.length > 0
                                                        ? units.filter((u: any) => u.shortfall_reason || u.breakdown)
                                                            .map((u: any) => `${u.unit_label || 'Unit'}: ${u.shortfall_reason || u.breakdown}`)
                                                        : [eq.shortfall_reason || eq.breakdown || eq.remark].filter(Boolean);
                                                    return (
                                                    <tr key={i} className={`text-[9px] transition-colors ${isShort ? 'bg-rose-50/50' : 'hover:bg-slate-50'}`}>
                                                        <td className="py-2 px-3 align-top">
                                                            <div className={`font-bold ${isShort ? 'text-rose-700' : 'text-black'}`}>{eq.type}</div>
                                                            {reasons.map((r: string, k: number) => (
                                                                <div key={k} className="text-[7px] text-rose-600 italic mt-0.5 flex items-start gap-1">
                                                                    <MessageSquare size={7} className="mt-[1px] shrink-0" /> <span>{r}</span>
                                                                </div>
                                                            ))}
                                                        </td>
                                                        <td className="py-2 px-2 text-center align-top">
                                                            {(eq.shortfall_status || eq.status) && (
                                                                <span className={`px-1 py-0.5 text-[6px] font-black uppercase border shrink-0 ${(eq.shortfall_status || eq.status) === 'Breakdown'
                                                                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                                                                    : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                                                    {eq.shortfall_status || eq.status}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-3 text-right align-top whitespace-nowrap">
                                                            <span className={`font-black ${isShort ? 'text-rose-700' : 'text-black'}`}>{eq.actual ?? 0}</span>
                                                            <span className="text-black/40 ml-0.5">/{eq.planned || 0}</span>
                                                            {isShort && (
                                                                <div className="text-[7px] font-black text-rose-600">-{short} short</div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-slate-50 border-t border-black font-bold text-[9px]">
                                                <tr>
                                                    <td className="py-1.5 px-3 text-black">GRAND TOTAL</td>
                                                    <td className="py-1.5 px-3 text-right text-black">
                                                        {formData?.equipments?.reduce((a: number, c: any) => a + (Number(c.actual) || 0), 0)}
                                                        <span className="text-black ml-0.5">/{formData?.equipments?.reduce((a: number, c: any) => a + (Number(c.planned) || 0), 0)}</span>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <div className="bg-white rounded-none overflow-hidden border border-black flex flex-col h-full">
                                    <div className="px-4 py-1.5 border-b border-black bg-slate-50">
                                        <h3 className="text-[9px] font-black text-black uppercase tracking-widest">Materials</h3>
                                    </div>
                                    <div className="overflow-x-auto flex-1">
                                        <table className="w-full text-left border-collapse">
                                            <tbody className="divide-y divide-black/5">
                                                {(() => {
                                                    /* Two things happened on this day: what was asked for, and
                                                       what landed. Listing every outstanding material said
                                                       neither — a request from last week looked like today's. */
                                                    const mats = formData?.priority_materials || [];
                                                    const requested = mats.filter((m: any) => !m.raised_on || dayOnly(m.raised_on) === reportDate);
                                                    const received = mats.filter((m: any) =>
                                                        ['received', 'fixed', 'closed'].includes(String(m.status || '').toLowerCase()));
                                                    if (requested.length === 0 && received.length === 0) {
                                                        return <tr><td className="py-6 text-center text-black italic text-[10px]">Nothing requested or received on this day.</td></tr>;
                                                    }
                                                    return (
                                                        <>
                                                            {requested.length > 0 && (
                                                                <tr className="bg-slate-50"><td colSpan={3} className="py-1 px-3 text-[7px] font-black uppercase tracking-widest text-black">Requested this day</td></tr>
                                                            )}
                                                            {requested.map((m: any, i: number) => (
                                                                <tr key={`req-${i}`} className="text-[9px]">
                                                                    <td className="py-1.5 px-3 font-bold text-black">{m.name}</td>
                                                                    <td className="py-1.5 px-2 text-center text-black font-semibold">{dayOnly(m.requiredDate) || '-'}</td>
                                                                    <td className="py-1.5 px-3 text-right font-black text-black">{m.quantity || '-'}</td>
                                                                </tr>
                                                            ))}
                                                            {received.length > 0 && (
                                                                <tr className="bg-emerald-50"><td colSpan={3} className="py-1 px-3 text-[7px] font-black uppercase tracking-widest text-emerald-800">Received this day</td></tr>
                                                            )}
                                                            {received.map((m: any, i: number) => (
                                                                <tr key={`rec-${i}`} className="text-[9px]">
                                                                    <td className="py-1.5 px-3 font-bold text-emerald-800">{m.name}</td>
                                                                    <td className="py-1.5 px-2 text-center text-emerald-700 font-semibold">
                                                                        {m.raised_on ? `raised ${dayOnly(m.raised_on)}` : ''}
                                                                    </td>
                                                                    <td className="py-1.5 px-3 text-right font-black text-emerald-800">{m.quantity || '-'}</td>
                                                                </tr>
                                                            ))}
                                                        </>
                                                    );
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <div className="bg-white rounded-none overflow-hidden border border-black flex flex-col h-full">
                                    <div className="px-4 py-1.5 border-b border-black bg-slate-50">
                                        <h3 className="text-[9px] font-black text-black uppercase tracking-widest">Safety and Quality Issues</h3>
                                    </div>
                                    <div className="overflow-x-auto flex-1">
                                        <table className="w-full text-left border-collapse">
                                            <tbody className="divide-y divide-black/5">
                                                {(() => {
                                                    /* A count strip, then the issues themselves.
                                                       The text used to come from `iss.issue`, a field the form
                                                       has never written — it writes `description` — so every
                                                       row rendered as a bare status badge with nothing beside
                                                       it. That was the blank list, not a design choice. */
                                                    const issues = formData?.safety_quality?.detailed_issues || [];
                                                    if (issues.length === 0) {
                                                        return <tr><td colSpan={2} className="py-6 text-center text-black italic text-[10px]">No issues on this report.</td></tr>;
                                                    }
                                                    const isClosed = (x: any) =>
                                                        ['closed', 'fixed'].includes(String(x.status || 'open').toLowerCase());
                                                    const open = issues.filter((x: any) => !isClosed(x)).length;
                                                    const closed = issues.length - open;
                                                    const raisedToday = issues.filter((x: any) => dayOnly(x.raised_on) === reportDate).length;

                                                    return (
                                                        <>
                                                            <tr className="bg-slate-50 border-b border-black/10">
                                                                <td colSpan={2} className="py-1.5 px-3">
                                                                    <div className="flex items-center gap-3 text-[8px] font-black uppercase tracking-widest">
                                                                        <span className="text-amber-700">{open} open</span>
                                                                        <span className="text-emerald-700">{closed} closed</span>
                                                                        <span className="text-black">{raisedToday} raised this day</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            {issues.map((iss: any, i: number) => {
                                                                const done = isClosed(iss);
                                                                const text = iss.description || iss.issue || '(no description)';
                                                                return (
                                                                    <tr key={i} className="text-[9px] hover:bg-slate-50 transition-colors">
                                                                        <td className={`py-1.5 px-3 font-bold ${done ? 'text-slate-400 line-through italic' : 'text-black'}`}>
                                                                            <div className="truncate max-w-[220px]" title={text}>{text}</div>
                                                                            <div className="flex items-center gap-2 text-[7px] font-bold text-slate-500 uppercase tracking-tighter">
                                                                                {iss.towerName && <span>{iss.towerName}</span>}
                                                                                {iss.assignee_name && <span>· {iss.assignee_name}</span>}
                                                                                {dayOnly(iss.raised_on) === reportDate && <span className="text-black">· Raised this day</span>}
                                                                                {iss.mom_point_id && <span className="text-violet-700">· MoM #{iss.mom_point_id}</span>}
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-1.5 px-3 text-right align-top"><StatusBadge status={done ? 'Closed' : 'Open'} /></td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </>
                                                    );
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* FOURTH ROW: Actions (Full Width) */}
                            <div className="col-span-12">
                                <div className="bg-white rounded-none overflow-hidden border border-black flex flex-col h-full">
                                    <div className="px-4 py-1.5 border-b border-black bg-zinc-800 text-white flex items-center justify-between">
                                        <h3 className="text-[9px] font-black text-white uppercase tracking-widest">Actions & Observations</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 border-b border-black/10">
                                                <tr className="text-[8px] font-bold text-black uppercase tracking-widest">
                                                    <th className="py-1.5 px-3">Description</th>
                                                    <th className="py-1.5 px-2 text-center">Att</th>
                                                    <th className="py-1.5 px-3 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5">
                                                {(() => {
                                                    /* What this report actually spoke to: points raised on the
                                                       day, and points still open at the time. A closed point
                                                       from three weeks ago is history, not this day's news. */
                                                    const all = formData?.other_issues || [];
                                                    const shown = all.filter((x: any) => {
                                                        const closed = ['closed', 'fixed'].includes(String(x.status || 'open').toLowerCase());
                                                        const raisedHere = dayOnly(x.raised_on) === reportDate;
                                                        return raisedHere || !closed;
                                                    });
                                                    if (shown.length === 0) {
                                                        return <tr><td colSpan={4} className="py-6 text-center text-black italic text-[10px]">
                                                            Nothing raised or outstanding on this day.
                                                        </td></tr>;
                                                    }
                                                    return shown.map((iss: any, i: number) => {
                                                    const isClosed = ['closed', 'fixed'].includes(String(iss.status || 'open').toLowerCase());
                                                    const raisedHere = dayOnly(iss.raised_on) === reportDate;
                                                    return (
                                                        <tr key={i} className="text-[9px] hover:bg-slate-50 transition-colors">
                                                            <td className={`py-2 px-3 align-top ${isClosed ? 'text-slate-400 italic' : 'text-black'}`}>
                                                                <div className={`font-bold text-[10px] leading-snug ${isClosed ? 'line-through' : ''}`}>
                                                                    {iss.description || iss.issue}
                                                                    {raisedHere && (
                                                                        <span className="ml-1.5 px-1 py-0.5 bg-black text-white text-[6px] font-black uppercase tracking-widest align-middle">
                                                                            Raised today
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                                    {iss.reviewer_name && (
                                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-[7px] font-black uppercase tracking-tighter">
                                                                            <User size={8} /> REV: {iss.reviewer_name}
                                                                        </div>
                                                                    )}
                                                                    {iss.assignments?.map((a: any, idx: number) => {
                                                                        const type = a.type || a.assignee_type;
                                                                        const name = a.name || a.assignee_name;
                                                                        if (!name) return null;
                                                                        return (
                                                                            <div key={idx} className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 text-slate-800 border border-slate-300 text-[7px] font-black uppercase tracking-tighter">
                                                                                {type === 'department' ? <Building size={8} className="text-blue-600" /> : <User size={8} className="text-emerald-600" />}
                                                                                {name}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {iss.attachments?.map((f: any, idx: number) => (
                                                                        <div key={idx} className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[7px] font-black uppercase tracking-tighter">
                                                                            <Paperclip size={8} /> {f.file_name}
                                                                        </div>
                                                                    ))}
                                                                    {iss.new_attachments?.map((f: any, idx: number) => (
                                                                        <div key={`new-${idx}`} className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[7px] font-black uppercase tracking-tighter">
                                                                            <Paperclip size={8} /> {f.name} (NEW)
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="py-2 px-2 text-center align-top opacity-0">
                                                                {/* Column reserved for spacing/icons if needed */}
                                                            </td>
                                                            <td className="py-2 px-3 text-right align-top"><StatusBadge status={iss.status} /></td>
                                                        </tr>
                                                    );
                                                    });
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* z-140: above the view-all sheet (z-120), which can open this. At
                        z-100 the revision log rendered behind that overlay and the
                        history button read as dead. */}
                    {showHistoryModal && (
                        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 font-sans">
                            <div className="bg-white rounded-none shadow-2xl w-full max-w-lg overflow-hidden border border-black">
                                <div className="bg-black p-6 text-white flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <History size={20} />
                                        <div>
                                            <h3 className="text-sm font-black tracking-tight">Revision History</h3>
                                            <p className="text-[8px] font-bold text-white uppercase tracking-widest mt-0.5">Target Log</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowHistoryModal(false)} className="p-1.5 hover:bg-white/10 rounded-none transition-colors">
                                        <XCircle size={18} />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto bg-slate-50">
                                    {(() => {
                                        /* Look across every milestone, not just the ones due on the
                                           reported day. The History button is also reachable from the
                                           view-all list, and from there the lookup missed — which is
                                           why Achieved and Target Date came up blank. */
                                        const targetInSubmitted = (formData?.monthly_schedule_today || []).find((t: any) => String(t.id) === String(showHistoryModal));
                                        const target =
                                            targetInSubmitted ||
                                            (daysMilestones as any[]).find((t: any) => String(t.id) === String(showHistoryModal)) ||
                                            (allMilestones as any[]).find((t: any) => String(t.id) === String(showHistoryModal));

                                        // The form writes `achieved`; older rows carry `is_achieved`.
                                        const targetAchieved = target
                                            ? (target.isAchieved === true || target.isAchieved === 'Yes' ||
                                               target.is_achieved === true || target.is_achieved === 'Yes' ||
                                               target.achieved === true ? 'Yes' : 'No')
                                            : '—';

                                        const latestHistoryRev = (targetHistory && targetHistory.length > 0) ? targetHistory[0]?.revised_date : null;
                                        const latestReason = target?.missed_reason || (targetHistory && targetHistory.length > 0 ? targetHistory[0]?.reason : null);

                                        const targetDate = formatDate(
                                            latestHistoryRev ||
                                            target?.revised_date || target?.new_target_date ||
                                            target?.target_date || target?.planned_date || target?.planned_target_date
                                        );
                                        return (
                                            <div className="relative pl-6 border-l border-black space-y-6">
                                                <div className="relative">
                                                    <div className="absolute -left-[27px] top-1 w-2 h-2 rounded-none bg-black border border-white" />
                                                    <p className="text-[10px] font-black text-black uppercase tracking-widest mb-1">Current Status</p>
                                                    <div className="bg-white p-3 border border-black text-[11px] font-bold">
                                                        <div className="flex justify-between mb-1">
                                                            <span>Achieved:</span>
                                                            <span className={targetAchieved === 'Yes' ? 'text-emerald-700' : 'text-rose-700'}>{targetAchieved}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Target Date:</span>
                                                            <span className="font-black text-blue-600">{targetDate || '—'}</span>
                                                        </div>
                                                        {latestReason && (
                                                            <div className="mt-2 text-[9px] text-rose-600 uppercase">
                                                                Reason: {latestReason}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="relative">
                                                    <div className="absolute -left-[27px] top-1 w-2 h-2 rounded-none bg-slate-200 border border-black" />
                                                    <p className="text-[10px] font-black text-black uppercase tracking-widest mb-1">Historical Log</p>
                                                    <div className="space-y-3">
                                                        {targetHistory.length > 0 ? (
                                                            targetHistory.map((h: any, idx: number) => (
                                                                <div key={idx} className="bg-white p-3 border border-black/10 text-[10px] space-y-1">
                                                                    <div className="flex justify-between items-center text-black text-[8px] uppercase font-black mb-1">
                                                                        <span>Revised on {formatDate(h.created_at)}</span>
                                                                        <span>By {h.created_by_name || 'System'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="font-bold">New Target:</span>
                                                                        <span className="font-black text-blue-600">{formatDate(h.revised_date)}</span>
                                                                    </div>
                                                                    {h.reason && (
                                                                        <div className="pt-1 border-t border-black/5">
                                                                            <span className="text-black/50 font-bold italic">"{h.reason}"</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-[11px] font-medium text-black/40 italic">No previous revisions detected in this instance.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="p-6 border-t border-black bg-white">
                                    <button
                                        onClick={() => setShowHistoryModal(false)}
                                        className="w-full py-3 bg-black hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-none transition-all"
                                    >
                                        Close Log
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Every milestone in the schedule, not just the day's — the card
                deliberately shows only what that report spoke to, and this is
                where the rest of the plan lives. */}
            {showAllMilestones && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white w-full max-w-3xl max-h-[85vh] flex flex-col border border-black">
                        <div className="px-4 py-3 border-b border-black flex items-center justify-between">
                            <div>
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-black">All schedule milestones</h3>
                                <p className="text-[9px] font-bold text-slate-500">{allMilestones.length} in this schedule</p>
                            </div>
                            <button onClick={() => setShowAllMilestones(false)} className="text-black hover:opacity-60 text-lg leading-none">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-black sticky top-0">
                                    <tr className="text-[8px] font-black uppercase tracking-widest text-black">
                                        <th className="py-2 px-3">Tower / Level</th>
                                        <th className="py-2 px-3">Purpose</th>
                                        <th className="py-2 px-3">Target</th>
                                        <th className="py-2 px-3">Status</th>
                                        <th className="py-2 px-3 text-center">Log</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/10">
                                    {allMilestones.length === 0 ? (
                                        <tr><td colSpan={5} className="py-8 text-center text-[11px] italic text-black">No milestones in this schedule.</td></tr>
                                    ) : allMilestones.map((m: any, i: number) => {
                                        const original = dayOnly(m.target_date || m.planned_target_date);
                                        const revised = dayOnly(m.revised_date || m.new_target_date);
                                        const target = revised || original;
                                        const done = m.achieved === true || m.isAchieved === true || m.isAchieved === 'Yes'
                                            || m.is_achieved === true || m.is_achieved === 'Yes';
                                        const overdue = !done && target && target < reportDate;
                                        const reason = m.missed_reason || m.delay_reason;
                                        return (
                                            <tr key={i} className="text-[10px]">
                                                <td className="py-1.5 px-3">
                                                    <div className="font-bold text-black">{m.tower_name || m.towerName || m.tower_id || 'Site'}</div>
                                                    <div className="text-[8px] font-bold text-slate-500 uppercase">{m.floor || '-'}</div>
                                                </td>
                                                <td className="py-1.5 px-3 text-black">{m.purpose || '-'}</td>
                                                <td className="py-1.5 px-3 text-black tabular-nums">
                                                    {target || '-'}
                                                    {/* A revision is only legible next to what it replaced. */}
                                                    {revised && original && revised !== original && (
                                                        <div className="text-[8px] font-bold text-slate-400 line-through">{original}</div>
                                                    )}
                                                    {reason && (
                                                        <div className="text-[8px] font-bold text-rose-600 italic truncate max-w-[160px]" title={reason}>{reason}</div>
                                                    )}
                                                </td>
                                                <td className="py-1.5 px-3">
                                                    <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${done ? 'bg-emerald-100 text-emerald-700'
                                                        : overdue ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {done ? 'Achieved' : overdue ? 'Overdue' : 'Upcoming'}
                                                    </span>
                                                    {done && dayOnly(m.achieved_date) && (
                                                        <div className="text-[8px] font-bold text-emerald-700 mt-0.5">on {dayOnly(m.achieved_date)}</div>
                                                    )}
                                                </td>
                                                {/* Same revision log the dashboard row opens. */}
                                                <td className="py-1.5 px-3 text-center">
                                                    {m.id ? (
                                                        <button
                                                            onClick={() => setShowHistoryModal(m.id)}
                                                            title="Revision history"
                                                            className="text-black hover:opacity-60"
                                                        >
                                                            <History size={12} />
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DpsPlanningDashboard;
