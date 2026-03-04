"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Calendar, CheckCircle2, Clock, MapPin, Search, UploadCloud, Save, ChevronRight, FileDown } from 'lucide-react';
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

    // Generate Form Modal State
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [sites, setSites] = useState<any[]>([]);
    const [genSiteId, setGenSiteId] = useState<string>('');
    const [genDate, setGenDate] = useState(new Date().toISOString().slice(0, 10));
    const [genFormType, setGenFormType] = useState(formType || 'both');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        setLoading(true);
        try {
            const data = await apiClient<any>(`/dps-schedule/dynamic-assignments${formType ? `?formType=${formType}` : ''}`, {
                method: 'GET',
                withAuth: true
            });
            const resultData = data?.data || data || [];
            setAssignments(Array.isArray(resultData) ? resultData : []);

            if (isOrgAdmin) {
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
            // copy the dynamic schema structure into the submitted data state for bi-directional binding
            setFormData(JSON.parse(JSON.stringify(task.dynamic_schema)));
        } else {
            // just view existing submission
            setFormData(task.submitted_data);
        }
    };

    const handleFormSubmit = async () => {
        if (!selectedForm) return;

        // Validations for Planning
        if (selectedForm.form_type === 'planning') {
            if (formData?.concrete_planning && (formData.concrete_planning.achieved_total === undefined || formData.concrete_planning.achieved_total === null || formData.concrete_planning.achieved_total === '')) {
                showError('Concrete Progress: Actual Achieved is required.');
                return;
            }
            if (formData?.staff) {
                for (let i = 0; i < formData.staff.length; i++) {
                    const val = formData.staff[i].actual;
                    if (val === undefined || val === null || val === '') {
                        showError(`Staff Deployment: Actual is required for ${formData.staff[i].role || formData.staff[i].designation}`);
                        return;
                    }
                }
            }
            if (formData?.labor) {
                for (let i = 0; i < formData.labor.length; i++) {
                    const val = formData.labor[i].actual;
                    if (val === undefined || val === null || val === '') {
                        showError(`Labor Deployment: Actual is required for ${formData.labor[i].type || formData.labor[i].name}`);
                        return;
                    }
                }
            }
            if (formData?.equipments) {
                for (let i = 0; i < formData.equipments.length; i++) {
                    const val = formData.equipments[i].actual;
                    if (val === undefined || val === null || val === '') {
                        showError(`Equipment Tracking: Actual is required for ${formData.equipments[i].type || formData.equipments[i].name}`);
                        return;
                    }
                }
            }
        }

        // Validations for CBD
        if (selectedForm.form_type === 'cbd') {
            const sr = formData?.steel_reconciliation;
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

            if (formData?.concrete_reconciliation) {
                for (let i = 0; i < formData.concrete_reconciliation.length; i++) {
                    const cr = formData.concrete_reconciliation[i];
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

            const vendorRegs = formData?.vendor_registrations || [];
            for (let i = 0; i < vendorRegs.length; i++) {
                if (!vendorRegs[i].vendor_name || vendorRegs[i].vendor_name.trim() === '') {
                    showError('Vendor Registration: Vendor Name is required.');
                    return;
                }
            }

            const reportChecklists = formData?.report_checklist || [];
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

            const clientDocs = formData?.documents_client_bill || [];
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
                body: { assignment_id: selectedForm.id, submitted_data: formData, is_draft: false }
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

    const handleFormSave = async () => {
        if (!selectedForm) return;
        setSubmitting(true);
        try {
            const { apiClient } = await import('@/lib/apiClient');
            await apiClient('/dps-schedule/dynamic-assignments/submit', {
                method: 'POST',
                withAuth: true,
                body: { assignment_id: selectedForm.id, submitted_data: formData, is_draft: true }
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

    const filtered = assignments.filter(a => {
        const q = searchQuery.toLowerCase();
        return (
            a.site_name?.toLowerCase().includes(q) ||
            a.unit_name?.toLowerCase().includes(q) ||
            a.form_type?.toLowerCase().includes(q) ||
            a.status?.toLowerCase().includes(q)
        );
    });

    const pending = filtered.filter(a => a.status === 'pending');
    const history = filtered.filter(a => a.status !== 'pending');

    const totalPages = Math.ceil(history.length / itemsPerPage);
    const paginatedHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    return (
        <div className="max-w-7xl mx-auto p-8 space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                        {isOrgAdmin ? 'All DPR Forms' : 'DPR Assignments'}
                    </h1>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex-1 md:flex-none max-w-xs relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search by site or unit..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm shadow-sm"
                        />
                    </div>
                    {isOrgAdmin && (
                        <button onClick={() => setShowGenerateModal(true)} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2 whitespace-nowrap">
                            <Clock size={16} /> Generate Forms
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    <p className="text-gray-400 font-medium">Loading assignments...</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {/* Pending Tasks Section */}
                    <section className="space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                            <Clock size={20} className="text-orange-500" />
                            {isOrgAdmin ? 'Pending Forms' : 'Action Required'} <span className="text-sm font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{pending.length}</span>
                        </h2>

                        {pending.length === 0 ? (
                            <div className="p-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                <p className="text-gray-500 font-medium">{isOrgAdmin ? 'There are no pending DPR forms.' : 'You have no pending DPR assignments.'}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pending.map(task => (
                                    <AssignmentCard key={task.id} task={task} onSelect={handleSelectForm} isOrgAdmin={isOrgAdmin} onChangeAssignee={handleChangeAssignee} />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Historical Table */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                            <h2 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                                <CheckCircle2 className="text-gray-400" /> Submitted Reports
                            </h2>
                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{history.length}</span>
                        </div>
                        {history.length === 0 ? (
                            <div className="p-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                <p className="text-gray-500 font-medium">No previous submissions found.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <th className="px-4 py-3">Site & Unit</th>
                                                <th className="px-4 py-3">Form Type</th>
                                                <th className="px-6 py-4">Assigned To</th>
                                                <th className="px-4 py-3">Target Date</th>
                                                <th className="px-4 py-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {paginatedHistory.map(task => (
                                                <tr key={task.id} className="hover:bg-gray-50 transition-colors group">
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm font-semibold text-gray-900">{task.site_name}</div>
                                                        <div className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={10} /> {task.unit_name}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${task.form_type === 'planning' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                            {task.form_type === 'planning' ? 'Planning' : 'CBD Report'}
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
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => handleSelectForm(task)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-all shadow-sm">
                                                                View Details
                                                            </button>
                                                            <DownloadExcelButton taskId={task.id} formType={task.form_type} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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
                    </section>
                </div>
            )}

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

            {/* Form Modal Placeholder */}
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
                                    <ExecutionFormBuilder data={formData} setData={setFormData} readonly={selectedForm.status !== 'pending'} />
                                ) : (
                                    <CBDFormBuilder data={formData} setData={setFormData} readonly={selectedForm.status !== 'pending'} siteId={selectedForm.site_id} />
                                )}
                            </div>
                        </div>

                        {/* Footer / Actions */}
                        <div className="px-8 py-5 border-t border-slate-200 bg-white flex justify-end gap-3 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] items-center relative">
                            <button onClick={() => setSelectedForm(null)} className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent">
                                Cancel
                            </button>
                            {selectedForm.status === 'pending' && (
                                <div className="flex gap-3 ml-2">
                                    <button
                                        onClick={handleFormSave}
                                        disabled={submitting}
                                        className="px-6 py-2.5 bg-white border-2 border-slate-200 hover:border-blue-500/50 hover:bg-blue-50/50 text-slate-700 font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Save size={18} className="text-slate-400" /> {submitting ? 'Auto-Saving...' : 'Save Draft'}
                                    </button>
                                    <button
                                        onClick={handleFormSubmit}
                                        disabled={submitting}
                                        className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 ring-2 ring-transparent focus:ring-blue-500/50 flex items-center gap-2"
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Form'} <ChevronRight size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


import { ExecutionFormBuilder, CBDFormBuilder, AssignmentCard } from './DpsFormBuilders';
