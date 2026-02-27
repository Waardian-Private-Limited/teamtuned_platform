"use client";

import React, { useState, useEffect } from 'react';
import {
    Briefcase, CheckCircle2, UserPlus, Clock, Search,
    Download, Calendar, User, Mail,
    Phone, FileText, LayoutGrid, DollarSign, Fingerprint, X, Eye, ChevronLeft, Loader2,
    File
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

const StatsCard = ({ title, count, icon: Icon, color, onClick, isActive }: any) => {
    const colorMap: Record<string, { bg: string; border: string; text: string; textDark: string }> = {
        'blue': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', textDark: 'text-blue-900' },
        'green': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', textDark: 'text-green-900' },
        'yellow': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', textDark: 'text-amber-900' },
        'indigo': { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', textDark: 'text-indigo-900' },
    };
    const colors = colorMap[color] || { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', textDark: 'text-gray-900' };

    return (
        <div
            onClick={onClick}
            className={`${colors.bg} rounded-lg p-4 border ${colors.border} cursor-pointer transition-all duration-200 ${isActive ? 'ring-2 ring-offset-1 ring-blue-500 shadow-md' : 'hover:shadow-md hover:border-gray-300'
                }`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className={`text-xs font-medium uppercase tracking-wide ${colors.text}`}>{title}</p>
                    <h3 className={`text-2xl font-semibold mt-1 ${colors.textDark}`}>{count}</h3>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
            </div>
        </div>
    );
};



const DocumentCard = ({ doc, index }: { doc: any; index: number }) => {
    const [showPreview, setShowPreview] = useState(false);
    const url = doc.url || doc.link;
    const fileName = doc.name || doc.filename || (url ? url.split('/').pop() : `Document ${index + 1}`);
    const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';
    const isImage = url && (url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg') || url.toLowerCase().endsWith('.png') || url.toLowerCase().endsWith('.webp') || url.toLowerCase().endsWith('.gif'));
    const isPDF = url && url.toLowerCase().endsWith('.pdf');
    const fullUrl = url ? (url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api/v1'}${url}`) : null;

    const handlePreview = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowPreview(true);
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (fullUrl) {
            const link = document.createElement('a');
            link.href = fullUrl;
            link.download = fileName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group">
                <div className="flex-shrink-0 p-2 bg-white rounded-md border border-gray-200 group-hover:border-blue-300 transition-colors">
                    {isImage ? (
                        <FileText className="w-4 h-4 text-blue-500" />
                    ) : isPDF ? (
                        <FileText className="w-4 h-4 text-red-500" />
                    ) : (
                        <FileText className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{fileExtension}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handlePreview}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Preview document"
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </button>
                    <a
                        href={fullUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title="Download document"
                        onClick={handleDownload}
                    >
                        <Download className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>

            {/* Preview Modal */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowPreview(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                    {isImage ? (
                                        <FileText className="w-5 h-5 text-blue-500" />
                                    ) : isPDF ? (
                                        <FileText className="w-5 h-5 text-red-500" />
                                    ) : (
                                        <FileText className="w-5 h-5 text-gray-500" />
                                    )}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{fileName}</h3>
                                        <p className="text-sm text-gray-500">{fileExtension} • {Math.round((doc.size || 0) / 1024)} KB</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleDownload}
                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                        title="Download"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50 max-h-[60vh] overflow-auto">
                                {isImage ? (
                                    <div className="flex justify-center">
                                        <img
                                            src={fullUrl || ''}
                                            alt={fileName}
                                            className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-sm"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                ) : isPDF ? (
                                    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg border border-gray-200">
                                        <FileText className="w-16 h-16 text-red-500 mb-4" />
                                        <p className="text-sm text-gray-500 mb-4">PDF preview not available inline</p>
                                        <button
                                            onClick={handleDownload}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download PDF
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg border border-gray-200">
                                        <FileText className="w-16 h-16 text-gray-400 mb-4" />
                                        <p className="text-sm text-gray-500 mb-4">Preview not available for this file type</p>
                                        <button
                                            onClick={handleDownload}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download File
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-gray-200 bg-gray-50">
                                <div className="flex items-center justify-between text-sm text-gray-500">
                                    <span>Document {index + 1}</span>
                                    <span>{new Date(doc.uploaded_at || doc.created_at || Date.now()).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default function OnboardingManagement() {
    const [view, setView] = useState<'list' | 'details'>('list');
    const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Completed'>('All');
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
    const [processing, setProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
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
    const [step, setStep] = useState(1);
    const [validationMessage, setValidationMessage] = useState('');
    const [applicationHistory, setApplicationHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const isOnboarded = (c: any) => c.status === 'Onboarded';
    const pendingCount = candidates.filter(c => !isOnboarded(c)).length;
    const completedCount = candidates.filter(c => isOnboarded(c)).length;

    const search = searchTerm.toLowerCase();
    const filteredCandidates = candidates.filter(c => {
        if (isOnboarded(c)) return false; // hide Onboarded candidates
        if (!search) return true;
        return (
            (c.candidate_name || '').toLowerCase().includes(search) ||
            (c.position_name || '').toLowerCase().includes(search)
        );
    });

    const filteredPendingCandidates = filteredCandidates;

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
                toast.success('Onboarding started. Email with link and appointment letter sent.');
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
                navigator.clipboard.writeText(link).catch(() => { });
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

    const handleDownloadReport = async () => {
        if (!selectedCandidate) return;
        try {
            const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api/v1';
            const url = `${base}/hr-operation/applications/${selectedCandidate.id}/interview-report`;
            const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                if (token) headers['Authorization'] = `Bearer ${token}`;
            } catch { }

            const res = await fetch(url, { method: 'GET', credentials: 'include', headers });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to download report');
            }

            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `interview_report_${selectedCandidate.id}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err: any) {
            console.error('Failed to download interview report', err);
            toast.error('Unable to download report');
        }
    };

    const fetchApplicationHistory = async (applicationId: number) => {
        setHistoryLoading(true);
        try {
            const res = await apiClient.get(`/hr-operation/applications/${applicationId}/history`, {}, { withAuth: true });
            if (res.success) {
                setApplicationHistory(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const next = () => {
        if (step === 2) {
            if (!form.employee_code || !form.joining_date || !form.salary || !form.designation) {
                setValidationMessage('Fill Employee Code, Joining Date, Salary, and Final Designation.');
                return;
            }
        }
        setValidationMessage('');
        setStep(s => Math.min(3, s + 1));
    };

    const back = () => {
        setValidationMessage('');
        setStep(s => Math.max(1, s - 1));
    };

    const filteredCandidatesCombined = filteredCandidates.filter(c => {
        if (filterStatus === 'Pending') return c.status !== 'Onboarding';
        if (filterStatus === 'Completed') return c.status === 'Onboarding';
        return true;
    });

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <AnimatePresence mode="wait">
                    {view === 'list' ? (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
                                        <Briefcase className="w-6 h-6 text-blue-600" />
                                        Hiring Onboarding
                                    </h1>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Finalize joining details and officially onboard new hires
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                                    <StatsCard
                                        title="Pending"
                                        count={pendingCount}
                                        icon={Clock}
                                        color="yellow"
                                        onClick={() => setFilterStatus('Pending')}
                                        isActive={filterStatus === 'Pending'}
                                    />
                                    <StatsCard
                                        title="Completed"
                                        count={completedCount}
                                        icon={CheckCircle2}
                                        color="green"
                                        onClick={() => setFilterStatus('Completed')}
                                        isActive={filterStatus === 'Completed'}
                                    />
                                    <StatsCard
                                        title="Total"
                                        count={candidates.length}
                                        icon={UserPlus}
                                        color="blue"
                                        onClick={() => setFilterStatus('All')}
                                        isActive={filterStatus === 'All'}
                                    />
                                </div>
                            </div>

                            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search candidate or position..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                <div className="overflow-x-auto relative">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                <th className="px-6 py-3 text-left">Candidate</th>
                                                <th className="px-6 py-3 text-left">Position</th>
                                                <th className="px-6 py-3 text-left">Proposed Salary</th>
                                                <th className="px-6 py-3 text-left">Status</th>
                                                <th className="px-6 py-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8">
                                                        <div className="flex flex-col items-center justify-center space-y-3 py-4">
                                                            <Loader2 className="animate-spin text-gray-300 w-6 h-6" />
                                                            <p className="text-sm text-gray-500">Loading candidates...</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredCandidatesCombined.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center">
                                                        <div className="flex flex-col items-center justify-center space-y-2">
                                                            <Briefcase className="w-8 h-8 text-gray-300" />
                                                            <p className="text-sm text-gray-500">No candidates found</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredCandidatesCombined.map(candidate => {
                                                    const completed = candidate.status === 'Onboarding';
                                                    return (
                                                        <tr key={candidate.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="font-medium text-gray-900">
                                                                    {candidate.first_name && candidate.last_name ? `${candidate.first_name} ${candidate.last_name}` : candidate.candidate_name}
                                                                </div>
                                                                <div className="text-xs text-gray-500">#{candidate.id}</div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="inline-flex px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                                                    {candidate.position_name}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="text-sm text-gray-900 flex items-center gap-1">
                                                                    <DollarSign className="w-4 h-4 text-gray-400" />
                                                                    {candidate.proposed_salary || '-'}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${completed
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-amber-100 text-amber-800'
                                                                    }`}>
                                                                    {completed ? 'Completed' : 'Pending'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedCandidate(candidate);
                                                                            setForm({ joining_date: candidate.joining_date || '', salary: candidate.proposed_salary || '', employee_code: candidate.employee_code || '', designation: candidate.position_name || '' });
                                                                            setStep(1); setPublicLink(''); fetchApplicationHistory(candidate.id); setView('details');
                                                                        }}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                        View
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedCandidate(candidate);
                                                                            setForm({ joining_date: candidate.joining_date || '', salary: candidate.proposed_salary || '', employee_code: candidate.employee_code || '', designation: candidate.position_name || '' });
                                                                            setStep(2); setPublicLink(''); fetchApplicationHistory(candidate.id); setView('details');
                                                                        }}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-all"
                                                                    >
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        Onboard
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="details"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            {!selectedCandidate ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-500 font-medium">No candidate selected</p>
                                    <button
                                        onClick={() => setView('list')}
                                        className="mt-4 text-blue-600 font-bold hover:underline"
                                    >
                                        Back to List
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setView('list')}
                                                className="p-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                                            >
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                            <div>
                                                <h1 className="text-xl font-semibold text-gray-900">
                                                    {selectedCandidate.candidate_name}
                                                </h1>
                                                <p className="text-sm text-blue-600 font-medium">
                                                    {selectedCandidate.position_name} • Onboarding Journey
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={handleDownloadReport}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                                            >
                                                <Download className="w-4 h-4" />
                                                Interview Report
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                        <div className="lg:col-span-8 space-y-6">
                                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-2 rounded-lg ${step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'} transition-colors`}>
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                        <div className="h-1 w-6 bg-gray-100"></div>
                                                        <div className={`p-2 rounded-lg ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'} transition-colors`}>
                                                            <Fingerprint className="w-4 h-4" />
                                                        </div>
                                                        <div className="h-1 w-6 bg-gray-100"></div>
                                                        <div className={`p-2 rounded-lg ${step === 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'} transition-colors`}>
                                                            <Mail className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500">Step {step} of 3</p>
                                                </div>

                                                <div className="p-6">
                                                    {step === 1 && (
                                                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

                                                            {/* Profile Snapshot */}
                                                            <div className="flex flex-wrap gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                                                <InfoChip label="DOB" value={selectedCandidate.dob ? new Date(selectedCandidate.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
                                                                <InfoChip label="Gender" value={selectedCandidate.gender || '—'} />
                                                                <InfoChip label="City" value={selectedCandidate.current_city || '—'} />
                                                                <InfoChip label="Total Exp" value={selectedCandidate.total_experience ? `${selectedCandidate.total_experience} yrs` : '—'} />
                                                                <InfoChip label="Relevant Exp" value={selectedCandidate.relevant_experience ? `${selectedCandidate.relevant_experience} yrs` : '—'} />
                                                                <InfoChip label="Notice Period" value={selectedCandidate.notice_period ? `${selectedCandidate.notice_period} days` : '—'} />
                                                                <InfoChip label="Applied" value={selectedCandidate.applied_at ? new Date(selectedCandidate.applied_at).toLocaleDateString('en-IN') : '—'} />
                                                                <InfoChip label="Stage" value={selectedCandidate.interview_stage || selectedCandidate.status || '—'} highlight />
                                                            </div>

                                                            {/* Contact + Salary */}
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <DetailRow icon={Mail} label="Email" value={selectedCandidate.candidate_email} />
                                                                <DetailRow icon={Phone} label="Phone" value={selectedCandidate.candidate_phone} />
                                                                <DetailRow icon={Briefcase} label="Current Company" value={selectedCandidate.current_company || '—'} />
                                                                <DetailRow icon={User} label="Current Designation" value={selectedCandidate.current_designation || '—'} />
                                                                <DetailRow icon={DollarSign} label="Current CTC" value={selectedCandidate.current_salary ? `₹${Number(selectedCandidate.current_salary).toLocaleString()}` : '—'} />
                                                                <DetailRow icon={DollarSign} label="Expected CTC" value={selectedCandidate.expected_salary ? `₹${Number(selectedCandidate.expected_salary).toLocaleString()}` : '—'} />
                                                                <DetailRow icon={DollarSign} label="Proposed CTC" value={selectedCandidate.proposed_salary ? `₹${Number(selectedCandidate.proposed_salary).toLocaleString()}` : '—'} />
                                                                <DetailRow icon={FileText} label="Education" value={selectedCandidate.highest_education ? `${selectedCandidate.highest_education}${selectedCandidate.specialization ? ' — ' + selectedCandidate.specialization : ''}` : '—'} />
                                                            </div>

                                                            {/* Scores */}
                                                            {selectedCandidate.tech_test_score != null && (
                                                                <div className="space-y-2">
                                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assessment</p>
                                                                    <div className="grid grid-cols-3 gap-3">
                                                                        <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-center">
                                                                            <p className="text-[10px] text-gray-500 mb-1">Technical Score</p>
                                                                            <p className="text-xl font-bold text-green-700">{Math.round(Number(selectedCandidate.tech_test_score))}%</p>
                                                                        </div>
                                                                        {selectedCandidate.tech_test_ai?.mcq_score_out_of_100 != null && (
                                                                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-center">
                                                                                <p className="text-[10px] text-gray-500 mb-1">MCQ Score</p>
                                                                                <p className="text-xl font-bold text-blue-700">{Math.round(selectedCandidate.tech_test_ai.mcq_score_out_of_100)}%</p>
                                                                            </div>
                                                                        )}
                                                                        {selectedCandidate.tech_test_ai?.descriptive_score_out_of_100 != null && (
                                                                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-center">
                                                                                <p className="text-[10px] text-gray-500 mb-1">Descriptive</p>
                                                                                <p className="text-xl font-bold text-purple-700">{Math.round(selectedCandidate.tech_test_ai.descriptive_score_out_of_100)}%</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {selectedCandidate.tech_test_ai?.overall_feedback && (
                                                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">AI Evaluation</p>
                                                                            <p className="text-xs text-gray-700">{selectedCandidate.tech_test_ai.overall_feedback}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Notes */}
                                                            {(selectedCandidate.interview_notes || selectedCandidate.hr_notes || selectedCandidate.operation_notes) && (
                                                                <div className="space-y-2">
                                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</p>
                                                                    <div className="space-y-2">
                                                                        {selectedCandidate.interview_notes && <NoteCard label="Interview" note={selectedCandidate.interview_notes} by={selectedCandidate.final_notes_by} color="blue" />}
                                                                        {selectedCandidate.operation_notes && <NoteCard label="Operations" note={selectedCandidate.operation_notes} by={selectedCandidate.operation_notes_by} color="amber" />}
                                                                        {selectedCandidate.hr_notes && <NoteCard label="HR" note={selectedCandidate.hr_notes} by={selectedCandidate.hr_notes_by} color="green" />}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Work Experience */}
                                                            {(() => {
                                                                let exp: any[] = [];
                                                                try { exp = JSON.parse(selectedCandidate.work_experience || '[]'); } catch { }
                                                                if (!exp.length) return null;
                                                                return (
                                                                    <div className="space-y-2">
                                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Work Experience</p>
                                                                        <div className="space-y-2">
                                                                            {exp.map((e: any, i: number) => (
                                                                                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                                                    <div className="flex items-start justify-between gap-2">
                                                                                        <div>
                                                                                            <p className="text-sm font-semibold text-gray-900">{e.designation}</p>
                                                                                            <p className="text-xs text-blue-600 font-medium">{e.company}</p>
                                                                                        </div>
                                                                                        <span className="text-[10px] text-gray-400 bg-white border border-gray-200 rounded px-2 py-0.5 whitespace-nowrap">{e.duration}</span>
                                                                                    </div>
                                                                                    {e.description && <p className="text-xs text-gray-500 mt-1.5 whitespace-pre-line">{e.description}</p>}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}

                                                            {/* Academic History */}
                                                            {(() => {
                                                                let acad: any[] = [];
                                                                try { acad = JSON.parse(selectedCandidate.academic_history || '[]'); } catch { }
                                                                if (!acad.length) return null;
                                                                return (
                                                                    <div className="space-y-2">
                                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Education</p>
                                                                        <div className="space-y-2">
                                                                            {acad.map((a: any, i: number) => (
                                                                                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                                                    <div className="p-2 bg-white rounded-md border border-gray-200">
                                                                                        <FileText className="w-4 h-4 text-indigo-500" />
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="text-sm font-semibold text-gray-900">{a.degree}{a.specialization ? ` — ${a.specialization}` : ''}</p>
                                                                                        <p className="text-xs text-gray-500">{a.university}{a.year ? ` · ${a.year}` : ''}</p>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}

                                                            {/* Application History */}
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Activity Timeline</p>
                                                                {historyLoading ? (
                                                                    <div className="flex justify-center p-6"><Loader2 className="animate-spin text-gray-300 w-5 h-5" /></div>
                                                                ) : (
                                                                    <div className="bg-gray-50 rounded-lg p-4 space-y-4 max-h-72 overflow-y-auto">
                                                                        {applicationHistory.length > 0 ? applicationHistory.map((h: any, i: number) => (
                                                                            <div key={i} className="flex gap-3 relative">
                                                                                {i !== applicationHistory.length - 1 && <div className="absolute left-3 top-7 bottom-0 w-0.5 bg-gray-200" />}
                                                                                <div className="z-10 bg-white p-1 rounded-full h-6 w-6 border border-blue-200 flex items-center justify-center text-blue-500 flex-shrink-0">
                                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                                </div>
                                                                                <div className="flex-1 pb-3">
                                                                                    <div className="flex items-center justify-between mb-0.5">
                                                                                        <p className="text-xs font-semibold text-gray-800">{h.event_type}</p>
                                                                                        <span className="text-[10px] text-gray-400">{new Date(h.created_at).toLocaleDateString()}</span>
                                                                                    </div>
                                                                                    <p className="text-[10px] text-blue-500 font-medium">{h.action_by_name}</p>
                                                                                    {h.notes && <p className="text-xs text-gray-500 italic mt-1">"{h.notes}"</p>}
                                                                                </div>
                                                                            </div>
                                                                        )) : <p className="text-center text-xs text-gray-400 py-4">No history available</p>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {step === 2 && (
                                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <label className="text-xs font-medium text-gray-500">Employee Code</label>
                                                                    <div className="relative">
                                                                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                                        <input
                                                                            type="text"
                                                                            value={form.employee_code}
                                                                            onChange={e => setForm({ ...form, employee_code: e.target.value })}
                                                                            className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-gray-900 transition-all"
                                                                            placeholder="EMP-000"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-xs font-medium text-gray-500">Joining Date</label>
                                                                    <div className="relative">
                                                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                                        <input
                                                                            type="date"
                                                                            value={form.joining_date}
                                                                            onChange={e => setForm({ ...form, joining_date: e.target.value })}
                                                                            className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-gray-900 transition-all"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-xs font-medium text-gray-500">Annual Salary</label>
                                                                    <div className="relative">
                                                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                                        <input
                                                                            type="text"
                                                                            value={form.salary}
                                                                            onChange={e => setForm({ ...form, salary: e.target.value })}
                                                                            className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-gray-900 transition-all"
                                                                            placeholder="0.00"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-xs font-medium text-gray-500">Final Designation</label>
                                                                    <div className="relative">
                                                                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                                        <input
                                                                            type="text"
                                                                            value={form.designation}
                                                                            onChange={e => setForm({ ...form, designation: e.target.value })}
                                                                            className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-gray-900 transition-all"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {step === 3 && (
                                                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-8 flex flex-col items-center text-center space-y-5">
                                                                <div className="p-4 bg-white rounded-xl shadow-sm border border-blue-100">
                                                                    <UserPlus className="w-10 h-10 text-blue-600" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <h3 className="text-lg font-semibold text-gray-900">Finalize Onboarding</h3>
                                                                    <p className="text-sm text-gray-500 max-w-xs">Clicking <strong>Finish &amp; Onboard</strong> will:</p>
                                                                </div>
                                                                <div className="w-full max-w-xs space-y-2 text-left">
                                                                    {[
                                                                        { icon: Mail, text: 'Send appointment letter PDF to candidate email' },
                                                                        { icon: UserPlus, text: 'Send onboarding link email with form access' },
                                                                        { icon: CheckCircle2, text: 'Mark candidate as Onboarding in system' },
                                                                    ].map((item, i) => (
                                                                        <div key={i} className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-blue-100">
                                                                            <div className="p-1.5 bg-blue-50 rounded-md flex-shrink-0">
                                                                                <item.icon className="w-3.5 h-3.5 text-blue-600" />
                                                                            </div>
                                                                            <p className="text-xs text-gray-700">{item.text}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <p className="text-[11px] text-gray-400">Employee Code: <strong className="text-gray-600">{form.employee_code}</strong> · Joining: <strong className="text-gray-600">{form.joining_date}</strong></p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                                    {step > 1 ? (
                                                        <button
                                                            onClick={back}
                                                            className="px-6 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 transition-all"
                                                        >
                                                            Back
                                                        </button>
                                                    ) : <div></div>}

                                                    {step < 3 ? (
                                                        <button
                                                            onClick={next}
                                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm"
                                                        >
                                                            Next Step
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={handleComplete}
                                                            disabled={processing}
                                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                                                        >
                                                            {processing ? 'Processing...' : 'Finish & Onboard'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="lg:col-span-4 space-y-6">
                                            {(selectedCandidate.onboarding_details || selectedCandidate.onboarding_documents) && (
                                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-gray-900">Candidate Submission</h3>
                                                        <p className="text-xs text-gray-500 mt-1">Data received from public form</p>
                                                    </div>

                                                    {selectedCandidate.onboarding_details && (() => {
                                                        let parsed: any = null;
                                                        try {
                                                            const raw = selectedCandidate.onboarding_details;
                                                            parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                                        } catch { }
                                                        const d = parsed?.details || {};
                                                        const s = parsed?.salary_details || {};
                                                        const empHistory: any[] = parsed?.employment_history || [];
                                                        // Collect UAN from employment history if not in salary_details
                                                        const uanFromHistory = empHistory.map((e: any) => e.uan_pf_number).filter(Boolean).join(', ');
                                                        const entries: { label: string; value: string; icon: any }[] = [
                                                            ...(d.address || d.current_address ? [{ label: 'Address', value: d.address || d.current_address, icon: FileText }] : []),
                                                            ...(d.emergency_contact ? [{ label: 'Emergency Contact', value: d.emergency_contact, icon: Phone }] : []),
                                                            ...(d.pan || s.pan_number ? [{ label: 'PAN', value: d.pan || s.pan_number, icon: Fingerprint }] : []),
                                                            ...(d.aadhaar || s.aadhaar_number ? [{ label: 'Aadhaar', value: d.aadhaar || s.aadhaar_number, icon: Fingerprint }] : []),
                                                            ...(d.bank_account || s.bank_account_no ? [{ label: 'Bank Account', value: d.bank_account || s.bank_account_no, icon: DollarSign }] : []),
                                                            ...(d.ifsc || s.ifsc_code ? [{ label: 'IFSC', value: d.ifsc || s.ifsc_code, icon: FileText }] : []),
                                                            ...(s.bank_name ? [{ label: 'Bank', value: `${s.bank_name}${s.branch_name ? ' — ' + s.branch_name : ''}`, icon: Briefcase }] : []),
                                                            ...((s.pf_uan || s.uan || uanFromHistory) ? [{ label: 'UAN / PF', value: s.pf_uan || s.uan || uanFromHistory, icon: Briefcase }] : []),
                                                        ];
                                                        return (
                                                            <div className="space-y-3">
                                                                {entries.length > 0 && (
                                                                    <div className="space-y-1.5">
                                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Identity & Banking</p>
                                                                        <div className="grid grid-cols-1 gap-1.5">
                                                                            {entries.map((e, i) => (
                                                                                <div key={i} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                                                                                    <div className="p-1.5 bg-white rounded-md border border-gray-200 flex-shrink-0">
                                                                                        <e.icon className="w-3 h-3 text-gray-500" />
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{e.label}</p>
                                                                                        <p className="text-xs font-semibold text-gray-800 truncate">{e.value}</p>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {empHistory.length > 0 && (
                                                                    <div className="space-y-1.5">
                                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Past Employment</p>
                                                                        {empHistory.map((e: any, i: number) => (
                                                                            <div key={i} className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
                                                                                <p className="text-xs font-semibold text-gray-800">{e.designation} @ {e.company_name}</p>
                                                                                <p className="text-[10px] text-gray-500">{e.start_date} → {e.end_date}</p>
                                                                                {e.last_drawn_ctc && <p className="text-[10px] text-gray-500">CTC: ₹{Number(e.last_drawn_ctc).toLocaleString()}</p>}
                                                                                {e.uan_pf_number && <p className="text-[10px] text-indigo-600 font-medium">UAN: {e.uan_pf_number}</p>}
                                                                                {e.reason_for_leaving && <p className="text-[10px] text-gray-400 italic">Reason: {e.reason_for_leaving}</p>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}

                                                    {selectedCandidate.onboarding_documents && (() => {
                                                        let docsObj: any = null;
                                                        try {
                                                            const raw = selectedCandidate.onboarding_documents;
                                                            docsObj = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                                        } catch { return null; }
                                                        const generalDocs: any[] = docsObj?.general || (Array.isArray(docsObj) ? docsObj : []);
                                                        const perCompany: Record<string, any[]> = docsObj?.per_company || {};
                                                        const allPerCompanyDocs = Object.values(perCompany).flat();
                                                        return (
                                                            <div className="space-y-3">
                                                                {generalDocs.length > 0 && (
                                                                    <div className="space-y-1.5">
                                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ID Documents</p>
                                                                        {generalDocs.map((d: any, i: number) => <DocumentCard key={i} doc={d} index={i} />)}
                                                                    </div>
                                                                )}
                                                                {allPerCompanyDocs.length > 0 && (
                                                                    <div className="space-y-1.5">
                                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Employment Documents</p>
                                                                        {allPerCompanyDocs.map((d: any, i: number) => <DocumentCard key={i} doc={d} index={i} />)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            <div className="bg-blue-600 rounded-lg p-6 space-y-4 text-white shadow-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white/10 rounded-lg">
                                                        <LayoutGrid className="w-5 h-5" />
                                                    </div>
                                                    <h3 className="text-sm font-semibold">Quick Actions</h3>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-xs text-white/80 leading-relaxed">
                                                        Ensure all candidate information is double-checked before finalizing the hiring process.
                                                    </p>
                                                    <div className="h-px bg-white/20 w-full"></div>
                                                    <div className="flex items-center gap-2 text-xs text-white/60">
                                                        <Clock className="w-3 h-3" />
                                                        <span>Onboarding expires in 14 days</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ─── Helper Components ───────────────────────────────────────────────────────

function InfoChip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className={`flex flex-col px-3 py-1.5 rounded-lg border ${highlight ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-blue-200 text-gray-800'}`}>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${highlight ? 'text-blue-100' : 'text-gray-400'}`}>{label}</span>
            <span className={`text-xs font-semibold truncate ${highlight ? 'text-white' : 'text-gray-800'}`}>{value}</span>
        </div>
    );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
            <div className="p-1.5 bg-white rounded-md border border-gray-200 flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-xs font-semibold text-gray-800 break-words">{value}</p>
            </div>
        </div>
    );
}

function NoteCard({ label, note, by, color }: { label: string; note: string; by?: string; color: 'blue' | 'amber' | 'green' }) {
    const colors = {
        blue: 'bg-blue-50 border-blue-100 text-blue-700',
        amber: 'bg-amber-50 border-amber-100 text-amber-700',
        green: 'bg-green-50 border-green-100 text-green-700',
    };
    const badgeColors = {
        blue: 'bg-blue-100 text-blue-700',
        amber: 'bg-amber-100 text-amber-700',
        green: 'bg-green-100 text-green-700',
    };
    return (
        <div className={`p-3 rounded-lg border ${colors[color]}`}>
            <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${badgeColors[color]}`}>{label}</span>
                {by && <span className="text-[10px] opacity-70">{by}</span>}
            </div>
            <p className="text-xs leading-relaxed opacity-90">{note}</p>
        </div>
    );
}