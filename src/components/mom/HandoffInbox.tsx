"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { ArrowRightLeft, Check, X, Loader2, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { describeDueDate } from '@/lib/momDates';

interface PendingHandoff {
    point_id: number;
    point_text: string;
    handoff_reason: string | null;
    from_name: string | null;
    meeting_title: string;
    due_date: string | null;
    priority: string;
}

/**
 * Handoffs waiting on you.
 *
 * Ownership does not move until the receiver accepts, so this has to be the
 * first thing someone sees — a proposal nobody notices is a point that quietly
 * belongs to no one.
 */
export default function HandoffInbox({ onChanged }: { onChanged?: () => void }) {
    const [handoffs, setHandoffs] = useState<PendingHandoff[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [decliningId, setDecliningId] = useState<number | null>(null);
    const [declineReason, setDeclineReason] = useState('');

    const load = useCallback(async () => {
        try {
            const res: any = await apiClient.get('/mom/points/handoffs/pending', undefined, { withAuth: true });
            setHandoffs(res?.success ? (res.handoffs || []) : []);
        } catch {
            setHandoffs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const respond = async (pointId: number, accept: boolean, reason?: string) => {
        try {
            setBusyId(pointId);
            const res: any = await apiClient.post(`/mom/points/${pointId}/assignees`, {
                action: 'respond', accept, reason: reason || null,
            }, { withAuth: true });

            if (res?.success) {
                toast.success(accept ? 'You now own this point.' : 'Sent back with your reason.');
                setHandoffs(prev => prev.filter(h => h.point_id !== pointId));
                setDecliningId(null);
                setDeclineReason('');
                onChanged?.();
            } else {
                toast.error(res?.message || 'Could not record your answer.');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Could not record your answer.');
        } finally {
            setBusyId(null);
        }
    };

    if (loading || handoffs.length === 0) return null;

    return (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/60 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-blue-100 flex items-center gap-2">
                <ArrowRightLeft size={14} className="text-blue-600" />
                <h2 className="text-[11px] font-black uppercase tracking-widest text-blue-800">
                    Waiting on you — {handoffs.length} {handoffs.length === 1 ? 'handoff' : 'handoffs'}
                </h2>
            </div>

            <div className="divide-y divide-blue-100">
                {handoffs.map(h => (
                    <div key={h.point_id} className="px-4 py-3 bg-white/70">
                        <p className="text-sm font-semibold text-slate-900">{h.point_text}</p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500">
                            <span><span className="font-semibold text-slate-700">{h.from_name || 'Someone'}</span> wants to hand this over</span>
                            <span className="text-slate-300">·</span>
                            <span>{h.meeting_title}</span>
                            {h.due_date && (
                                <>
                                    <span className="text-slate-300">·</span>
                                    <span className="inline-flex items-center gap-1">
                                        <CalendarDays size={10} />{describeDueDate(h.due_date.slice(0, 10))}
                                    </span>
                                </>
                            )}
                        </div>

                        {h.handoff_reason && (
                            <p className="mt-2 text-xs text-slate-600 italic border-l-2 border-blue-300 pl-2">
                                “{h.handoff_reason}”
                            </p>
                        )}

                        {decliningId === h.point_id ? (
                            <div className="mt-3 flex flex-col gap-2">
                                <textarea
                                    value={declineReason}
                                    onChange={e => setDeclineReason(e.target.value)}
                                    rows={2}
                                    autoFocus
                                    placeholder="Why are you sending it back?"
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => respond(h.point_id, false, declineReason)}
                                        disabled={!declineReason.trim() || busyId === h.point_id}
                                        className="px-3 py-1.5 bg-rose-600 text-white rounded-md text-[10px] font-black uppercase tracking-widest disabled:opacity-40 hover:bg-rose-700 transition-colors"
                                    >
                                        Send it back
                                    </button>
                                    <button
                                        onClick={() => { setDecliningId(null); setDeclineReason(''); }}
                                        className="text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 flex items-center gap-2">
                                <button
                                    onClick={() => respond(h.point_id, true)}
                                    disabled={busyId === h.point_id}
                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center gap-1.5 disabled:opacity-40"
                                >
                                    {busyId === h.point_id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                    Accept
                                </button>
                                <button
                                    onClick={() => setDecliningId(h.point_id)}
                                    disabled={busyId === h.point_id}
                                    className="px-3 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                                >
                                    <X size={11} /> Decline
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
