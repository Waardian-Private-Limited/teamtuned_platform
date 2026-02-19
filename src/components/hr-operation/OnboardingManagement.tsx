"use client";

import React, { useState, useEffect } from 'react';
import {
    Briefcase, CheckCircle2, UserPlus, Clock, Search, Filter,
    ChevronRight, Download, Calendar, ArrowRight, User, Mail,
    Phone, FileText, LayoutGrid, DollarSign, Fingerprint
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function OnboardingManagement() {
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
    const [processing, setProcessing] = useState(false);
    const { organization } = useAuth();

    // Form State
    const [form, setForm] = useState({
        joining_date: '',
        salary: '',
        employee_code: '',
        designation: ''
    });
    const [publicLink, setPublicLink] = useState<string>('');
    const [sendingLetter, setSendingLetter] = useState(false);
    const [updatingSalary, setUpdatingSalary] = useState(false);

    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        try {
            const res = await apiClient.get('/hiring-onboarding/candidates', {}, { withAuth: true });
            if (res.success) {
                setCandidates(res.data);
            }
        } catch (err: any) {
            console.error('Failed to load candidates', err);
            toast.error(err.message || 'Failed to load onboarding list');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const res = await apiClient.post(`/hiring-onboarding/applications/${selectedCandidate.id}/complete`, form, { withAuth: true });
            if (res.success) {
                toast.success('Hiring process completed! Candidate onboarded.');
                setSelectedCandidate(null);
                setForm({ joining_date: '', salary: '', employee_code: '', designation: '' });
                fetchCandidates();
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Failed to complete onboarding');
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateLink = async () => {
        if (!selectedCandidate) return;
        try {
            const res = await apiClient.post(`/hiring-onboarding/links/${selectedCandidate.id}`, {}, { withAuth: true });
            if (res.success) {
                const token = res.data.token;
                const link = `${window.location.origin}/public/onboarding?token=${token}&orgId=${organization?.id}`;
                setPublicLink(link);
                navigator.clipboard.writeText(link).catch(() => {});
                toast.success('Onboarding link generated and copied');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to generate link');
        }
    };

    const handleSendAppointment = async () => {
        if (!selectedCandidate) return;
        setSendingLetter(true);
        try {
            const res = await apiClient.post(`/hiring-onboarding/applications/${selectedCandidate.id}/appointment`, {}, { withAuth: true });
            if (res.success) {
                toast.success('Appointment letter marked as sent');
                fetchCandidates();
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to send appointment letter');
        } finally {
            setSendingLetter(false);
        }
    };

    const handleUpdateFinalSalary = async () => {
        if (!selectedCandidate) return;
        setUpdatingSalary(true);
        try {
            const res = await apiClient.post(`/hiring-onboarding/applications/${selectedCandidate.id}/salary`, {
                final_salary: form.salary
            }, { withAuth: true });
            if (res.success) {
                toast.success('Final salary updated');
                fetchCandidates();
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to update salary');
        } finally {
            setUpdatingSalary(false);
        }
    };

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto min-h-screen bg-gray-50">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Hiring Onboarding</h1>
                <p className="mt-1 text-gray-500 font-medium">Finalize joining details and officially onboard new hires.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pending Onboarding */}
                <div className="lg:col-span-1 bg-white rounded-[40px] shadow-sm border border-gray-100 p-6">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Ready for Onboarding</h3>
                    <div className="space-y-4">
                        {loading ? (
                            <div className="animate-pulse space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-50 rounded-3xl"></div>)}
                            </div>
                        ) : candidates.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 font-bold">No pending onboarding</div>
                        ) : (
                            candidates.map(candidate => (
                                <button
                                    key={candidate.id}
                                    onClick={() => {
                                        setSelectedCandidate(candidate);
                                        setForm(prev => ({
                                            ...prev,
                                            designation: candidate.position_name,
                                            salary: candidate.proposed_salary || ''
                                        }));
                                    }}
                                    className={`w-full p-5 rounded-3xl transition-all border-2 text-left ${selectedCandidate?.id === candidate.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-gray-50 border-transparent text-gray-900 hover:border-gray-200'}`}
                                >
                                    <p className="font-black text-lg">{candidate.candidate_name}</p>
                                    <p className={`text-xs font-bold uppercase ${selectedCandidate?.id === candidate.id ? 'text-blue-100' : 'text-gray-500'}`}>{candidate.position_name}</p>
                                </button>
                            ))
                        )}
                        {/* Sidebar: Completed vs Pending table */}
                        {!loading && candidates.length > 0 && (
                            <div className="mt-6">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Onboarding Status</h4>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-gray-400">
                                            <th className="text-left py-2">Candidate</th>
                                            <th className="text-left py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {candidates.map(c => {
                                            const completed = !!(c.onboarding_details || c.onboarding_documents);
                                            return (
                                                <tr key={c.id} className="border-t border-gray-100">
                                                    <td className="py-2">{c.candidate_name}</td>
                                                    <td className="py-2">
                                                        <span className={`px-2 py-1 rounded-full font-bold ${completed ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'}`}>
                                                            {completed ? 'Completed' : 'Pending'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Onboarding Form */}
                <div className="lg:col-span-2">
                    {selectedCandidate ? (
                        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 animate-in slide-in-from-bottom-8 duration-500 overflow-hidden">
                            <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-black">{selectedCandidate.candidate_name}</h2>
                                    <p className="font-bold text-blue-100 uppercase text-xs tracking-widest">{selectedCandidate.position_name}</p>
                                </div>
                                <UserPlus size={32} />
                            </div>

                            <form onSubmit={handleComplete} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee Code</label>
                                        <div className="relative">
                                            <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                            <input
                                                required
                                                type="text"
                                                placeholder="e.g. EMP-001"
                                                value={form.employee_code}
                                                onChange={e => setForm({ ...form, employee_code: e.target.value })}
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Joining Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                            <input
                                                required
                                                type="date"
                                                value={form.joining_date}
                                                onChange={e => setForm({ ...form, joining_date: e.target.value })}
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
                                            />
                                        </div>
                                    </div>

                                    {selectedCandidate.interview_notes && (
                                        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 mt-4">
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Final Selection Notes</p>
                                            <p className="text-sm font-medium text-blue-900 italic">"{selectedCandidate.interview_notes}"</p>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Public Onboarding Link</p>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={handleGenerateLink} className="px-4 py-2 bg-white border border-gray-200 rounded-2xl text-sm font-bold hover:border-black transition-all">
                                                Generate Link
                                            </button>
                                            {publicLink && (
                                                <a href={publicLink} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 underline break-all">
                                                    {publicLink}
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={handleSendAppointment} disabled={sendingLetter} className="px-4 py-2 bg-white border border-gray-200 rounded-2xl text-sm font-bold hover:border-black transition-all">
                                            {sendingLetter ? 'Sending...' : 'Send Appointment Letter'}
                                        </button>
                                        <button type="button" onClick={handleUpdateFinalSalary} disabled={updatingSalary} className="px-4 py-2 bg-white border border-gray-200 rounded-2xl text-sm font-bold hover:border-black transition-all">
                                            {updatingSalary ? 'Updating...' : 'Add Salary'}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Offered Salary (Annual)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                            <input
                                                required
                                                type="text"
                                                placeholder="e.g. 5,00,000"
                                                value={form.salary}
                                                onChange={e => setForm({ ...form, salary: e.target.value })}
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final Designation</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                            <input
                                                required
                                                type="text"
                                                value={form.designation}
                                                onChange={e => setForm({ ...form, designation: e.target.value })}
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
                                            />
                                        </div>
                                    </div>

                                    {(selectedCandidate.onboarding_details || selectedCandidate.onboarding_documents) && (
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Submitted Onboarding Info</p>
                                            {selectedCandidate.onboarding_details && (
                                                <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                                                    {(() => {
                                                        try {
                                                            return JSON.stringify(JSON.parse(selectedCandidate.onboarding_details), null, 2);
                                                        } catch {
                                                            return selectedCandidate.onboarding_details;
                                                        }
                                                    })()}
                                                </pre>
                                            )}
                                            {selectedCandidate.onboarding_documents && (
                                                <div className="mt-3">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Documents</p>
                                                    <ul className="text-xs text-gray-700 list-disc pl-4">
                                                        {(() => {
                                                            try {
                                                                const docs = JSON.parse(selectedCandidate.onboarding_documents);
                                                                return (Array.isArray(docs) ? docs : []).map((d: any, i: number) => (
                                                                    <li key={i}>
                                                                        <a href={d.url || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                                                            {d.name || d.filename || d.url}
                                                                        </a>
                                                                    </li>
                                                                ));
                                                            } catch {
                                                                return <li>{selectedCandidate.onboarding_documents}</li>;
                                                            }
                                                        })()}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="md:col-span-2 pt-6">
                                    <button
                                        disabled={processing}
                                        className="w-full py-5 bg-blue-600 text-white rounded-[32px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50"
                                    >
                                        {processing ? 'Processing...' : 'Finish Hiring & Onboard Employee'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white rounded-[40px] border border-dashed border-gray-100 p-20 text-center">
                            <LayoutGrid className="text-gray-100 mb-6" size={64} />
                            <h3 className="text-2xl font-black">Ready to Hire</h3>
                            <p className="text-gray-400 max-w-xs mt-2">Select a candidate who passed the final round to complete their onboarding.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
