"use client";

import React, { useState, useEffect } from 'react';
import {
    Briefcase, CheckCircle2, XCircle, UserCheck, MessageSquare,
    Search, Filter, ChevronRight, Download, Calendar, ArrowRight,
    User, Mail, Phone, FileText, QrCode
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '@/context/AuthContext';

export default function OperationManagement({ myOnly = false }: { myOnly?: boolean }) {
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
    const [processing, setProcessing] = useState(false);
    const [interviewers, setInterviewers] = useState<any[]>([]);
    const { organization } = useAuth();

    // Form State
    const [outcome, setOutcome] = useState<'Pending' | 'Passed' | 'Failed'>('Pending');
    const [notes, setNotes] = useState('');
    const [assignedToNext, setAssignedToNext] = useState('');

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
        try {
            const res = await apiClient.get('/operation-round/candidates', {
                assigned_to_me: myOnly ? 'true' : 'false'
            }, { withAuth: true });
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (outcome === 'Pending') {
            toast.error('Please select an outcome');
            return;
        }

        setProcessing(true);
        try {
            const payload = {
                outcome,
                interview_notes: notes,
                assigned_to_next: assignedToNext
            };

            const res = await apiClient.put(`/operation-round/applications/${selectedCandidate.id}/result`, payload, { withAuth: true });

            if (res.success) {
                toast.success(outcome === 'Passed' ? 'Candidate advanced to Final Round' : 'Candidate marked as Failed');
                setSelectedCandidate(null);
                setNotes('');
                setOutcome('Pending');
                setAssignedToNext('');
                fetchCandidates();
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Failed to update operation round result');
        } finally {
            setProcessing(false);
        }
    };

    const generatePDF = (candidate: any) => {
        const doc = new jsPDF();

        // Header
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('OPERATION ROUND REPORT', 14, 25);

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
            ['Current Company', candidate.current_company || 'N/A']
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

        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text('Operation Round Notes', 14, finalY);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(candidate.interview_notes || 'No notes provided.', 180);
        doc.text(splitNotes, 14, finalY + 10);

        doc.save(`${candidate.candidate_name}_Operation_Round.pdf`);
    };

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto min-h-screen bg-gray-50">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                        {myOnly ? 'My Operation Interviews' : 'Operation Rounds'}
                    </h1>
                    <p className="mt-1 text-gray-500 font-medium">
                        {myOnly ? 'Review and evaluate candidates assigned to your Operation round.' : 'Manage Department Head interviews and final round progressions.'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-bold text-gray-600 uppercase tracking-wider">{candidates.length} Pending</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Candidate List */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-black text-gray-400 uppercase tracking-widest text-xs">
                            {myOnly ? 'Your Evaluation Queue' : 'Operation Pipeline'}
                        </h3>
                        <Filter size={14} className="text-gray-400" />
                    </div>

                    <div className="space-y-3 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="h-32 bg-white rounded-3xl animate-pulse shadow-sm border border-gray-50"></div>
                            ))
                        ) : candidates.length === 0 ? (
                            <div className="bg-white rounded-[32px] p-12 text-center border-2 border-dashed border-gray-100">
                                <User className="mx-auto text-gray-200 mb-4" size={48} />
                                <p className="text-gray-400 font-bold">No candidates at this stage</p>
                            </div>
                        ) : (
                            candidates.map((candidate) => (
                                <button
                                    key={candidate.id}
                                    onClick={() => setSelectedCandidate(candidate)}
                                    className={`w-full text-left p-5 rounded-[32px] transition-all duration-300 border-2 ${selectedCandidate?.id === candidate.id
                                        ? 'bg-black border-black text-white shadow-xl scale-[1.02]'
                                        : 'bg-white border-transparent text-gray-900 shadow-sm hover:border-gray-200 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`p-2 rounded-xl ${selectedCandidate?.id === candidate.id ? 'bg-white/10' : 'bg-gray-50'}`}>
                                            <Briefcase size={16} className={selectedCandidate?.id === candidate.id ? 'text-white' : 'text-gray-600'} />
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${selectedCandidate?.id === candidate.id ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600'}`}>
                                            Operation
                                        </div>
                                    </div>
                                    <h4 className="font-black text-lg leading-tight mb-1">{candidate.candidate_name}</h4>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${selectedCandidate?.id === candidate.id ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {candidate.position_name}
                                    </p>
                                    <div className={`mt-4 pt-4 border-t ${selectedCandidate?.id === candidate.id ? 'border-white/10' : 'border-gray-50'} flex items-center justify-between`}>
                                        <span className={`text-[10px] font-bold ${selectedCandidate?.id === candidate.id ? 'text-gray-400' : 'text-gray-400'}`}>
                                            {new Date(candidate.applied_at).toLocaleDateString()}
                                        </span>
                                        <ChevronRight size={14} className={selectedCandidate?.id === candidate.id ? 'text-white' : 'text-gray-300'} />
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Candidate Details & Evaluation */}
                <div className="lg:col-span-2">
                    {selectedCandidate ? (
                        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-right-4 duration-500">
                            {/* Detailed Header */}
                            <div className="bg-gray-900 p-8 text-white relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-center gap-6">
                                            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20">
                                                <User size={32} className="text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-3xl font-black tracking-tight">{selectedCandidate.candidate_name}</h2>
                                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-white/80 border border-white/10">
                                                        {selectedCandidate.candidate_email}
                                                    </span>
                                                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-white/80 border border-white/10">
                                                        {selectedCandidate.candidate_phone}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => generatePDF(selectedCandidate)}
                                            className="flex items-center gap-2 px-6 py-3 bg-white text-black font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-gray-100 transition-all shadow-lg"
                                        >
                                            <Download size={14} /> Export Report
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    {/* Left: Info */}
                                    <div className="space-y-8">
                                        <div>
                                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Application Details</h3>
                                            <div className="space-y-4">
                                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <div className="flex items-center gap-3 text-gray-400 mb-1">
                                                        <Briefcase size={14} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Position</span>
                                                    </div>
                                                    <p className="font-bold text-gray-900">{selectedCandidate.position_name}</p>
                                                </div>
                                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <div className="flex items-center gap-3 text-gray-400 mb-1">
                                                        <UserCheck size={14} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Previous Notes</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-600 italic">
                                                        "{selectedCandidate.interview_notes || 'No notes from previous stage.'}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Evaluation */}
                                    <div className="space-y-8">
                                        <div>
                                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Operation Evaluation</h3>
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setOutcome('Passed')}
                                                        className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${outcome === 'Passed'
                                                            ? 'bg-green-50 border-green-600 shadow-lg shadow-green-100'
                                                            : 'bg-white border-gray-100 hover:border-green-200'
                                                            }`}
                                                    >
                                                        <div className={`p-3 rounded-2xl ${outcome === 'Passed' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600'}`}>
                                                            <CheckCircle2 size={24} />
                                                        </div>
                                                        <span className={`font-black text-xs uppercase tracking-widest ${outcome === 'Passed' ? 'text-green-900' : 'text-gray-400'}`}>Passed</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setOutcome('Failed')}
                                                        className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${outcome === 'Failed'
                                                            ? 'bg-red-50 border-red-600 shadow-lg shadow-red-100'
                                                            : 'bg-white border-gray-100 hover:border-red-200'
                                                            }`}
                                                    >
                                                        <div className={`p-3 rounded-2xl ${outcome === 'Failed' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}>
                                                            <XCircle size={24} />
                                                        </div>
                                                        <span className={`font-black text-xs uppercase tracking-widest ${outcome === 'Failed' ? 'text-red-900' : 'text-gray-400'}`}>Failed</span>
                                                    </button>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Round Notes</label>
                                                    <textarea
                                                        required
                                                        placeholder="Share your detailed assessment of the candidate..."
                                                        value={notes}
                                                        onChange={(e) => setNotes(e.target.value)}
                                                        className="w-full p-5 bg-gray-50 border border-gray-200 rounded-3xl outline-none focus:ring-4 focus:ring-black/5 font-medium text-sm min-h-[150px] transition-all"
                                                    />
                                                </div>

                                                {outcome === 'Passed' && (
                                                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                            <QrCode size={12} className="text-black" />
                                                            Assign for Final Round (Admin)
                                                        </label>
                                                        <select
                                                            value={assignedToNext}
                                                            onChange={(e) => setAssignedToNext(e.target.value)}
                                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold text-sm focus:ring-4 focus:ring-black/5 appearance-none cursor-pointer"
                                                        >
                                                            <option value="">Don't Assign / Next Available Admin</option>
                                                            {interviewers.map(emp => (
                                                                <option key={emp.id} value={`${emp.first_name} ${emp.last_name || ''}`.trim()}>
                                                                    {emp.first_name} {emp.last_name} — {emp.designation}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                <button
                                                    disabled={processing || outcome === 'Pending'}
                                                    type="submit"
                                                    className="w-full py-5 bg-black text-white rounded-[32px] font-black uppercase tracking-widest hover:bg-gray-900 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3"
                                                >
                                                    {processing ? (
                                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                    ) : (
                                                        <>Submit & Advance to Final Round</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-white rounded-[40px] border border-gray-100 border-dashed p-20 text-center">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <QrCode className="text-gray-200" size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900">Select a Candidate</h3>
                            <p className="text-gray-400 font-medium mt-2 max-w-xs">
                                Choose a candidate from the left pipeline to begin your Operation round evaluation.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
