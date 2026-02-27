"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    Briefcase, CheckCircle2, XCircle, UserCheck, MessageSquare,
    Search, Filter, ChevronRight, Download, Calendar, ArrowRight,
    User, Mail, Phone, FileText, QrCode, ClipboardCheck, History,
    ShieldCheck, AlertTriangle, GraduationCap, ChevronDown, ChevronUp, Clock, Info
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import Select from 'react-select';

export default function OperationManagement({ myOnly = false }: { myOnly?: boolean }) {
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
    const [processing, setProcessing] = useState(false);
    const [interviewers, setInterviewers] = useState<any[]>([]);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [applicationHistory, setApplicationHistory] = useState<Record<number, any[]>>({});
    const [loadingHistory, setLoadingHistory] = useState<Record<number, boolean>>({});
    const [assessmentDetails, setAssessmentDetails] = useState<Record<number, any>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const { organization } = useAuth();

    const filteredCandidates = useMemo(() => {
        let base = candidates.filter(c =>
            c.status === 'Interviewing' ||
            c.status === 'Shortlisted' ||
            c.status === 'Final' ||
            c.status === 'Offered' ||
            c.status === 'Hired'
        );

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            base = base.filter(c =>
                (c.candidate_name || '').toLowerCase().includes(q) ||
                (c.position_name || '').toLowerCase().includes(q)
            );
        }
        return base;
    }, [candidates, searchQuery]);

    // Form State
    const [outcome, setOutcome] = useState<'Pending' | 'Passed' | 'Failed'>('Pending');
    const [notes, setNotes] = useState('');
    const [assignedToNext, setAssignedToNext] = useState('');
    const [assignedToNextId, setAssignedToNextId] = useState<number | string | null>(null);
    const [proposedSalary, setProposedSalary] = useState('');
    const [showEmpDropdown, setShowEmpDropdown] = useState<number | null>(null);

    useEffect(() => {
        fetchCandidates();
        fetchInterviewers();
    }, []);

    const fetchInterviewers = async () => {
        try {
            const res = await apiClient.get('/organization/employees', { hq: 'true' }, { withAuth: true });
            if (Array.isArray(res)) setInterviewers(res);
            else if (res.data) setInterviewers(res.data);
            else if (res.employees) setInterviewers(res.employees);
        } catch (err) {
            console.error('Failed to load interviewers');
        }
    };

    const fetchCandidates = async () => {
        setLoading(true);
        console.log('OperationManagement: fetchCandidates with myOnly =', myOnly);
        try {
            const res = await apiClient.get('/operation-round/candidates', myOnly ? { assigned_to_me: 'true' } : {}, { withAuth: true });
            if (res.success) {
                setCandidates(res.data);
            }
        } catch (err: any) {
            console.error('Failed to load candidates', err);
            toast.error(err.message || 'Failed to load candidate list');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = async (candidateId: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(candidateId)) {
            newExpanded.delete(candidateId);
        } else {
            newExpanded.add(candidateId);
            fetchApplicationHistory(candidateId);
            fetchAssessmentDetails(candidateId);
        }
        setExpandedRows(newExpanded);
    };

    const fetchApplicationHistory = async (applicationId: number) => {
        if (applicationHistory[applicationId] || loadingHistory[applicationId]) return;

        setLoadingHistory(prev => ({ ...prev, [applicationId]: true }));
        try {
            const res = await apiClient.get(`/hr-operation/applications/${applicationId}/history`, {}, { withAuth: true });
            if (res.success) {
                setApplicationHistory(prev => ({ ...prev, [applicationId]: res.data }));
            }
        } catch (error) {
            console.error('Failed to fetch application history:', error);
        } finally {
            setLoadingHistory(prev => ({ ...prev, [applicationId]: false }));
        }
    };

    const fetchAssessmentDetails = async (applicationId: number) => {
        if (assessmentDetails[applicationId]) return;
        try {
            // Find assignment id if possible, otherwise we might need an endpoint by applicationId
            // Let's assume we fetch the full details when needed or use the data already in the candidate object
            // The candidate object already has tech_test_status, tech_test_score, tech_test_ai
            // But we need questions/answers.
            // Let's find if there's an assignment for this application
            const res = await apiClient.get(`/technical-assessments/results`, {}, { withAuth: true });
            if (res.success) {
                const assignment = res.data.find((a: any) => a.application_id === applicationId);
                if (assignment && assignment.id) {
                    const detailsRes = await apiClient.get(`/technical-assessments/${assignment.id}`, {}, { withAuth: true });
                    if (detailsRes.success) {
                        setAssessmentDetails(prev => ({ ...prev, [applicationId]: detailsRes.data }));
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch assessment details:', error);
        }
    };

    const handleSubmit = async (candidateId: number, e: React.FormEvent) => {
        e.preventDefault();
        if (outcome === 'Pending') {
            toast.error('Please select an outcome');
            return;
        }

        setProcessing(true);
        try {
            const candidate = candidates.find(c => c.id === candidateId);
            const payload = {
                outcome,
                interview_notes: notes,
                proposed_salary: proposedSalary,
                assigned_to_next: assignedToNext,
                assigned_to_next_id: assignedToNextId
            };

            const res = await apiClient.put(`/operation-round/applications/${candidateId}/result`, payload, { withAuth: true });

            if (res.success) {
                let message = 'Candidate marked as Failed';
                if (outcome === 'Passed') {
                    if (candidate?.interview_stage === 'Final') {
                        message = 'Candidate marked for Onboarding';
                    } else {
                        message = 'Operation round feedback saved (Passed). HR will decide next stage.';
                    }
                }
                toast.success(message);
                setNotes('');
                setOutcome('Pending');
                setAssignedToNext('');
                setAssignedToNextId(null);
                setProposedSalary('');
                const newExpanded = new Set(expandedRows);
                newExpanded.delete(candidateId);
                setExpandedRows(newExpanded);
                fetchCandidates();
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Failed to update round result');
        } finally {
            setProcessing(false);
        }
    };

    const generatePDF = async (candidate: any) => {
        try {
            toast.loading('Generating report...', { id: 'report-gen' });
            const blob = await apiClient.get(`/hr-operation/report/${candidate.id}`, {}, {
                responseType: 'blob',
                withAuth: true
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Interview_Report_${candidate.candidate_name.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Report downloaded successfully', { id: 'report-gen' });
        } catch (error: any) {
            console.error('Report generation failed:', error);
            toast.error(error.message || 'Failed to generate report', { id: 'report-gen' });
        }
    };

    return (
        <div className="p-8 bg-gray-50/50 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <Briefcase size={32} className="text-black" />
                            {candidates.some(c => c.interview_stage === 'Final') && !candidates.every(c => c.interview_stage === 'Final')
                                ? 'Consolidated Assessment'
                                : candidates.every(c => c.interview_stage === 'Final') && candidates.length > 0
                                    ? 'Operations Assessment'
                                    : 'Operations Assessment'}
                        </h1>
                        <p className="mt-2 text-gray-500 font-medium">
                            {candidates.some(c => c.interview_stage === 'Final')
                                ? 'Review and provide final feedback for candidates in both operation and final rounds.'
                                : 'Review and provide departmental feedback for candidates in the operations round.'}
                        </p>
                    </div>


                </div>
                {/* Search */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search candidate, position..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-black/5 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Main Table */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="sticky top-0 bg-gray-50/80 backdrop-blur-md z-10 px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 w-16 text-center">
                                        #
                                    </th>
                                    <th className="sticky top-0 bg-gray-50/80 backdrop-blur-md z-10 px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                        Candidate
                                    </th>
                                    <th className="sticky top-0 bg-gray-50/80 backdrop-blur-md z-10 px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                        Position Info
                                    </th>
                                    <th className="sticky top-0 bg-gray-50/80 backdrop-blur-md z-10 px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                        Status
                                    </th>
                                    <th className="sticky top-0 bg-gray-50/80 backdrop-blur-md z-10 px-6 py-4 text-right text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    [1, 2, 3].map((i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-6 py-8">
                                                <div className="flex gap-4">
                                                    <div className="w-12 h-12 bg-gray-100 rounded-2xl" />
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-4 bg-gray-100 rounded w-1/4" />
                                                        <div className="h-3 bg-gray-50 rounded w-1/6" />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredCandidates.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <h3 className="text-lg font-bold text-gray-900 uppercase">No candidates at this stage</h3>
                                            <p className="text-sm text-gray-500">Pipeline is currently clear.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCandidates.map((app, index) => (
                                        <React.Fragment key={app.id}>
                                            <tr className={`hover:bg-gray-50/50 transition-colors group ${expandedRows.has(app.id) ? 'bg-gray-50/50' : ''}`}>
                                                <td className="px-6 py-5 text-center">
                                                    <span className="text-[10px] font-black text-gray-300 group-hover:text-black transition-colors uppercase tracking-widest">
                                                        {(index + 1).toString().padStart(2, '0')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-gray-900 uppercase tracking-tight">
                                                            {app.candidate_name}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                                <Mail size={10} /> {app.candidate_email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-gray-900 uppercase tracking-tight">
                                                            {app.position_name}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                            {app.department}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        <span className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest border ${app.interview_stage === 'Final' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                                            {app.interview_stage || 'Operation'} Round
                                                        </span>
                                                        {app.tech_test_status && (
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 flex items-center gap-1">
                                                                    Test: {app.tech_test_status === 'Completed' ? `${app.tech_test_score ?? 0}%` : app.tech_test_status}
                                                                </span>
                                                                {app.tech_test_assigned_by && (
                                                                    <span className="text-[8px] font-black uppercase text-indigo-500 tracking-tighter ml-1 italic">By {app.tech_test_assigned_by}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button
                                                        onClick={() => toggleExpand(app.id)}
                                                        className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-sm transition-all shadow-md ${expandedRows.has(app.id)
                                                            ? 'bg-red-50 text-red-600 hover:bg-red-100 shadow-red-100'
                                                            : 'bg-black text-white hover:bg-gray-800 shadow-black/10'
                                                            }`}
                                                    >
                                                        {expandedRows.has(app.id) ? (
                                                            <>Close Details <ChevronUp size={12} /></>
                                                        ) : (
                                                            <>Proceed Ahead <ChevronDown size={12} /></>
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Expanded Content */}
                                            {expandedRows.has(app.id) && (
                                                <tr>
                                                    <td colSpan={5} className="px-12 py-10 bg-gray-50/30">
                                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                                            {/* Left Column: Context & Assessment */}
                                                            <div className="lg:col-span-6 space-y-8">
                                                                {/* Card 1: Operational History (Application Journey) */}
                                                                <div className="bg-white rounded-none border border-gray-100 shadow-sm p-8">
                                                                    <div className="flex items-center gap-3 mb-8">
                                                                        <div className="p-2 bg-indigo-50 text-indigo-600">
                                                                            <Clock size={20} />
                                                                        </div>
                                                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Application Journey</h3>
                                                                    </div>

                                                                    <div className="relative pl-8 border-l-2 border-gray-50 space-y-8 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                                        {loadingHistory[app.id] ? (
                                                                            <div className="animate-pulse flex flex-col gap-4">
                                                                                {[1, 2].map(i => (
                                                                                    <div key={i} className="h-20 bg-gray-50 w-full" />
                                                                                ))}
                                                                            </div>
                                                                        ) : applicationHistory[app.id]?.map((log: any, lIdx: number) => (
                                                                            <div key={lIdx} className="relative">
                                                                                <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full border-2 border-white bg-indigo-500 shadow-sm" />
                                                                                <div className="flex flex-col">
                                                                                    <div className="flex items-center justify-between gap-4 mb-2">
                                                                                        <span className="text-sm font-bold text-gray-800 uppercase tracking-tighter">{log.action_type || 'Update'}</span>
                                                                                        <span className="text-[11px] text-gray-400 font-medium">
                                                                                            {new Date(log.created_at).toLocaleDateString()}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="p-3 bg-gray-50/50 border border-gray-100">
                                                                                        <p className="text-sm text-gray-600 leading-relaxed italic">"{log.notes || log.details || 'No notes available'}"</p>
                                                                                        {log.action_by_name && (
                                                                                            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-gray-100">
                                                                                                <span className="text-[10px] text-gray-400 uppercase font-bold">Action By</span>
                                                                                                <span className="text-[11px] font-bold text-indigo-600">{log.action_by_name}</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )) || (
                                                                            <p className="text-sm text-gray-400 italic">No history found</p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Card 2: Personal & Professional Information */}
                                                                <div className="bg-white rounded-none border border-gray-100 shadow-sm p-8">
                                                                    <div className="flex items-center gap-3 mb-6">
                                                                        <div className="p-2 bg-indigo-50 text-indigo-600">
                                                                            <User size={20} />
                                                                        </div>
                                                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Candidate Profile</h3>
                                                                    </div>

                                                                    <div className="space-y-6">
                                                                        {/* Personal Section */}
                                                                        <div className="grid grid-cols-2 gap-6 pb-6 border-b border-gray-50">
                                                                            <div>
                                                                                <p className="text-[11px] text-gray-400 uppercase font-bold tracking-widest mb-1">Phone</p>
                                                                                <p className="text-sm font-semibold text-gray-700">{app.candidate_phone || 'Not Provided'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[11px] text-gray-400 uppercase font-bold tracking-widest mb-1">Current City</p>
                                                                                <p className="text-sm font-semibold text-gray-700">{app.current_city || 'Not Specified'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[11px] text-gray-400 uppercase font-bold tracking-widest mb-1">Gender / DOB</p>
                                                                                <p className="text-sm font-semibold text-gray-700">{app.gender || '-'} / {app.dob ? new Date(app.dob).toLocaleDateString() : '-'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[11px] text-gray-400 uppercase font-bold tracking-widest mb-1">Education</p>
                                                                                <p className="text-sm font-semibold text-gray-700">{app.highest_education || 'Not Specified'}</p>
                                                                            </div>
                                                                        </div>

                                                                        {/* Professional Section */}
                                                                        <div className="grid grid-cols-2 gap-6">
                                                                            <div className="col-span-2">
                                                                                <p className="text-[11px] text-gray-400 uppercase font-bold tracking-widest mb-1">Current Company & Role</p>
                                                                                <p className="text-sm font-semibold text-gray-700">{app.current_company || '—'} · {app.current_designation || '—'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[11px] text-gray-400 uppercase font-bold tracking-widest mb-1">Total Experience</p>
                                                                                <p className="text-sm font-semibold text-gray-700">{app.total_experience || 'Fresher'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[11px] text-gray-400 uppercase font-bold tracking-widest mb-1">Notice Period</p>
                                                                                <p className="text-sm font-semibold text-gray-700">{app.notice_period || '—'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[11px] text-gray-400 uppercase font-bold tracking-widest mb-1">Current / Expected Salary</p>
                                                                                <p className="text-sm font-semibold text-gray-700">{app.current_salary || '—'} / {app.expected_salary || '—'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[11px] text-gray-400 uppercase font-bold tracking-widest mb-1">Tech Score</p>
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="h-1.5 w-16 bg-gray-100 rounded-none overflow-hidden">
                                                                                        <div
                                                                                            className="h-full bg-indigo-500"
                                                                                            style={{ width: `${app.tech_test_score || 0}%` }}
                                                                                        />
                                                                                    </div>
                                                                                    <span className="text-[11px] font-bold text-indigo-600">{app.tech_test_score || 0}%</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {(app.hr_notes || app.operation_notes) && (
                                                                        <div className="mt-6 space-y-4 pt-6 border-t border-gray-50">
                                                                            {app.hr_notes && (
                                                                                <div className="p-3 bg-gray-50 border border-gray-100 rounded-none">
                                                                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">HR Feedback</p>
                                                                                    <p className="text-xs text-gray-700 leading-relaxed italic">"{app.hr_notes}"</p>
                                                                                </div>
                                                                            )}
                                                                            {app.operation_notes && (
                                                                                <div className="p-3 bg-gray-50 border border-gray-100 rounded-none">
                                                                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Previous Operation Notes</p>
                                                                                    <p className="text-xs text-gray-700 leading-relaxed italic">"{app.operation_notes}"</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {app.resume_url && (
                                                                        <div className="mt-6">
                                                                            <a
                                                                                href={app.resume_url}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
                                                                            >
                                                                                <FileText size={14} /> View Resume / Documents
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Card 3: Technical Assessment */}
                                                                <div className="bg-white rounded-none border border-gray-100 shadow-sm p-8">
                                                                    <div className="flex items-center justify-between mb-6">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="p-2 bg-indigo-50 text-indigo-600">
                                                                                <FileText size={20} />
                                                                            </div>
                                                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Technical Assessment</h3>
                                                                        </div>
                                                                        {assessmentDetails[app.id]?.assignment?.ai_evaluation && (
                                                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 border ${assessmentDetails[app.id].assignment.ai_evaluation.is_ai_generated
                                                                                ? 'border-red-200 bg-red-50 text-red-600'
                                                                                : 'border-green-200 bg-green-50 text-green-600'
                                                                                }`}>
                                                                                {assessmentDetails[app.id].assignment.ai_evaluation.is_ai_generated ? 'AI Detected' : 'Authentic'}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {assessmentDetails[app.id]?.questions ? (
                                                                        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                                            {assessmentDetails[app.id].questions.map((qa: any, idx: number) => (
                                                                                <div key={idx} className="pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                                                                                    <p className="text-sm font-bold text-gray-800 mb-3 flex gap-2">
                                                                                        <span className="text-indigo-400">Q.</span>
                                                                                        {qa.question_text || qa.question}
                                                                                    </p>
                                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                        <div className="p-3 bg-gray-50/50 border border-gray-100">
                                                                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Candidate Answer</p>
                                                                                            <p className="text-sm text-gray-700">{qa.candidate_answer || qa.answer || 'No answer'}</p>
                                                                                        </div>
                                                                                        <div className="p-3 bg-green-50/30 border border-green-100">
                                                                                            <p className="text-[10px] text-green-500/70 uppercase font-bold mb-1">Expected Answer</p>
                                                                                            <p className="text-sm text-gray-700">{qa.correct_answer || qa.expected_answer}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="py-10 text-center">
                                                                            <p className="text-sm text-gray-400 italic">No assessment details available.</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Right Column: History & Evaluation */}
                                                            <div className="lg:col-span-6 space-y-8">
                                                                {/* Final Action: Evaluation Form */}
                                                                <div className="bg-white rounded-none border border-gray-100 shadow-sm p-8">
                                                                    <div className="flex items-center gap-3 mb-6">
                                                                        <div className="p-2 bg-indigo-50 text-indigo-600">
                                                                            <CheckCircle2 size={20} />
                                                                        </div>
                                                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{app.interview_stage || 'Operational'} Evaluation</h3>
                                                                    </div>

                                                                    <form onSubmit={(e) => handleSubmit(app.id, e)} className="space-y-6">
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setOutcome('Passed')}
                                                                                className={`py-3 px-4 text-xs font-bold uppercase tracking-widest border transition-all ${outcome === 'Passed'
                                                                                    ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-100'
                                                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-green-600 hover:text-green-600'
                                                                                    }`}
                                                                            >
                                                                                {app.interview_stage === 'Final' ? 'Approve for Offer' : 'Approve'}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setOutcome('Failed')}
                                                                                className={`py-3 px-4 text-xs font-bold uppercase tracking-widest border transition-all ${outcome === 'Failed'
                                                                                    ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-100'
                                                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-red-600 hover:text-red-600'
                                                                                    }`}
                                                                            >
                                                                                Reject
                                                                            </button>
                                                                        </div>

                                                                        <div>
                                                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Evaluation Notes</label>
                                                                            <textarea
                                                                                value={notes}
                                                                                onChange={(e) => setNotes(e.target.value)}
                                                                                className="w-full bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700 min-h-[120px] focus:outline-none focus:border-indigo-400 transition-colors"
                                                                                placeholder={`Provide detailed feedback on the ${app.interview_stage?.toLowerCase() || 'operational'} interview...`}
                                                                                required
                                                                            />
                                                                        </div>

                                                                        {outcome === 'Passed' && app.interview_stage !== 'Final' && (
                                                                            <div className="space-y-2 relative">
                                                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Assign Next Interviewer</label>
                                                                                <div className="relative">
                                                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="Search interviewer name..."
                                                                                        value={assignedToNext}
                                                                                        onChange={(e) => {
                                                                                            setAssignedToNext(e.target.value);
                                                                                            setShowEmpDropdown(app.id);
                                                                                        }}
                                                                                        onFocus={() => setShowEmpDropdown(app.id)}
                                                                                        className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-100 text-sm text-gray-700 focus:outline-none focus:border-indigo-400 transition-colors"
                                                                                    />
                                                                                    {showEmpDropdown === app.id && (
                                                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-none shadow-xl max-h-48 overflow-y-auto z-50">
                                                                                            {(() => {
                                                                                                const q = assignedToNext.toLowerCase();
                                                                                                const filtered = interviewers.filter(e => {
                                                                                                    const n = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
                                                                                                    return n.includes(q) || (e.email || '').toLowerCase().includes(q) || (e.designation || '').toLowerCase().includes(q);
                                                                                                });

                                                                                                if (filtered.length === 0) {
                                                                                                    return <div className="p-3 text-xs text-gray-500 text-center">No employees found</div>
                                                                                                }

                                                                                                return filtered.map(emp => {
                                                                                                    const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                                                                                                    return (
                                                                                                        <button
                                                                                                            key={emp.id}
                                                                                                            type="button"
                                                                                                            onClick={() => {
                                                                                                                setAssignedToNext(empName);
                                                                                                                setAssignedToNextId(emp.id || emp.employee_id || emp.user_id);
                                                                                                                setShowEmpDropdown(null);
                                                                                                            }}
                                                                                                            className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-gray-0 last:border-0 transition-colors"
                                                                                                        >
                                                                                                            <div className="flex flex-col">
                                                                                                                <span className="text-sm font-bold text-gray-900">{empName}</span>
                                                                                                                <span className="text-[10px] text-gray-500">{emp.email || emp.designation}</span>
                                                                                                            </div>
                                                                                                        </button>
                                                                                                    );
                                                                                                });
                                                                                            })()}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {app.interview_stage === 'Final' && (
                                                                            <div>
                                                                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Proposed Salary</label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={proposedSalary}
                                                                                    onChange={(e) => setProposedSalary(e.target.value)}
                                                                                    className="w-full bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700 focus:outline-none focus:border-indigo-400 transition-colors"
                                                                                    placeholder="e.g. $120,000 / year"
                                                                                />
                                                                            </div>
                                                                        )}

                                                                        <div className="flex gap-4">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => generatePDF(app)}
                                                                                className="flex-1 py-4 bg-white border border-gray-200 text-gray-900 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                                                            >
                                                                                <Download size={14} /> Report
                                                                            </button>
                                                                            <button
                                                                                type="submit"
                                                                                disabled={processing || outcome === 'Pending'}
                                                                                className="flex-[2] py-4 bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all disabled:bg-gray-400 disabled:cursor-not-allowed shadow-xl shadow-gray-200"
                                                                            >
                                                                                {processing ? 'Processing...' : 'Finalize Assessment'}
                                                                            </button>
                                                                        </div>
                                                                    </form>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div >
            </div >
        </div >
    );
}
