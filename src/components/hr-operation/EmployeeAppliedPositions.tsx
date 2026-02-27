"use strict";
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, Search, Mail, Phone, Download, MapPin,
    ChevronLeft, ChevronRight, CheckCircle2, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { NextStepDialog } from './OrgAppliedPositions';

export default function EmployeeAppliedPositions() {
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

    useEffect(() => {
        fetchAssignedCandidates();
    }, []);

    const fetchAssignedCandidates = async () => {
        setLoading(true);
        try {
            // Fetch candidates assigned to logged-in user
            const res = await apiClient.get('/hr-operation/shortlisted-candidates?assigned_to_me=true', {}, { withAuth: true });
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
        let base = applicants;

        if (statusTab === 'Pending') {
            base = base.filter(a => a.status === 'Interviewing' || a.status === 'Shortlisted');
        } else {
            base = base.filter(a => a.status === 'Rejected' || a.status === 'Offered' || a.status === 'Hired');
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            base = base.filter(a =>
                (a.candidate_name || '').toLowerCase().includes(q) ||
                (a.department || '').toLowerCase().includes(q) ||
                (a.position_name || '').toLowerCase().includes(q)
            );
        }

        return base;
    }, [applicants, statusTab, searchQuery]);

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

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        {(['Pending', 'Evaluated'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => { setStatusTab(tab); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${statusTab === tab
                                    ? 'bg-black text-white border-black shadow-md'
                                    : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                placeholder="Search candidate, position..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-black outline-none transition-all"
                            />
                        </div>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="bg-gray-50 border-none rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-black"
                        >
                            <option value={5}>5 per page</option>
                            <option value={10}>10 per page</option>
                            <option value={20}>20 per page</option>
                        </select>
                    </div>
                </div>

                {/* Applications Table */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="sticky top-0 bg-gray-50/80 backdrop-blur-md z-10 px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                        Candidate
                                    </th>
                                    <th className="sticky top-0 bg-gray-50/80 backdrop-blur-md z-10 px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                        Contact
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
                                        <tr key={app.id} className="hover:bg-gray-50/50 transition-colors group">
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
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-gray-900 uppercase tracking-tight">
                                                            {app.position_name}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                            {app.department}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                        <span>
                                                            {app.highest_education || 'Education'}
                                                            {app.specialization ? ` · ${app.specialization}` : ''}
                                                            {app.year_of_passing ? ` · ${app.year_of_passing}` : ''}
                                                        </span>
                                                    </div>
                                                    {app.resume_url && (
                                                        <a
                                                            href={app.resume_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors mt-1"
                                                        >
                                                            <Download size={10} /> View Resume
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <span className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest border ${app.status === 'Shortlisted' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        app.status === 'Interviewing' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                            app.status === 'Offered' || app.status === 'Hired' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                'bg-red-50 text-red-700 border-red-200'
                                                        }`}>
                                                        {app.status}
                                                    </span>
                                                    {app.tech_test_status && (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200">
                                                                Test: {app.tech_test_status === 'Completed' ? `${app.tech_test_score ?? 0}%` : app.tech_test_status}
                                                            </span>
                                                            {app.tech_test_assigned_by && (
                                                                <span className="text-[8px] font-black uppercase text-indigo-500 tracking-tighter ml-1">By {app.tech_test_assigned_by}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                {statusTab === 'Pending' && (
                                                    <button
                                                        onClick={() => { setSelectedApplicant(app); setEvalModalOpen(true); }}
                                                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-black text-white hover:bg-gray-800 px-4 py-2 rounded-sm transition-all shadow-md shadow-black/10"
                                                    >
                                                        Evaluate
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
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
                    techTestAI={selectedApplicant.tech_test_ai ? (typeof selectedApplicant.tech_test_ai === 'string' ? JSON.parse(selectedApplicant.tech_test_ai) : selectedApplicant.tech_test_ai) : null}
                    techTestAssignedBy={selectedApplicant.tech_test_assigned_by}
                    hrNotes={selectedApplicant.hr_notes}
                    operationNotes={selectedApplicant.operation_notes}
                    onSuccess={() => {
                        setEvalModalOpen(false);
                        fetchAssignedCandidates();
                    }}
                />
            )}
        </div>
    );
}
