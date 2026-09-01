"use client";

import React, { useEffect, useState } from 'react';
import { apiClient, getBackendUrl } from '@/lib/apiClient';
import { FileText, Download, Send, Loader2, ArrowDownToLine, AlertTriangle, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface MinutesBarProps {
    meetingId: string | number;
    meetingStatus?: string;
    canManage: boolean;
    onCarried?: () => void;
}

interface CarryPreview {
    source: { id: number; title: string } | null;
    points: { id: number; point_text: string; owners: string | null }[];
    message: string;
}

const FORMATS = [
    { key: 'pdf', label: 'PDF', hint: 'To circulate' },
    { key: 'docx', label: 'Word', hint: 'To edit first' },
    { key: 'xlsx', label: 'Excel', hint: 'Action items only' },
] as const;

/**
 * The minutes, and last meeting's unfinished work.
 *
 * Both live here because both are things you do at the edges of a meeting —
 * pulling open work in at the start, sending the record out at the end.
 */
export default function MinutesBar({ meetingId, meetingStatus, canManage, onCarried }: MinutesBarProps) {
    const [busy, setBusy] = useState<string | null>(null);
    const [carry, setCarry] = useState<CarryPreview | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res: any = await apiClient.get(`/mom/meetings/${meetingId}/carry-forward`);
                if (!cancelled && res?.success && res.points?.length) setCarry(res);
            } catch { /* nothing to carry is the normal case */ }
        })();
        return () => { cancelled = true; };
    }, [meetingId]);

    const download = async (format: string) => {
        try {
            setBusy(format);
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch(`${getBackendUrl()}/api/v1/mom/meetings/${meetingId}/export?format=${format}`, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    'ngrok-skip-browser-warning': 'true',
                },
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message || 'The minutes could not be generated.');
            }
            const blob = await res.blob();
            const name = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1]
                || `minutes.${format}`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = name;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
            toast.success(`Minutes downloaded as ${format.toUpperCase()}`);
        } catch (err: any) {
            toast.error(err?.message || 'The minutes could not be generated.');
        } finally {
            setBusy(null);
        }
    };

    const send = async () => {
        try {
            setBusy('send');
            const res: any = await apiClient.post(`/mom/meetings/${meetingId}/send-minutes`,
                { format: 'pdf' }, { withAuth: true });
            if (res?.success) toast.success(res.message);
            else toast.error(res?.message || 'The minutes could not be sent.');
        } catch (err: any) {
            toast.error(err?.message || 'The minutes could not be sent.');
        } finally {
            setBusy(null);
        }
    };

    const applyCarry = async () => {
        try {
            setBusy('carry');
            const res: any = await apiClient.post(`/mom/meetings/${meetingId}/carry-forward`, {}, { withAuth: true });
            if (res?.success) {
                toast.success(res.message);
                setCarry(null);
                onCarried?.();
            } else {
                toast.error(res?.message || 'Nothing was carried across.');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Nothing was carried across.');
        } finally {
            setBusy(null);
        }
    };

    const isClosed = meetingStatus === 'completed';

    return (
        <>
            {/* Last meeting's unfinished work, offered before anyone starts typing. */}
            {carry && carry.points.length > 0 && !dismissed && canManage && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-amber-100 flex items-center gap-2">
                        <ArrowDownToLine size={14} className="text-amber-700" />
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-amber-800">
                            Still open from {carry.source?.title}
                        </h2>
                    </div>
                    <div className="px-4 py-3 bg-white/60">
                        <ul className="space-y-1 mb-3">
                            {carry.points.slice(0, 5).map(p => (
                                <li key={p.id} className="text-[13px] text-slate-700 flex items-start gap-2">
                                    <span className="text-amber-500 mt-0.5">•</span>
                                    <span className="min-w-0">
                                        {p.point_text}
                                        {p.owners && <span className="text-slate-400"> — {p.owners}</span>}
                                    </span>
                                </li>
                            ))}
                            {carry.points.length > 5 && (
                                <li className="text-[12px] text-slate-400 pl-4">
                                    and {carry.points.length - 5} more
                                </li>
                            )}
                        </ul>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={applyCarry}
                                disabled={busy === 'carry'}
                                className="px-3 py-1.5 bg-amber-600 text-white rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {busy === 'carry' ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                Bring {carry.points.length} across
                            </button>
                            <button
                                onClick={() => setDismissed(true)}
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-widest"
                            >
                                Not this time
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* The record, once there is one worth sending. */}
            <div className="mb-4 flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white">
                <FileText size={15} className="text-slate-400" />
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 mr-1">
                    Minutes
                </span>

                {FORMATS.map(f => (
                    <button
                        key={f.key}
                        onClick={() => download(f.key)}
                        disabled={!!busy}
                        title={f.hint}
                        className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 text-[10px] font-bold uppercase tracking-wide hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {busy === f.key ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                        {f.label}
                    </button>
                ))}

                {canManage && (
                    <button
                        onClick={send}
                        disabled={!!busy}
                        className="ml-auto px-3 py-1.5 rounded-md bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {busy === 'send' ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                        Email to attendees
                    </button>
                )}

                {!isClosed && (
                    <span className="w-full flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                        <AlertTriangle size={11} />
                        This meeting is still open — the minutes will say so, and reopening it later marks any copy you send superseded.
                    </span>
                )}
            </div>
        </>
    );
}
