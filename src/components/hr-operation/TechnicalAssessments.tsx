"use client";

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Award, Calendar, User, Briefcase, FileText, CheckCircle2, Clock, XCircle, Search, ExternalLink, ChevronLeft, ChevronRight, Filter, X, Send, UserPlus, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import Select from 'react-select';

export default function TechnicalAssessments() {
    const [assessments, setAssessments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Details Modal State
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [details, setDetails] = useState<any>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Evaluation Form
    const [outcome, setOutcome] = useState<'Passed' | 'Failed' | null>(null);
    const [assignedTo, setAssignedTo] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [manualMarks, setManualMarks] = useState<Record<number, number>>({});
    const [eligibleInterviewers, setEligibleInterviewers] = useState<any[]>([]);

    const isAlreadyEvaluated = Boolean(details?.assignment?.manual_marks);

    useEffect(() => {
        fetchAssessments();
    }, []);

    const fetchAssessments = async () => {
        try {
            const res = await apiClient.get('/technical-assessments/results', {}, { withAuth: true });
            if (res.success) {
                setAssessments(res.data);
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Failed to fetch assessments');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (id: number) => {
        setSelectedId(id);
        setDetailsLoading(true);
        setOutcome(null);
        setAssignedTo('');
        setManualMarks({});
        try {
            const res = await apiClient.get(`/technical-assessments/${id}`, {}, { withAuth: true });
            if (res.success) {
                setDetails(res.data);
                // Pre-fill manual marks if already evaluated
                if (res.data.assignment.manual_marks) {
                    const existingMarks = typeof res.data.assignment.manual_marks === 'string'
                        ? JSON.parse(res.data.assignment.manual_marks)
                        : res.data.assignment.manual_marks;
                    setManualMarks(existingMarks);
                }
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to update status');
        } finally {
            setDetailsLoading(false);
        }
    };

    useEffect(() => {
        const fetchInterviewers = async () => {
            if (!details?.assignment?.department) return;
            try {
                // Using the standard employee API with HQ filters
                const res = await apiClient.get('/organization/employees', {
                    hq: 'true',
                    hq_only: 'true',
                    department_name: details.assignment.department,
                    purpose: 'approver_search'
                }, { withAuth: true });
                setEligibleInterviewers(Array.isArray(res) ? res : ((res as any).data || []));
            } catch (err) {
                console.error('Failed to fetch interviewers', err);
            }
        };
        if (details) fetchInterviewers();
    }, [details]);

    const handleMarkQuestion = (questionId: number, marks: number) => {
        if (isAlreadyEvaluated) return;
        setManualMarks(prev => ({ ...prev, [questionId]: marks }));
    };

    const calculateCurrentScore = () => {
        if (!details) return 0;
        let obtained = 0;
        let total = 0;
        details.questions.forEach((q: any) => {
            total += q.marks;
            if (q.type === 'MCQ') {
                if (q.candidate_answer === q.correct_answer) obtained += q.marks;
            } else {
                obtained += manualMarks[q.id] || 0;
            }
        });
        return total > 0 ? (obtained / total) * 100 : 0;
    };

    const handleEvaluations = async () => {
        if (!outcome || isAlreadyEvaluated) return;
        setSubmitting(true);
        try {
            const res = await apiClient.put(`/technical-assessments/${selectedId}/status`, {
                outcome,
                next_stage: 'Operation',
                assigned_to: assignedTo,
                manual_marks: manualMarks
            }, { withAuth: true });
            if (res.success) {
                toast.success(`Candidate marked as ${outcome}`);
                setSelectedId(null);
                fetchAssessments();
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to update status');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopyLink = (token: string) => {
        const resetLink = `${window.location.origin}/public/technical-test/${token}`;
        navigator.clipboard.writeText(resetLink);
        toast.success('Test link copied to clipboard!');
    };

    const filteredAssessments = assessments.filter(a => {
        const matchesSearch = a.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.position_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalEntries = filteredAssessments.length;
    const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
    const pageStart = (page - 1) * pageSize;
    const pagedAssessments = filteredAssessments.slice(pageStart, pageStart + pageSize);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, statusFilter]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-green-50 text-green-600 border-green-100';
            case 'Pending': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
            case 'Expired': return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="p-8 bg-gray-50/50 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <Award size={32} className="text-black" />
                            Technical Assessments
                        </h2>
                        <p className="mt-2 text-gray-500 font-medium">
                            Track candidate performance and results across all technical tests.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search candidates, positions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-black text-sm font-medium w-72 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    {['All', 'Pending', 'Completed', 'Expired'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest border transition-all ${statusFilter === status
                                ? 'bg-black text-white border-black shadow-sm'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {/* Assessments Table */}
                {loading ? (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="overflow-y-auto max-h-[400px] overflow-x-auto relative">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Candidate
                                        </th>
                                        <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Position
                                        </th>
                                        <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Test
                                        </th>
                                        <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status / Score
                                        </th>
                                        <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Assigned
                                        </th>
                                        <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {[1, 2, 3].map((i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-4 py-3">
                                                <div className="h-4 w-32 bg-gray-100 rounded" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="h-4 w-40 bg-gray-100 rounded" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="h-4 w-28 bg-gray-100 rounded" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="h-4 w-24 bg-gray-100 rounded" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="h-4 w-32 bg-gray-100 rounded" />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="h-8 w-24 bg-gray-100 rounded-lg inline-block" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : filteredAssessments.length > 0 ? (
                    <>
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="overflow-y-auto max-h-[400px] overflow-x-auto relative">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Candidate
                                            </th>
                                            <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Position
                                            </th>
                                            <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Test
                                            </th>
                                            <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status / Score
                                            </th>
                                            <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Assigned
                                            </th>
                                            <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {pagedAssessments.map((a) => (
                                            <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                                            <User size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-900">
                                                                {a.candidate_name}
                                                            </div>
                                                            {a.assigned_by_name && (
                                                                <div className="text-[11px] font-medium text-gray-500">
                                                                    Assigned by {a.assigned_by_name}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-gray-800">
                                                            {a.position_name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-700">
                                                        {a.question_count} questions • {a.time_limit_mins} mins
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-widest border ${getStatusColor(a.status)}`}>
                                                            {a.status === 'Completed' ? (
                                                                <CheckCircle2 size={12} className="mr-1" />
                                                            ) : a.status === 'Pending' ? (
                                                                <Clock size={12} className="mr-1" />
                                                            ) : (
                                                                <XCircle size={12} className="mr-1" />
                                                            )}
                                                            {a.status}
                                                        </span>
                                                        {a.status === 'Completed' && (
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-widest border ${getScoreColor(a.score).replace('text', 'border')} ${getScoreColor(a.score).replace('text', 'bg').replace('600', '50')}`}>
                                                                <span className={getScoreColor(a.score)}>Score: {Math.round(a.score)}%</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-gray-700">
                                                            {new Date(a.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {a.status === 'Completed' ? (
                                                        <button
                                                            onClick={() => handleViewDetails(a.id)}
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors"
                                                        >
                                                            View Results
                                                            <ChevronRight size={14} />
                                                        </button>
                                                    ) : a.status === 'Pending' ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                                                                Waiting for Candidate
                                                            </div>
                                                            <button
                                                                onClick={() => handleCopyLink(a.test_token)}
                                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[11px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-colors"
                                                                title="Copy Test Link"
                                                            >
                                                                <Copy size={14} />
                                                                Copy Link
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-bold uppercase tracking-widest hover:bg-red-100 transition-colors">
                                                            Re-assign Test
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-2 mt-3">
                            <div className="text-xs text-gray-600">
                                Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(page * pageSize, totalEntries)}</span> of <span className="font-medium">{totalEntries}</span> assessments
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-1">
                                    <span className="text-xs text-gray-600">Rows:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setPage(1);
                                        }}
                                        className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                    >
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page <= 1}
                                        className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-3 h-3" />
                                    </button>
                                    <div className="flex items-center space-x-1">
                                        {(() => {
                                            const pages = [];
                                            const maxVisible = 5;
                                            let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
                                            let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                                            if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);
                                            if (startPage > 1) {
                                                pages.push(
                                                    <button
                                                        key={1}
                                                        onClick={() => setPage(1)}
                                                        className={`px-2 py-1 rounded text-xs transition-colors ${page === 1
                                                            ? 'bg-blue-600 text-white'
                                                            : 'border border-gray-300 hover:bg-gray-50'
                                                            } `}
                                                    >
                                                        1
                                                    </button>
                                                );
                                                if (startPage > 2) pages.push(<span key="ellipsis1" className="px-1 text-gray-500">...</span>);
                                            }
                                            for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                                                pages.push(
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setPage(pageNum)}
                                                        className={`px-2 py-1 rounded text-xs transition-colors ${page === pageNum
                                                            ? 'bg-blue-600 text-white'
                                                            : 'border border-gray-300 hover:bg-gray-50'
                                                            } `}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            }
                                            if (endPage < totalPages) {
                                                if (endPage < totalPages - 1) pages.push(<span key="ellipsis2" className="px-1 text-gray-500">...</span>);
                                                pages.push(
                                                    <button
                                                        key={totalPages}
                                                        onClick={() => setPage(totalPages)}
                                                        className={`px-2 py-1 rounded text-xs transition-colors ${page === totalPages
                                                            ? 'bg-blue-600 text-white'
                                                            : 'border border-gray-300 hover:bg-gray-50'
                                                            } `}
                                                    >
                                                        {totalPages}
                                                    </button>
                                                );
                                            }
                                            return pages;
                                        })()}
                                    </div>
                                    <button
                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                        disabled={page === totalPages}
                                        className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Award className="text-gray-200" size={40} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No assessments found</h3>
                        <p className="text-sm text-gray-500 mt-2">
                            Start by sending tests from Interview Management to see results here.
                        </p>
                    </div>
                )}

                {/* Details Modal */}
                {selectedId && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl z-[60] flex items-center justify-center p-6 overflow-y-auto">
                        <div className="bg-white rounded-md w-full max-w-5xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Modal Header */}
                            <div className="p-10 border-b border-gray-50 flex justify-between items-center sticky top-0 z-10 bg-white/80 backdrop-blur-md">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-black rounded-md flex items-center justify-center">
                                        <Award size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Assessment Results</h2>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                                            {details?.assignment?.candidate_name} • {details?.assignment?.position_name}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedId(null)} className="p-3 hover:bg-gray-50 rounded-full transition-all text-gray-400 hover:text-black">
                                    <X size={24} />
                                </button>
                            </div>

                            {detailsLoading ? (
                                <div className="p-20 text-center animate-pulse font-black text-gray-300 uppercase tracking-widest">Loading details...</div>
                            ) : details && (
                                <div className="flex-1 overflow-y-auto p-10 space-y-10">
                                    {/* Questions & Answers */}
                                    <div className="space-y-6">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-3">
                                            <div className="w-1 h-4 bg-black rounded-full"></div>
                                            Application Details
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div className="p-6 bg-gray-50 rounded-md border border-gray-100">
                                                <div className="text-[10px] font-black uppercase text-gray-400 mb-2">Applied Position</div>
                                                <div className="font-bold text-gray-900">{details.assignment.position_name}</div>
                                                <div className="text-[10px] font-bold text-blue-600 mt-1 uppercase">{details.assignment.department}</div>
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] font-bold text-gray-500">{details.assignment.job_type}</span>
                                                    <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] font-bold text-gray-500">{details.assignment.job_location}</span>
                                                </div>
                                            </div>
                                            <div className="p-6 bg-gray-50 rounded-md border border-gray-100">
                                                <div className="text-[10px] font-black uppercase text-gray-400 mb-2">Previous Company</div>
                                                <div className="font-bold text-gray-900 truncate" title={details.assignment.current_company}>{details.assignment.current_company || 'N/A'}</div>
                                                <div className="text-[10px] font-bold text-gray-500 mt-1">{details.assignment.current_designation || 'No Designation'}</div>
                                            </div>
                                            <div className="p-6 bg-gray-50 rounded-md border border-gray-100">
                                                <div className="text-[10px] font-black uppercase text-gray-400 mb-2">Candidate Info</div>
                                                <div className="font-bold text-gray-900">{details.assignment.total_experience || 'Not Specified'} EXP</div>
                                                <div className="text-[10px] font-bold text-gray-500 mt-1">{details.assignment.highest_education}</div>
                                            </div>
                                            <div className="p-6 bg-gray-50 rounded-md border border-gray-100 flex flex-col justify-between">
                                                <div>
                                                    <div className="text-[10px] font-black uppercase text-gray-400 mb-2">Resume / Portfolio</div>
                                                    {details.assignment.resume_url ? (
                                                        <a href={details.assignment.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline">
                                                            View Resume <ExternalLink size={14} />
                                                        </a>
                                                    ) : <span className="text-sm font-bold text-gray-400">Not Available</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {(details?.assignment?.tracking_metrics || details?.assignment?.ai_evaluation) && (
                                            <>
                                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-3 pt-6">
                                                    <div className="w-1 h-4 bg-black rounded-full"></div>
                                                    Integrity & AI Report
                                                </h3>
                                                <div className="p-8 bg-gray-50 rounded-md border border-gray-100 flex flex-col md:flex-row gap-8">
                                                    {details.assignment.tracking_metrics && Object.keys(details.assignment.tracking_metrics).length > 0 && (
                                                        <div className="flex-1 space-y-4">
                                                            <h4 className="text-[10px] font-black uppercase text-gray-400">Activity Tracking</h4>
                                                            <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-md">
                                                                <span className="text-sm font-bold text-gray-600">Tab Switches</span>
                                                                <span className={`text-sm font-black ${details.assignment.tracking_metrics.tabSwitches > 3 ? 'text-red-500' : 'text-gray-900'}`}>{details.assignment.tracking_metrics.tabSwitches || 0}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-md">
                                                                <span className="text-sm font-bold text-gray-600">Time Taken</span>
                                                                <span className="text-sm font-black text-gray-900">{details.assignment.tracking_metrics.timeTakenMins || 0} mins</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {details.assignment.ai_evaluation && (
                                                        <div className="flex-[2] space-y-4">
                                                            <h4 className="text-[10px] font-black uppercase text-gray-400">AI Evaluation</h4>
                                                            <div className="grid grid-cols-4 gap-4">
                                                                <div className="p-4 bg-white border border-gray-100 rounded-md text-center">
                                                                    <div className="text-2xl font-black text-gray-900">
                                                                        {details.assignment.ai_evaluation.mcq_score_out_of_100 ?? 0}%
                                                                    </div>
                                                                    <div className="text-[8px] font-black uppercase text-gray-400 mt-1">MCQ Accuracy</div>
                                                                </div>
                                                                <div className="p-4 bg-white border border-gray-100 rounded-md text-center">
                                                                    <div className="text-2xl font-black text-gray-900">
                                                                        {details.assignment.ai_evaluation.descriptive_score_out_of_100 ?? 0}%
                                                                    </div>
                                                                    <div className="text-[8px] font-black uppercase text-gray-400 mt-1">Descriptive Accuracy</div>
                                                                </div>
                                                                <div className="p-4 bg-white border border-gray-100 rounded-md text-center">
                                                                    <div className="text-2xl font-black text-gray-900">
                                                                        {details.assignment.ai_evaluation.overall_score_out_of_100 ?? details.assignment.score ?? 0}%
                                                                    </div>
                                                                    <div className="text-[8px] font-black uppercase text-gray-400 mt-1">Overall Score</div>
                                                                </div>
                                                                <div className="p-4 bg-white border border-gray-100 rounded-md text-center">
                                                                    <div className="text-2xl font-black text-gray-900">
                                                                        {details.assignment.ai_evaluation.confidence_score || 0}%
                                                                    </div>
                                                                    <div className="text-[8px] font-black uppercase text-gray-400 mt-1">Confidence</div>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="p-4 bg-white border border-gray-100 rounded-md text-center">
                                                                    <div className="text-lg font-black text-gray-900 mt-1">
                                                                        {details.assignment.ai_evaluation.consistency_rating || 'N/A'}
                                                                    </div>
                                                                    <div className="text-[8px] font-black uppercase text-gray-400 mt-1">Consistency</div>
                                                                </div>
                                                                <div className={`p-4 border rounded-md text-center ${details.assignment.ai_evaluation.is_ai_generated ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                                                    <div className={`text-lg font-black mt-1 ${details.assignment.ai_evaluation.is_ai_generated ? 'text-red-700' : 'text-green-700'}`}>
                                                                        {details.assignment.ai_evaluation.is_ai_generated ? 'Detected' : 'Negative'}
                                                                    </div>
                                                                    <div className={`text-[8px] font-black uppercase mt-1 ${details.assignment.ai_evaluation.is_ai_generated ? 'text-red-600/70' : 'text-green-600/70'}`}>
                                                                        AI Written
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {details.assignment.ai_evaluation.overall_feedback && (
                                                                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-md">
                                                                    <p className="text-sm font-bold text-blue-900 italic">
                                                                        " {details.assignment.ai_evaluation.overall_feedback} "
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-3 pt-6">
                                            <div className="w-1 h-4 bg-black rounded-full"></div>
                                            Response Analysis
                                        </h3>

                                        <div className="mt-4 bg-white border border-gray-100 rounded-md overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-50">
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-left w-10">
                                                                #
                                                            </th>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-left">
                                                                Question
                                                            </th>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-left">
                                                                Type
                                                            </th>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-left">
                                                                Candidate Answer
                                                            </th>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-left">
                                                                Correct Answer / Marks
                                                            </th>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-left">
                                                                Integrity
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {details.questions.map((q: any, i: number) => {
                                                            const metrics = details?.assignment?.tracking_metrics?.questionMetrics?.[q.id];
                                                            const isCorrectMcq = q.type === 'MCQ' && q.candidate_answer === q.correct_answer;

                                                            return (
                                                                <tr key={q.id} className="align-top hover:bg-gray-50/60">
                                                                    <td className="px-4 py-3 text-[11px] font-black text-gray-400">
                                                                        {(i + 1).toString().padStart(2, '0')}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="space-y-1">
                                                                            <p className="font-bold text-gray-900 text-xs md:text-sm">
                                                                                {q.question_text}
                                                                            </p>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className="inline-flex px-2 py-1 rounded-full bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                                            {q.type}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        {q.type === 'MCQ' ? (
                                                                            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-bold ${isCorrectMcq ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                                                                {isCorrectMcq ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                                                <span>{q.candidate_answer || 'No Answer'}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="max-w-md max-h-32 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                                                                                <p className="text-xs font-medium text-gray-700 leading-relaxed italic whitespace-pre-wrap">
                                                                                    {q.candidate_answer || 'No Response Submitted'}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        {q.type === 'MCQ' ? (
                                                                            <div className="space-y-1 text-xs">
                                                                                <p className="font-bold text-gray-900">{q.correct_answer}</p>
                                                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                                                    Marks: {q.marks}
                                                                                </p>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col gap-2">
                                                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                                                    Max Marks: {q.marks}
                                                                                </p>
                                                                                {!isAlreadyEvaluated && (
                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        <button
                                                                                            onClick={() => handleMarkQuestion(q.id, q.marks)}
                                                                                            className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest border transition-all inline-flex items-center gap-1 ${manualMarks[q.id] === q.marks ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-gray-400 border-gray-100 hover:border-green-200'}`}
                                                                                        >
                                                                                            <CheckCircle2 size={12} /> Correct (+{q.marks})
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleMarkQuestion(q.id, 0)}
                                                                                            className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest border transition-all inline-flex items-center gap-1 ${manualMarks[q.id] === 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-400 border-gray-100 hover:border-red-200'}`}
                                                                                        >
                                                                                            <XCircle size={12} /> Incorrect (0)
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        {metrics ? (
                                                                            <div className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                                                {q.type === 'MCQ' ? (
                                                                                    <span>
                                                                                        Option Changes:{' '}
                                                                                        <span className="text-gray-900">
                                                                                            {metrics.optionChanges || 0}
                                                                                        </span>
                                                                                    </span>
                                                                                ) : (
                                                                                    <span>
                                                                                        Copy & Pastes:{' '}
                                                                                        <span className={metrics.copyPastes > 0 ? 'text-red-500' : 'text-gray-900'}>
                                                                                            {metrics.copyPastes || 0}
                                                                                        </span>
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                                                                                —
                                                                            </span>
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

                                    {/* Evaluation Footer */}
                                    {!isAlreadyEvaluated && (
                                        <div className="mt-12 p-10 bg-white border-2 border-gray-100 rounded-md shadow-2xl">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-md flex flex-col items-center justify-center">
                                                        <span className="text-2xl font-black text-gray-900">{Math.round(calculateCurrentScore())}%</span>
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Final Score</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-black text-gray-900">Overall Evaluation</h4>
                                                        <p className="text-gray-500 text-xs font-bold mt-1">Determine if the candidate should advance to the Operation Round.</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-4">
                                                    <button
                                                        onClick={() => setOutcome('Failed')}
                                                        className={`px-8 py-4 rounded-md font-black uppercase tracking-widest text-xs transition-all ${outcome === 'Failed' ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'bg-white text-red-500 border border-red-100 hover:bg-red-50'}`}
                                                    >
                                                        Fail & Reject
                                                    </button>
                                                    <button
                                                        onClick={() => setOutcome('Passed')}
                                                        className={`px-8 py-4 rounded-md font-black uppercase tracking-widest text-xs transition-all ${outcome === 'Passed' ? 'bg-green-500 text-white shadow-xl shadow-green-500/20' : 'bg-white text-green-500 border border-green-100 hover:bg-green-50'}`}
                                                    >
                                                        Pass and Proceed
                                                    </button>
                                                </div>
                                            </div>

                                            {outcome === 'Passed' && (
                                                <div className="mt-8 pt-8 border-t border-gray-100 animate-in slide-in-from-top-4 duration-500">
                                                    <div className="flex flex-col md:flex-row items-end gap-6">
                                                        <div className="flex-1 space-y-3">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Assign to Operation Round Interviewer</label>
                                                            <div className="relative group z-50">
                                                                <Select
                                                                    options={eligibleInterviewers?.map((emp: any) => ({
                                                                        value: `${emp.first_name} ${emp.last_name}`,
                                                                        label: `${emp.first_name} ${emp.last_name} — ${emp.designation}`
                                                                    }))}
                                                                    onChange={(selected: any) => setAssignedTo(selected ? selected.value : '')}
                                                                    value={assignedTo ? { value: assignedTo, label: assignedTo } : null}
                                                                    placeholder={`Search HQ Interviewer from ${details.assignment.department}...`}
                                                                    isClearable
                                                                    isSearchable
                                                                    styles={{
                                                                        control: (base: any, state: any) => ({
                                                                            ...base,
                                                                            padding: '8px 16px',
                                                                            borderRadius: '0.375rem',
                                                                            borderColor: state.isFocused ? '#4ade80' : '#f3f4f6',
                                                                            boxShadow: state.isFocused ? '0 0 0 4px rgba(74, 222, 128, 0.2)' : 'none',
                                                                            backgroundColor: '#ffffff',
                                                                            '&:hover': {
                                                                                borderColor: '#4ade80'
                                                                            }
                                                                        }),
                                                                        option: (base: any, state: any) => ({
                                                                            ...base,
                                                                            backgroundColor: state.isSelected ? '#000000' : state.isFocused ? '#f3f4f6' : 'white',
                                                                            color: state.isSelected ? 'white' : '#111827',
                                                                            fontWeight: '700',
                                                                            fontSize: '14px',
                                                                            padding: '12px 20px',
                                                                            cursor: 'pointer'
                                                                        }),
                                                                        menu: (base: any) => ({
                                                                            ...base,
                                                                            borderRadius: '0.375rem',
                                                                            overflow: 'hidden',
                                                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                                                        }),
                                                                        singleValue: (base: any) => ({
                                                                            ...base,
                                                                            color: '#111827',
                                                                            fontWeight: '700'
                                                                        })
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={handleEvaluations}
                                                            disabled={submitting || !assignedTo}
                                                            className="px-10 py-4 h-[58px] bg-green-500 text-white rounded-md font-black uppercase tracking-widest text-xs shadow-xl shadow-green-500/20 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                                                        >
                                                            {submitting ? 'Processing...' : 'Submit Evaluation'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {outcome === 'Failed' && (
                                                <div className="mt-8 pt-8 border-t border-gray-100 animate-in slide-in-from-top-4 duration-500 flex justify-end">
                                                    <button
                                                        onClick={handleEvaluations}
                                                        disabled={submitting}
                                                        className="px-10 py-4 h-[58px] bg-red-500 text-white rounded-md font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:shadow-none"
                                                    >
                                                        {submitting ? 'Processing...' : 'Confirm Rejection'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
