"use client";

import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { X, Search, User, Loader2, ArrowRightLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface HandoffDialogProps {
    pointId: number;
    pointText: string;
    /** Reassign moves ownership immediately; handoff waits for the receiver. */
    mode: 'handoff' | 'reassign';
    onClose: () => void;
    onDone: () => void;
}

interface Person {
    id: number;
    name: string;
    designation?: string;
}

/**
 * Moving a point to someone else.
 *
 * A handoff is a proposal: the receiver has to accept before they become
 * accountable, so the reason is mandatory — it is what they are answering.
 * A reassign is immediate, and only offered to the people responsible for the
 * point in the first place.
 */
export default function HandoffDialog({ pointId, pointText, mode, onClose, onDone }: HandoffDialogProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Person[]>([]);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState<Person | null>(null);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => { searchRef.current?.focus(); }, []);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                setSearching(true);
                const res: any = await apiClient.get(
                    `/organization/employees?format=paginated&limit=8&search=${encodeURIComponent(query)}`,
                    undefined, { withAuth: true }
                );
                if (cancelled) return;
                const items = res?.data || res?.items || [];
                setResults(items.map((e: any) => ({
                    id: e.id,
                    name: e.name || `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim(),
                    designation: e.designation,
                })));
            } catch {
                if (!cancelled) setResults([]);
            } finally {
                if (!cancelled) setSearching(false);
            }
        };
        const t = setTimeout(run, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [query]);

    const reasonRequired = mode === 'handoff';
    const canSubmit = !!selected && (!reasonRequired || reason.trim().length > 0) && !submitting;

    const submit = async () => {
        if (!canSubmit || !selected) return;
        try {
            setSubmitting(true);
            const res: any = await apiClient.post(`/mom/points/${pointId}/assignees`, {
                action: mode,
                to_employee_id: selected.id,
                reason: reason.trim() || null,
            }, { withAuth: true });

            if (res?.success) {
                toast.success(mode === 'handoff'
                    ? `Sent to ${selected.name} — they’ll be asked to accept.`
                    : `${selected.name} now owns this point.`);
                onDone();
                onClose();
            } else {
                toast.error(res?.message || 'Could not move this point.');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Could not move this point.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={mode === 'handoff' ? 'Hand this point over' : 'Reassign this point'}
            >
                <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <ArrowRightLeft size={16} className="text-blue-600" />
                            {mode === 'handoff' ? 'Hand this over' : 'Reassign this point'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{pointText}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-50" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                            Who takes it on
                        </label>
                        {selected ? (
                            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                                <span className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                                    <User size={14} /> {selected.name}
                                </span>
                                <button onClick={() => setSelected(null)} className="text-blue-500 hover:text-blue-800" aria-label="Choose someone else">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        ref={searchRef}
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        placeholder="Search people…"
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="mt-2 max-h-44 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
                                    {searching && (
                                        <div className="px-3 py-3 text-xs text-slate-400 flex items-center gap-2">
                                            <Loader2 size={12} className="animate-spin" /> Searching…
                                        </div>
                                    )}
                                    {!searching && results.length === 0 && (
                                        <div className="px-3 py-3 text-xs text-slate-400">No one matched that.</div>
                                    )}
                                    {!searching && results.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelected(p)}
                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center gap-2"
                                        >
                                            <User size={13} className="text-emerald-600 shrink-0" />
                                            <span className="text-sm font-medium text-slate-800">{p.name}</span>
                                            {p.designation && (
                                                <span className="text-[10px] text-slate-400 uppercase tracking-tight truncate ml-auto">{p.designation}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                            Why {reasonRequired && <span className="text-rose-500">(required)</span>}
                        </label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            rows={2}
                            placeholder={reasonRequired ? 'e.g. on leave from Monday' : 'Optional'}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {reasonRequired && (
                            <p className="text-[11px] text-slate-400 mt-1">
                                They’ll see this when deciding whether to accept.
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-50 border-t border-slate-100">
                    <button onClick={onClose} className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest">
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={!canSubmit}
                        className="px-4 py-2 bg-black text-white rounded-lg text-xs font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                        {submitting && <Loader2 size={12} className="animate-spin" />}
                        {mode === 'handoff' ? 'Send request' : 'Reassign'}
                    </button>
                </div>
            </div>
        </div>
    );
}
