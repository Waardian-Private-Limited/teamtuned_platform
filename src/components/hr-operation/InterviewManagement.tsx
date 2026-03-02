"use strict";
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, Search, Mail, Phone, Download, MapPin,
    ChevronLeft, ChevronRight, CheckCircle2, X, Calendar, MessageSquare, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { NextStepDialog, TimelineItem } from './OrgAppliedPositions';

interface InterviewManagementProps {
    myOnly?: boolean;
}

export default function InterviewManagement({ myOnly = false }: InterviewManagementProps) {
    const [applicants, setApplicants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusTab, setStatusTab] = useState<'Pending' | 'Evaluated'>('Pending');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Evaluate modal
    const [evalModalOpen, setEvalModalOpen] = useState(false);
    const [selectedApplicant, setSelectedApplicant] = useState<any>(null);

    // View Details Expand
    const [expandedApplicantId, setExpandedApplicantId] = useState<number | null>(null);
    const [applicationHistory, setApplicationHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const toggleExpand = (id: number) => {
        if (expandedApplicantId === id) {
            setExpandedApplicantId(null);
        } else {
            setExpandedApplicantId(id);
            fetchApplicationHistory(id);
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

    useEffect(() => {
        fetchAssignedCandidates();
    }, []);

    const fetchAssignedCandidates = async () => {
        setLoading(true);
        try {
            // Fetch all candidates for evaluation (assignment filter removed for global evaluation view)
            const res = await apiClient.get('/hr-operation/shortlisted-candidates', {}, { withAuth: true });
            if (res.success) {
                setApplicants(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch assigned candidates:', error);
            toast.error('Failed to load your assigned candidates');
        } finally {
            setLoading(false);
        }
    };

    const filteredApplicants = useMemo(() => {
        let base = applicants.filter(a =>
            ['Shortlisted', 'Interviewing', 'Final', 'Offered', 'Hired'].includes(a.status)
        );

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            base = base.filter(a =>
                (a.candidate_name || '').toLowerCase().includes(q) ||
                (a.department || '').toLowerCase().includes(q) ||
                (a.position_name || '').toLowerCase().includes(q)
            );
        }

        return base;
    }, [applicants, searchQuery]);

    const paginatedApplicants = useMemo(() => {
        const totalPages = Math.ceil(filteredApplicants.length / itemsPerPage);
        const safePage = Math.max(1, Math.min(currentPage, totalPages || 1));
        const start = (safePage - 1) * itemsPerPage;
        return filteredApplicants.slice(start, start + itemsPerPage);
    }, [filteredApplicants, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredApplicants.length / itemsPerPage) || 1;

    return (
        <div className="p-8 bg-gray-50/50 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <Users size={32} className="text-black" />
                            Candidate Evaluations
                        </h1>
                        <p className="mt-2 text-gray-500 font-medium">
                            Review and evaluate candidates assigned to you for technical and operational interviews.
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                placeholder="Search candidate, position..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-black outline-none transition-all"
                            />
                        </div>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-black"
                        >
                            <option value={5}>5 per page</option>
                            <option value={10}>10 per page</option>
                            <option value={20}>20 per page</option>
                        </select>
                    </div>
                </div>

                {/* Applications Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-y-auto max-h-[480px] overflow-x-auto relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="sticky top-0 bg-gray-50 z-10 px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                        Candidate
                                    </th>
                                    <th className="sticky top-0 bg-gray-50 z-10 px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                        Contact
                                    </th>
                                    <th className="sticky top-0 bg-gray-50 z-10 px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                        Position Info
                                    </th>
                                    <th className="sticky top-0 bg-gray-50 z-10 px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                        Status
                                    </th>
                                    <th className="sticky top-0 bg-gray-50 z-10 px-6 py-4 text-right text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
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
                                ) : paginatedApplicants.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="p-4 bg-gray-50 rounded-full">
                                                    <Users size={32} className="text-gray-300" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900">No candidates found</h3>
                                                    <p className="text-sm text-gray-500">You have no pending candidates to evaluate matching this criteria.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedApplicants.map((app) => (
                                        <React.Fragment key={app.id}>
                                            <tr className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-gray-900 uppercase tracking-tight">
                                                            {app.candidate_name}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                                                Exp: {app.total_experience || 'Fresher'}
                                                            </span>
                                                            <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                                <MapPin size={10} />
                                                                {app.current_city || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="space-y-1 text-[11px] text-gray-600 font-medium">
                                                        <div className="flex items-center gap-1.5">
                                                            <Mail size={12} className="text-gray-400" />
                                                            {app.candidate_email}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Phone size={12} className="text-gray-400" />
                                                            {app.candidate_phone}
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
                                                        {app.resume_url && (
                                                            <a
                                                                href={app.resume_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors mt-2"
                                                            >
                                                                <Download size={10} /> View Resume
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        <span className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest border ${app.status === 'Shortlisted'
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                            : app.status === 'Interviewing'
                                                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                                : app.status === 'Final'
                                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                    : app.status === 'Offered' || app.status === 'Hired'
                                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                                        : 'bg-red-50 text-red-700 border-red-200'
                                                            }`}>
                                                            {app.status}
                                                        </span>
                                                        {(app.status === 'Interviewing' || app.status === 'Final') && (
                                                            <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider border ${app.interview_stage === 'Final' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                                                {app.interview_stage || 'Operation'} Round
                                                            </span>
                                                        )}
                                                        {app.tech_test_status && (
                                                            <span className="px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200">
                                                                Test: {app.tech_test_status === 'Completed' ? `${app.tech_test_score ?? 0}%` : app.tech_test_status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => toggleExpand(app.id)}
                                                            className="inline-flex items-center gap-2 text-[10px] font-bold text-gray-600 hover:text-black bg-gray-50 px-2.5 py-1.5 rounded-sm border border-gray-200 transition-all uppercase tracking-widest min-w-[100px] justify-center"
                                                        >
                                                            {expandedApplicantId === app.id ? 'Hide Details' : 'View Details'}
                                                        </button>
                                                        {statusTab === 'Pending' && (
                                                            <button
                                                                onClick={() => { setSelectedApplicant(app); setEvalModalOpen(true); }}
                                                                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-black text-white hover:bg-gray-800 px-4 py-2 rounded-sm transition-all shadow-md shadow-black/10 min-w-[100px] justify-center"
                                                            >
                                                                Evaluate
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedApplicantId === app.id && (
                                                <tr className="bg-gray-50/60 border-b border-gray-100">
                                                    <td colSpan={5} className="p-0">
                                                        <div className="px-8 py-8 animate-in slide-in-from-top-4 duration-300">
                                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                                                {/* Left Column: Journey & Personal */}
                                                                <div className="lg:col-span-4 space-y-8">
                                                                    {/* Application Timeline */}
                                                                    <div className="bg-white rounded-none border border-gray-100 shadow-sm p-6">
                                                                        <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-6 flex items-center gap-2">
                                                                            <Clock size={14} /> Application Journey
                                                                        </h4>
                                                                        {historyLoading ? (
                                                                            <div className="flex items-center justify-center py-10">
                                                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                                                                            </div>
                                                                        ) : applicationHistory.length > 0 ? (
                                                                            <div className="space-y-6">
                                                                                {applicationHistory.map((h: any, i: number) => (
                                                                                    <div key={i} className="relative pl-6 border-l-2 border-gray-100 last:border-0 pb-6 last:pb-0">
                                                                                        <div className="absolute left-[-7px] top-1 w-3 h-3 rounded-full bg-gray-200 border-2 border-white shadow-sm ring-2 ring-gray-50" />
                                                                                        <div className="flex justify-between items-start mb-1">
                                                                                            <h5 className="text-[10px] font-black text-gray-900 leading-tight tracking-tight uppercase">{h.event_type}</h5>
                                                                                            <span className="text-[8px] font-bold text-gray-400">{new Date(h.created_at).toLocaleDateString()}</span>
                                                                                        </div>
                                                                                        <div className="text-[9px] font-bold text-indigo-600 mb-1.5 uppercase tracking-tighter">{h.action_by_name}</div>
                                                                                        {h.notes && (
                                                                                            <p className="text-[10px] text-gray-600 bg-gray-50 p-2 border border-gray-100 italic rounded-sm">
                                                                                                "{h.notes}"
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-center py-10 text-gray-400 font-bold text-[10px] uppercase tracking-widest border border-dashed rounded-sm border-gray-200">
                                                                                No history found
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Personal Details */}
                                                                    <div className="bg-white rounded-none border border-gray-100 shadow-sm p-6">
                                                                        <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-6 flex items-center gap-2">
                                                                            <Users size={14} /> Personal Details
                                                                        </h4>
                                                                        <div className="space-y-4">
                                                                            <div>
                                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Email Address</span>
                                                                                <p className="text-sm font-bold text-gray-900 break-all">{app.candidate_email || 'N/A'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Phone Number</span>
                                                                                <p className="text-sm font-bold text-gray-900">{app.candidate_phone || 'N/A'}</p>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-4">
                                                                                <div>
                                                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Gender</span>
                                                                                    <p className="text-sm font-bold text-gray-900">{app.gender || 'N/A'}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">City</span>
                                                                                    <p className="text-sm font-bold text-gray-900">{app.current_city || 'N/A'}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Right Column: Professional & Feedback */}
                                                                <div className="lg:col-span-8 space-y-8">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                        {/* Professional Context */}
                                                                        <div className="bg-white rounded-none border border-gray-100 shadow-sm p-6">
                                                                            <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-6">Professional Information</h4>
                                                                            <div className="grid grid-cols-1 gap-4">
                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                    <div>
                                                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total Exp</span>
                                                                                        <p className="text-sm font-bold text-gray-900">{app.total_experience || 'N/A'}</p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Notice</span>
                                                                                        <p className="text-sm font-bold text-gray-900">{app.notice_period || 'N/A'}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Current Company</span>
                                                                                    <p className="text-sm font-bold text-gray-900">{app.current_company || 'N/A'}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Designation</span>
                                                                                    <p className="text-sm font-bold text-gray-900">{app.current_designation || 'N/A'}</p>
                                                                                </div>
                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                    <div>
                                                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Salary (Current)</span>
                                                                                        <p className="text-sm font-bold text-gray-900">{app.current_salary || 'N/A'}</p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Expected</span>
                                                                                        <p className="text-sm font-bold text-gray-900">{app.expected_salary || 'N/A'}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Technical Assessment Summary */}
                                                                        {(app.tech_test_status || app.tech_test_score !== null) && (
                                                                            <div className="bg-white rounded-none border border-gray-100 shadow-sm p-6">
                                                                                <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-6">Technical Assessment</h4>
                                                                                <div className="space-y-4">
                                                                                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-sm flex items-center justify-between">
                                                                                        <div>
                                                                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Score</span>
                                                                                            <span className="text-2xl font-black text-gray-900">{app.tech_test_score}%</span>
                                                                                        </div>
                                                                                        <div className="text-right">
                                                                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Status</span>
                                                                                            <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black uppercase ${app.tech_test_status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                                                {app.tech_test_status || 'Pending'}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                    {app.tech_test_ai && (
                                                                                        <div className="grid grid-cols-2 gap-3">
                                                                                            <div className="p-2 border border-blue-50 bg-blue-50/20 rounded-sm">
                                                                                                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest block mb-1">Accuracy</span>
                                                                                                <span className="text-xs font-black text-blue-700">{app.tech_test_ai.descriptive_score_out_of_100}%</span>
                                                                                            </div>
                                                                                            <div className="p-2 border border-emerald-50 bg-emerald-50/20 rounded-sm">
                                                                                                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Integrity</span>
                                                                                                <span className="text-xs font-black text-emerald-700">{app.tech_test_ai.is_ai_generated ? 'AI Pattern' : 'Authentic'}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Operational Evaluation Feedback */}
                                                                    <div className="bg-white rounded-none border border-gray-100 shadow-sm p-8">
                                                                        <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-6 flex items-center gap-2">
                                                                            <MessageSquare size={14} /> Operational Feedback
                                                                        </h4>
                                                                        <div className="space-y-6">
                                                                            {(() => {
                                                                                const opLogs = applicationHistory.filter(h => h.event_type?.includes('Operation Round'));

                                                                                if (opLogs.length > 0) {
                                                                                    return (
                                                                                        <div className="grid grid-cols-1 gap-6">
                                                                                            {opLogs.map((log, i) => (
                                                                                                <div key={i} className="p-4 bg-indigo-50/30 border border-indigo-100/50 rounded-sm relative overflow-hidden">
                                                                                                    <div className="absolute right-0 top-0 p-2 bg-indigo-500/10 text-indigo-500 rounded-bl-xl font-black text-[8px] uppercase tracking-widest">
                                                                                                        Source: {log.event_type}
                                                                                                    </div>
                                                                                                    <div className="flex items-center gap-3 mb-3">
                                                                                                        <div className="w-8 h-8 rounded-sm bg-indigo-600 flex items-center justify-center text-white text-xs font-black">
                                                                                                            {log.action_by_name?.charAt(0) || 'O'}
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{log.action_by_name}</p>
                                                                                                            <p className="text-[10px] text-indigo-500 font-bold">Operational Interviewer</p>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="bg-white/60 p-4 border border-white rounded-sm text-sm text-gray-700 leading-relaxed italic">
                                                                                                        "{log.notes || 'No detailed notes provided'}"
                                                                                                    </div>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    );
                                                                                }

                                                                                // Fallback to application's operation_notes if history is empty but notes exist
                                                                                if (app.operation_notes) {
                                                                                    return (
                                                                                        <div className="p-4 bg-indigo-50/30 border border-indigo-100/50 rounded-sm relative overflow-hidden">
                                                                                            <div className="flex items-center gap-3 mb-3">
                                                                                                <div className="w-8 h-8 rounded-sm bg-indigo-600 flex items-center justify-center text-white text-xs font-black">
                                                                                                    {app.operation_notes_by?.charAt(0) || 'I'}
                                                                                                </div>
                                                                                                <div>
                                                                                                    <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{app.operation_notes_by || 'Interviewer'}</p>
                                                                                                    <p className="text-[10px] text-indigo-500 font-bold">Recorded Notes</p>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="bg-white/60 p-4 border border-white rounded-sm text-sm text-gray-700 leading-relaxed italic">
                                                                                                "{app.operation_notes}"
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                }

                                                                                return (
                                                                                    <div className="py-10 text-center border border-dashed border-gray-100 rounded-sm bg-gray-50/50">
                                                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No Operational Notes Found</p>
                                                                                        <p className="text-[9px] text-gray-400 mt-1">Evaluation will be recorded after the operational round.</p>
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
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

                    {/* Pagination */}
                    {!loading && filteredApplicants.length > 0 && (
                        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredApplicants.length)} of {filteredApplicants.length}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-xl bg-white border border-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:border-black transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1
                                            ? 'bg-black text-white shadow-lg shadow-black/10'
                                            : 'bg-white text-gray-400 border border-gray-100 hover:border-black'
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-xl bg-white border border-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:border-black transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {evalModalOpen && selectedApplicant && (
                <NextStepDialog
                    isOpen={evalModalOpen}
                    onClose={() => setEvalModalOpen(false)}
                    candidateName={selectedApplicant.candidate_name}
                    applicationId={selectedApplicant.id}
                    department={selectedApplicant.department}
                    techTestStatus={selectedApplicant.tech_test_status}
                    techTestScore={selectedApplicant.tech_test_score}
                    hrNotes={selectedApplicant.hr_notes}
                    hrNotesBy={selectedApplicant.hr_notes_by}
                    onSuccess={() => {
                        setEvalModalOpen(false);
                        fetchAssignedCandidates();
                    }}
                />
            )}
        </div>
    );
}
