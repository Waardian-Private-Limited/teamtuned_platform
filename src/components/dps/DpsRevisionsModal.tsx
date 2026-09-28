"use client";

import React, { useEffect, useState } from 'react';
import {
    X,
    History as HistoryIcon,
    Clock,
    User,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    FileText,
    CheckCircle2,
    Calendar,
    RefreshCw
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

export interface FormRevisionChange {
    path: string;
    from: any;
    to: any;
}

export interface FormRevision {
    id: number;
    revision_no: number;
    changed_at: string;
    changed_by_name: string;
    changes: FormRevisionChange[];
    previous_data?: any;
}

interface DpsRevisionsModalProps {
    assignmentId: number;
    siteName?: string;
    unitName?: string;
    reportDate?: string | null;
    formType?: string;
    onClose: () => void;
}

export function DpsRevisionsModal({
    assignmentId,
    siteName,
    unitName,
    reportDate,
    formType = 'planning',
    onClose
}: DpsRevisionsModalProps) {
    const [revisions, setRevisions] = useState<FormRevision[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedSnapshotRev, setExpandedSnapshotRev] = useState<number | null>(null);

    const fetchRevisions = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient<{ revisions: FormRevision[] }>(
                `/dps-schedule/dynamic-assignments/${assignmentId}/revisions`,
                { withAuth: true }
            );
            setRevisions(res.revisions || []);
        } catch (err: any) {
            console.error('Error fetching revisions:', err);
            setError(err?.message || 'Failed to load revision history.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRevisions();
    }, [assignmentId]);

    const formatVal = (val: any) => {
        if (val === null || val === undefined) return <span className="text-gray-400 italic">empty</span>;
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border-2 border-black w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl relative">
                {/* Header */}
                <div className="p-5 border-b-2 border-black bg-zinc-50 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 bg-black text-white flex items-center justify-center">
                                <HistoryIcon size={15} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-0.5">
                                Revision History
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                Assignment #{assignmentId}
                            </span>
                        </div>
                        <h2 className="text-base font-black text-black uppercase tracking-tight">
                            {siteName || 'Site'} {unitName ? `— ${unitName}` : ''}
                        </h2>
                        {reportDate && (
                            <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5 mt-0.5">
                                <Calendar size={12} /> Report Date: {new Date(reportDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 border border-black hover:bg-black hover:text-white transition-colors"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {loading ? (
                        <div className="py-16 text-center">
                            <RefreshCw size={24} className="animate-spin mx-auto text-gray-400 mb-3" />
                            <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                                Loading versions…
                            </p>
                        </div>
                    ) : error ? (
                        <div className="p-4 border border-red-500 bg-red-50 text-red-700 text-xs font-bold">
                            {error}
                        </div>
                    ) : revisions.length === 0 ? (
                        <div className="py-16 text-center border-2 border-dashed border-gray-200">
                            <HistoryIcon size={32} className="mx-auto text-gray-300 mb-2" />
                            <h3 className="text-sm font-black text-black uppercase tracking-wider">
                                No Previous Revisions
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                                This report contains its initial submission data. Any future edits will be captured as versioned revisions with full diff tracking.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-600 pb-2 border-b border-gray-200">
                                <span>{revisions.length} recorded revision{revisions.length === 1 ? '' : 's'}</span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Latest to oldest</span>
                            </div>

                            {revisions.map((rev) => {
                                const hasChanges = Array.isArray(rev.changes) && rev.changes.length > 0;
                                const isSnapshotOpen = expandedSnapshotRev === rev.revision_no;

                                return (
                                    <div
                                        key={rev.id || rev.revision_no}
                                        className="border-2 border-black bg-white shadow-sm"
                                    >
                                        <div className="p-4 bg-zinc-100/70 border-b border-black flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-wider">
                                                    Revision #{rev.revision_no}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-black">
                                                    <User size={13} className="text-gray-500" />
                                                    <span>{rev.changed_by_name || 'Original Submitter'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500">
                                                <Clock size={12} />
                                                <span>
                                                    {new Date(rev.changed_at).toLocaleString('en-GB', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-4 space-y-3">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                                    Changes in this revision ({hasChanges ? rev.changes.length : 0})
                                                </p>

                                                {hasChanges ? (
                                                    <div className="divide-y divide-gray-100 border border-gray-200 bg-gray-50/50">
                                                        {rev.changes.map((c, i) => (
                                                            <div key={i} className="p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white transition-colors">
                                                                <span className="font-bold text-black uppercase tracking-tight text-[11px]">
                                                                    {c.path}
                                                                </span>
                                                                <div className="flex items-center gap-2 font-mono text-[11px]">
                                                                    <span className="px-2 py-0.5 bg-red-100 text-red-800 line-through rounded">
                                                                        {formatVal(c.from)}
                                                                    </span>
                                                                    <ArrowRight size={12} className="text-gray-400 shrink-0" />
                                                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">
                                                                        {formatVal(c.to)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-500 italic">
                                                        Resubmitted with no tracked field modifications.
                                                    </p>
                                                )}
                                            </div>

                                            {rev.previous_data && (
                                                <div className="pt-2">
                                                    <button
                                                        onClick={() => setExpandedSnapshotRev(isSnapshotOpen ? null : rev.revision_no)}
                                                        className="text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                    >
                                                        {isSnapshotOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                        {isSnapshotOpen ? 'Hide Prior Snapshot' : 'View Prior Snapshot (JSON)'}
                                                    </button>
                                                    {isSnapshotOpen && (
                                                        <pre className="mt-2 p-3 bg-zinc-900 text-zinc-100 text-[10px] overflow-x-auto max-h-52 font-mono rounded">
                                                            {JSON.stringify(rev.previous_data, null, 2)}
                                                        </pre>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t-2 border-black bg-zinc-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors border border-black"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
