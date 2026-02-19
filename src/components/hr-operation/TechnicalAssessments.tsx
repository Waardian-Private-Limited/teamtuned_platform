"use client";

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Award, Calendar, User, Briefcase, FileText, CheckCircle2, Clock, XCircle, Search, ExternalLink, ChevronRight, Filter, X, Send, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TechnicalAssessments() {
    const [assessments, setAssessments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

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
        if (!outcome) return;
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

    const filteredAssessments = assessments.filter(a => {
        const matchesSearch = a.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.position_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

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
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                        <Award size={40} className="text-black" />
                        Technical Assessments
                    </h2>
                    <p className="text-gray-500 font-bold mt-2 uppercase tracking-widest text-[10px]">Track candidate performance and results</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search candidates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-3xl outline-none focus:ring-4 focus:ring-black/5 font-bold text-sm w-72 shadow-sm transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 pb-2">
                {['All', 'Pending', 'Completed', 'Expired'].map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${statusFilter === status
                            ? 'bg-black text-white shadow-xl shadow-black/20'
                            : 'bg-white text-gray-400 hover:text-black border border-gray-100'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Assessments Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white h-64 rounded-[40px] border border-gray-50 animate-pulse shadow-sm"></div>
                    ))}
                </div>
            ) : filteredAssessments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredAssessments.map((a) => (
                        <div key={a.id} className="group bg-white rounded-[48px] p-8 shadow-sm border border-gray-50 hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                            {/* Score display for completed */}
                            {a.status === 'Completed' && (
                                <div className="absolute top-0 right-0 p-8">
                                    <div className={`w-16 h-16 rounded-3xl flex flex-col items-center justify-center border-2 ${getScoreColor(a.score).replace('text', 'border')} ${getScoreColor(a.score).replace('text', 'bg').replace('600', '50')}`}>
                                        <span className={`text-lg font-black ${getScoreColor(a.score)}`}>{Math.round(a.score)}%</span>
                                        <span className={`text-[8px] font-black uppercase ${getScoreColor(a.score).replace('600', '400')}`}>Score</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gray-50 rounded-[20px] flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-colors duration-500">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-gray-900 group-hover:text-black">{a.candidate_name}</h3>
                                        <div className={`mt-1 inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(a.status)}`}>
                                            {a.status === 'Completed' ? <CheckCircle2 size={10} className="mr-1" /> : (a.status === 'Pending' ? <Clock size={10} className="mr-1" /> : <XCircle size={10} className="mr-1" />)}
                                            {a.status}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 p-6 bg-gray-50 rounded-3xl border border-gray-100 group-hover:bg-white group-hover:border-gray-200 transition-all duration-500">
                                    <div className="flex items-center gap-3">
                                        <Briefcase size={16} className="text-gray-400" />
                                        <span className="text-sm font-bold text-gray-600">{a.position_name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <FileText size={16} className="text-gray-400" />
                                        <span className="text-sm font-bold text-gray-600">{a.question_count} Questions | {a.time_limit_mins}m</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Calendar size={16} className="text-gray-400" />
                                        <span className="text-sm font-bold text-gray-600">Assigned: {new Date(a.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    {a.status === 'Completed' ? (
                                        <button
                                            onClick={() => handleViewDetails(a.id)}
                                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-black transition-all"
                                        >
                                            View Results <ChevronRight size={14} />
                                        </button>
                                    ) : a.status === 'Pending' ? (
                                        <div className="w-full py-4 bg-white border border-gray-100 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                                            Waiting for Candidate
                                        </div>
                                    ) : (
                                        <button className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-red-100 transition-all">
                                            Re-assign Test
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white p-20 rounded-[64px] text-center border-4 border-dashed border-gray-50">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <Award className="text-gray-200" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">No assessments found</h3>
                    <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-[10px]">Start by passing candidates from Interview Management</p>
                </div>
            )}

            {/* Details Modal */}
            {selectedId && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xl z-[60] flex items-center justify-center p-6 overflow-y-auto">
                    <div className="bg-white rounded-[48px] w-full max-w-5xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-10 border-b border-gray-50 flex justify-between items-center sticky top-0 z-10 bg-white/80 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
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
                                        <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                            <div className="text-[10px] font-black uppercase text-gray-400 mb-2">Applied Position</div>
                                            <div className="font-bold text-gray-900">{details.assignment.position_name}</div>
                                            <div className="text-[10px] font-bold text-blue-600 mt-1 uppercase">{details.assignment.department}</div>
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] font-bold text-gray-500">{details.assignment.job_type}</span>
                                                <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] font-bold text-gray-500">{details.assignment.job_location}</span>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                            <div className="text-[10px] font-black uppercase text-gray-400 mb-2">Previous Company</div>
                                            <div className="font-bold text-gray-900 truncate" title={details.assignment.current_company}>{details.assignment.current_company || 'N/A'}</div>
                                            <div className="text-[10px] font-bold text-gray-500 mt-1">{details.assignment.current_designation || 'No Designation'}</div>
                                        </div>
                                        <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                            <div className="text-[10px] font-black uppercase text-gray-400 mb-2">Candidate Info</div>
                                            <div className="font-bold text-gray-900">{details.assignment.total_experience || 'Not Specified'} EXP</div>
                                            <div className="text-[10px] font-bold text-gray-500 mt-1">{details.assignment.highest_education}</div>
                                        </div>
                                        <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col justify-between">
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

                                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-3 pt-6">
                                        <div className="w-1 h-4 bg-black rounded-full"></div>
                                        Response Analysis
                                    </h3>

                                    <div className="space-y-6">
                                        {details.questions.map((q: any, i: number) => (
                                            <div key={q.id} className="p-8 bg-gray-50 rounded-[32px] border border-gray-100 hover:border-gray-200 transition-all">
                                                <div className="flex items-start gap-6">
                                                    <span className="w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center font-black text-gray-400 text-sm shadow-sm">
                                                        {i + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-gray-900 text-lg mb-4">{q.question_text}</p>

                                                        {q.type === 'MCQ' ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <div className={`p-4 rounded-2xl border ${q.candidate_answer === q.correct_answer ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                                                    <div className="text-[8px] font-black uppercase tracking-widest mb-1">Candidate Answer</div>
                                                                    <div className="font-bold text-sm flex items-center gap-2">
                                                                        {q.candidate_answer === q.correct_answer ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                                        {q.candidate_answer || 'No Answer'}
                                                                    </div>
                                                                </div>
                                                                <div className="p-4 rounded-2xl border bg-gray-900 border-gray-800 text-white">
                                                                    <div className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-50">Correct Answer</div>
                                                                    <div className="font-bold text-sm">{q.correct_answer}</div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                <div className="p-6 bg-white border border-gray-100 rounded-2xl">
                                                                    <div className="text-[8px] font-black uppercase tracking-widest mb-2 text-gray-400">Candidate Submission</div>
                                                                    <p className="text-sm font-medium text-gray-700 leading-relaxed italic">"{q.candidate_answer || 'No Response Submitted'}"</p>
                                                                </div>
                                                                <div className="flex gap-3">
                                                                    <button
                                                                        onClick={() => handleMarkQuestion(q.id, q.marks)}
                                                                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${manualMarks[q.id] === q.marks ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-gray-400 border-gray-100 hover:border-green-200'}`}
                                                                    >
                                                                        <CheckCircle2 size={14} /> Correct (+{q.marks})
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleMarkQuestion(q.id, 0)}
                                                                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${manualMarks[q.id] === 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-400 border-gray-100 hover:border-red-200'}`}
                                                                    >
                                                                        <XCircle size={14} /> Incorrect (0)
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Evaluation Footer */}
                                <div className="mt-12 p-10 bg-black rounded-[40px] text-white shadow-2xl">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                        <div className="flex items-center gap-6">
                                            <div className="w-20 h-20 bg-white/10 rounded-3xl flex flex-col items-center justify-center border border-white/10 backdrop-blur-xl">
                                                <span className="text-2xl font-black">{Math.round(calculateCurrentScore())}%</span>
                                                <span className="text-[8px] font-black uppercase tracking-widest text-white/50">Final Score</span>
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black">Overall Evaluation</h4>
                                                <p className="text-white/50 text-xs font-bold mt-1">Determine if the candidate should advance to the Operation Round.</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-4">
                                            <button
                                                onClick={() => setOutcome('Failed')}
                                                className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${outcome === 'Failed' ? 'bg-red-500 text-white' : 'bg-white/5 text-red-400 border border-red-400/20 hover:bg-red-400/10'}`}
                                            >
                                                Fail & Reject
                                            </button>
                                            <button
                                                onClick={() => setOutcome('Passed')}
                                                className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${outcome === 'Passed' ? 'bg-green-500 text-white shadow-xl shadow-green-500/20' : 'bg-white/5 text-green-400 border border-green-400/20 hover:bg-green-400/10'}`}
                                            >
                                                Pass & Advance
                                            </button>
                                        </div>
                                    </div>

                                    {outcome === 'Passed' && (
                                        <div className="mt-8 pt-8 border-t border-white/10 animate-in slide-in-from-top-4 duration-500">
                                            <div className="flex flex-col md:flex-row items-end gap-6">
                                                <div className="flex-1 space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Assign to Operation Round Interviewer</label>
                                                    <div className="relative group">
                                                        <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white/60 transition-colors z-10" size={20} />
                                                        <select
                                                            value={assignedTo}
                                                            onChange={(e) => setAssignedTo(e.target.value)}
                                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-4 focus:ring-green-400/20 focus:border-green-400/40 font-bold transition-all appearance-none cursor-pointer text-white"
                                                        >
                                                            <option value="" className="bg-gray-900">Select HQ Interviewer from {details.assignment.department} department...</option>
                                                            {eligibleInterviewers?.map((emp: any) => (
                                                                <option key={emp.id} value={`${emp.first_name} ${emp.last_name}`} className="bg-gray-900">
                                                                    {emp.first_name} {emp.last_name} — {emp.designation}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleEvaluations}
                                                    disabled={submitting}
                                                    className="px-10 py-4 bg-green-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-green-500/20 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
                                                >
                                                    {submitting ? 'Processing...' : 'Submit Evaluation'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {outcome === 'Failed' && (
                                        <div className="mt-8 pt-8 border-t border-white/10 animate-in slide-in-from-top-4 duration-500 flex justify-end">
                                            <button
                                                onClick={handleEvaluations}
                                                disabled={submitting}
                                                className="px-10 py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20 hover:-translate-y-1 transition-all disabled:opacity-50"
                                            >
                                                {submitting ? 'Processing...' : 'Confirm Rejection'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
