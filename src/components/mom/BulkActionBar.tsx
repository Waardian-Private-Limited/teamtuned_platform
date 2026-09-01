"use client";

import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Users, CalendarDays, Flag, Shuffle, X, Loader2, Search, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { dueDatePresets } from '@/lib/momDates';

interface BulkActionBarProps {
    selectedIds: number[];
    onClear: () => void;
    onDone: () => void;
}

interface Person { id: number; name: string; }

type Panel = null | 'assign' | 'distribute' | 'due' | 'priority';

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

/**
 * Acting on several points at once.
 *
 * The server reports per-row success, so a point the caller may not touch
 * fails on its own rather than taking the batch down. That distinction is
 * surfaced here rather than flattened into "something went wrong".
 */
export default function BulkActionBar({ selectedIds, onClear, onDone }: BulkActionBarProps) {
    const [panel, setPanel] = useState<Panel>(null);
    const [busy, setBusy] = useState(false);
    const [query, setQuery] = useState('');
    const [people, setPeople] = useState<Person[]>([]);
    const [chosen, setChosen] = useState<Person[]>([]);
    const barRef = useRef<HTMLDivElement>(null);

    const count = selectedIds.length;

    useEffect(() => { if (count === 0) { setPanel(null); setChosen([]); } }, [count]);

    useEffect(() => {
        if (panel !== 'assign' && panel !== 'distribute') return;
        let cancelled = false;
        const run = async () => {
            try {
                const res: any = await apiClient.get(
                    `/organization/employees?format=paginated&limit=8&search=${encodeURIComponent(query)}`,
                    undefined, { withAuth: true }
                );
                if (cancelled) return;
                const items = res?.data || res?.items || [];
                setPeople(items.map((e: any) => ({
                    id: e.id, name: e.name || `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim(),
                })));
            } catch { if (!cancelled) setPeople([]); }
        };
        const t = setTimeout(run, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [query, panel]);

    const run = async (body: Record<string, unknown>) => {
        try {
            setBusy(true);
            const res: any = await apiClient.post('/mom/points/bulk',
                { point_ids: selectedIds, ...body }, { withAuth: true });

            if (!res?.success) { toast.error(res?.message || 'Nothing was changed.'); return; }

            if (res.failed === 0) {
                toast.success(res.message);
            } else {
                // Name the first reason rather than just a count - "skipped 3"
                // tells nobody what to do next.
                const firstReason = (res.results || []).find((r: any) => !r.ok)?.message;
                toast(`${res.message}${firstReason ? ` ${firstReason}` : ''}`, { icon: '⚠️' });
            }
            setPanel(null);
            setChosen([]);
            onDone();
        } catch (err: any) {
            toast.error(err?.message || 'Nothing was changed.');
        } finally {
            setBusy(false);
        }
    };

    if (count === 0) return null;

    const toggle = (p: Person) => setChosen(prev =>
        prev.some(c => c.id === p.id) ? prev.filter(c => c.id !== p.id) : [...prev, p]);

    return (
        <div ref={barRef} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[min(94vw,760px)]">
            {panel && (
                <div className="mb-2 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 max-h-[50vh] overflow-y-auto">
                    {(panel === 'assign' || panel === 'distribute') && (
                        <>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                {panel === 'assign' ? 'Give all of them to' : 'Share them out between'}
                            </p>
                            <div className="relative mb-2">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Search people…"
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            {chosen.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {chosen.map(c => (
                                        <span key={c.id} className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-[11px] font-bold flex items-center gap-1">
                                            {c.name}
                                            <X size={10} className="cursor-pointer" onClick={() => toggle(c)} />
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="border border-slate-100 rounded-lg divide-y divide-slate-50 mb-3">
                                {people.map(p => {
                                    const on = chosen.some(c => c.id === p.id);
                                    return (
                                        <button key={p.id} onClick={() => toggle(p)}
                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between">
                                            <span className="text-sm text-slate-800">{p.name}</span>
                                            {on && <Check size={13} className="text-blue-600" />}
                                        </button>
                                    );
                                })}
                                {people.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">No one matched that.</div>}
                            </div>
                            <button
                                disabled={chosen.length === 0 || busy || (panel === 'distribute' && chosen.length < 2)}
                                onClick={() => run(panel === 'assign'
                                    ? { action: 'assign', role: 'owner', assignees: chosen.map(c => ({ type: 'employee', id: c.id })) }
                                    : { action: 'distribute', among: chosen.map(c => ({ id: c.id })) })}
                                className="w-full px-4 py-2 bg-black text-white rounded-lg text-[11px] font-black uppercase tracking-widest disabled:opacity-40 hover:bg-slate-800 flex items-center justify-center gap-2"
                            >
                                {busy && <Loader2 size={12} className="animate-spin" />}
                                {panel === 'assign'
                                    ? `Assign ${count} ${count === 1 ? 'point' : 'points'}`
                                    : chosen.length < 2 ? 'Pick at least two people' : `Share ${count} out between ${chosen.length}`}
                            </button>
                        </>
                    )}

                    {panel === 'due' && (
                        <>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Target date for all {count}</p>
                            <div className="flex flex-wrap gap-2">
                                {dueDatePresets().map(preset => (
                                    <button key={preset.key} disabled={busy}
                                        onClick={() => run({ action: 'set_due_date', due_date: preset.value, reason: 'Set in bulk' })}
                                        className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-amber-50 hover:border-amber-300 transition-colors">
                                        {preset.label}
                                    </button>
                                ))}
                                <input type="date" disabled={busy}
                                    onChange={e => e.target.value && run({ action: 'set_due_date', due_date: e.target.value, reason: 'Set in bulk' })}
                                    className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" />
                            </div>
                            <p className="text-[11px] text-slate-400 mt-2">
                                Points whose target has already moved once will be skipped, and told you why.
                            </p>
                        </>
                    )}

                    {panel === 'priority' && (
                        <>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Priority for all {count}</p>
                            <div className="flex flex-wrap gap-2">
                                {PRIORITIES.map(pr => (
                                    <button key={pr} disabled={busy}
                                        onClick={() => run({ action: 'set_priority', priority: pr })}
                                        className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 capitalize hover:bg-slate-50 transition-colors">
                                        {pr}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            <div className="bg-slate-900 text-white rounded-xl shadow-2xl px-4 py-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest tabular-nums">
                    {count} selected
                </span>
                <div className="w-px h-4 bg-white/20 mx-1" />

                {([
                    ['assign', Users, 'Assign'],
                    ['distribute', Shuffle, 'Share out'],
                    ['due', CalendarDays, 'Target date'],
                    ['priority', Flag, 'Priority'],
                ] as const).map(([key, Icon, label]) => (
                    <button key={key}
                        onClick={() => setPanel(panel === key ? null : key)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${
                            panel === key ? 'bg-white text-slate-900' : 'bg-white/10 hover:bg-white/20'
                        }`}>
                        <Icon size={12} /> {label}
                    </button>
                ))}

                <button onClick={onClear}
                    className="ml-auto text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white flex items-center gap-1">
                    <X size={12} /> Clear
                </button>
            </div>
        </div>
    );
}
