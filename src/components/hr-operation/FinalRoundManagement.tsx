"use client";

import React, { useState, useEffect } from 'react';
import {
    Briefcase, CheckCircle2, XCircle, UserCheck, MessageSquare,
    Search, Filter, ChevronRight, Download, Calendar, ArrowRight,
    User, Mail, Phone, FileText, Globe
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '@/context/AuthContext';

export default function FinalRoundManagement({ myOnly = false }: { myOnly?: boolean }) {
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
    const [processing, setProcessing] = useState(false);
    const { organization } = useAuth();

    // Form State
    const [outcome, setOutcome] = useState<'Pending' | 'Passed' | 'Failed'>('Pending');
    const [notes, setNotes] = useState('');
    const [proposedSalary, setProposedSalary] = useState('');
    const [onboardingLink, setOnboardingLink] = useState<string>('');

    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        try {
            const res = await apiClient.get('/final-round/candidates', {
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
                proposed_salary: proposedSalary
            };

            const res = await apiClient.put(`/final-round/applications/${selectedCandidate.id}/result`, payload, { withAuth: true });

            if (res.success) {
                if (outcome === 'Passed' && res.data?.token) {
                    const link = `${window.location.origin}/public/onboarding?token=${res.data.token}&orgId=${organization?.id}`;
                    setOnboardingLink(link);
                    navigator.clipboard.writeText(link).catch(() => {});
                    toast.success('Candidate approved and onboarding link copied');
                } else {
                    toast.success(outcome === 'Passed' ? 'Candidate approved for Onboarding!' : 'Candidate marked as Failed');
                }
                setSelectedCandidate(null);
                setNotes('');
                setOutcome('Pending');
                setProposedSalary('');
                fetchCandidates();
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Failed to update final round result');
        } finally {
            setProcessing(false);
        }
    };

    const generateOnboardingLink = async () => {
        if (!selectedCandidate) return;
        try {
            const res = await apiClient.post(`/hiring-onboarding/links/${selectedCandidate.id}`, {}, { withAuth: true });
            if (res.success) {
                const token = res.data.token;
                const link = `${window.location.origin}/public/onboarding?token=${token}&orgId=${organization?.id}`;
                setOnboardingLink(link);
                navigator.clipboard.writeText(link).catch(() => {});
                toast.success('Onboarding link generated and copied');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to generate link');
        }
    };
    const generatePDF = (candidate: any) => {
        const doc = new jsPDF();
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('FINAL SELECTION REPORT', 14, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Candidate Final Evaluation', 14, 55);

        const candidateData = [
            ['Full Name', candidate.candidate_name],
            ['Position', candidate.position_name],
            ['Department', candidate.department || 'N/A'],
            ['Email', candidate.candidate_email],
            ['Phone', candidate.candidate_phone],
            ['Decision', outcome === 'Passed' ? 'APPROVED FOR HIRING' : 'REJECTED']
        ];

        autoTable(doc, {
            startY: 60,
            body: candidateData,
            theme: 'grid',
            headStyles: { fillColor: [0, 0, 0] }
        });

        doc.save(`${candidate.candidate_name}_Final_Round.pdf`);
    };

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto min-h-screen bg-gray-50">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                        Final Round Selection
                    </h1>
                    <p className="mt-1 text-gray-500 font-medium">
                        Make final hiring decisions for candidates who reached the final review stage.
                    </p>
                </div>
                <div className="px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-bold text-gray-600 uppercase tracking-wider">{candidates.length} In Review</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pipeline */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between font-black text-xs uppercase tracking-widest text-gray-400">
                        Selection Pipeline
                        <Filter size={14} />
                    </div>

                    <div className="space-y-3 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                        {loading ? (
                            [1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-3xl animate-pulse border border-gray-100"></div>)
                        ) : candidates.length === 0 ? (
                            <div className="bg-white rounded-[32px] p-12 text-center border-2 border-dashed border-gray-100">
                                <Globe className="mx-auto text-gray-200 mb-4" size={48} />
                                <p className="text-gray-400 font-bold">No candidates at Final Round</p>
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
                                    <h4 className="font-black text-lg leading-tight mb-1">{candidate.candidate_name}</h4>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${selectedCandidate?.id === candidate.id ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {candidate.position_name}
                                    </p>
                                    <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase">
                                        <span>Candidate ID: #{candidate.id}</span>
                                        <ChevronRight size={14} />
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Details */}
                <div className="lg:col-span-2">
                    {selectedCandidate ? (
                        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-500">
                            <div className="bg-gray-900 p-8 text-white relative">
                                <h2 className="text-3xl font-black tracking-tight">{selectedCandidate.candidate_name}</h2>
                                <p className="text-gray-400 font-bold uppercase tracking-wider mt-1">{selectedCandidate.position_name} — FINAL ROUND</p>
                                <button
                                    onClick={() => generatePDF(selectedCandidate)}
                                    className="absolute top-8 right-8 p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"
                                >
                                    <Download size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="p-6 bg-gray-50 rounded-3xl">
                                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Round Decision</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setOutcome('Passed')}
                                                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${outcome === 'Passed' ? 'bg-green-50 border-green-600' : 'bg-white border-gray-100'}`}
                                                >
                                                    <CheckCircle2 size={24} className={outcome === 'Passed' ? 'text-green-600' : 'text-gray-200'} />
                                                    <span className="text-[10px] font-black uppercase">Approve</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setOutcome('Failed')}
                                                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${outcome === 'Failed' ? 'bg-red-50 border-red-600' : 'bg-white border-gray-100'}`}
                                                >
                                                    <XCircle size={24} className={outcome === 'Failed' ? 'text-red-600' : 'text-gray-200'} />
                                                    <span className="text-[10px] font-black uppercase">Reject</span>
                                                </button>
                                            </div>
                                        </div>

                                        {outcome === 'Passed' && (
                                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Proposed Annual Salary</label>
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="e.g. 5,50,000"
                                                    value={proposedSalary}
                                                    onChange={(e) => setProposedSalary(e.target.value)}
                                                    className="w-full p-5 bg-gray-50 border border-gray-100 rounded-3xl outline-none focus:ring-4 focus:ring-black/5 font-bold text-sm"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final Decision Notes</label>
                                            <textarea
                                                required
                                                placeholder="Provide the rationale for the final selection decision..."
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                className="w-full p-5 bg-gray-50 border border-gray-200 rounded-3xl font-medium text-sm min-h-[200px]"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-6 bg-gray-50 rounded-3xl space-y-4">
                                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quick View</h3>
                                            <div className="flex items-center gap-4">
                                                <Mail size={16} className="text-gray-400" />
                                                <span className="text-sm font-bold text-gray-600">{selectedCandidate.candidate_email}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Phone size={16} className="text-gray-400" />
                                                <span className="text-sm font-bold text-gray-600">{selectedCandidate.candidate_phone}</span>
                                            </div>
                                            <div className="pt-4 border-t border-gray-200">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Test Assignment Score</span>
                                                <p className="mt-2 text-sm text-gray-900 font-bold">{selectedCandidate.tech_score != null ? `${Number(selectedCandidate.tech_score).toFixed(2)}%` : 'Not available'}</p>
                                            </div>
                                            <div className="pt-4 border-t border-gray-200">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">HR Notes</span>
                                                <p className="mt-2 text-sm text-gray-500 italic">"{selectedCandidate.hr_notes || 'No HR notes'}"</p>
                                            </div>
                                            <div className="pt-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Operation Notes</span>
                                                <p className="mt-2 text-sm text-gray-500 italic">"{selectedCandidate.operation_notes || 'No Operation notes'}"</p>
                                            </div>
                                        </div>

                                        {onboardingLink && (
                                            <div className="space-y-2">
                                                <div className="text-xs text-gray-500 break-all">{onboardingLink}</div>
                                            </div>
                                        )}

                                        <button
                                            disabled={processing || outcome === 'Pending'}
                                            className="w-full py-5 bg-black text-white rounded-[32px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl disabled:opacity-50"
                                        >
                                            {processing ? 'Processing...' : 'Complete Selection Process'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-white rounded-[40px] border border-dashed border-gray-100 p-20 text-center">
                            <UserCheck className="text-gray-100 mb-6" size={64} />
                            <h3 className="text-2xl font-black">Final Review</h3>
                            <p className="text-gray-400 max-w-xs mt-2">Select a candidate to perform the final review and hiring decision.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
