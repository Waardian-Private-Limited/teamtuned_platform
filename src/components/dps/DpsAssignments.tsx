"use client";

import React, { useEffect, useState, useRef } from 'react';
import {
    Calendar, CheckCircle2, Clock, MapPin, Search, UploadCloud, Save,
    ChevronRight, ChevronLeft, FileDown, Plus, Users, Filter, RefreshCw,
    AlertCircle, FileText, Check, Eye, MoreVertical, ChevronDown, ChevronUp
} from 'lucide-react';
import { FormEvent } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { showSuccess, showError } from '@/lib/toast';

const EmployeeSearchInput = ({ value, onChange, readonly }: { value: any, onChange: (val: any) => void, readonly?: boolean }) => {
    const [searchTerm, setSearchTerm] = useState(value?.name || "");
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const debouncedSearch = useRef<any>(null);

    useEffect(() => {
        if (value?.name) setSearchTerm(value.name);
    }, [value]);

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        if (!term || term.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }
        if (debouncedSearch.current) clearTimeout(debouncedSearch.current);
        debouncedSearch.current = setTimeout(async () => {
            try {
                const res = await apiClient<any>(`/organization/employees?format=paginated&search=${encodeURIComponent(term)}&limit=10&status=active`, {
                    method: "GET",
                    withAuth: true
                });
                setResults(res?.data || []);
                setIsOpen(true);
            } catch { }
        }, 300);
    };

    return (
        <div className="relative w-full">
            <input
                type="text"
                placeholder="Search employee..."
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                readOnly={readonly}
                className="p-2 border border-blue-100 rounded-lg outline-none text-sm w-full bg-blue-50/50 focus:border-blue-400 font-bold text-gray-700"
            />
            {isOpen && !readonly && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {results.map(r => (
                        <div
                            key={r.id}
                            className="p-3 text-sm cursor-pointer border-b last:border-0 border-gray-100 hover:bg-blue-50 transition-colors"
                            onClick={() => {
                                const name = `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.email;
                                setSearchTerm(name);
                                onChange({ id: r.id, name });
                                setIsOpen(false);
                            }}
                        >
                            <div className="font-bold text-gray-800">{r.first_name} {r.last_name}</div>
                            {r.designation && <div className="text-xs text-gray-500 font-medium">{r.designation}</div>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const formatDate = (dateString: string) => {
    try {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateString;
    }
};

interface DynamicAssignment {
    id: number;
    site_id: number;
    site_name: string;
    unit_id: number;
    unit_name: string;
    schedule_id: number;
    form_type: 'planning' | 'cbd';
    assigned_to: number;
    first_name?: string;
    last_name?: string;
    due_date: string;
    status: 'pending' | 'submitted' | 'reviewed';
    dynamic_schema: any;
    submitted_data: any;
    created_at: string;
    updated_at: string;
}

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
            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded hover:bg-emerald-100 disabled:opacity-50 transition-all border border-emerald-200 flex items-center justify-center shadow-sm"
        >
            {downloading ? '...' : <FileDown size={14} />}
        </button>
    );
}

export default function DpsAssignments({ formType }: { formType?: 'planning' | 'cbd' }) {
    const { role } = useAuth();
    const isOrgAdmin = (role || '').toLowerCase() === 'orgadmin';

    const [assignments, setAssignments] = useState<DynamicAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedForm, setSelectedForm] = useState<DynamicAssignment | null>(null);
    const [formData, setFormData] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    // Filter states
    const [statusFilter, setStatusFilter] = useState<'All' | 'pending' | 'submitted' | 'reviewed'>('All');
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Generate Form Modal State
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [sites, setSites] = useState<any[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string>('');
    const [genSiteId, setGenSiteId] = useState<string>('');
    const [genDate, setGenDate] = useState(new Date().toISOString().slice(0, 10));
    const [genFormType, setGenFormType] = useState(formType || 'both');

    // Pagination state matching LeaveRequests
    const [activeTab, setActiveTab] = useState<'pending' | 'submitted'>('pending');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalEntries, setTotalEntries] = useState(0);

    useEffect(() => {
        fetchAssignments();
    }, [page, pageSize, statusFilter, selectedSiteId, fromDate, toDate, activeTab]);

    const fetchAssignments = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pageSize.toString(),
                activeTab: activeTab,
            });

            if (formType) params.append('formType', formType);
            if (statusFilter !== 'All') params.append('status', statusFilter);
            if (selectedSiteId) params.append('siteId', selectedSiteId);
            if (fromDate) params.append('dateFrom', fromDate);
            if (toDate) params.append('dateTo', toDate);
            if (searchQuery) params.append('search', searchQuery);

            const data = await apiClient<any>(`/dps-schedule/dynamic-assignments?${params.toString()}`, {
                method: 'GET',
                withAuth: true
            });

            setAssignments(data?.data || []);
            setTotalEntries(data?.meta?.total || 0);

            if (sites.length === 0) {
                const sData = await apiClient<any>('/dps-schedule/sites', {
                    method: 'GET',
                    withAuth: true
                });
                setSites(sData.sites || []);
            }
        } catch (error) {
            console.error('Failed to fetch dynamic assignments', error);
            showError('Failed to load assignments');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateForm = async () => {
        try {
            if (isOrgAdmin && !genSiteId) {
                showError('Please select a site first.');
                return;
            }
            setSubmitting(true);
            await apiClient('/dps-schedule/dynamic-assignments/generate', {
                method: 'POST',
                body: { siteId: genSiteId, date: genDate, form_type: genFormType },
                withAuth: true
            });
            alert('Forms generated successfully!');
            setShowGenerateModal(false);
            fetchAssignments();
        } catch (e: any) {
            alert('Error generating forms: ' + (e?.message || 'Unknown Error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleChangeAssignee = async (taskId: number, newAssigneeId: number) => {
        try {
            await apiClient(`/dps-schedule/dynamic-assignments/${taskId}/assignee`, {
                method: 'PATCH',
                body: { assigned_to: newAssigneeId },
                withAuth: true
            });
            showSuccess('Assignee updated successfully!');
            fetchAssignments();
        } catch (e: any) {
            showError('Error updating assignee: ' + (e?.message || 'Unknown Error'));
        }
    };

    const handleSelectForm = (task: DynamicAssignment) => {
        setSelectedForm(task);
        if (task.status === 'pending') {
            const data = JSON.parse(JSON.stringify(task.dynamic_schema));
            if (data.staff && Array.isArray(data.staff)) {
                data.staff = data.staff.map((s: any) => ({
                    ...s,
                    required_wo: (s.required_wo === undefined || s.required_wo === null || s.required_wo === 0) ? (s.planned || 0) : s.required_wo
                }));
            }
            setFormData(data);
        } else {
            // just view existing submission
            setFormData(task.submitted_data);
        }
    };

    const handleFormSubmit = async (updatedData?: any) => {
        if (!selectedForm) return;

        const dataToSave = updatedData || formData;

        // Validations for Planning
        if (selectedForm.form_type === 'planning') {
            if (dataToSave?.concrete_planning && (dataToSave.concrete_planning.achieved_total === undefined || dataToSave.concrete_planning.achieved_total === null || String(dataToSave.concrete_planning.achieved_total).trim() === '')) {
                showError('Concrete Progress: ACTUAL QTY is required.');
                return;
            }
            if (dataToSave?.staff) {
                for (let i = 0; i < dataToSave.staff.length; i++) {
                    const val = dataToSave.staff[i].actual;
                    if (val === undefined || val === null || val === '') {
                        showError(`Staff Deployment: Actual is required for ${dataToSave.staff[i].role || dataToSave.staff[i].designation}`);
                        return;
                    }
                }
            }
            if (dataToSave?.labor) {
                for (let i = 0; i < dataToSave.labor.length; i++) {
                    const val = dataToSave.labor[i].actual;
                    if (val === undefined || val === null || val === '') {
                        showError(`Labor Deployment: Actual is required for ${dataToSave.labor[i].type || dataToSave.labor[i].name}`);
                        return;
                    }
                }
            }
            if (dataToSave?.equipments) {
                for (let i = 0; i < dataToSave.equipments.length; i++) {
                    const val = dataToSave.equipments[i].actual;
                    if (val === undefined || val === null || val === '') {
                        showError(`Equipment Tracking: Actual is required for ${dataToSave.equipments[i].type || dataToSave.equipments[i].name}`);
                        return;
                    }
                }
            }
        }

        // Validations for CBD
        if (selectedForm.form_type === 'cbd') {
            const sr = dataToSave?.steel_reconciliation;
            if (sr) {
                const srFields = ['total_received', 'total_billed', 'wip_steel', 'jmr_total', 'total_stock', 'total_scrap', 'wastage_percent'];
                const srLabels = ['Total Received Steel', 'Total Billed Steel', 'WIP Steel', 'JMR Total', 'Total Stock', 'Total Scrap', '% Wastage'];
                for (let j = 0; j < srFields.length; j++) {
                    const val = sr[srFields[j]];
                    if (val === undefined || val === null || val === '') {
                        showError(`Steel Reconciliation: ${srLabels[j]} is required.`);
                        return;
                    }
                }
            }

            if (dataToSave?.concrete_reconciliation) {
                for (let i = 0; i < dataToSave.concrete_reconciliation.length; i++) {
                    const cr = dataToSave.concrete_reconciliation[i];
                    const crFields = ['theoretical', 'consumed', 'difference', 'wastage_percent'];
                    const crLabels = ['Theoretical', 'Consumed', 'Difference', '% Wastage'];
                    for (let j = 0; j < crFields.length; j++) {
                        const val = cr[crFields[j]];
                        if (val === undefined || val === null || val === '') {
                            showError(`Concrete Reconciliation (${cr.region || i + 1}): ${crLabels[j]} is required.`);
                            return;
                        }
                    }
                }
            }

            const vendorRegs = dataToSave?.vendor_registrations || [];
            for (let i = 0; i < vendorRegs.length; i++) {
                if (!vendorRegs[i].vendor_name || vendorRegs[i].vendor_name.trim() === '') {
                    showError('Vendor Registration: Vendor Name is required.');
                    return;
                }
            }

            const reportChecklists = dataToSave?.report_checklist || [];
            for (let i = 0; i < reportChecklists.length; i++) {
                const item = reportChecklists[i];
                if (!item.status) {
                    showError(`Report Checklist: Please select Yes or No for ${item.description}`);
                    return;
                }
                if (item.status === 'Yes' && (!item.attachments || item.attachments.length === 0)) {
                    showError(`Attachment is required for: ${item.description}`);
                    return;
                }
                if (item.status === 'No' && (!item.remark || item.remark.trim() === '')) {
                    showError(`Remark is compulsory for 'No' selected in: ${item.description}`);
                    return;
                }
            }

            const clientDocs = dataToSave?.documents_client_bill || [];
            for (let i = 0; i < clientDocs.length; i++) {
                const item = clientDocs[i];
                if (!item.status) {
                    showError(`Documents For Client Bill: Please select Yes or No for ${item.document_name}`);
                    return;
                }
                if (item.status === 'Yes' && (!item.attachments || item.attachments.length === 0)) {
                    showError(`Attachment is required for Client Document: ${item.document_name}`);
                    return;
                }
                if (item.status === 'No' && (!item.remark || item.remark.trim() === '')) {
                    showError(`Remark is compulsory for 'No' selected in Client Document: ${item.document_name}`);
                    return;
                }
            }
        }

        setSubmitting(true);
        try {
            const { apiClient } = await import('@/lib/apiClient');
            await apiClient('/dps-schedule/dynamic-assignments/submit', {
                method: 'POST',
                withAuth: true,
                body: { assignment_id: selectedForm.id, submitted_data: dataToSave, is_draft: false }
            });
            showSuccess('Form submitted successfully!');
            setSelectedForm(null);
            fetchAssignments();
        } catch (e: any) {
            showError('Error submitting form: ' + (e?.message || 'Unknown Error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleFormSave = async (updatedData?: any) => {
        if (!selectedForm) return;
        const dataToSave = updatedData || formData;
        setSubmitting(true);
        try {
            const { apiClient } = await import('@/lib/apiClient');
            await apiClient('/dps-schedule/dynamic-assignments/submit', {
                method: 'POST',
                withAuth: true,
                body: { assignment_id: selectedForm.id, submitted_data: dataToSave, is_draft: true }
            });
            showSuccess('Progress saved successfully!');
            setSelectedForm(null);
            fetchAssignments();
        } catch (e: any) {
            showError('Error saving progress: ' + (e?.message || 'Unknown Error'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-black tracking-tight uppercase">Assignments</h1>
                        <p className="text-xs text-gray-500 font-bold mt-1 tracking-widest uppercase">Manage and Track Site Reports</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isOrgAdmin && (
                            <button
                                onClick={() => setShowGenerateModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest border border-black hover:bg-zinc-800 transition-all active:scale-95"
                            >
                                <Plus size={14} /> Generate Forms
                            </button>
                        )}
                        <button
                            onClick={fetchAssignments}
                            className="p-2 border border-black hover:bg-gray-50 text-black transition-all"
                            title="Refresh Data"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Tasks', value: totalEntries, icon: FileText, color: 'text-black' },
                        { label: 'Pending', value: assignments.filter(a => a.status === 'pending').length, icon: Clock, color: 'text-orange-500' },
                        { label: 'Submitted', value: assignments.filter(a => a.status === 'submitted').length, icon: CheckCircle2, color: 'text-emerald-500' },
                        { label: 'Reviewed', value: assignments.filter(a => a.status === 'reviewed').length, icon: Check, color: 'text-blue-500' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white border border-black p-4 flex items-center justify-between group">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                            </div>
                            <div className={`p-3 border border-black/5 group-hover:border-black transition-colors`}>
                                <stat.icon size={20} className={stat.color} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters & Tabs Section */}
                <div className="bg-white border border-black mb-6">
                    <div className="p-4 border-b border-black flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => { setActiveTab('pending'); setPage(1); }}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`}
                            >
                                Pending Assignments
                            </button>
                            <button
                                onClick={() => { setActiveTab('submitted'); setPage(1); }}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'submitted' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`}
                            >
                                Submitted Reports
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative group flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="SEARCH BY SITE, UNIT..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-black text-[10px] font-black uppercase tracking-widest placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-black"
                                />
                            </div>
                            <button
                                onClick={() => setFiltersExpanded(!filtersExpanded)}
                                className={`p-2 border border-black transition-all ${filtersExpanded ? 'bg-black text-white' : 'text-black hover:bg-gray-50'}`}
                            >
                                <Filter size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Expanded Filters */}
                    {filtersExpanded && (
                        <div className="p-4 bg-gray-50 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
                            <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="w-full bg-white border border-black p-2 text-[10px] font-black uppercase tracking-widest focus:outline-none"
                                >
                                    <option value="All">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="submitted">Submitted</option>
                                    <option value="reviewed">Reviewed</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Site</label>
                                <select
                                    value={selectedSiteId}
                                    onChange={(e) => setSelectedSiteId(e.target.value)}
                                    className="w-full bg-white border border-black p-2 text-[10px] font-black uppercase tracking-widest focus:outline-none"
                                >
                                    <option value="">All Sites</option>
                                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">From Date</label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-full bg-white border border-black p-2 text-[10px] font-black uppercase focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">To Date</label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-full bg-white border border-black p-2 text-[10px] font-black uppercase focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Table Section */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead className="bg-gray-50 border-b border-black">
                                <tr className="text-[10px] font-black text-black uppercase tracking-widest">
                                    <th className="p-4">Reference</th>
                                    <th className="p-4 border-l border-black/5">Site / Unit</th>
                                    <th className="p-4 border-l border-black/5">Form Type</th>
                                    <th className="p-4 border-l border-black/5">Current Assignee</th>
                                    <th className="p-4 border-l border-black/5">Due Date</th>
                                    <th className="p-4 border-l border-black/5">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <RefreshCw size={24} className="animate-spin text-gray-300" />
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fetching assignments...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : assignments.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <AlertCircle size={24} className="text-gray-200" />
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No assignments found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : assignments.map(task => (
                                    <tr key={task.id} className="group hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="text-[10px] font-black text-black">#{task.id}</div>
                                            <div className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">SR-REF-{task.id}</div>
                                        </td>
                                        <td className="p-4 border-l border-black/5">
                                            <div className="text-[10px] font-black text-black uppercase leading-tight">{task.site_name}</div>
                                            <div className="text-[9px] text-gray-400 font-bold mt-1 uppercase flex items-center gap-1">
                                                <MapPin size={8} /> {task.unit_name}
                                            </div>
                                        </td>
                                        <td className="p-4 border-l border-black/5">
                                            <span className={`inline-flex px-2 py-0.5 border border-black text-[9px] font-black uppercase tracking-widest bg-white ${task.form_type === 'planning' ? 'text-black' : 'text-zinc-600'}`}>
                                                {task.form_type}
                                            </span>
                                        </td>
                                        <td className="p-4 border-l border-black/5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 border border-black flex items-center justify-center text-[9px] font-black text-black bg-white group-hover:bg-black group-hover:text-white transition-colors">
                                                    {(task.first_name?.[0] || 'U').toUpperCase()}
                                                </div>
                                                <div className="text-[10px] font-black text-black uppercase">{task.first_name} {task.last_name}</div>
                                            </div>
                                        </td>
                                        <td className="p-4 border-l border-black/5">
                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-black">
                                                <Calendar size={12} className="text-gray-400" />
                                                {formatDate(task.due_date)}
                                            </div>
                                        </td>
                                        <td className="p-4 border-l border-black/5">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-black text-[9px] font-black uppercase tracking-widest ${task.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                                                task.status === 'submitted' ? 'bg-emerald-50 text-emerald-600' :
                                                    'bg-blue-50 text-blue-600'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 ${task.status === 'pending' ? 'bg-amber-500' :
                                                    task.status === 'submitted' ? 'bg-emerald-500' :
                                                        'bg-blue-500'
                                                    }`} />
                                                {task.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {task.status === 'pending' ? (
                                                    <button
                                                        onClick={() => handleSelectForm(task)}
                                                        className="px-4 py-2 bg-black text-white text-[9px] font-black uppercase tracking-widest border border-black hover:bg-zinc-800 transition-all active:scale-95"
                                                    >
                                                        Process DPR
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleSelectForm(task)}
                                                            className="p-2 border border-black hover:bg-gray-100 text-black transition-all"
                                                        >
                                                            <Eye size={14} />
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

                    {/* Advanced Pagination UI matching LeaveRequests */}
                    {!loading && totalEntries > 0 && (
                        <div className="p-4 border-t border-black bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-black uppercase tracking-widest">
                                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalEntries)} of {totalEntries} entries
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Display</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                                        className="bg-white border border-black text-[10px] font-black px-2 py-1 focus:outline-none"
                                    >
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(prev => prev - 1)}
                                    className="p-2 border border-black text-black hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {Array.from({ length: Math.ceil(totalEntries / pageSize) }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === Math.ceil(totalEntries / pageSize) || Math.abs(p - page) <= 1)
                                    .map((p, i, arr) => (
                                        <React.Fragment key={p}>
                                            {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2 text-gray-400">...</span>}
                                            <button
                                                onClick={() => setPage(p)}
                                                className={`w-8 h-8 flex items-center justify-center text-[10px] font-black border transition-all ${page === p ? 'bg-black text-white border-black' : 'text-black border-transparent hover:border-black'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        </React.Fragment>
                                    ))
                                }

                                <button
                                    disabled={page === Math.ceil(totalEntries / pageSize)}
                                    onClick={() => setPage(prev => prev + 1)}
                                    className="p-2 border border-black text-black hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Generate Form Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">Generate Manual Forms</h2>
                            <button onClick={() => setShowGenerateModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {isOrgAdmin && (
                                <div>
                                    <label className="block text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">Select Site</label>
                                    <select
                                        value={genSiteId}
                                        onChange={e => setGenSiteId(e.target.value)}
                                        className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-gray-800 bg-white"
                                    >
                                        <option value="">-- Choose Site --</option>
                                        {sites.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">Target Date</label>
                                <input type="date" value={genDate} onChange={e => setGenDate(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-gray-800" />
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">Form Type</label>
                                <select value={genFormType} onChange={e => setGenFormType(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-gray-800 bg-white">
                                    <option value="both">Both (Planning & CBD)</option>
                                    <option value="planning">Planning (Execution Plan)</option>
                                    <option value="cbd">CBD (Billing Target)</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
                            <button onClick={() => setShowGenerateModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button disabled={submitting} onClick={handleGenerateForm} className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">
                                {submitting ? 'Generating...' : 'Generate Forms'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full-Screen Multi-Step Form */}
            {selectedForm && (
                <DprMultiStepForm
                    task={selectedForm}
                    onClose={() => setSelectedForm(null)}
                    onSave={handleFormSave}
                    onSubmit={handleFormSubmit}
                    submitting={submitting}
                    initialData={formData}
                    siteId={selectedForm.site_id}
                    readOnly={selectedForm.status === 'submitted' || selectedForm.status === 'reviewed'}
                />
            )}
        </div>
    );
}


import { ExecutionFormBuilder, CBDFormBuilder, AssignmentCard, DprMultiStepForm } from './DpsFormBuilders';
