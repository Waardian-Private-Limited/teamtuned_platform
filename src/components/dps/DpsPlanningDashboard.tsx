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

    // Helper for Table Status badges
    const StatusBadge = ({ status }: { status: string }) => {
        const s = status?.trim().toLowerCase();
        let colorClass = 'bg-slate-500 text-white border-black'; // Default gray

        if (s === 'open' || s === 'assigned' || s === 'unassigned') colorClass = 'bg-blue-600 text-white border-black';
        if (s === 'acknowledged') colorClass = 'bg-amber-500 text-white border-black';
        if (s === 'completed' || s === 'approved' || s === 'closed' || s === 'achieved') colorClass = 'bg-emerald-600 text-white border-black';
        if (s === 'rejected' || s === 'missed') colorClass = 'bg-rose-600 text-white border-black';
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
            link.setAttribute('download', `${latestSubmission.form_type}_report_${selectedDate}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
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
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
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
                                                    <th className="py-1.5 px-2 text-center">Act</th>
                                                    <th className="py-1.5 px-2 text-center">WO</th>
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
                                                                {isNew && <span className="text-[6px] font-black text-amber-600 uppercase tracking-tighter">New Requirement</span>}
                                                            </td>
                                                            <td className="py-1.5 px-2 text-center text-black">{s.planned || 0}</td>
                                                            <td className="py-1.5 px-2 text-center font-black text-black">{s.actual || 0}</td>
                                                            <td className="py-1.5 px-2 text-center text-black font-medium">{s.required_wo || '-'}</td>
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
                                                    <td className="py-1.5 px-2 text-center text-black">{formData?.staff?.reduce((a: number, c: any) => a + (Number(c.required_wo) || 0), 0)}</td>
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
                                        </div>
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
                                                {formData?.monthly_schedule_today?.length > 0 ? (
                                                    formData.monthly_schedule_today.map((item: any, i: number) => {
                                                        const isAchieved = item.isAchieved === true || item.isAchieved === 'Yes' || item.is_achieved === 'Yes' || item.achieved === true;
                                                        let status = 'Pending';
                                                        if (isAchieved) {
                                                            status = 'Achieved';
                                                        } else {
                                                            const targetDateStr = item.revised_date || item.new_target_date || item.planned_date || item.target_date || item.planned_target_date;
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

                                                        const delayReason = item.missed_reason || item.delay_reason;
                                                        const revisedDate = item.revised_date || item.new_target_date;
                                                        const achievedDate = item.achievedDate || item.achieved_date;

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
                                                                            {revisedDate && <span className="ml-1 text-black font-black"> → NEW TARGET: {revisedDate}</span>}
                                                                        </div>
                                                                    )}
                                                                    {!delayReason && revisedDate && (
                                                                        <div className="text-[8px] font-black text-blue-600 mt-0.5">
                                                                            NEW TARGET: {revisedDate}
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
                                                    <tr><td colSpan={4} className="py-6 text-center text-black font-medium italic text-xs">No targets scheduled.</td></tr>
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
                                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-black/20 scrollbar-track-slate-50">
                                        {(() => {
                                            const lData = formData?.labor || [];
                                            const towerList = Array.from(new Set(lData.map((l: any) => l.towerName || l.tower_name || l.towerId || l.tower_id || l.location || l.tower || 'Overall'))).sort();
                                            const categoryList = Array.from(new Set(lData.map((l: any) => l.type || l.name))).sort();

                                            return (
                                                <table className="w-full text-left border-collapse min-w-max">
                                                    <thead>
                                                        <tr className="bg-slate-100 border-b border-black">
                                                            <th className="py-2 px-3 border-r border-black/20 text-[9px] font-black uppercase text-black sticky left-0 bg-slate-100 z-10 w-40">Category</th>
                                                            {towerList.map(t => (
                                                                <th key={String(t)} colSpan={3} className="py-2 px-2 border-r border-black/20 text-center text-[8px] font-black uppercase text-black bg-slate-50/50">
                                                                    {String(t)}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                        <tr className="bg-slate-50 border-b border-black/10 text-[7px] font-black uppercase text-black tracking-tighter">
                                                            <th className="py-1 px-3 border-r border-black/20 sticky left-0 bg-slate-50 z-10">---</th>
                                                            {towerList.map(t => (
                                                                <React.Fragment key={String(t)}>
                                                                    <th className="py-1 px-1 text-center w-10">Pln</th>
                                                                    <th className="py-1 px-1 text-center w-10">Act</th>
                                                                    <th className="py-1 px-1 text-center w-10 border-r border-black/20">Var</th>
                                                                </React.Fragment>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-black/10">
                                                        {categoryList.map(cat => {
                                                            let rowPlnTotal = 0;
                                                            let rowActTotal = 0;

                                                            return (
                                                                <tr key={String(cat)} className="text-[10px] hover:bg-slate-50 transition-colors">
                                                                    <td className="py-1.5 px-3 font-bold text-black border-r border-black/10 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{String(cat)}</td>
                                                                    {towerList.map(t => {
                                                                        const entry = lData.find((l: any) => (l.type === cat || l.name === cat) && (l.towerName === t || l.tower_name === t || l.towerId === t || l.tower_id === t || l.location === t || l.tower === t));
                                                                        const pln = Number(entry?.planned) || 0;
                                                                        const act = Number(entry?.actual) || 0;
                                                                        const varc = act - pln;

                                                                        return (
                                                                            <React.Fragment key={String(t)}>
                                                                                <td className="py-1.5 px-1 text-center text-black bg-slate-50/20">{pln || '-'}</td>
                                                                                <td className="py-1.5 px-1 text-center font-black text-black">{act || '-'}</td>
                                                                                <td className={`py-1.5 px-1 text-center font-black border-r border-black/5 ${varc !== 0 ? 'text-rose-600 bg-rose-50/30' : 'text-black'}`}>
                                                                                    {varc !== 0 ? Math.abs(varc) : '-'}
                                                                                </td>
                                                                            </React.Fragment>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                    <tfoot className="bg-zinc-800 text-white font-black text-[9px] uppercase tracking-wider">
                                                        <tr className="border-t border-black">
                                                            <td className="py-2 px-3 sticky left-0 bg-zinc-900 z-10">GRAND TOTAL</td>
                                                            {towerList.map(t => {
                                                                const towerPln = lData.filter((l: any) => (l.towerName === t || l.tower_name === t || l.towerId === t || l.tower_id === t || l.location === t || l.tower === t)).reduce((a: number, c: any) => a + (Number(c.planned) || 0), 0);
                                                                const towerAct = lData.filter((l: any) => (l.towerName === t || l.tower_name === t || l.towerId === t || l.tower_id === t || l.location === t || l.tower === t)).reduce((a: number, c: any) => a + (Number(c.actual) || 0), 0);
                                                                return (
                                                                    <React.Fragment key={String(t)}>
                                                                        <td className="py-2 px-1 text-center opacity-100">{towerPln}</td>
                                                                        <td className="py-2 px-1 text-center text-white">{towerAct}</td>
                                                                        <td className={`py-2 px-1 text-center border-r border-white/10 opacity-100 ${towerAct - towerPln !== 0 ? 'text-rose-400' : 'text-white/50'}`}>{towerAct - towerPln !== 0 ? Math.abs(towerAct - towerPln) : 0}</td>
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            );
                                        })()}
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
                                                {formData?.equipments?.map((eq: any, i: number) => (
                                                    <tr key={i} className="text-[9px] hover:bg-slate-50 transition-colors">
                                                        <td className="py-2 px-3 align-top">
                                                            <div className="font-bold text-black">{eq.type}</div>
                                                            {eq.remark && (
                                                                <div className="text-[7px] text-slate-500 italic mt-0.5 flex items-center gap-1">
                                                                    <MessageSquare size={7} /> {eq.remark}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-2 text-center align-top">
                                                            {eq.status && (
                                                                <span className={`px-1 py-0.5 text-[6px] font-black uppercase border shrink-0 ${eq.status === 'Breakdown' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                                    'bg-amber-50 text-amber-600 border-amber-200'
                                                                    }`}>
                                                                    {eq.status}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-3 text-right align-top whitespace-nowrap">
                                                            <span className="font-black text-black">{eq.actual}</span>
                                                            <span className="text-black/40 ml-0.5">/{eq.planned}</span>
                                                        </td>
                                                    </tr>
                                                ))}
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
                                                {formData?.priority_materials?.map((m: any, i: number) => (
                                                    <tr key={i} className="text-[9px] hover:bg-slate-50 transition-colors">
                                                        <td className="py-1.5 px-3 font-bold text-black">{m.name}</td>
                                                        <td className="py-1.5 px-2 text-center text-black font-semibold">{m.requiredDate}</td>
                                                        <td className="py-1.5 px-3 text-right font-black text-black">{m.quantity}</td>
                                                    </tr>
                                                ))}
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
                                                {formData?.safety_quality?.detailed_issues?.map((iss: any, i: number) => {
                                                    const isClosed = iss.status?.toLowerCase() === 'closed';
                                                    return (
                                                        <tr key={i} className="text-[9px] hover:bg-slate-50 transition-colors">
                                                            <td className={`py-1.5 px-3 font-bold truncate max-w-[200px] ${isClosed ? 'text-slate-400 line-through italic' : 'text-black'}`}>
                                                                {iss.issue}
                                                            </td>
                                                            <td className="py-1.5 px-3 text-right"><StatusBadge status={iss.status} /></td>
                                                        </tr>
                                                    );
                                                })}
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
                                                {formData?.other_issues?.map((iss: any, i: number) => {
                                                    const isClosed = iss.status?.toLowerCase() === 'closed';
                                                    return (
                                                        <tr key={i} className="text-[9px] hover:bg-slate-50 transition-colors">
                                                            <td className={`py-2 px-3 align-top ${isClosed ? 'text-slate-400 italic' : 'text-black'}`}>
                                                                <div className={`font-bold text-[10px] leading-snug ${isClosed ? 'line-through' : ''}`}>
                                                                    {iss.description || iss.issue}
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
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {showHistoryModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 font-sans">
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
                                        const target = formData?.monthly_schedule_today?.find((t: any) => t.id === showHistoryModal);
                                        return (
                                            <div className="relative pl-6 border-l border-black space-y-6">
                                                <div className="relative">
                                                    <div className="absolute -left-[27px] top-1 w-2 h-2 rounded-none bg-black border border-white" />
                                                    <p className="text-[10px] font-black text-black uppercase tracking-widest mb-1">Current Status</p>
                                                    <div className="bg-white p-3 border border-black text-[11px] font-bold">
                                                        <div className="flex justify-between mb-1">
                                                            <span>Achieved:</span>
                                                            <span className={target?.is_achieved === 'Yes' ? 'text-emerald-700' : 'text-rose-700'}>{target?.is_achieved}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Target Date:</span>
                                                            <span>{formatDate(target?.new_target_date || target?.planned_date || target?.target_date)}</span>
                                                        </div>
                                                        {target?.missed_reason && (
                                                            <div className="mt-2 text-[9px] text-rose-600 uppercase">
                                                                Reason: {target.missed_reason}
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
        </div>
    );
};

export default DpsPlanningDashboard;
