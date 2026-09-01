"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import {
    Calendar, MapPin, Loader2, Target, Truck, Package, ShieldCheck,
    AlertCircle, CheckCircle2, XCircle, Info, ChevronRight,
    CircleDot, Wrench, FileText, ClipboardCheck, UserCheck, Download, ChevronDown, FileSpreadsheet, FileDown, Paperclip
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';

interface SiteConfig {
    site_id: number;
    total_concrete_planned: number;
    concrete_cumulative_till_date: number;
    towers?: any[];
}

interface CbdStats {
    totalSteelReceived: number;
    totalSteelBilled: number;
    totalSteelWIP: number;
    totalDocumentsRequired: number;
    totalDocumentsSubmitted: number;
}

const formatDate = (dateString: string) => {
    try {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateString;
    }
};

const StatusBadge = ({ status }: { status: string }) => {
    const s = status?.toLowerCase();
    let colorClass = 'bg-amber-500 text-white border-black';
    if (s === 'yes' || s === 'achieved' || s === 'submitted') colorClass = 'bg-emerald-600 text-white border-black';
    if (s === 'no' || s === 'missed') colorClass = 'bg-rose-600 text-white border-black';
    if (s === 'pending') colorClass = 'bg-slate-700 text-white border-black';

    return (
        <span className={`px-2 py-0.5 rounded-none text-[8px] font-black uppercase tracking-wider border ${colorClass}`}>
            {status}
        </span>
    );
};

export default function DpsCbdDashboard() {
    const { role } = useAuth();
    const isPowerUser = ['orgadmin', 'superadmin', 'admin', 'system_admin'].includes((role || '').toLowerCase());

    const [loading, setLoading] = useState(true);
    const [sites, setSites] = useState<any[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
    const [latestSubmission, setLatestSubmission] = useState<any>(null);
    const [stats, setStats] = useState<CbdStats>({
        totalSteelReceived: 0,
        totalSteelBilled: 0,
        totalSteelWIP: 0,
        totalDocumentsRequired: 0,
        totalDocumentsSubmitted: 0
    });

    const [steelTrendData, setSteelTrendData] = useState<any[]>([]);
    const [concreteReconData, setConcreteReconData] = useState<any[]>([]);
    const [towerWiseReconData, setTowerWiseReconData] = useState<any[]>([]);
    const [documentComplianceData, setDocumentComplianceData] = useState<any[]>([]);
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
        fetchSites();
    }, []);

    // 2. Fetch Data
    useEffect(() => {
        if (!selectedSiteId) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Site Config
                const configRes = await apiClient<any>(`/dps-schedule/${selectedSiteId}/config`, { method: 'GET', withAuth: true });
                setSiteConfig(configRes.config);

                // Fetch All Submissions for Trends & Aggregates
                const params = new URLSearchParams({
                    siteId: selectedSiteId,
                    formType: 'cbd',
                    limit: '500' // Get a good chunk for trends
                });
                const response = await apiClient<any>(`/dps-schedule/dynamic-assignments?${params.toString()}`, { method: 'GET', withAuth: true });
                const submissions = response?.data || response || [];

                // Find Latest Submission for the selected date
                // The day reported on, not the day the form was raised — they
                // differ whenever a report is filled late.
                const dayOf = (x: any) => (x.report_date || x.due_date || '').split('T')[0];
                const submissionForDate = submissions.find((s: any) => dayOf(s) === selectedDate);
                setLatestSubmission(submissionForDate || null);

                // Process Trends (Aggregates)
                const sTrend: any[] = [];
                const cReconTrend: any[] = [];
                const towerReconMap: Record<string, { name: string, theoretical: number, consumed: number }> = {};
                const docMap: Record<string, { name: string, required: number, submitted: number }> = {};

                let steelRec = 0, steelBill = 0, steelWIP = 0;
                let docsReq = 0, docsSub = 0;

                submissions.sort((a: any, b: any) => new Date(dayOf(a)).getTime() - new Date(dayOf(b)).getTime());

                submissions.forEach((sub: any) => {
                    if (sub.status === 'pending') return;
                    const subDate = dayOf(sub);
                    if (subDate > selectedDate) return; // Only process up to selected date

                    const data = sub.submitted_data;
                    if (!data) return;

                    const formattedDate = new Date(dayOf(sub)).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });

                    // Steel
                    if (data.steel_reconciliation) {
                        const r = parseFloat(data.steel_reconciliation.total_received) || 0;
                        const b = parseFloat(data.steel_reconciliation.total_billed) || 0;
                        const w = parseFloat(data.steel_reconciliation.wip_steel) || 0;
                        steelRec += r;
                        steelBill += b;
                        steelWIP += w;
                        sTrend.push({ date: formattedDate, received: r, billed: b, wip: w });
                    }

                    // Documents
                    if (data.documents_client_bill && Array.isArray(data.documents_client_bill)) {
                        docsReq += data.documents_client_bill.length;
                        docsSub += data.documents_client_bill.filter((d: any) => d.status === 'Yes').length;
                        data.documents_client_bill.forEach((doc: any) => {
                            const dName = doc.document_name || 'General';
                            if (!docMap[dName]) docMap[dName] = { name: dName, required: 0, submitted: 0 };
                            docMap[dName].required++;
                            if (doc.status === 'Yes') docMap[dName].submitted++;
                        });
                    }

                    // Concrete Reconciliation
                    if (data.concrete_reconciliation && Array.isArray(data.concrete_reconciliation)) {
                        let dTheo = 0, dCons = 0;
                        data.concrete_reconciliation.forEach((item: any) => {
                            const t = parseFloat(item.theoretical) || 0;
                            const c = parseFloat(item.consumed) || 0;
                            dTheo += t; dCons += c;
                            const rName = item.region || 'Site';
                            if (!towerReconMap[rName]) towerReconMap[rName] = { name: rName, theoretical: 0, consumed: 0 };
                            towerReconMap[rName].theoretical += t;
                            towerReconMap[rName].consumed += c;
                        });
                        cReconTrend.push({ date: formattedDate, theoretical: dTheo, consumed: dCons, variance: dCons - dTheo });
                    }
                });

                setStats({
                    totalSteelReceived: steelRec,
                    totalSteelBilled: steelBill,
                    totalSteelWIP: steelWIP,
                    totalDocumentsRequired: docsReq,
                    totalDocumentsSubmitted: docsSub
                });
                setSteelTrendData(sTrend.slice(-10)); // Last 10 days ending at selected date
                setConcreteReconData(cReconTrend.slice(-10));
                setTowerWiseReconData(Object.values(towerReconMap));
                setDocumentComplianceData(Object.values(docMap));

            } catch (error) {
                console.error("Failed to fetch CBD data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedSiteId, selectedDate]);

    // Backend Export Logic
    const handleExport = async (format: 'pdf' | 'excel') => {
        if (!latestSubmission?.id) return;

        try {
            const url = `/dps-schedule/dynamic-assignments/${latestSubmission.id}/export?format=${format}`;
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

    const formData = latestSubmission?.submitted_data || null;

    if (loading && !sites.length) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-white">
                <Loader2 className="animate-spin text-black" size={32} />
                <p className="text-black font-bold uppercase tracking-widest text-xs">Loading CBD Analytics...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 px-4 md:px-6 pt-0 pb-6 space-y-3 max-w-[1600px] mx-auto font-sans antialiased text-black">
            {/* Minimal Square Header */}
            <header className="flex flex-col md:flex-row justify-between items-center gap-2 py-1 bg-white border-b border-black mb-2 -mx-4 md:-mx-6 px-4 md:px-6">
                <div className="flex items-baseline gap-2">
                    <h1 className="text-sm font-black tracking-tighter text-black uppercase">CBD ANALYTICS</h1>
                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-black">Client Bill & Reconciliation</span>
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
                    <p className="font-bold uppercase tracking-widest text-[9px]">Fetching CBD Data...</p>
                </div>
            ) : !latestSubmission ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white border border-black rounded-none">
                    <div className="bg-slate-50 p-4 rounded-none border border-black mb-4">
                        <AlertCircle size={32} className="text-black" />
                    </div>
                    <h2 className="text-lg font-black text-black">No CBD Data Found</h2>
                    <p className="font-bold mt-1 text-xs text-black">No CBD Report has been submitted for the selected date and site.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* CUMULATIVE PERFORMANCE (GRAND TOTALS) */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-black text-white p-4 rounded-none flex flex-col justify-between">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">TOTAL STEEL RECEIVED</span>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-2xl font-black">{stats.totalSteelReceived.toFixed(1)}</span>
                                <span className="text-[10px] font-bold opacity-60 uppercase">MT</span>
                            </div>
                        </div>
                        <div className="bg-white border border-black p-4 rounded-none flex flex-col justify-between">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-600">TOTAL STEEL BILLED</span>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-2xl font-black text-purple-600">{stats.totalSteelBilled.toFixed(1)}</span>
                                <span className="text-[10px] font-bold text-purple-600 uppercase">MT</span>
                            </div>
                        </div>
                        <div className="bg-white border border-black p-4 rounded-none flex flex-col justify-between">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-600">DOC COMPLIANCE SCORE</span>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-2xl font-black text-emerald-600">
                                    {stats.totalDocumentsRequired > 0 ? ((stats.totalDocumentsSubmitted / stats.totalDocumentsRequired) * 100).toFixed(0) : 0}%
                                </span>
                                <span className="text-[10px] font-bold text-black opacity-40 italic">{stats.totalDocumentsSubmitted}/{stats.totalDocumentsRequired}</span>
                            </div>
                        </div>
                        <div className="bg-white border border-black p-4 rounded-none flex flex-col justify-between">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-600">TOTAL WIP STEEL</span>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-2xl font-black text-amber-600">{stats.totalSteelWIP.toFixed(2)}</span>
                                <span className="text-[10px] font-bold text-amber-600 uppercase">MT</span>
                            </div>
                        </div>
                    </div>

                    {/* PRIMARY SECTION: BILLING DEADLINES & STEEL RECONCILIATION */}
                    <div className="grid grid-cols-12 gap-4">
                        {/* Billing Deadlines Card */}
                        <div className="col-span-12 lg:col-span-4 bg-white border border-black rounded-none p-4 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[9px] font-black text-black uppercase tracking-[0.2em]">BILLING DEADLINES</h3>
                                    <div className="w-6 h-6 rounded-none bg-black flex items-center justify-center text-white">
                                        <Calendar size={14} strokeWidth={3} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-purple-50 border border-purple-200">
                                            <p className="text-[7px] font-black text-purple-600 uppercase tracking-widest mb-1">CLIENT TARGET</p>
                                            <p className="text-[11px] font-black text-black">{formData?.billing_targets?.client_target_date ? formatDate(formData.billing_targets.client_target_date) : '---'}</p>
                                        </div>
                                        <div className="p-3 bg-emerald-50 border border-emerald-200">
                                            <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-1">CLIENT ACHIEVED</p>
                                            <p className="text-[11px] font-black text-black">{formData?.billing_targets?.client_achieved_date ? formatDate(formData.billing_targets.client_achieved_date) : 'PENDING'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-orange-50 border border-orange-200">
                                            <p className="text-[7px] font-black text-orange-600 uppercase tracking-widest mb-1">CONTRACTOR TARGET</p>
                                            <p className="text-[11px] font-black text-black">{formData?.billing_targets?.contractor_target_date ? formatDate(formData.billing_targets.contractor_target_date) : '---'}</p>
                                        </div>
                                        <div className="p-3 bg-blue-50 border border-blue-200">
                                            <p className="text-[7px] font-black text-blue-600 uppercase tracking-widest mb-1">CONTRACTOR ACHIEVED</p>
                                            <p className="text-[11px] font-black text-black">{formData?.billing_targets?.contractor_achieved_date ? formatDate(formData.billing_targets.contractor_achieved_date) : 'PENDING'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-black/10">
                                <p className="text-[8px] font-bold text-black/40 uppercase italic">* Data reflected from latest CBD Submission</p>
                            </div>
                        </div>

                        {/* Steel Reconciliation Overview */}
                        <div className="col-span-12 lg:col-span-8 bg-white border border-black rounded-none flex flex-col">
                            <div className="px-4 py-2 border-b border-black bg-slate-50 flex justify-between items-center">
                                <h3 className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-2">
                                    <Truck size={12} className="text-black" />
                                    Steel Reconciliation status
                                </h3>
                                <div className="text-[9px] font-black text-black">MT (METRIC TONS)</div>
                            </div>
                            <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                                {[
                                    { label: 'RECEIVED', val: formData?.steel_reconciliation?.total_received, color: 'text-black' },
                                    { label: 'BILLED', val: formData?.steel_reconciliation?.total_billed, color: 'text-purple-600' },
                                    { label: 'WIP', val: formData?.steel_reconciliation?.wip_steel, color: 'text-amber-600' },
                                    { label: 'JMR TOTAL', val: formData?.steel_reconciliation?.jmr_total, color: 'text-black' },
                                    { label: 'STOCK', val: formData?.steel_reconciliation?.total_stock, color: 'text-emerald-700' },
                                    { label: 'SCRAP', val: formData?.steel_reconciliation?.total_scrap, color: 'text-rose-700' },
                                    { label: '% WASTAGE', val: formData?.steel_reconciliation?.wastage_percent + '%', color: 'text-rose-600', isPercent: true },
                                ].map((item, i) => (
                                    <div key={i} className="border border-black p-2 flex flex-col justify-center items-center text-center">
                                        <p className="text-[7px] font-black text-black/50 uppercase mb-1 tracking-tighter">{item.label}</p>
                                        <p className={`text-sm font-black ${item.color}`}>{item.val ?? '0'}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Steel Trends Mini-Chart */}
                            <div className="flex-1 px-4 pb-2">
                                <div className="h-32 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={steelTrendData}>
                                            <defs>
                                                <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#000" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#000" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                            <XAxis dataKey="date" hide />
                                            <YAxis hide />
                                            <Tooltip contentStyle={{ fontSize: '10px', fontWeight: 'bold', borderRadius: 0, border: '1px solid black' }} />
                                            <Area type="monotone" dataKey="received" stroke="#000" fillOpacity={1} fill="url(#colorRec)" strokeWidth={2} />
                                            <Area type="monotone" dataKey="billed" stroke="#9333ea" fillOpacity={0} strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-[8px] font-black uppercase text-black/40">10-Day Steel Flow Trend</p>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-black" /><span className="text-[8px] font-bold">Received</span></div>
                                        <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-purple-600" /><span className="text-[8px] font-bold">Billed</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CONCRETE RECONCILIATION SECTION (HORIZONTAL) */}
                    <div className="bg-white border border-black rounded-none flex flex-col">
                        <div className="px-4 py-2 border-b border-black bg-slate-50 flex justify-between items-center">
                            <h3 className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-2">
                                <CircleDot size={12} className="text-black" />
                                Daily Concrete Reconciliation
                            </h3>
                            <div className="text-[9px] font-black text-black">CUM (CUBIC METERS)</div>
                        </div>
                        <div className="p-4 flex flex-wrap gap-4 overflow-x-auto no-scrollbar">
                            {(formData?.concrete_reconciliation || []).map((item: any, idx: number) => (
                                <div key={idx} className="min-w-[280px] border border-black bg-white flex flex-col">
                                    <div className="px-3 py-1.5 border-b border-black bg-slate-50 flex justify-between items-center">
                                        <span className="text-[9px] font-black text-black uppercase">{item.region || 'REGION'}</span>
                                        <span className="text-[9px] font-black text-rose-600">{item.wastage_percent}% Wastage</span>
                                    </div>
                                    <div className="p-3 grid grid-cols-3 gap-2">
                                        <div className="text-center">
                                            <p className="text-[7px] font-black text-black/40 uppercase mb-0.5">THEO</p>
                                            <p className="text-[11px] font-black text-black">{item.theoretical || 0}</p>
                                        </div>
                                        <div className="text-center border-x border-black/10">
                                            <p className="text-[7px] font-black text-black/40 uppercase mb-0.5">CONS</p>
                                            <p className="text-[11px] font-black text-black">{item.consumed || 0}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[7px] font-black text-black/40 uppercase mb-0.5">DIFF</p>
                                            <p className={`text-[11px] font-black ${item.difference < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{item.difference || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!formData?.concrete_reconciliation || formData?.concrete_reconciliation.length === 0) && (
                                <div className="w-full py-8 text-center text-black/30 font-bold text-xs uppercase tracking-widest italic">No Tower/Region Data Reported</div>
                            )}
                        </div>
                    </div>

                    {/* CHECKLISTS & VENDORS ROW */}
                    <div className="grid grid-cols-12 gap-4">
                        {/* Report Checklist */}
                        <div className="col-span-12 lg:col-span-4 bg-white border border-black rounded-none flex flex-col">
                            <div className="px-4 py-2 border-b border-black bg-slate-50">
                                <h3 className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-2">
                                    <ClipboardCheck size={12} className="text-black" />
                                    Report Checklist
                                </h3>
                            </div>
                            <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {(formData?.report_checklist || []).map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-2 border-b border-black/5 last:border-0 hover:bg-slate-50">
                                        <span className="text-[9px] font-bold text-black uppercase">{item.description}</span>
                                        <div className="flex items-center gap-2">
                                            {['yes', 'achieved', 'submitted'].includes(item.status?.toLowerCase()) && item.attachments && item.attachments.length > 0 && (
                                                <div className="flex gap-1">
                                                    {item.attachments.map((file: any, idx: number) => (
                                                        <a
                                                            key={idx}
                                                            href={file.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title={file.file_name}
                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-blue-200 bg-blue-50/30"
                                                        >
                                                            <Paperclip size={10} />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                            <StatusBadge status={item.status} />
                                        </div>
                                    </div>
                                ))}
                                {(!formData?.report_checklist || formData?.report_checklist.length === 0) && (
                                    <p className="p-4 text-center text-[9px] font-bold text-black/40 uppercase">No items in checklist</p>
                                )}
                            </div>
                        </div>

                        {/* Documents For Client Bill */}
                        <div className="col-span-12 lg:col-span-3 bg-white border border-black rounded-none flex flex-col">
                            <div className="px-4 py-2 border-b border-black bg-slate-50">
                                <h3 className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={12} className="text-black" />
                                    Billing Documents
                                </h3>
                            </div>
                            <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {(formData?.documents_client_bill || []).map((doc: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-2 border-b border-black/5 last:border-0 hover:bg-slate-50">
                                        <span className="text-[9px] font-bold text-black uppercase truncate pr-2">{doc.document_name}</span>
                                        <div className="flex items-center gap-2">
                                            {['yes', 'achieved', 'submitted'].includes(doc.status?.toLowerCase()) && doc.attachments && doc.attachments.length > 0 && (
                                                <div className="flex gap-1">
                                                    {doc.attachments.map((file: any, idx: number) => (
                                                        <a
                                                            key={idx}
                                                            href={file.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title={file.file_name}
                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-blue-200 bg-blue-50/30"
                                                        >
                                                            <Paperclip size={10} />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                            <StatusBadge status={doc.status} />
                                        </div>
                                    </div>
                                ))}
                                {(!formData?.documents_client_bill || formData?.documents_client_bill.length === 0) && (
                                    <p className="p-4 text-center text-[9px] font-bold text-black/40 uppercase">No documents reported</p>
                                )}
                            </div>
                        </div>

                        {/* Vendor Registration Status */}
                        <div className="col-span-12 lg:col-span-5 bg-white border border-black rounded-none flex flex-col">
                            <div className="px-4 py-2 border-b border-black bg-slate-50">
                                <h3 className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-2">
                                    <UserCheck size={12} className="text-black" />
                                    Vendor Compliance Status
                                </h3>
                            </div>
                            <div className="p-0 overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-black">
                                        <tr className="text-[8px] font-black text-black uppercase tracking-widest">
                                            <th className="py-2 px-3">Vendor Name</th>
                                            <th className="py-2 px-2 text-center">Reg</th>
                                            <th className="py-2 px-2 text-center">WO</th>
                                            <th className="py-2 px-3 text-center">Closing</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5">
                                        {(formData?.vendor_registrations || []).map((v: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="py-2 px-3 text-[9px] font-bold text-black uppercase">{v.vendor_name}</td>
                                                <td className="py-2 px-2 text-center"><StatusBadge status={v.is_reg_form} /></td>
                                                <td className="py-2 px-2 text-center"><StatusBadge status={v.is_wo} /></td>
                                                <td className="py-2 px-3 text-center"><StatusBadge status={v.is_closing} /></td>
                                            </tr>
                                        ))}
                                        {(!formData?.vendor_registrations || formData?.vendor_registrations.length === 0) && (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-[9px] font-bold text-black/40 uppercase">No Vendors Reported</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* ANALYTICS TRENDS (CHARTS) */}
                    <div className="grid grid-cols-12 gap-4 pt-4">
                        <div className="col-span-12 lg:col-span-6 bg-white border border-black rounded-none p-4">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[10px] font-black text-black uppercase tracking-widest">Concrete Consumption Analytics</h3>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-600" /><span className="text-[8px] font-bold">Theo</span></div>
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500" /><span className="text-[8px] font-bold">Cons</span></div>
                                </div>
                            </div>
                            <div className="h-64 w-full">
                                {concreteReconData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={concreteReconData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                            <XAxis dataKey="date" axisLine={{ stroke: '#000' }} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                                            <YAxis axisLine={{ stroke: '#000' }} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                                            <Tooltip contentStyle={{ borderRadius: 0, border: '1px solid black', fontSize: '10px' }} />
                                            <Bar dataKey="consumed" fill="#f59e0b" barSize={20} />
                                            <Line type="monotone" dataKey="theoretical" stroke="#9333ea" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#9333ea', strokeWidth: 2 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full border border-dashed border-black/10 text-black/30 font-bold text-[9px] uppercase">Insufficient Data for Trends</div>
                                )}
                            </div>
                        </div>

                        <div className="col-span-12 lg:col-span-6 bg-white border border-black rounded-none p-4">
                            <h3 className="text-[10px] font-black text-black uppercase tracking-widest mb-6">Document Compliance Breakdown</h3>
                            <div className="h-64 w-full">
                                {documentComplianceData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={documentComplianceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                            <XAxis dataKey="name" axisLine={{ stroke: '#000' }} tick={{ fontSize: 8, fontWeight: 'bold' }} interval={0} />
                                            <YAxis axisLine={{ stroke: '#000' }} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                                            <Tooltip contentStyle={{ borderRadius: 0, border: '1px solid black', fontSize: '10px' }} />
                                            <Bar name="Required" dataKey="required" fill="#000" barSize={15} />
                                            <Bar name="Submitted" dataKey="submitted" fill="#10b981" barSize={15} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full border border-dashed border-black/10 text-black/30 font-bold text-[9px] uppercase">No documentation records found.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
