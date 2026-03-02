"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { Calendar, Filter, MapPin } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';

interface CbdStats {
    totalSteelReceived: number;
    totalSteelBilled: number;
    totalSteelWIP: number;
    totalDocumentsRequired: number;
    totalDocumentsSubmitted: number;
}

export default function DpsCbdDashboard() {
    const { role } = useAuth();
    const isOrgAdmin = (role || '').toLowerCase() === 'orgadmin';

    const [loading, setLoading] = useState(true);
    const [sites, setSites] = useState<any[]>([]);

    // Filters
    const [siteFilter, setSiteFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Data States
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

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                if (isOrgAdmin && sites.length === 0) {
                    const sData = await apiClient<any>('/dps-schedule/sites', {
                        method: 'GET',
                        withAuth: true
                    });
                    setSites(sData.sites || []);
                }

                // Construct query params
                const params = new URLSearchParams({
                    limit: '200',
                    formType: 'cbd'
                });

                if (siteFilter) params.append('siteId', siteFilter);
                if (dateFrom) params.append('dateFrom', dateFrom);
                if (dateTo) params.append('dateTo', dateTo);

                const response = await apiClient<any>(`/dps-schedule/dynamic-assignments?${params.toString()}`, {
                    method: 'GET',
                    withAuth: true
                });

                const submissions = response?.data || response || [];
                const sTrend: any[] = [];
                const cReconTrend: any[] = [];
                const towerReconMap: Record<string, { name: string, theoretical: number, consumed: number }> = {};
                const docMap: Record<string, { name: string, required: number, submitted: number }> = {};

                let steelRec = 0, steelBill = 0, steelWIP = 0;
                let docsReq = 0, docsSub = 0;

                // Use due_date for sorting and display
                submissions.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

                submissions.forEach((sub: any) => {
                    const data = sub.submitted_data || sub.dynamic_schema;
                    if (!data) return;

                    const formattedDate = new Date(sub.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                    // Steel
                    if (data.steel_reconciliation) {
                        const r = parseFloat(data.steel_reconciliation.total_received) || 0;
                        const b = parseFloat(data.steel_reconciliation.total_billed) || 0;
                        const w = parseFloat(data.steel_reconciliation.wip_steel) || 0;
                        steelRec += r;
                        steelBill += b;
                        steelWIP += w;

                        sTrend.push({
                            date: formattedDate,
                            received: r,
                            billed: b,
                            wip: w
                        });
                    }

                    // Documents
                    if (data.documents_client_bill && Array.isArray(data.documents_client_bill)) {
                        docsReq += data.documents_client_bill.length;
                        docsSub += data.documents_client_bill.filter((d: any) => d.status === 'Yes').length;

                        data.documents_client_bill.forEach((doc: any) => {
                            const dName = doc.document_name || 'General Document';
                            if (!docMap[dName]) docMap[dName] = { name: dName, required: 0, submitted: 0 };
                            docMap[dName].required++;
                            if (doc.status === 'Yes') docMap[dName].submitted++;
                        });
                    }

                    // Concrete Reconciliation
                    if (data.concrete_reconciliation && Array.isArray(data.concrete_reconciliation)) {
                        let dailyTheo = 0, dailyCons = 0;
                        data.concrete_reconciliation.forEach((item: any) => {
                            const t = parseFloat(item.theoretical) || 0;
                            const c = parseFloat(item.consumed) || 0;
                            dailyTheo += t;
                            dailyCons += c;

                            const tName = item.towerId || 'Site Overall';
                            if (!towerReconMap[tName]) towerReconMap[tName] = { name: tName, theoretical: 0, consumed: 0 };
                            towerReconMap[tName].theoretical += t;
                            towerReconMap[tName].consumed += c;
                        });
                        cReconTrend.push({
                            date: formattedDate,
                            theoretical: dailyTheo,
                            consumed: dailyCons,
                            variance: dailyCons - dailyTheo
                        });
                    }
                });

                setStats({
                    totalSteelReceived: isNaN(steelRec) ? 0 : steelRec,
                    totalSteelBilled: isNaN(steelBill) ? 0 : steelBill,
                    totalSteelWIP: isNaN(steelWIP) ? 0 : steelWIP,
                    totalDocumentsRequired: docsReq,
                    totalDocumentsSubmitted: docsSub
                });

                setSteelTrendData(sTrend);
                setConcreteReconData(cReconTrend);
                setTowerWiseReconData(Object.values(towerReconMap));
                setDocumentComplianceData(Object.values(docMap));

            } catch (error) {
                console.error("Failed to fetch CBD dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [siteFilter, dateFrom, dateTo, isOrgAdmin, sites.length]);

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-2xl font-black text-gray-900 tracking-tight">
                        CBD Analytics Dashboard
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-1">
                        Track steel reconciliation, concrete variance, and billing documents.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                {isOrgAdmin && (
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filter by Site</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={siteFilter}
                                onChange={e => setSiteFilter(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">All Sites Overview</option>
                                {sites.map(site => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">From Date</label>
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">To Date</label>
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            min={dateFrom}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4"></div>
                    <p className="text-gray-500 font-medium">Aggregating analytics...</p>
                </div>
            ) : (
                <>
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Steel Reconciliation Tracker</span>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Total Received</span>
                                    <span className="text-2xl font-black text-gray-800">{stats.totalSteelReceived.toFixed(1)} <span className="text-sm font-bold">MT</span></span>
                                </div>
                                <div className="border-l border-gray-100 pl-4">
                                    <span className="text-[10px] text-purple-500 font-bold uppercase block mb-1">Total Billed</span>
                                    <span className="text-2xl font-black text-purple-600">{stats.totalSteelBilled.toFixed(1)} <span className="text-sm font-bold">MT</span></span>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-50">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">WIP Steel</span>
                                <div className="mt-1">
                                    <span className="text-sm font-black px-2 py-1 bg-amber-50 text-amber-600 rounded-md">
                                        {stats.totalSteelWIP.toFixed(2)} MT pending
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between col-span-1 md:col-span-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Client Billing Readiness</span>
                            <div className="flex gap-4 items-center mb-4">
                                <div className="flex-1">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Requested Docs</span>
                                    <span className="text-2xl font-black text-gray-800">{stats.totalDocumentsRequired}</span>
                                </div>
                                <div className="flex-1 border-l border-gray-100 pl-4">
                                    <span className="text-[10px] text-emerald-500 font-bold uppercase block mb-1">Submitted</span>
                                    <span className="text-2xl font-black text-emerald-600">{stats.totalDocumentsSubmitted}</span>
                                </div>
                                <div className="flex-1 border-l border-gray-100 pl-4">
                                    <span className="text-[10px] text-red-500 font-bold uppercase block mb-1">Missing</span>
                                    <span className="text-2xl font-black text-red-600">{Math.max(0, stats.totalDocumentsRequired - stats.totalDocumentsSubmitted)}</span>
                                </div>
                            </div>
                            <div className="border-t border-gray-50 pt-4">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Compliance Score</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-1000"
                                            style={{ width: `${stats.totalDocumentsRequired > 0 ? (stats.totalDocumentsSubmitted / stats.totalDocumentsRequired) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-black text-emerald-600">
                                        {stats.totalDocumentsRequired > 0 ? ((stats.totalDocumentsSubmitted / stats.totalDocumentsRequired) * 100).toFixed(0) : 0}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Analysis Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Tower-wise Concrete Recon */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-800 mb-6">Tower-wise Concrete Reconciliation (MT)</h3>
                            <div className="h-[300px] w-full">
                                {towerWiseReconData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={towerWiseReconData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} width={80} />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                                            />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                            <Bar name="Theoretical" dataKey="theoretical" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={10} />
                                            <Bar name="Consumed" dataKey="consumed" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={10} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                                        <span className="text-gray-400 font-medium text-sm">No tower-wise recon data.</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Document Compliance breakdown */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-800 mb-6">Document Compliance Breakdown</h3>
                            <div className="h-[300px] w-full">
                                {documentComplianceData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={documentComplianceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} interval={0} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                                            />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                            <Bar name="Required" dataKey="required" fill="#e2e8f0" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                            <Bar name="Submitted" dataKey="submitted" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                                        <span className="text-gray-400 font-medium text-sm">No documentation records found.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
