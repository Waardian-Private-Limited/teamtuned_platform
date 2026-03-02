"use client";

import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock, MapPin, Search, ChevronRight, FileDown, Filter } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { showSuccess, showError } from '@/lib/toast';
import { DynamicAssignment, formatDate, ExecutionFormBuilder, CBDFormBuilder } from './DpsFormBuilders';

function DownloadExcelButton({ taskId, formType }: { taskId: number; formType: string }) {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api/v1';
            const url = `${base}/dps-schedule/dynamic-assignments/${taskId}/export`;
            const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };
            try {
                const token = localStorage.getItem('token');
                if (token) headers['Authorization'] = `Bearer ${token}`;
            } catch { }

            const res = await fetch(url, { method: 'GET', credentials: 'include', headers });
            if (!res.ok) throw new Error(`Failed: ${await res.text()}`);

            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${formType}_report_${taskId}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            console.error('Download failed', e);
            alert('Failed to download report');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={downloading}
            title="Download Excel Report"
            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded hover:bg-emerald-100 disabled:opacity-50 transition-all border border-emerald-200 flex items-center justify-center shadow-sm whitespace-nowrap gap-1"
        >
            {downloading ? '...' : <FileDown size={14} />} Download
        </button>
    );
}

interface PageProps {
    formType: 'planning' | 'cbd';
}

export default function DpsSubmissionsList({ formType }: PageProps) {
    const { role } = useAuth();
    const isOrgAdmin = (role || '').toLowerCase() === 'orgadmin';

    const [assignments, setAssignments] = useState<DynamicAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [sites, setSites] = useState<any[]>([]);

    // Filters mirroring LeaveRequests.tsx style
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [siteFilter, setSiteFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [selectedForm, setSelectedForm] = useState<DynamicAssignment | null>(null);
    const [formData, setFormData] = useState<any>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [totalPages, setTotalPages] = useState(1); // New state for total pages from backend

    const fetchAssignments = async () => {
        setLoading(true);
        try {
            // Build query params
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '15',
                formType: formType
            });

            if (searchQuery) params.append('search', searchQuery);
            if (statusFilter) params.append('status', statusFilter);
            if (siteFilter) params.append('siteId', siteFilter);
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);

            const data = await apiClient<any>(`/dps-schedule/dynamic-assignments?${params.toString()}`, {
                method: 'GET',
                withAuth: true
            });

            const resultData = data?.data || data || [];

            setAssignments(resultData);

            if (data?.meta) {
                setTotalPages(data.meta.totalPages || 1);
            }

            if (isOrgAdmin && sites.length === 0) {
                const sData = await apiClient<any>('/dps-schedule/sites', {
                    method: 'GET',
                    withAuth: true
                });
                setSites(sData.sites || []);
            }
        } catch (error) {
            console.error('Failed to fetch dynamic assignments', error);
        } finally {
            setLoading(false);
        }
    };

    // Refresh when page or filters change
    useEffect(() => {
        setCurrentPage(1); // Reset to page 1 on filter change
    }, [searchQuery, statusFilter, siteFilter, dateFrom, dateTo]);

    useEffect(() => {
        fetchAssignments();
    }, [currentPage, searchQuery, statusFilter, siteFilter, dateFrom, dateTo]);

    const handleSelectForm = (task: DynamicAssignment) => {
        setSelectedForm(task);
        if (task.status === 'pending') {
            setFormData(JSON.parse(JSON.stringify(task.dynamic_schema)));
        } else {
            setFormData(task.submitted_data);
        }
    };

    // We no longer need local filtering since the backend handles it.
    const paginated = assignments;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-2xl font-black text-gray-900 tracking-tight">
                        {formType === 'planning' ? 'Planning DPR' : 'CBD DPR'}
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-1">Review and download submitted DPR reports</p>
                </div>
            </div>

            {/* Filters matching LeaveRequests.tsx style */}
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-center w-full">
                    <div className="w-full md:w-auto min-w-[200px] lg:min-w-[250px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search Employee, Site or Unit..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {isOrgAdmin && (
                        <div className="w-full md:w-auto min-w-[150px]">
                            <select
                                value={siteFilter}
                                onChange={(e) => setSiteFilter(e.target.value)}
                                className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm font-medium text-gray-700 placeholder-gray-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[length:1.25em_1.25em]"
                            >
                                <option value="">All Sites</option>
                                {sites.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="w-full md:w-auto min-w-[150px]">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm font-medium text-gray-700 placeholder-gray-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[length:1.25em_1.25em]"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="submitted">Submitted</option>
                            <option value="reviewed">Reviewed</option>
                        </select>
                    </div>

                    <div className="hidden md:block w-px h-8 bg-gray-200 mx-2"></div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm text-gray-700"
                            />
                        </div>
                        <span className="text-gray-400 font-medium text-sm">to</span>
                        <div className="relative flex-1">
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm text-gray-700"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading submissions...</p>
                </div>
            ) : paginated.length === 0 ? (
                <div className="p-16 flex flex-col items-center justify-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <Filter className="text-gray-300 w-12 h-12 mb-4" />
                    <p className="text-gray-500 font-medium text-lg">No submissions match your filters.</p>
                </div>
            ) : (
                <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">Site & Unit</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-6 py-4">Assigned To</th>
                                    <th className="px-6 py-4">Target Date</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginated.map((task: any) => (
                                    <tr key={task.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-semibold text-gray-900">{task.site_name}</div>
                                            <div className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={10} /> {task.unit_name}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${task.form_type === 'planning' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                                                {task.form_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-max border
                                                ${task.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    task.status === 'submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                {task.status === 'pending' && <Clock size={10} />}
                                                {task.status !== 'pending' && <CheckCircle2 size={10} />}
                                                {task.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-100">
                                                    {(task.first_name?.[0] || 'U').toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">{task.first_name} {task.last_name || ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-700">{formatDate(task.due_date)}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2 transition-opacity">
                                                {task.status !== 'pending' && (
                                                    <>
                                                        <button onClick={() => handleSelectForm(task)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-all shadow-sm">
                                                            View Form
                                                        </button>
                                                        <DownloadExcelButton taskId={task.id} formType={task.form_type} />
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination matching DpsAssignments style */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-widest">
                                Page <span className="text-gray-900 font-bold">{currentPage}</span> of <span className="text-gray-900 font-bold">{totalPages}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                    className="px-3 py-1.5 rounded border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
                                >
                                    Previous
                                </button>
                                <div className="flex gap-1">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`w-8 h-8 rounded text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    className="px-3 py-1.5 rounded border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal for viewing details (Identical UI to DpsAssignments) */}
            {selectedForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-[90rem] h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200/50">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80 flex justify-between items-center backdrop-blur-xl">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${selectedForm.form_type === 'planning' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        <CheckCircle2 size={24} className="opacity-80" />
                                    </div>
                                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                                        {selectedForm.form_type === 'planning' ? 'Execution Plan DPR' : 'Billing Target DPR'}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-4 text-sm font-semibold text-slate-500 ml-12">
                                    <span className="flex items-center gap-1.5"><MapPin size={14} /> {selectedForm.site_name}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    <span className="flex items-center gap-1.5"><Calendar size={14} /> Target Date: <span className="text-slate-700">{formatDate(selectedForm.due_date)}</span></span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedForm(null)} className="p-2.5 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-200/50 transition-colors group">
                                <span className="font-bold text-xl leading-none group-hover:scale-110 transition-transform block">&times;</span>
                            </button>
                        </div>

                        {/* Scrolling Body content */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 relative">
                            <div className="max-w-[85rem] mx-auto w-full">
                                {selectedForm.form_type === 'planning' ? (
                                    <ExecutionFormBuilder data={formData} setData={setFormData} readonly={true} />
                                ) : (
                                    <CBDFormBuilder data={formData} setData={setFormData} readonly={true} siteId={selectedForm.site_id} />
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-5 border-t border-slate-200 bg-white flex justify-end gap-3 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] items-center">
                            <button onClick={() => setSelectedForm(null)} className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
