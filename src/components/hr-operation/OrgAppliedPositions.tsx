"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Briefcase, Search, Filter, Plus, X, Building2, MapPin,
    DollarSign, Send, Download, Edit3, Trash2, CheckCircle2, MoreHorizontal,
    ChevronDown, ChevronUp, ChevronLeft, ChevronRight, LayoutGrid, Clock, XCircle, MoreVertical, Eye, FileText, ShieldCheck, Award, Users, Phone, Mail, ExternalLink, Upload,
    ListFilter,
    History,
    FileQuestion,
    UserPlus,
    CalendarCheck,
    Calendar,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

function useCountUp(target: number, duration = 1000) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let startTime: number;
        let animationFrame: number;
        const start = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            setCount(Math.floor(target * percentage));
            if (progress < duration) {
                animationFrame = requestAnimationFrame(start);
            } else {
                setCount(target);
            }
        };
        animationFrame = requestAnimationFrame(start);
        return () => cancelAnimationFrame(animationFrame);
    }, [target, duration]);
    return count;
}

export default function OrgAppliedPositions() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [positions, setPositions] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [shortlistedCount, setShortlistedCount] = useState(0);
    const [allDepartments, setAllDepartments] = useState<any[]>([]);

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const [applicants, setApplicants] = useState<any[]>([]);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [currentJob, setCurrentJob] = useState<any>(null);
    const [expandedCandidateId, setExpandedCandidateId] = useState<number | null>(null);
    const [applicantStatusTab, setApplicantStatusTab] = useState<'Pending' | 'Referred' | 'Shortlisted' | 'Rejected'>('Pending');
    const [applicantSearch, setApplicantSearch] = useState('');
    const [applicantPage, setApplicantPage] = useState(1);
    const [applicantLimit, setApplicantLimit] = useState(10);
    const [applicantsTotal, setApplicantsTotal] = useState(0);
    const [applicantCounts, setApplicantCounts] = useState({
        pending: 0,
        referred: 0,
        shortlisted: 0,
        rejected: 0
    });
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusDialogType, setStatusDialogType] = useState<'Shortlisted' | 'Rejected' | null>(null);
    const [statusDialogApplicant, setStatusDialogApplicant] = useState<any | null>(null);
    const [statusDialogReason, setStatusDialogReason] = useState('');
    const [statusDialogShareFeedback, setStatusDialogShareFeedback] = useState(true);
    const [statusDialogSubmitting, setStatusDialogSubmitting] = useState(false);

    const [applicationHistory, setApplicationHistory] = useState<any[]>([]);
    const [applicationNotes, setApplicationNotes] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
    const [viewDetailsApplicant, setViewDetailsApplicant] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        department: '',
        type: 'Full-time',
        location: '',
        description: '',
        requirements: '',
        salary_range: '',
        status: 'Active',
        jd_url: ''
    });

    const jdInputRef = useRef<HTMLInputElement>(null);
    const [uploadingJD, setUploadingJD] = useState(false);

    const handleJDUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png'
        ];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Invalid file type. Please upload PDF, Doc, or Image.");
            return;
        }

        const uploadData = new FormData();
        uploadData.append('files', file);

        setUploadingJD(true);
        try {
            const result = await apiClient('/files/org-upload/job-descriptions', {
                method: 'POST',
                body: uploadData,
                withAuth: true
            });

            if (result.success && result.files?.[0]) {
                setFormData(prev => ({ ...prev, jd_url: result.files[0].url }));
                toast.success("Job Description uploaded");
            } else {
                toast.error(result.message || "Upload failed");
            }
        } catch (error: any) {
            toast.error(error?.message || "JD upload failed");
        } finally {
            setUploadingJD(false);
        }
    };

    const fetchPositions = async () => {
        try {
            const res = await apiClient.get('/hr-operation/applied-positions', {}, { withAuth: true });
            if (res.success) {
                setPositions(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch positions:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchShortlistedCount = async () => {
        try {
            const res = await apiClient.get('/hr-operation/shortlisted-candidates', {}, { withAuth: true });
            if (res.success) {
                setShortlistedCount(res.data.length);
            }
        } catch (err) {
            console.error('Failed to fetch shortlisted count:', err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await apiClient.get('/organization/departments', {}, { withAuth: true });
            // The API returns { departments: [], ... } for paginated or [] for legacy
            if (res.departments) {
                setAllDepartments(res.departments);
            } else if (Array.isArray(res)) {
                setAllDepartments(res);
            }
        } catch (err) {
            console.error('Failed to fetch departments:', err);
        }
    };

    useEffect(() => {
        fetchPositions();
        fetchShortlistedCount();
        fetchDepartments();
    }, []);

    useEffect(() => {
        setApplicantPage(1);
    }, [applicantStatusTab, currentJob]);

    useEffect(() => {
        if (currentJob && viewModalOpen) {
            fetchApplicants(currentJob);
        }
    }, [applicantPage, applicantLimit, applicantStatusTab, applicantSearch, currentJob, viewModalOpen]);

    const filteredPositions = useMemo(() => {
        return positions.filter(p => {
            const matchesSearch = p.position_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.department.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [positions, searchQuery, statusFilter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                const res = await apiClient.put(`/hr-operation/openings/${editingId}`, formData, { withAuth: true });
                if (res.success) {
                    toast.success('Position updated successfully');
                    closeModal();
                    fetchPositions();
                }
            } else {
                const res = await apiClient.post('/hr-operation/openings', formData, { withAuth: true });
                if (res.success) {
                    toast.success('Position posted successfully');
                    closeModal();
                    fetchPositions();
                }
            }
        } catch (err: any) {
            toast.error(err.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this position? This action cannot be undone.')) return;
        try {
            const res = await apiClient.delete(`/hr-operation/openings/${id}`, { withAuth: true });
            if (res.success) {
                toast.success('Position deleted');
                fetchPositions();
            }
        } catch (err: any) {
            toast.error(err.message || 'Delete failed');
        }
    };

    const handleEdit = (job: any) => {
        setEditingId(job.id);
        setFormData({
            title: job.position_name,
            department: job.department,
            type: job.type || 'Full-time',
            location: job.location || '',
            description: job.description || '',
            requirements: job.requirements || '',
            salary_range: job.salary_range || '',
            status: job.status,
            jd_url: job.jd_url || ''
        });
        setIsModalOpen(true);
    };

    const fetchApplicants = async (job: any, overridePage?: number) => {
        if (!job) return;
        setLoading(true);
        try {
            const res = await apiClient.get(
                `/hr-operation/applied-positions/${job.id}/applicants`,
                {
                    page: overridePage ?? applicantPage,
                    limit: applicantLimit,
                    statusTab: applicantStatusTab,
                    search: applicantSearch || undefined
                },
                { withAuth: true }
            );
            if (res.success) {
                setApplicants(res.data || []);
                if (typeof res.total === 'number') {
                    setApplicantsTotal(res.total);
                } else if (Array.isArray(res.data)) {
                    setApplicantsTotal(res.data.length);
                }
                if (res.counts) {
                    setApplicantCounts({
                        pending: res.counts.pending ?? 0,
                        referred: res.counts.referred ?? 0,
                        shortlisted: res.counts.shortlisted ?? 0,
                        rejected: res.counts.rejected ?? 0
                    });
                }
            } else {
                toast.error(res.message || 'Error fetching applicants');
            }
        } catch (err: any) {
            toast.error('Error fetching applicants');
        } finally {
            setLoading(false);
        }
    };

    const handleViewApplicants = async (job: any) => {
        setCurrentJob(job);
        setViewModalOpen(true);
        setApplicantPage(1);
        await fetchApplicants(job, 1);
    };

    const handleSendReminder = async (appId: number) => {
        try {
            const res = await apiClient.post(`/hr-operation/referrals/${appId}/remind`, {}, { withAuth: true });
            if (res.success) {
                toast.success('Reminder sent successfully');
            } else {
                toast.error(res.message || 'Failed to send reminder');
            }
        } catch (err: any) {
            toast.error('Error sending reminder');
        }
    };

    const handleStatusUpdate = async (appId: number, status: string, reason?: string, shareFeedback?: boolean) => {
        try {
            const res = await apiClient.put(
                `/hr-operation/applications/${appId}/status`,
                { status, reason, shareFeedback },
                { withAuth: true }
            );
            if (res.success) {
                toast.success(`Candidate marked as ${status}`);
                setApplicants(prev => prev.map(app => {
                    if (app.id !== appId) return app;
                    const apiData = (res as any).data || {};
                    return {
                        ...app,
                        status: apiData.status || status,
                        rejection_reason: status === 'Rejected' ? (apiData.rejection_reason ?? reason) : null,
                        status_updated_by: apiData.status_updated_by ?? app.status_updated_by ?? null
                    };
                }));
            }
        } catch (err: any) {
            toast.error('Failed to update status');
        }
    };

    const openStatusDialog = (app: any, type: 'Shortlisted' | 'Rejected') => {
        setStatusDialogApplicant(app);
        setStatusDialogType(type);
        setStatusDialogReason('');
        setStatusDialogShareFeedback(true);
        setStatusDialogOpen(true);
    };

    const closeStatusDialog = () => {
        if (statusDialogSubmitting) return;
        setStatusDialogOpen(false);
        setStatusDialogType(null);
        setStatusDialogApplicant(null);
        setStatusDialogReason('');
    };

    const confirmStatusDialog = async () => {
        if (!statusDialogApplicant || !statusDialogType) return;
        if (statusDialogType === 'Rejected' && !statusDialogReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }
        setStatusDialogSubmitting(true);
        try {
            await handleStatusUpdate(
                statusDialogApplicant.id,
                statusDialogType,
                statusDialogType === 'Rejected' ? statusDialogReason.trim() : undefined,
                statusDialogType === 'Rejected' ? statusDialogShareFeedback : undefined
            );
            setStatusDialogOpen(false);
            setStatusDialogType(null);
            setStatusDialogApplicant(null);
            setStatusDialogReason('');
        } finally {
            setStatusDialogSubmitting(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setViewModalOpen(false);
        setEditingId(null);
        setCurrentJob(null);
        setApplicantStatusTab('Pending');
        setApplicants([]);
        setFormData({
            title: '',
            department: '',
            type: 'Full-time',
            location: '',
            description: '',
            requirements: '',
            salary_range: '',
            status: 'Active',
            jd_url: ''
        });
    };

    const ActionDropdown = ({ job }: { job: any }) => {
        const [isOpen, setIsOpen] = useState(false);
        const dropdownRef = useRef<HTMLDivElement>(null);
        const triggerRef = useRef<HTMLButtonElement>(null);
        const [placeUp, setPlaceUp] = useState(false);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        useEffect(() => {
            if (isOpen && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                setPlaceUp(spaceBelow < 200);
            }
        }, [isOpen]);

        return (
            <div className="relative" ref={dropdownRef}>
                <button
                    ref={triggerRef}
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
                >
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <div
                            className={`fixed z-50 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-200 shadow-black/5 ${placeUp ? 'mb-2' : 'mt-2'}`}
                            style={{
                                left: (triggerRef.current?.getBoundingClientRect().left || 0) - 180 + 'px',
                                top: placeUp ? 'auto' : triggerRef.current?.getBoundingClientRect().bottom! + 'px',
                                bottom: placeUp ? (window.innerHeight - triggerRef.current?.getBoundingClientRect().top!) + 'px' : 'auto'
                            }}
                        >
                            <div className="px-4 py-2 border-b border-gray-100 mb-1 bg-gray-50/50">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Navigation</p>
                            </div>
                            <div className="px-2 space-y-0.5">
                                <button
                                    onClick={() => { handleViewApplicants(job); setIsOpen(false); }}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-black text-gray-700 hover:bg-black hover:text-white rounded-xl transition-all group tracking-widest uppercase"
                                >
                                    <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    <span>View Applicants</span>
                                </button>
                                <button
                                    onClick={() => { handleEdit(job); setIsOpen(false); }}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-black text-gray-700 hover:bg-black hover:text-white rounded-xl transition-all group tracking-widest uppercase"
                                >
                                    <Edit3 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                    <span>Edit Position</span>
                                </button>
                                <div className="border-t border-gray-100 my-1 mx-2" />
                                <button
                                    onClick={() => { handleDelete(job.id); setIsOpen(false); }}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-black text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all group tracking-widest uppercase"
                                >
                                    <Trash2 className="w-4 h-4 group-hover:shake transition-transform" />
                                    <span>Delete Position</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const StatsCard = ({ title, count, icon: Icon, color, onClick, isActive }: any) => {
        const animatedCount = useCountUp(count);

        const colorMap: Record<string, { bg: string; border: string; text: string; textDark: string }> = {
            'blue': { bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-black', textDark: 'text-gray-900' },
            'green': { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-600', textDark: 'text-green-900' },
            'purple': { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-600', textDark: 'text-purple-900' },
            'indigo': { bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-black', textDark: 'text-gray-900' },
            'yellow': { bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-600', textDark: 'text-yellow-900' },
            'red': { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600', textDark: 'text-red-900' },
        };

        const colors = colorMap[color] || { bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-gray-600', textDark: 'text-gray-900' };

        return (
            <div
                onClick={onClick}
                className={`${colors.bg} rounded-xl p-4 border ${colors.border} cursor-pointer transition-all duration-200 ${isActive ? 'ring-2 ring-offset-1 ring-black shadow-md' : 'hover:shadow-md'}`}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}>{title}</p>
                        <h3 className={`text-2xl font-bold mt-1 ${colors.textDark}`}>{animatedCount}</h3>
                    </div>
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                </div>
            </div>
        );
    };

    const exportToExcel = () => {
        const dataToExport = filteredPositions.map(p => ({
            'Position ID': `TT-${p.id}`,
            'Title': p.position_name,
            'Department': p.department,
            'Applications': p.apps_count,
            'Status': p.status
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Applied Positions");
        XLSX.writeFile(wb, "Applied_Positions_Report.xlsx");
        toast.success('Excel report downloaded');
    };

    const pendingApplicantsCount = applicantCounts.pending;
    const referredApplicantsCount = applicantCounts.referred;
    const shortlistedApplicantsCount = applicantCounts.shortlisted;
    const rejectedApplicantsCount = applicantCounts.rejected;

    const totalApplicantPages = applicantsTotal > 0 ? Math.ceil(applicantsTotal / applicantLimit) : 1;
    const safeApplicantPage = Math.min(applicantPage, totalApplicantPages || 1);

    if (viewModalOpen && currentJob) {
        return (
            <>
                <div className="p-4 md:p-6 space-y-4 bg-gray-50/30 min-h-screen">
                    <div className="max-w-6xl mx-auto space-y-4">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-xl h-[85vh] flex flex-col overflow-hidden">
                            {statusDialogOpen && statusDialogType && statusDialogApplicant && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 mx-4">
                                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900">
                                                    {statusDialogType === 'Shortlisted' ? 'Confirm Shortlist' : 'Reject Candidate'}
                                                </h3>
                                                <p className="text-[11px] text-gray-500 mt-1">
                                                    {statusDialogType === 'Shortlisted'
                                                        ? 'Confirm that you want to mark this candidate as shortlisted.'
                                                        : 'Add a short reason so the team knows why this profile was rejected.'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={closeStatusDialog}
                                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div className="px-5 py-4 space-y-4">
                                            <div className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                                                <p className="font-semibold text-gray-900">{statusDialogApplicant.candidate_name}</p>
                                                <p className="text-[11px] text-gray-500 flex items-center gap-2 mt-1">
                                                    <Mail size={11} className="text-gray-400" />
                                                    <span className="break-all">{statusDialogApplicant.candidate_email}</span>
                                                </p>
                                            </div>
                                            {statusDialogType === 'Rejected' && (
                                                <>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-semibold text-gray-700">
                                                            Rejection reason
                                                        </label>
                                                        <textarea
                                                            value={statusDialogReason}
                                                            onChange={(e) => setStatusDialogReason(e.target.value)}
                                                            rows={3}
                                                            className="w-full text-xs rounded-xl border border-gray-200 focus:ring-1 focus:ring-black focus:border-black px-3 py-2 resize-none"
                                                            placeholder="Example: Lacks required experience for this role. Not a fit for current opening."
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setStatusDialogShareFeedback(!statusDialogShareFeedback)}
                                                        className="mt-2 inline-flex items-center gap-2 text-[11px] font-medium text-gray-700"
                                                    >
                                                        <span className={`w-4 h-4 rounded border flex items-center justify-center ${statusDialogShareFeedback ? 'bg-black border-black' : 'bg-white border-gray-300'}`}>
                                                            {statusDialogShareFeedback && <span className="w-2 h-2 bg-white rounded-sm" />}
                                                        </span>
                                                        Send this feedback to candidate in rejection email
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/60">
                                            <button
                                                onClick={closeStatusDialog}
                                                disabled={statusDialogSubmitting}
                                                className="px-3.5 py-1.5 rounded-[0.65rem] text-[11px] font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={confirmStatusDialog}
                                                disabled={statusDialogSubmitting}
                                                className={`px-4 py-1.5 rounded-[0.65rem] text-[11px] font-bold uppercase tracking-wider border transition-all ${statusDialogType === 'Rejected'
                                                    ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                                                    : 'bg-black text-white border-black hover:bg-gray-900'
                                                    } disabled:opacity-60`}
                                            >
                                                {statusDialogSubmitting ? 'Updating...' : statusDialogType}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={closeModal}
                                        className="p-2 rounded-lg hover:bg-white border border-gray-200 text-gray-600"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Applicants for {currentJob.position_name}</h2>
                                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5 uppercase tracking-widest">Reviewing {applicants.length} candidates</p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="p-2 rounded-lg hover:bg-white border border-gray-200 text-gray-500"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                                <div className="mb-4 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                onClick={() => setApplicantStatusTab('Pending')}
                                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${applicantStatusTab === 'Pending'
                                                    ? 'bg-black text-white border-black shadow-sm'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <span>Pending</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 border border-white/40">
                                                    {pendingApplicantsCount}
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => setApplicantStatusTab('Referred')}
                                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${applicantStatusTab === 'Referred'
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <span>Referred</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 border border-white/40">
                                                    {referredApplicantsCount}
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => setApplicantStatusTab('Shortlisted')}
                                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${applicantStatusTab === 'Shortlisted'
                                                    ? 'bg-green-600 text-white border-green-600 shadow-sm'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <span>Shortlisted</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 border border-white/40">
                                                    {shortlistedApplicantsCount}
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => setApplicantStatusTab('Rejected')}
                                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${applicantStatusTab === 'Rejected'
                                                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <span>Rejected</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 border border-white/40">
                                                    {rejectedApplicantsCount}
                                                </span>
                                            </button>
                                        </div>
                                        {applicants.length > 0 && (
                                            <div className="flex items-center gap-2 w-full md:w-auto">
                                                <div className="relative flex-1 md:w-64">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                    <input
                                                        type="text"
                                                        value={applicantSearch}
                                                        onChange={(e) => setApplicantSearch(e.target.value)}
                                                        placeholder="Search by candidate, email or phone..."
                                                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-xs font-medium"
                                                    />
                                                </div>
                                                <div className="hidden md:flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                                                    <span>Rows</span>
                                                    <select
                                                        value={applicantLimit}
                                                        onChange={(e) => { setApplicantLimit(Number(e.target.value)); setApplicantPage(1); }}
                                                        className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-[11px] font-semibold outline-none focus:ring-1 focus:ring-black"
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {applicants.length > 0 && (
                                        <div className="flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                                            <span>
                                                {applicantsTotal} {applicantStatusTab.toLowerCase()} candidate{applicantsTotal === 1 ? '' : 's'} found
                                                {applicantSearch.trim() && ' (filtered)'}
                                            </span>
                                            <div className="md:hidden flex items-center gap-1.5">
                                                <span>Rows</span>
                                                <select
                                                    value={applicantLimit}
                                                    onChange={(e) => { setApplicantLimit(Number(e.target.value)); setApplicantPage(1); }}
                                                    className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-[11px] font-semibold outline-none focus:ring-1 focus:ring-black"
                                                >
                                                    <option value={5}>5</option>
                                                    <option value={10}>10</option>
                                                    <option value={20}>20</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {loading ? (
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="overflow-y-auto max-h-[480px] overflow-x-auto relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr>
                                                        <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">Candidate</th>
                                                        <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">Contact</th>
                                                        <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">Experience</th>
                                                        <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">Attachments</th>
                                                        <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                                                        <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {[1, 2, 3, 4, 5].map((i) => (
                                                        <tr key={i} className="animate-pulse">
                                                            <td className="px-4 py-3">
                                                                <div className="h-4 w-32 bg-gray-100 rounded" />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="space-y-2">
                                                                    <div className="h-3 w-40 bg-gray-100 rounded" />
                                                                    <div className="h-3 w-32 bg-gray-100 rounded" />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="h-3 w-24 bg-gray-100 rounded" />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="h-3 w-24 bg-gray-100 rounded" />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="h-5 w-16 bg-gray-100 rounded-full" />
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="h-7 w-24 bg-gray-100 rounded-lg ml-auto" />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : applicants.length === 0 ? (
                                    <div className="text-center py-20">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📭</div>
                                        <h3 className="text-lg font-black text-gray-400">No Applications Yet</h3>
                                        <p className="text-gray-400 text-sm mt-2">Check back later for new candidates.</p>
                                    </div>
                                ) : applicants.length === 0 ? (
                                    <div className="text-center py-16">
                                        <h3 className="text-sm font-bold text-gray-500">
                                            No candidates in {applicantStatusTab.toLowerCase()} tab
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Try adjusting search or switching to a different status.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                            <div className="overflow-y-auto max-h-[480px] overflow-x-auto relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                                <table className="w-full border-collapse">
                                                    <thead>
                                                        <tr>
                                                            <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                                                Candidate
                                                            </th>
                                                            <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                                                Contact
                                                            </th>
                                                            <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                                                Experience
                                                            </th>
                                                            <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                                                Attachments
                                                            </th>
                                                            <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                                                Status
                                                            </th>
                                                            <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                                                Actions
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {applicants.map((app: any) => (
                                                            <React.Fragment key={app.id}>
                                                                <tr className="hover:bg-gray-50/60 transition-colors">
                                                                    <td className="px-4 py-3 align-top">
                                                                        <div className="flex flex-col gap-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <h3 className="text-sm font-bold text-gray-900">
                                                                                    {app.candidate_name}
                                                                                </h3>
                                                                                <div className="flex gap-1.5 flex-wrap">
                                                                                    <span
                                                                                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${app.status === 'Shortlisted'
                                                                                            ? 'bg-green-50 text-green-700 border-green-200'
                                                                                            : app.status === 'Rejected'
                                                                                                ? 'bg-red-50 text-red-500 border-red-200'
                                                                                                : 'bg-gray-50 text-gray-600 border-gray-200'
                                                                                            }`}
                                                                                    >
                                                                                        {app.status}
                                                                                    </span>
                                                                                    {app.tech_test_status && (
                                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${app.tech_test_status === 'Completed' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                                                                                            Test: {app.tech_test_status === 'Completed' ? (app.tech_test_score != null ? `${app.tech_test_score}%` : 'Pending Review') : app.tech_test_status}
                                                                                        </span>
                                                                                    )}
                                                                                    {app.referrer_first_name && (
                                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1">
                                                                                            <Users size={10} />
                                                                                            Ref: {app.referrer_first_name} {app.referrer_last_name}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-[11px] text-gray-500 font-medium">
                                                                                {app.current_city || '-'}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 align-top">
                                                                        <div className="space-y-1 text-[11px] text-gray-600 font-medium">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Mail size={12} className="text-gray-400" />
                                                                                <span className="break-all">{app.candidate_email}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Phone size={12} className="text-gray-400" />
                                                                                <span>{app.candidate_phone}</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 align-top">
                                                                        <div className="space-y-1 text-[11px] text-gray-600 font-medium">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Briefcase size={12} className="text-gray-400" />
                                                                                <span>{app.total_experience || 'N/A'} Exp</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Clock size={12} className="text-gray-400" />
                                                                                <span>{app.notice_period || 'N/A'} notice</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 align-top">
                                                                        <div className="flex flex-col gap-1 text-[11px] font-semibold text-gray-700">
                                                                            {app.resume_url && (
                                                                                <a
                                                                                    href={app.resume_url}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black"
                                                                                >
                                                                                    <Download size={12} />
                                                                                    <span>Resume</span>
                                                                                </a>
                                                                            )}
                                                                            {app.portfolio_link && (
                                                                                <a
                                                                                    href={app.portfolio_link}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black"
                                                                                >
                                                                                    <ExternalLink size={12} />
                                                                                    <span>Portfolio</span>
                                                                                </a>
                                                                            )}
                                                                            {!app.resume_url && !app.portfolio_link && (
                                                                                <span className="text-[11px] text-gray-400 font-medium">
                                                                                    No attachments
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 align-top">
                                                                        <span
                                                                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${app.status === 'Shortlisted'
                                                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                                                : app.status === 'Rejected'
                                                                                    ? 'bg-red-50 text-red-500 border-red-200'
                                                                                    : 'bg-gray-50 text-gray-600 border-gray-200'
                                                                                }`}
                                                                        >
                                                                            {app.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 align-top text-right">
                                                                        <div className="flex flex-col items-end gap-2">
                                                                            <div className="flex flex-wrap justify-end gap-2">
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        setViewDetailsApplicant(app);
                                                                                        setViewDetailsOpen(true);
                                                                                        setHistoryLoading(true);
                                                                                        setApplicationHistory([]);
                                                                                        setApplicationNotes([]);
                                                                                        try {
                                                                                            const res = await apiClient.get(`/hr-operation/applications/${app.id}/history`, {}, { withAuth: true });
                                                                                            if (res.success) {
                                                                                                setApplicationHistory(res.data || []);
                                                                                            }
                                                                                        } catch (err) {
                                                                                            console.error('Failed to fetch application history', err);
                                                                                        } finally {
                                                                                            setHistoryLoading(false);
                                                                                        }
                                                                                    }}
                                                                                    className="px-4 py-1.5 bg-white text-gray-900 text-[10px] font-black uppercase tracking-widest rounded-xl border border-gray-300 hover:bg-gray-900 hover:text-white transition-all shadow-sm"
                                                                                >
                                                                                    View Details
                                                                                </button>
                                                                                {app.status === 'Applied' && (
                                                                                    <button
                                                                                        onClick={() => openStatusDialog(app, 'Shortlisted')}
                                                                                        className="px-3 py-1.5 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-500/20"
                                                                                    >
                                                                                        Shortlist
                                                                                    </button>
                                                                                )}
                                                                                <button
                                                                                    onClick={() => openStatusDialog(app, 'Rejected')}
                                                                                    className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                                                                                >
                                                                                    Reject
                                                                                </button>
                                                                            </div>
                                                                            {applicantStatusTab === 'Referred' && (
                                                                                <button
                                                                                    onClick={() => handleSendReminder(app.id)}
                                                                                    className="px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                                                                                >
                                                                                    <Mail size={12} /> Send Reminder
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                {false && (
                                                                    <tr className="bg-gray-50/60">
                                                                        <td colSpan={6} className="px-4 py-4">
                                                                            <div className="animate-in slide-in-from-top-2 duration-300">
                                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                                                    <div className="space-y-8">
                                                                                        {/* Candidate Journey Timeline */}
                                                                                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                                                                                            <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-6 flex items-center gap-2">
                                                                                                <History size={14} />
                                                                                                Candidate Journey
                                                                                            </h4>
                                                                                            <div className="space-y-1">
                                                                                                {historyLoading ? (
                                                                                                    <div className="py-10 flex flex-col items-center justify-center gap-2">
                                                                                                        <div className="w-5 h-5 border-2 border-black/10 border-t-black rounded-full animate-spin" />
                                                                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading History...</span>
                                                                                                    </div>
                                                                                                ) : applicationHistory.length === 0 ? (
                                                                                                    <div className="py-10 text-center">
                                                                                                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No history found</span>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    applicationHistory.map((log: any) => (
                                                                                                        <TimelineItem key={log.id} log={log} />
                                                                                                    ))
                                                                                                )}
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                                                                                            <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-6 flex items-center gap-2">
                                                                                                <FileText size={14} />
                                                                                                Notes
                                                                                            </h4>
                                                                                            <div className="space-y-3">
                                                                                                {historyLoading ? (
                                                                                                    <div className="py-10 flex flex-col items-center justify-center gap-2">
                                                                                                        <div className="w-5 h-5 border-2 border-black/10 border-t-black rounded-full animate-spin" />
                                                                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading Notes...</span>
                                                                                                    </div>
                                                                                                ) : (applicationNotes || []).length === 0 ? (
                                                                                                    <div className="py-10 text-center">
                                                                                                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No notes found</span>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    (applicationNotes || []).map((note: any) => (
                                                                                                        <div key={note.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                                                                                                            <p className="text-[11px] text-gray-700 leading-relaxed mb-2">{note.note}</p>
                                                                                                            <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
                                                                                                                <span>{note.created_by}</span>
                                                                                                                <span>{new Date(note.created_at).toLocaleDateString()}</span>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="space-y-8">
                                                                                        <div className="space-y-3">
                                                                                            <h4 className="text-[9px] uppercase font-bold text-gray-400 tracking-widest border-b border-gray-100 pb-1.5">
                                                                                                Personal Details
                                                                                            </h4>
                                                                                            <div className="grid grid-cols-1 gap-2.5">
                                                                                                <div>
                                                                                                    <span className="text-gray-400 font-semibold block mb-0.5">Full Name</span>
                                                                                                    <p className="font-bold text-gray-900">{app.candidate_name || 'N/A'}</p>
                                                                                                </div>
                                                                                                <div className="grid grid-cols-2 gap-3">
                                                                                                    <div>
                                                                                                        <span className="text-gray-400 font-semibold block mb-0.5">Email</span>
                                                                                                        <p className="font-bold text-gray-900 break-all">{app.candidate_email || 'N/A'}</p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <span className="text-gray-400 font-semibold block mb-0.5">Phone</span>
                                                                                                        <p className="font-bold text-gray-900">{app.candidate_phone || 'N/A'}</p>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="grid grid-cols-2 gap-3">
                                                                                                    <div>
                                                                                                        <span className="text-gray-400 font-semibold block mb-0.5">DOB</span>
                                                                                                        <p className="font-bold text-gray-900">
                                                                                                            {app.dob ? new Date(app.dob).toLocaleDateString() : 'N/A'}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <span className="text-gray-400 font-semibold block mb-0.5">Gender</span>
                                                                                                        <p className="font-bold text-gray-900">{app.gender || 'N/A'}</p>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <span className="text-gray-400 font-semibold block mb-0.5">Current City</span>
                                                                                                    <p className="font-bold text-gray-900">{app.current_city || 'N/A'}</p>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="space-y-3">
                                                                                            <h4 className="text-[9px] uppercase font-bold text-gray-400 tracking-widest border-b border-gray-100 pb-1.5">
                                                                                                Professional Information
                                                                                            </h4>
                                                                                            <div className="grid grid-cols-1 gap-2.5">
                                                                                                <div className="grid grid-cols-2 gap-3">
                                                                                                    <div>
                                                                                                        <span className="text-gray-400 font-semibold block mb-0.5">Total Experience</span>
                                                                                                        <p className="font-bold text-gray-900">{app.total_experience || 'N/A'}</p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <span className="text-gray-400 font-semibold block mb-0.5">Relevant Experience</span>
                                                                                                        <p className="font-bold text-gray-900">{app.relevant_experience || 'N/A'}</p>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="grid grid-cols-2 gap-3">
                                                                                                    <div>
                                                                                                        <span className="text-gray-400 font-semibold block mb-0.5">Current Company</span>
                                                                                                        <p className="font-bold text-gray-900">{app.current_company || 'N/A'}</p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <span className="text-gray-400 font-semibold block mb-0.5">Designation</span>
                                                                                                        <p className="font-bold text-gray-900">{app.current_designation || 'N/A'}</p>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="grid grid-cols-2 gap-3">
                                                                                                    <div>
                                                                                                        <span className="text-gray-400 font-semibold block mb-0.5">Current Salary</span>
                                                                                                        <p className="font-bold text-gray-900">{app.current_salary || 'N/A'}</p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <span className="text-gray-400 font-semibold block mb-0.5">Expected Salary</span>
                                                                                                        <p className="font-bold text-gray-900">{app.expected_salary || 'N/A'}</p>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <span className="text-gray-400 font-semibold block mb-0.5">Notice Period</span>
                                                                                                    <p className="font-bold text-gray-900">{app.notice_period || 'N/A'}</p>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="space-y-3">
                                                                                            <h4 className="text-[9px] uppercase font-bold text-gray-400 tracking-widest border-b border-gray-100 pb-1.5">
                                                                                                Education & Attachments
                                                                                            </h4>
                                                                                            <div className="grid grid-cols-1 gap-2.5">
                                                                                                <div>
                                                                                                    <span className="text-gray-400 font-semibold block mb-0.5">Highest Education</span>
                                                                                                    <p className="font-bold text-gray-900">{app.highest_education || 'N/A'}</p>
                                                                                                </div>
                                                                                                <div className="grid grid-cols-2 gap-3">
                                                                                                    <div>
                                                                                                        <span className="text-gray-400 font-semibold block mb-0.5">Passing Year</span>
                                                                                                        <p className="font-bold text-gray-900">{app.year_of_passing || 'N/A'}</p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <span className="text-gray-400 font-semibold block mb-0.5">Specialization</span>
                                                                                                        <p className="font-bold text-gray-900">{app.specialization || 'N/A'}</p>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="pt-2 mt-2 border-t border-gray-100 grid grid-cols-1 gap-2.5">
                                                                                                    <div>
                                                                                                        <span className="text-gray-400 font-semibold block mb-0.5">Resume File</span>
                                                                                                        <p className="font-bold text-gray-900">{app.resume_url ? 'Attached' : 'Not attached'}</p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <span className="text-gray-400 font-semibold block mb-0.5">Resume Link</span>
                                                                                                        <p className="font-bold text-gray-900 break-all">{app.resume_link || 'N/A'}</p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <span className="text-gray-400 font-semibold block mb-0.5">Portfolio / LinkedIn</span>
                                                                                                        <p className="font-bold text-gray-900 break-all">{app.portfolio_link || 'N/A'}</p>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                    {((app.status === 'Rejected' && app.rejection_reason) || app.status_updated_by) && (
                                                                                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                            {app.status === 'Rejected' && app.rejection_reason && (
                                                                                                <div className="bg-red-50/60 border border-red-100 rounded-2xl p-4">
                                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                                        <p className="text-[10px] uppercase font-bold text-red-500 tracking-widest">
                                                                                                            Rejection Reason
                                                                                                        </p>
                                                                                                    </div>
                                                                                                    <p className="text-[11px] text-red-700 leading-relaxed">
                                                                                                        {app.rejection_reason}
                                                                                                    </p>
                                                                                                </div>
                                                                                            )}
                                                                                            {app.status_updated_by && (
                                                                                                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                                                                                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                                                                                                        Last Updated By
                                                                                                    </p>
                                                                                                    <p className="text-[11px] font-semibold text-gray-800">
                                                                                                        {app.status_updated_by}
                                                                                                    </p>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}

                                                                                    {(app.work_experience || app.academic_history) && (
                                                                                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                                            {app.work_experience && (
                                                                                                <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                                                                                                    <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                                                                                                        Work Experience
                                                                                                    </h4>
                                                                                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                                                                                                        {(() => {
                                                                                                            try {
                                                                                                                const exp = typeof app.work_experience === 'string' ? JSON.parse(app.work_experience) : app.work_experience;
                                                                                                                return Array.isArray(exp) && exp.length > 0 ? (
                                                                                                                    <div className="space-y-4">
                                                                                                                        {exp.map((e: any, i: number) => (
                                                                                                                            <div key={i} className="relative pl-6 pb-4 last:pb-0 border-l border-indigo-100/50">
                                                                                                                                <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white shadow-sm ring-2 ring-indigo-50" />
                                                                                                                                <h5 className="text-xs font-black text-gray-900 leading-tight uppercase tracking-tight">{e.designation}</h5>
                                                                                                                                <div className="text-[11px] font-bold text-indigo-600 mt-0.5">{e.company}</div>
                                                                                                                                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-1.5 flex items-center gap-1.5 bg-gray-50 w-fit px-2 py-0.5 rounded-md border border-gray-100">
                                                                                                                                    <Calendar size={10} /> {e.duration}
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        ))}
                                                                                                                    </div>
                                                                                                                ) : (
                                                                                                                    <div className="text-[11px] font-bold text-gray-400 text-center py-4 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                                                                                                                        No work experience listed
                                                                                                                    </div>
                                                                                                                );
                                                                                                            } catch (err) {
                                                                                                                return <div className="text-[11px] text-red-500 font-bold">Error loading experience data</div>;
                                                                                                            }
                                                                                                        })()}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {app.academic_history && (
                                                                                                <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                                                                                                    <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                                                                                                        Academic History
                                                                                                    </h4>
                                                                                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                                                                                                        {(() => {
                                                                                                            try {
                                                                                                                const acad = typeof app.academic_history === 'string' ? JSON.parse(app.academic_history) : app.academic_history;
                                                                                                                return Array.isArray(acad) && acad.length > 0 ? (
                                                                                                                    <div className="space-y-4">
                                                                                                                        {acad.map((e: any, i: number) => (
                                                                                                                            <div key={i} className="relative pl-6 pb-4 last:pb-0 border-l border-emerald-100/50">
                                                                                                                                <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm ring-2 ring-emerald-50" />
                                                                                                                                <h5 className="text-xs font-black text-gray-900 leading-tight uppercase tracking-tight">{e.degree}</h5>
                                                                                                                                <div className="text-[11px] font-bold text-emerald-600 mt-0.5">{e.university || e.institute}</div>
                                                                                                                                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-1.5 flex items-center gap-1.5 bg-gray-50 w-fit px-2 py-0.5 rounded-md border border-gray-100">
                                                                                                                                    <Calendar size={10} /> Class of {e.year}
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        ))}
                                                                                                                    </div>
                                                                                                                ) : (
                                                                                                                    <div className="text-[11px] font-bold text-gray-400 text-center py-4 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                                                                                                                        No academic record listed
                                                                                                                    </div>
                                                                                                                );
                                                                                                            } catch (err) {
                                                                                                                return <div className="text-[11px] text-red-500 font-bold">Error loading academic data</div>;
                                                                                                            }
                                                                                                        })()}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {totalApplicantPages > 1 && (
                                            <div className="flex items-center justify-between mt-2 text-[11px] font-medium text-gray-600">
                                                <p>
                                                    Page {safeApplicantPage} of {totalApplicantPages} • {applicantsTotal} candidate{applicantsTotal === 1 ? '' : 's'}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={safeApplicantPage === 1}
                                                        onClick={() => setApplicantPage((prev) => Math.max(1, prev - 1))}
                                                        className="px-3 py-1 rounded-full border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-black hover:text-black disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        Previous
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={safeApplicantPage === totalApplicantPages}
                                                        onClick={() => setApplicantPage((prev) => Math.min(totalApplicantPages, prev + 1))}
                                                        className="px-3 py-1 rounded-full border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-black hover:text-black disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {viewDetailsOpen && viewDetailsApplicant && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-black uppercase">
                                        {String(viewDetailsApplicant.candidate_name || '?').slice(0, 2)}
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">
                                            Candidate Profile
                                        </h2>
                                        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">
                                            {viewDetailsApplicant.candidate_name} • {viewDetailsApplicant.current_city || 'Location not specified'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewDetailsOpen(false)}
                                    className="p-2 rounded-lg hover:bg-white border border-gray-200 text-gray-500"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/40">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Left Column: Personal & Professional */}
                                    <div className="space-y-6">
                                        {/* Application Progress */}
                                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                            <h3 className="text-[10px] uppercase font-black text-indigo-500 tracking-widest mb-4 flex items-center gap-2">
                                                <Send size={14} />
                                                Application Progress
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4 text-[11px]">
                                                <div>
                                                    <span className="text-gray-400 font-semibold block mb-0.5">Applied At</span>
                                                    <p className="font-bold text-gray-900">{viewDetailsApplicant.applied_at ? new Date(viewDetailsApplicant.applied_at).toLocaleString() : 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 font-semibold block mb-0.5">Status</span>
                                                    <p className="font-bold text-gray-900">{viewDetailsApplicant.status || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 font-semibold block mb-0.5">Interview Stage</span>
                                                    <p className="font-bold text-gray-900 text-indigo-600">{viewDetailsApplicant.interview_stage || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 font-semibold block mb-0.5">Assigned To</span>
                                                    <p className="font-bold text-gray-900">{viewDetailsApplicant.assigned_by_name || 'Not Assigned'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Personal Details */}
                                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                            <h3 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                                                <Users size={14} />
                                                Personal Details
                                            </h3>
                                            <div className="grid grid-cols-1 gap-3 text-[11px]">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-gray-400 font-semibold block mb-0.5">DOB</span>
                                                        <p className="font-bold text-gray-900">
                                                            {viewDetailsApplicant.dob ? new Date(viewDetailsApplicant.dob).toLocaleDateString() : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 font-semibold block mb-0.5">Gender</span>
                                                        <p className="font-bold text-gray-900">{viewDetailsApplicant.gender || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-gray-400 font-semibold block mb-0.5">Email</span>
                                                        <p className="font-bold text-gray-900 break-all">{viewDetailsApplicant.candidate_email || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 font-semibold block mb-0.5">Phone</span>
                                                        <p className="font-bold text-gray-900">{viewDetailsApplicant.candidate_phone || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Professional Information */}
                                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                            <h3 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                                                <Briefcase size={14} />
                                                Professional Information
                                            </h3>
                                            <div className="grid grid-cols-1 gap-3 text-[11px]">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-gray-400 font-semibold block mb-0.5">Experience (T/R)</span>
                                                        <p className="font-bold text-gray-900">
                                                            {viewDetailsApplicant.total_experience || '0'}y / {viewDetailsApplicant.relevant_experience || '0'}y
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 font-semibold block mb-0.5">Notice Period</span>
                                                        <p className="font-bold text-gray-900">{viewDetailsApplicant.notice_period || 'N/A'} Days</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-gray-400 font-semibold block mb-0.5">Current Company</span>
                                                        <p className="font-bold text-gray-900">{viewDetailsApplicant.current_company || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 font-semibold block mb-0.5">Current Role</span>
                                                        <p className="font-bold text-gray-900">{viewDetailsApplicant.current_designation || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-gray-400 font-semibold block mb-0.5">Salary (C/E)</span>
                                                        <p className="font-bold text-gray-900">
                                                            {viewDetailsApplicant.current_salary || 'N/A'} / {viewDetailsApplicant.expected_salary || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Education, History & Referrals */}
                                    <div className="space-y-6">
                                        {/* Referral Information */}
                                        {viewDetailsApplicant.referrer_first_name && (
                                            <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-5 shadow-sm">
                                                <h3 className="text-[10px] uppercase font-black text-indigo-600 tracking-widest mb-3 flex items-center gap-2">
                                                    <Award size={14} />
                                                    Referral Details
                                                </h3>
                                                <div className="text-[11px]">
                                                    <p className="text-gray-500 font-semibold">Referred By</p>
                                                    <p className="font-bold text-indigo-700 text-sm">
                                                        {viewDetailsApplicant.referrer_first_name} {viewDetailsApplicant.referrer_last_name}
                                                        <span className="ml-2 text-[10px] text-indigo-400 font-medium">(ID: {viewDetailsApplicant.referred_by_employee_id})</span>
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Education & Attachments */}
                                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                            <h3 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                                                <Award size={14} />
                                                Education & Attachments
                                            </h3>
                                            <div className="grid grid-cols-1 gap-3 text-[11px]">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-gray-400 font-semibold block mb-0.5">Highest Education</span>
                                                        <p className="font-bold text-gray-900">{viewDetailsApplicant.highest_education || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 font-semibold block mb-0.5">Specialization</span>
                                                        <p className="font-bold text-gray-900">{viewDetailsApplicant.specialization || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {viewDetailsApplicant.resume_url && (
                                                        <a href={viewDetailsApplicant.resume_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-black transition-all">
                                                            <Download size={12} /> Resume File
                                                        </a>
                                                    )}
                                                    {viewDetailsApplicant.portfolio_link && (
                                                        <a href={viewDetailsApplicant.portfolio_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-900 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-gray-50 transition-all">
                                                            <ExternalLink size={12} /> Portfolio
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Work Experience Parsed */}
                                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                            <h3 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-4">
                                                Work History Details
                                            </h3>
                                            {(() => {
                                                try {
                                                    const exp = typeof viewDetailsApplicant.work_experience === 'string' ? JSON.parse(viewDetailsApplicant.work_experience) : viewDetailsApplicant.work_experience;
                                                    return Array.isArray(exp) && exp.length > 0 ? (
                                                        <div className="space-y-4">
                                                            {exp.map((e: any, i: number) => (
                                                                <div key={i} className="border-l-2 border-indigo-50 pl-4 relative">
                                                                    <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-indigo-500" />
                                                                    <p className="text-[10px] font-black text-gray-900 uppercase"> {e.designation}</p>
                                                                    <p className="text-[11px] font-bold text-indigo-600">{e.company}</p>
                                                                    <p className="text-[10px] text-gray-400 font-medium mt-1">{e.duration}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : <p className="text-[11px] text-gray-400 italic">No detailed work history provided</p>;
                                                } catch (e) { return null; }
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Section: Rejection/Tech Test if exists */}
                                <div className="mt-8 space-y-6">

                                    {((viewDetailsApplicant.status === 'Rejected' && viewDetailsApplicant.rejection_reason) ||
                                        viewDetailsApplicant.status_updated_by) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {viewDetailsApplicant.status === 'Rejected' &&
                                                    viewDetailsApplicant.rejection_reason && (
                                                        <div className="bg-red-50/60 border border-red-100 rounded-2xl p-4">
                                                            <p className="text-[10px] uppercase font-bold text-red-500 tracking-widest mb-1">
                                                                Rejection Reason
                                                            </p>
                                                            <p className="text-[11px] text-red-700 leading-relaxed">
                                                                {viewDetailsApplicant.rejection_reason}
                                                            </p>
                                                        </div>
                                                    )}
                                                {viewDetailsApplicant.status_updated_by && (
                                                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                                                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                                                            Last Updated By
                                                        </p>
                                                        <p className="text-[11px] font-semibold text-gray-800">
                                                            {viewDetailsApplicant.status_updated_by}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                    {viewDetailsApplicant.tech_test_status && (
                                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm max-w-md">
                                            <h3 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                                                <ShieldCheck size={14} />
                                                Technical Assessment
                                            </h3>
                                            {(() => {
                                                const ai =
                                                    viewDetailsApplicant.tech_test_ai
                                                        ? (typeof viewDetailsApplicant.tech_test_ai === 'string'
                                                            ? JSON.parse(viewDetailsApplicant.tech_test_ai)
                                                            : viewDetailsApplicant.tech_test_ai)
                                                        : null;
                                                return (
                                                    <div className="flex flex-col gap-3 text-[11px]">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-500 font-semibold">Status</span>
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${viewDetailsApplicant.tech_test_status === 'Completed'
                                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                    }`}
                                                            >
                                                                {viewDetailsApplicant.tech_test_status}
                                                            </span>
                                                        </div>
                                                        {viewDetailsApplicant.tech_test_score != null && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-gray-500 font-semibold">Overall Score</span>
                                                                <span className="text-sm font-black text-gray-900">
                                                                    {viewDetailsApplicant.tech_test_score}%
                                                                </span>
                                                            </div>
                                                        )}
                                                        {ai && ai.descriptive_score_out_of_100 != null && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-gray-500 font-semibold">AI Accuracy</span>
                                                                <span className="text-sm font-black text-gray-900">
                                                                    {ai.descriptive_score_out_of_100}%
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-4 bg-gray-50/30 min-h-screen">
            {/* 1. Header Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-2 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="px-2">
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Applied Positions</h1>
                        {/* <p className="text-xs text-gray-400 font-semibold mt-1 uppercase tracking-widest">Recruitment Lifecycle & Application Tracking</p> */}
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white text-gray-700 rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition-all font-semibold text-sm"
                        >
                            <Download size={16} />
                            <span>Export</span>
                        </button>
                        <button
                            onClick={() => { closeModal(); setIsModalOpen(true); }}
                            className="flex items-center gap-2 px-4 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-all shadow-sm font-bold text-sm whitespace-nowrap"
                        >
                            <Plus size={16} />
                            <span>Post Position</span>
                        </button>
                        <div className="h-6 w-px bg-gray-200 mx-1"></div>
                        <button
                            onClick={() => setFiltersExpanded(!filtersExpanded)}
                            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-all font-semibold text-sm ${filtersExpanded ? 'bg-black text-white border-black focus:ring-1 focus:ring-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                            <Filter size={16} />
                            <span>Filters</span>
                            {filtersExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    </div>
                </div>

                {/* Collapsible Filters */}
                {filtersExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200 px-2 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search by position name or department..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none transition-all text-sm font-medium"
                                />
                            </div>
                            <div className="relative">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none transition-all text-sm font-medium appearance-none cursor-pointer"
                                >
                                    <option value="All">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Closed">Closed</option>
                                    <option value="Draft">Draft</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4" size={14} />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setStatusFilter('All'); setSearchQuery(''); }}
                                    className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-xs uppercase tracking-widest rounded-lg transition-all"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Pool"
                    count={positions.reduce((acc, curr) => acc + (curr.apps_count || 0), 0)}
                    icon={Users}
                    color="blue"
                    onClick={() => setStatusFilter('All')}
                    isActive={statusFilter === 'All' && !searchQuery}
                />
                <StatsCard
                    title="Active Jobs"
                    count={positions.filter(p => p.status === 'Active').length}
                    icon={Briefcase}
                    color="green"
                    onClick={() => setStatusFilter('Active')}
                    isActive={statusFilter === 'Active'}
                />
                <StatsCard
                    title="Shortlisted"
                    count={shortlistedCount}
                    icon={Award}
                    color="purple"
                    onClick={() => { }}
                    isActive={false}
                />
                <StatsCard
                    title="All Job Post"
                    count={positions.length}
                    icon={LayoutGrid}
                    color="indigo"
                    onClick={() => setStatusFilter('All')}
                    isActive={false}
                />
            </div>

            {/* 3. Table Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-y-auto max-h-[480px] overflow-x-auto relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Position Detail
                                </th>
                                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Department
                                </th>
                                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Applicants
                                </th>
                                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    State
                                </th>
                                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin"></div>
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Synchronizing Data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPositions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3 text-gray-300">
                                            <Briefcase size={40} className="opacity-20" />
                                            <p className="text-sm font-bold">No Records Found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPositions.slice((page - 1) * limit, page * limit).map((job) => (
                                <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-900 transition-colors text-sm">{job.position_name}</span>
                                                {job.jd_url && (
                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-tighter border border-blue-100" title="Job Description Attached">
                                                        <FileText size={10} /> JD
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-tighter">ID: TT-{job.id}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-gray-600 font-medium">{job.department}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 text-gray-600 text-sm">
                                            <Users className="w-3.5 h-3.5" />
                                            <span>{job.apps_count}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${job.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                            {job.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <ActionDropdown job={job} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 4. Pagination bar */}
                {filteredPositions.length > 0 && (
                    <div className="bg-white border-t border-gray-200 p-2 flex items-center justify-between">
                        <div className="text-[10px] font-semibold text-gray-500 px-2 uppercase tracking-widest">
                            Page {page} of {Math.ceil(filteredPositions.length / limit)} ({filteredPositions.length} items)
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Rows:</span>
                                <select
                                    value={limit}
                                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                    className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-black"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    disabled={page >= Math.ceil(filteredPositions.length / limit)}
                                    onClick={() => setPage(p => p + 1)}
                                    className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-50 text-black rounded-lg">
                                        <Briefcase size={20} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {editingId ? 'Edit Position' : 'Post New Opening'}
                                    </h3>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Job Title *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g., Senior DevOps Engineer"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black focus:border-transparent font-medium transition-all text-sm"
                                    />
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">INTERNAL IDENTIFIER</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Department *</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={formData.department}
                                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black focus:border-transparent appearance-none font-medium text-sm"
                                        >
                                            <option value="">Select Department</option>
                                            {allDepartments.map((dept: any) => (
                                                <option key={dept.id} value={dept.name}>{dept.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">ORGANIZATIONAL UNIT</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Employment Type</label>
                                    <div className="relative">
                                        <select
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black focus:border-transparent appearance-none font-medium text-sm"
                                        >
                                            <option>Full-time</option>
                                            <option>Part-time</option>
                                            <option>Contract</option>
                                            <option>Internship</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Work Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input
                                            type="text"
                                            placeholder="London, UK (Hybrid)"
                                            value={formData.location}
                                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium transition-all text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Salary Range</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input
                                            type="text"
                                            placeholder="e.g., £60k - £85k"
                                            value={formData.salary_range}
                                            onChange={e => setFormData({ ...formData, salary_range: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium transition-all text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Visible Status</label>
                                    <div className="relative">
                                        <select
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black focus:border-transparent appearance-none font-medium text-sm"
                                        >
                                            <option>Active</option>
                                            <option>Closed</option>
                                            <option>Draft</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Job Description *</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="Outline the core responsibilities and team mission..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black focus:border-transparent font-medium transition-all text-sm resize-none"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Minimum Requirements</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Experience, technologies, soft skills..."
                                        value={formData.requirements}
                                        onChange={e => setFormData({ ...formData, requirements: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black focus:border-transparent font-medium transition-all text-sm resize-none"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1.5 pt-2">
                                    <label className="text-sm font-semibold text-gray-700">Detailed Job Description (Optional)</label>
                                    <input
                                        type="file"
                                        ref={jdInputRef}
                                        onChange={handleJDUpload}
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    />
                                    <div
                                        onClick={() => jdInputRef.current?.click()}
                                        className={`w-full p-6 border-2 border-dashed rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${formData.jd_url
                                            ? 'bg-green-50 border-green-200'
                                            : uploadingJD
                                                ? 'bg-gray-50 border-gray-200 animate-pulse'
                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                            }`}
                                    >
                                        {uploadingJD ? (
                                            <>
                                                <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
                                                <span className="text-xs font-bold text-black uppercase tracking-widest">Uploading JD...</span>
                                            </>
                                        ) : formData.jd_url ? (
                                            <>
                                                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-sm">
                                                    <FileText size={20} />
                                                </div>
                                                <span className="text-xs font-bold text-green-700 uppercase tracking-widest">JD Uploaded Successfully</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-green-500 font-medium truncate max-w-[200px]">
                                                        {formData.jd_url.split('/').pop()}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFormData({ ...formData, jd_url: '' });
                                                            if (jdInputRef.current) jdInputRef.current.value = '';
                                                        }}
                                                        className="p-1 hover:bg-red-50 text-red-500 rounded-md transition-all group/remove"
                                                        title="Remove Attachment"
                                                    >
                                                        <XCircle size={14} className="group-hover/remove:scale-110 transition-transform" />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 bg-white border border-gray-200 text-gray-400 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                                    <Upload size={18} />
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest block">Upload JD File</span>
                                                    <span className="text-[10px] text-gray-400 font-medium">PDF, DOC, or Images up to 5MB</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50/30">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-bold text-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-bold text-sm transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                            >
                                {submitting ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <Send size={16} />
                                )}
                                <span>{editingId ? 'Update Position' : 'Publish Position'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export const TimelineItem = ({ log }: { log: any }) => {
    const getStatusIcon = (type: string) => {
        switch (type) {
            case 'Shortlisted': return <CheckCircle2 size={14} className="text-emerald-500" />;
            case 'Rejected': return <X size={14} className="text-red-500" />;
            case 'Interviewing': return <Clock size={14} className="text-blue-500" />;
            case 'Application Received': return <FileText size={14} className="text-indigo-500" />;
            case 'Technical Round Update':
            case 'Technical Round: Passed':
            case 'Technical Round: Failed':
                return <ShieldCheck size={14} className="text-blue-600" />;
            case 'Operation Round Update':
            case 'Operation Round: Passed':
            case 'Operation Round: Failed':
                return <Briefcase size={14} className="text-purple-600" />;
            default: return <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />;
        }
    };

    const isRejection = log.event_type === 'Rejected';

    return (
        <div className="flex gap-3 relative pb-6 last:pb-0">
            <div className="absolute left-[11px] top-[24px] bottom-0 w-px bg-gray-100 last:hidden" />
            <div className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 z-10 bg-white shadow-sm ${isRejection ? 'border-red-100 bg-red-50' : 'border-gray-100'}`}>
                {getStatusIcon(log.event_type)}
            </div>
            <div className="flex-1 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-black uppercase tracking-tight ${isRejection ? 'text-red-600' : 'text-gray-900'}`}>{log.event_type}</span>
                    <span className="text-[10px] font-bold text-gray-400">{new Date(log.created_at).toLocaleDateString()}</span>
                </div>
                {log.notes && (
                    <div className={`mt-2 p-3 rounded-md text-[11px] font-medium leading-relaxed ${isRejection ? 'bg-red-50/50 text-red-800 border border-red-100/50' : 'bg-gray-50 text-gray-600 border border-gray-100/50'}`}>
                        {log.notes}
                    </div>
                )}
                {(log.action_by_name || log.updated_by) && (
                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-2 tracking-widest">
                        By {log.action_by_name || log.updated_by}
                    </p>
                )}
            </div>
        </div>
    );
};

export const NextStepDialog = ({
    isOpen,
    onClose,
    candidateName,
    applicationId,
    onSuccess,
    department,
    techTestStatus,
    techTestScore,
    techTestAI,
    techTestAssignedBy,
    hrNotes,
    hrNotesBy,
    operationNotes
}: {
    isOpen: boolean;
    onClose: () => void;
    candidateName: string;
    applicationId: number | null;
    onSuccess: () => void;
    department?: string;
    techTestStatus?: string;
    techTestScore?: number;
    techTestAI?: any;
    techTestAssignedBy?: string;
    hrNotes?: string;
    hrNotesBy?: string;
    operationNotes?: string;
}) => {
    const [stage, setStage] = useState('Technical');
    const [isFinalRound, setIsFinalRound] = useState(false);
    const [notes, setNotes] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [assignedToId, setAssignedToId] = useState<string | number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Employee List for Assign To
    const [employees, setEmployees] = useState<any[]>([]);
    const [showEmpDropdown, setShowEmpDropdown] = useState(false);

    // Evaluation configs
    const [maxDescriptive, setMaxDescriptive] = useState(0);
    const [maxObjective, setMaxObjective] = useState(0);
    const [descriptiveCount, setDescriptiveCount] = useState(0);
    const [objectiveCount, setObjectiveCount] = useState(0);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStage(techTestStatus === 'Completed' ? 'Operational' : 'Technical'); // Smart default
            setIsFinalRound(false);
            setNotes('');
            setAssignedTo('');
            setAssignedToId(null);
            setDescriptiveCount(0);
            setObjectiveCount(0);
            setShowEmpDropdown(false);

            if (stage === 'Operational' || techTestStatus === 'Completed') {
                fetchEmployees();
            }

            if (department) {
                fetchQuestionsLimits(department);
            }

            if (applicationId) {
                fetchHistory(applicationId);
            }
        }
    }, [isOpen, department, techTestStatus, applicationId]);

    const fetchHistory = async (appId: number) => {
        setHistoryLoading(true);
        try {
            const res = await apiClient.get(`/hr-operation/applications/${appId}/history`, {}, { withAuth: true });
            if (res.success) {
                setHistory(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch history', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchQuestionsLimits = async (dept: string) => {
        setLoadingQuestions(true);
        try {
            const res = await apiClient.get(`/technical-questions/department-counts/${dept}`);
            if (res.success && res.data) {
                setMaxDescriptive(res.data.desc_count || 0);
                setMaxObjective(res.data.mcq_count || 0);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingQuestions(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await apiClient.get('/organization/employees', {}, { withAuth: true });
            if (res && Array.isArray(res.data)) {
                setEmployees(res.data);
            } else if (res && Array.isArray(res)) {
                setEmployees(res);
            } else if (res && res.data && Array.isArray(res.data.data)) {
                setEmployees(res.data.data);
            }
        } catch (err) {
            console.error('Failed to load employees', err);
        }
    };

    useEffect(() => {
        if (isOpen && stage === 'Operational' && employees.length === 0) {
            fetchEmployees();
        }
    }, [stage, isOpen]);

    const handleAction = async (isReject: boolean) => {
        if (!applicationId) return;

        if (isReject && !notes.trim()) {
            toast.error('Reason for rejection is required');
            return;
        }

        setSubmitting(true);
        try {
            if (isReject) {
                const res = await apiClient.put(`/hr-operation/applications/${applicationId}/status`, {
                    status: 'Rejected',
                    reason: notes
                }, { withAuth: true });
                if (res.success || (res.data && res.data.success)) {
                    toast.success('Candidate Rejected');
                    onSuccess();
                    onClose();
                } else {
                    toast.error(res.message || 'Failed to reject candidate');
                }
            } else if (stage === 'Technical') {
                const res = await apiClient.post(`/technical-assessments/assign`, {
                    application_id: applicationId,
                    mcq_count: objectiveCount,
                    desc_count: descriptiveCount,
                    time_limit_mins: 30
                }, { withAuth: true });
                if (res.success || (res.data && res.data.success)) {
                    toast.success(`Candidate moved to ${stage}`);
                    onSuccess();
                    onClose();
                } else {
                    toast.error(res.message || 'Failed to assign technical test');
                }
            } else if (stage === 'Operational') {
                if (!assignedTo.trim() && !isReject) {
                    toast.error('Assigning the next interviewer is required');
                    setSubmitting(false);
                    return;
                }
                const res = await apiClient.put(`/hr-operation/applications/${applicationId}/interview`, {
                    status: isFinalRound ? 'Final' : 'Interviewing',
                    interview_stage: isFinalRound ? 'Final' : 'Operation',
                    interview_notes: notes,
                    assigned_to: assignedTo,
                    assigned_to_id: assignedToId
                }, { withAuth: true });
                if (res.success || (res.data && res.data.success)) {
                    toast.success(`Candidate moved to ${isFinalRound ? 'Final Round' : stage}`);
                    onSuccess();
                    onClose();
                } else {
                    toast.error(res.message || 'Failed to move to operational round');
                }
            }
        } catch (error) {
            console.error('Failed to update stage:', error);
            toast.error('Failed to process candidate');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-sm border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex-1">
                        <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">Evaluate Candidate</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-gray-500 font-bold">{candidateName}</span>
                            <div className="h-1 w-1 rounded-full bg-gray-300" />
                            <span className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">{department}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                {/* Context Context Block */}
                {(techTestStatus || hrNotes || history.length > 0) && (
                    <div className="px-6 py-4 bg-indigo-50/30 border-b border-indigo-100/50 flex flex-col gap-4">
                        <div className="flex flex-wrap gap-2">
                            {techTestStatus && (
                                <div className={`px-3 py-1.5 rounded-sm border flex flex-col gap-0.5 min-w-[100px] ${techTestStatus === 'Completed' ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Tech Test</span>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`text-[10px] font-black ${techTestStatus === 'Completed' ? 'text-green-700' : 'text-amber-700'}`}>{techTestStatus}</span>
                                        {techTestScore !== undefined && techTestScore !== null && <span className="text-xs font-black text-green-900">{techTestScore}%</span>}
                                    </div>
                                    {techTestAssignedBy && (
                                        <div className="mt-1 text-[8px] font-bold text-indigo-400 italic">By {techTestAssignedBy}</div>
                                    )}
                                </div>
                            )}
                            {techTestAI && (
                                <div className="px-3 py-1.5 rounded-sm border border-indigo-100 bg-white shadow-sm flex flex-col gap-0.5 min-w-[100px]">
                                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">AI Integrity</span>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] font-black ${techTestAI.is_ai_generated ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {techTestAI.is_ai_generated ? 'AI Written' : 'Clean'}
                                        </span>
                                        <span className="text-[10px] font-black text-gray-900">{techTestAI.descriptive_score_out_of_100}%</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Application Journey Section */}
                        {history.length > 0 && (
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Application Journey</label>
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                    {history.map((h, i) => (
                                        <div key={i} className="shrink-0 bg-white border border-indigo-100/50 p-2 rounded-sm min-w-[140px] shadow-sm">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[9px] font-black text-gray-900 leading-tight tracking-tight uppercase truncate mr-2">{h.event_type}</span>
                                                <span className="text-[8px] font-bold text-gray-400">{new Date(h.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-[8px] font-bold text-indigo-500 mb-1 truncate">By {h.action_by_name}</div>
                                            {h.notes && <div className="text-[9px] text-gray-500 line-clamp-2 italic leading-tight">"{h.notes}"</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Previous Notes Hover-like View */}
                        {(hrNotes) && (
                            <div className="flex flex-col gap-2 border-t border-indigo-100/30 pt-3">
                                {hrNotes && (
                                    <div className="bg-white/50 p-4 border border-indigo-50 rounded-xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">HR Notes</span>
                                            {hrNotesBy && <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">By {hrNotesBy}</span>}
                                        </div>
                                        <p className="text-xs text-gray-700 italic leading-relaxed">"{hrNotes}"</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="p-6 space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">Interview Stage</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['Technical', 'Operational'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStage(s)}
                                    className={`px-4 py-3 rounded-sm text-xs font-bold transition-all border ${stage === s
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    {s} Round
                                </button>
                            ))}
                        </div>
                    </div>

                    {stage === 'Operational' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="final-round-checkbox"
                                    checked={isFinalRound}
                                    onChange={(e) => setIsFinalRound(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded-sm border-gray-300 focus:ring-indigo-500"
                                />
                                <label htmlFor="final-round-checkbox" className="text-sm font-semibold text-gray-700">
                                    Is Final Round?
                                </label>
                            </div>
                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Assign Next Interviewer</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Search by name, email or designation (200+ employees)..."
                                        value={assignedTo}
                                        onChange={(e) => {
                                            setAssignedTo(e.target.value);
                                            setShowEmpDropdown(true);
                                        }}
                                        onFocus={() => setShowEmpDropdown(true)}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                    {showEmpDropdown && employees.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                                            {(() => {
                                                const q = assignedTo.toLowerCase();
                                                const filtered = employees.filter(e => {
                                                    const n = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
                                                    return n.includes(q) || (e.email || '').toLowerCase().includes(q) || (e.designation || '').toLowerCase().includes(q) || (e.role || '').toLowerCase().includes(q);
                                                }).sort((a, b) => {
                                                    const hA = (a.role || '').toLowerCase() === 'hod' || (a.designation || '').toLowerCase().includes('hod');
                                                    const hB = (b.role || '').toLowerCase() === 'hod' || (b.designation || '').toLowerCase().includes('hod');
                                                    if (hA && !hB) return -1;
                                                    if (!hA && hB) return 1;
                                                    return 0;
                                                });

                                                if (filtered.length === 0) {
                                                    return <div className="p-3 text-xs text-gray-500 text-center">No employees found matching '{assignedTo}'</div>
                                                }

                                                return filtered.map(emp => {
                                                    const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                                                    const isHod = (emp.role || '').toLowerCase() === 'hod' || (emp.designation || '').toLowerCase().includes('hod');
                                                    return (
                                                        <button
                                                            key={emp.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setAssignedTo(empName);
                                                                setAssignedToId(emp.id || emp.employee_id || emp.user_id);
                                                                setShowEmpDropdown(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center justify-between border-b border-gray-50 last:border-0 transition-colors"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-gray-900">{empName}</span>
                                                                <span className="text-[10px] text-gray-500">{emp.email}</span>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[10px] uppercase font-bold text-gray-600">{emp.designation || emp.role || 'Employee'}</span>
                                                                {isHod && <span className="text-[8px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider mt-0.5 border border-amber-200 shadow-sm shadow-amber-500/10">HOD Priority</span>}
                                                            </div>
                                                        </button>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {stage === 'Technical' && department && (
                        <div className="bg-slate-50 border border-slate-100 rounded-md p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Technical Evaluation Setup</label>
                                {loadingQuestions && <Loader2 size={12} className="animate-spin text-slate-400" />}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Descriptive Qs</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max={maxDescriptive}
                                            value={descriptiveCount}
                                            onChange={(e) => setDescriptiveCount(Math.min(maxDescriptive, Math.max(0, parseInt(e.target.value) || 0)))}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                        <span className="text-[10px] text-slate-400 font-medium shrink-0">/ {maxDescriptive}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Objective Qs</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max={maxObjective}
                                            value={objectiveCount}
                                            onChange={(e) => setObjectiveCount(Math.min(maxObjective, Math.max(0, parseInt(e.target.value) || 0)))}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                        <span className="text-[10px] text-slate-400 font-medium shrink-0">/ {maxObjective}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center justify-between">
                            <span>Notes / Rejection Reason</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Enter evaluation notes or the reason for rejection..."
                            className="w-full h-24 px-4 py-3 bg-white border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none shadow-sm"
                        />
                    </div>
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex flex-wrap gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-sm font-bold text-xs hover:bg-gray-50 transition-all shadow-sm"
                    >
                        Cancel
                    </button>
                    <div className="flex-1 flex gap-3 justify-end">
                        <button
                            onClick={() => handleAction(true)}
                            disabled={submitting}
                            className="px-6 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-sm font-bold text-[11px] tracking-wide uppercase hover:bg-red-100 transition-all flex items-center justify-center gap-2 min-w-[100px]"
                        >
                            Reject
                        </button>
                        <button
                            onClick={() => handleAction(false)}
                            disabled={submitting}
                            className="px-6 py-2.5 bg-emerald-500 text-white rounded-sm font-bold text-[11px] tracking-wide uppercase hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-2 min-w-[120px]"
                        >
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            Process Ahead
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
