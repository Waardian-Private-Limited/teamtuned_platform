"use client";

import React, { useState, useEffect } from 'react';
import {
    Briefcase, CheckCircle2, XCircle, UserCheck, MessageSquare,
    Search, Filter, ChevronRight, Download, Calendar, ArrowRight,
    User, Mail, Phone, FileText, Award
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '@/context/AuthContext';

export default function InterviewManagement({ myOnly = false }: { myOnly?: boolean }) {
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
    const [processing, setProcessing] = useState(false);
    const { organization } = useAuth();

    // Form State
    const [outcome, setOutcome] = useState<'Pending' | 'Passed' | 'Failed'>('Pending');
    const [notes, setNotes] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [nextStage, setNextStage] = useState('Operation');
    const [questionCount, setQuestionCount] = useState(10);
    const [testDuration, setTestDuration] = useState(30);
    const [generatedLink, setGeneratedLink] = useState('');

    useEffect(() => {
        fetchCandidates();
    }, []);

    const generatePDF = (candidate: any) => {
        const doc = new jsPDF();

        // Header
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('INTERVIEW PROCESS REPORT', 14, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

        // Candidate Summary
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Candidate Profile', 14, 55);

        const candidateData = [
            ['Full Name', candidate.candidate_name],
            ['Position Applied', candidate.position_name],
            ['Department', candidate.department || 'N/A'],
            ['Email', candidate.candidate_email],
            ['Phone', candidate.candidate_phone],
            ['Experience', candidate.total_experience || 'N/A'],
            ['Current Company', candidate.current_company || 'N/A'],
            ['Expected Salary', candidate.expected_salary || 'N/A'],
            ['Notice Period', candidate.notice_period || 'N/A'],
        ];

        autoTable(doc, {
            startY: 60,
            head: [['Field', 'Details']],
            body: candidateData,
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
        });

        // Interview Details
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text('Interview Evaluation', 14, finalY);

        const interviewData = [
            ['Status', candidate.status],
            ['Current Stage', candidate.interview_stage || 'HR Round'],
            ['Assigned Interviewer', candidate.assigned_to || 'Pending'],
            ['Last Updated', new Date().toLocaleDateString()]
        ];

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Metric', 'Status']],
            body: interviewData,
            theme: 'striped',
            headStyles: { fillColor: [40, 40, 40] },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
        });

        // Notes Section
        const notesY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text('HR Notes / Feedback', 14, notesY);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(candidate.interview_notes || 'No feedback recorded yet.', 180);
        doc.text(splitNotes, 14, notesY + 8);

        // Resume Link
        const resumeY = notesY + 15 + (splitNotes.length * 5);
        if (candidate.resume_url) {
            doc.setFillColor(240, 240, 240);
            doc.rect(14, resumeY, 182, 15, 'F');
            doc.setTextColor(0, 0, 255);
            doc.setFontSize(11);
            doc.textWithLink('CLICK HERE TO OPEN ATTACHED RESUME (EXTERNAL LINK)', 20, resumeY + 10, { url: candidate.resume_url });
        }

        doc.save(`${candidate.candidate_name.replace(/\s+/g, '_')}_Interview_Report.pdf`);
    };

    const fetchCandidates = async () => {
        try {
            const res = await apiClient.get('/hr-operation/shortlisted-candidates', {
                assigned_to_me: myOnly ? 'true' : 'false'
            }, { withAuth: true });
            if (res.success) {
                setCandidates(res.data);
            }
        } catch (err) {
            console.error('Failed to load candidates', err);
            toast.error('Failed to load candidate list');
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = (candidate: any) => {
        setSelectedCandidate(candidate);
        setOutcome('Pending');
        setNotes(candidate.interview_notes || '');
        setAssignedTo(candidate.assigned_to || '');
        setNextStage(candidate.interview_stage === 'HR' ? 'Operation' : candidate.interview_stage);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCandidate) return;

        setProcessing(true);
        try {
            const payload: any = {
                interview_notes: notes,
            };

            if (outcome === 'Passed') {
                payload.status = 'Interviewing';
                payload.interview_stage = nextStage;
                if (nextStage !== 'Technical') {
                    payload.assigned_to = assignedTo;
                }
            } else if (outcome === 'Failed') {
                payload.status = 'Rejected';
            }

            const res = await apiClient.put(`/hr-operation/applications/${selectedCandidate.id}/interview`, payload, { withAuth: true });

            if (res.success) {
                if (outcome === 'Passed' && nextStage === 'Technical') {
                    // Also assign technical test
                    const testRes = await apiClient.post('/technical-assessments/assign', {
                        application_id: selectedCandidate.id,
                        question_count: questionCount,
                        time_limit_mins: testDuration
                    }, { withAuth: true });
                    if (testRes.success) {
                        toast.success('Technical test assigned and advanced');
                        setGeneratedLink(`${window.location.origin}/public/technical-test/${testRes.data.test_token}?orgId=${organization?.id}`);
                    }
                } else {
                    toast.success(outcome === 'Passed' ? 'Candidate advanced to next round' : 'Candidate marked as rejected');
                    setSelectedCandidate(null);
                }
                fetchCandidates();
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Failed to update interview status');
        } finally {
            setProcessing(false);
        }
    };

    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'HR': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'Technical': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'Operation': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'Final': return 'bg-green-50 text-green-700 border-green-100';
            default: return 'bg-gray-50 text-gray-700';
        }
    };

    const [expandedCandidateId, setExpandedCandidateId] = useState<number | null>(null);

    const toggleExpand = (id: number) => {
        setExpandedCandidateId(prev => (prev === id ? null : id));
    };

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto min-h-screen bg-gray-50">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                        {myOnly ? 'Assigned Interviews' : 'Interview Board'}
                    </h1>
                    <p className="mt-1 text-gray-500 font-medium">
                        {myOnly ? 'Review and evaluate candidates assigned to your department.' : 'Manage HR interviews, evaluations, and stage progressions.'}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                    <h3 className="font-black text-gray-400 uppercase tracking-widest text-xs">
                        {myOnly ? 'Your Evaluation Queue' : 'Shortlisted Pipeline'}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-black text-white text-[10px] font-bold rounded-full">{candidates.length} Candidates</span>
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 text-center text-gray-400 font-bold animate-pulse">Loading Pipeline...</div>
                ) : candidates.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Briefcase className="text-gray-300" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">No Candidates Ready</h3>
                        <p className="text-gray-400 mt-2 font-medium">Shortlist candidates from the "Applied Positions" page first.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {candidates.map((candidate) => (
                            <div key={candidate.id} className="p-6 hover:bg-gray-50/50 transition-all flex flex-col gap-6 group">
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-black text-gray-900">{candidate.candidate_name}</h3>
                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStageColor(candidate.interview_stage || 'HR')}`}>
                                                {candidate.interview_stage || 'HR'} Round
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-500">
                                            <span className="flex items-center gap-1"><Briefcase size={14} /> {candidate.position_name} <span className="mx-1 text-gray-300">|</span> {candidate.department}</span>
                                            <span className="flex items-center gap-1"><Mail size={14} /> {candidate.candidate_email}</span>
                                            <span className="flex items-center gap-1"><Phone size={14} /> {candidate.candidate_phone}</span>
                                        </div>
                                    </div>

                                    <div className="hidden md:block w-px h-10 bg-gray-100"></div>

                                    <div className="flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
                                        <button
                                            onClick={() => toggleExpand(candidate.id)}
                                            className="p-3 bg-white border border-gray-200 text-gray-400 hover:text-black hover:border-black rounded-xl transition-all text-xs font-bold whitespace-nowrap"
                                        >
                                            {expandedCandidateId === candidate.id ? 'Collapse Details' : 'Expand Details'}
                                        </button>
                                        <button
                                            onClick={() => generatePDF(candidate)}
                                            className="p-3 bg-white border border-gray-200 text-gray-400 hover:text-black hover:border-black rounded-xl transition-all"
                                            title="Download Report"
                                        >
                                            <Download size={18} />
                                        </button>
                                        {candidate.resume_url && (
                                            <a
                                                href={candidate.resume_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 bg-white border border-gray-200 text-gray-400 hover:text-black hover:border-black rounded-xl transition-all"
                                                title="View Resume"
                                            >
                                                <FileText size={18} />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => handleProcess(candidate)}
                                            className="flex-1 md:flex-none px-6 py-3 bg-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-xs uppercase tracking-wider flex items-center gap-2"
                                        >
                                            Process Interview <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedCandidateId === candidate.id && (
                                    <div className="pt-6 border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
                                            {/* Professional Profile */}
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-50 pb-2">Professional Profile</h4>
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div>
                                                        <span className="text-gray-400 text-xs font-bold block mb-0.5">Current Company</span>
                                                        <p className="font-bold text-gray-900">{candidate.current_company || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 text-xs font-bold block mb-0.5">Designation</span>
                                                        <p className="font-bold text-gray-900">{candidate.current_designation || 'N/A'}</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <span className="text-gray-400 text-xs font-bold block mb-0.5">Current Salary</span>
                                                            <p className="font-bold text-gray-900">{candidate.current_salary || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400 text-xs font-bold block mb-0.5">Notice Period</span>
                                                            <p className="font-bold text-gray-900">{candidate.notice_period || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Personal Details */}
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-50 pb-2">Personal Details</h4>
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <span className="text-gray-400 text-xs font-bold block mb-0.5">DOB</span>
                                                            <p className="font-bold text-gray-900">{candidate.dob ? new Date(candidate.dob).toLocaleDateString() : 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400 text-xs font-bold block mb-0.5">Gender</span>
                                                            <p className="font-bold text-gray-900">{candidate.gender || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 text-xs font-bold block mb-0.5">Current City</span>
                                                        <p className="font-bold text-gray-900">{candidate.current_city || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Education */}
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-50 pb-2">Education</h4>
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div>
                                                        <span className="text-gray-400 text-xs font-bold block mb-0.5">Highest Education</span>
                                                        <p className="font-bold text-gray-900">{candidate.highest_education || 'N/A'}</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <span className="text-gray-400 text-xs font-bold block mb-0.5">Passing Year</span>
                                                            <p className="font-bold text-gray-900">{candidate.year_of_passing || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400 text-xs font-bold block mb-0.5">Specialization</span>
                                                            <p className="font-bold text-gray-900">{candidate.specialization || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Detailed History Tables */}
                                        {(candidate.work_experience || candidate.academic_history) && (
                                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {candidate.work_experience && (
                                                    <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                                                        <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                                                            Work Experience
                                                        </h4>
                                                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                                                            <table className="w-full text-left text-xs">
                                                                <thead className="bg-gray-50 border-b border-gray-100">
                                                                    <tr>
                                                                        <th className="px-4 py-3 font-bold text-gray-500">Company</th>
                                                                        <th className="px-4 py-3 font-bold text-gray-500">Role</th>
                                                                        <th className="px-4 py-3 font-bold text-gray-500">Duration</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-50">
                                                                    {(() => {
                                                                        try {
                                                                            const exp = typeof candidate.work_experience === 'string' ? JSON.parse(candidate.work_experience) : candidate.work_experience;
                                                                            return Array.isArray(exp) && exp.length > 0 ? exp.map((e: any, i: number) => (
                                                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                                                    <td className="px-4 py-3 font-bold text-gray-900">{e.company}</td>
                                                                                    <td className="px-4 py-3 text-gray-600 font-medium">{e.designation}</td>
                                                                                    <td className="px-4 py-3 text-gray-500">{e.duration}</td>
                                                                                </tr>
                                                                            )) : <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400 font-medium">No work experience listed</td></tr>
                                                                        } catch (err) {
                                                                            return <tr><td colSpan={3} className="px-4 py-6 text-center text-red-400 font-medium">Error loading data</td></tr>
                                                                        }
                                                                    })()}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}

                                                {candidate.academic_history && (
                                                    <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                                                        <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                                                            Academic History
                                                        </h4>
                                                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                                                            <table className="w-full text-left text-xs">
                                                                <thead className="bg-gray-50 border-b border-gray-100">
                                                                    <tr>
                                                                        <th className="px-4 py-3 font-bold text-gray-500">Degree</th>
                                                                        <th className="px-4 py-3 font-bold text-gray-500">Institute</th>
                                                                        <th className="px-4 py-3 font-bold text-gray-500">Year</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-50">
                                                                    {(() => {
                                                                        try {
                                                                            const acad = typeof candidate.academic_history === 'string' ? JSON.parse(candidate.academic_history) : candidate.academic_history;
                                                                            return Array.isArray(acad) && acad.length > 0 ? acad.map((e: any, i: number) => (
                                                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                                                    <td className="px-4 py-3 font-bold text-gray-900">{e.degree}</td>
                                                                                    <td className="px-4 py-3 text-gray-600 font-medium">{e.university || e.institute}</td>
                                                                                    <td className="px-4 py-3 text-gray-500">{e.year}</td>
                                                                                </tr>
                                                                            )) : <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400 font-medium">No academic record listed</td></tr>
                                                                        } catch (err) {
                                                                            return <tr><td colSpan={3} className="px-4 py-6 text-center text-red-400 font-medium">Error loading data</td></tr>
                                                                        }
                                                                    })()}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Process Modal */}
            {selectedCandidate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">HR Evaluation</h2>
                                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">{selectedCandidate.candidate_name} — {selectedCandidate.position_name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => generatePDF(selectedCandidate)} className="p-2 hover:bg-white rounded-full transition-all text-gray-400 hover:text-black" title="Download Report">
                                    <Download size={20} />
                                </button>
                                <button onClick={() => setSelectedCandidate(null)} className="p-2 hover:bg-white rounded-full transition-all text-gray-400 hover:text-black">
                                    <XCircle size={24} />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {/* Outcome Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all ${outcome === 'Passed' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 hover:border-green-200'}`}>
                                    <input type="radio" name="outcome" className="hidden" onClick={() => setOutcome('Passed')} />
                                    <CheckCircle2 size={24} className={outcome === 'Passed' ? 'text-green-600' : 'text-gray-300'} />
                                    <span className="font-black text-xs uppercase tracking-widest">Pass & Advance</span>
                                </label>
                                <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all ${outcome === 'Failed' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 hover:border-red-200'}`}>
                                    <input type="radio" name="outcome" className="hidden" onClick={() => setOutcome('Failed')} />
                                    <XCircle size={24} className={outcome === 'Failed' ? 'text-red-600' : 'text-gray-300'} />
                                    <span className="font-black text-xs uppercase tracking-widest">Reject</span>
                                </label>
                            </div>

                            {/* Conditional Fields for Passed */}
                            {outcome === 'Passed' && (
                                <div className="space-y-4 animate-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Next Stage</label>
                                        <select
                                            value={nextStage}
                                            onChange={(e) => setNextStage(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-black/5"
                                        >
                                            <option value="Operation">Operation Round</option>
                                            <option value="Technical">Technical Round</option>
                                            <option value="Final">Final Round</option>
                                        </select>
                                    </div>
                                    {nextStage !== 'Technical' && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Assign Next Interviewer</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="Enter name or email..."
                                                    value={assignedTo}
                                                    onChange={(e) => setAssignedTo(e.target.value)}
                                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-black/5"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {nextStage === 'Technical' && (
                                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-1">
                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">No. of Questions</label>
                                                <input
                                                    type="number"
                                                    value={questionCount || ''}
                                                    onChange={(e) => setQuestionCount(parseInt(e.target.value) || 0)}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Time (Mins)</label>
                                                <input
                                                    type="number"
                                                    value={testDuration || ''}
                                                    onChange={(e) => setTestDuration(parseInt(e.target.value) || 0)}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {generatedLink && (
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-2">
                                    <label className="text-[10px] uppercase font-black text-blue-400 tracking-widest font-bold">Generated Test Link (Expires in 24h)</label>
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={generatedLink}
                                            className="flex-1 bg-white border border-blue-200 px-3 py-2 rounded-lg text-xs font-mono overflow-ellipsis"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(generatedLink);
                                                toast.success('Link copied!');
                                            }}
                                            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Interview Notes / Feedback</label>
                                <textarea
                                    required
                                    placeholder="Enter detailed feedback and observations..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-medium text-sm focus:ring-2 focus:ring-black/5 min-h-[100px]"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={processing || outcome === 'Pending'}
                                className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest hover:bg-gray-900 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? 'Updating...' : 'Submit Evaluation'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
