"use client";

/**
 * The three sections of a daily report whose contents outlive the day:
 * equipment breakdowns, priority materials, and site issues.
 *
 * A daily form is a snapshot, but these things are not. A pump that broke on
 * Monday is the same pump on Thursday; steel ordered last week is still
 * outstanding until it lands; an issue has an opened date and a closed date.
 * The server carries each one forward with its own history, so these sections
 * render state rather than a fresh blank every morning — and the badge that
 * says "raised 3 days ago" is the honest signal that nothing has moved.
 *
 * Raising a MoM point is the server's job on submit, once per open item. These
 * sections only show whether one exists.
 */

import React from 'react';
import { Wrench, Layers, AlertCircle, Plus, Trash2, MessageSquare, CheckCircle2, Search, X } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { Section, ToolButton, EmptyRow, inputCls, numCls, headCls } from './DpsUi';

/**
 * Pick the person who owns an issue.
 *
 * Searches the directory rather than listing it. An organisation of a few
 * hundred people makes a plain dropdown unusable — you cannot scan it, and
 * fetching every employee to populate a control that is used once per issue is
 * a lot of payload for nothing. Two characters queries the server, which is
 * already how the site-config picker works.
 */
function AssigneePicker({ value, valueName, onChange, disabled }: {
    value?: number | null;
    valueName?: string;
    onChange: (id: number | null, name: string) => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    const boxRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!open) return;
        const onOutside = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onOutside);
        return () => document.removeEventListener('mousedown', onOutside);
    }, [open]);

    React.useEffect(() => {
        const term = query.trim();
        if (term.length < 2) { setResults([]); return; }
        setLoading(true);
        const t = setTimeout(async () => {
            try {
                const res = await apiClient.get<any>(
                    '/organization/employees',
                    { format: 'paginated', search: term, limit: 10, status: 'active' },
                    { withAuth: true }
                );
                const items = Array.isArray(res?.data) ? res.data
                    : Array.isArray(res?.items) ? res.items
                        : Array.isArray(res) ? res : [];
                setResults(items);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 250);
        return () => clearTimeout(t);
    }, [query]);

    const nameOf = (e: any) =>
        e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || `#${e.id}`;

    if (value && valueName) {
        return (
            <div className="flex items-center gap-2">
                <span className="flex-1 px-2.5 py-2 border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 truncate">
                    {valueName}
                </span>
                {!disabled && (
                    <button
                        type="button"
                        onClick={() => onChange(null, '')}
                        title="Remove assignee"
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div ref={boxRef} className="relative">
            <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    disabled={disabled}
                    value={query}
                    onFocus={() => setOpen(true)}
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    placeholder="Search a name — or leave unassigned"
                    className={`${inputCls} pl-8`}
                />
            </div>
            {open && query.trim().length >= 2 && (
                <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 shadow-lg">
                    {loading ? (
                        <p className="px-3 py-3 text-xs text-slate-400">Searching…</p>
                    ) : results.length === 0 ? (
                        <p className="px-3 py-3 text-xs text-slate-400">No match for “{query.trim()}”</p>
                    ) : results.map(e => (
                        <button
                            key={e.id}
                            type="button"
                            onClick={() => { onChange(e.id, nameOf(e)); setQuery(''); setOpen(false); }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0"
                        >
                            <p className="text-xs font-semibold text-slate-800 truncate">{nameOf(e)}</p>
                            {e.designation && (
                                <p className="text-[10px] text-slate-400 truncate">{e.designation}</p>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * A row nobody has named is not a thing being tracked.
 *
 * The plan's own template carries blank rows, and a freshly added row starts
 * empty — counting those made the header report "1 outstanding" on a form where
 * nothing had been entered.
 */
const named = (v: any) => String(v ?? '').trim().length > 0;

const daysSince = (iso?: string | null) => {
    if (!iso) return null;
    const then = new Date(iso).setHours(0, 0, 0, 0);
    if (isNaN(then)) return null;
    const days = Math.round((Date.now() - then) / 86400000);
    return days > 0 ? days : 0;
};

/** "raised 3 days ago" — the part of an item's history that changes behaviour. */
function AgeBadge({ since, days: given, verb = 'Raised' }: { since?: string | null; days?: number | null; verb?: string }) {
    const days = given ?? daysSince(since);
    if (days === null) return null;
    const tone = days >= 3 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200';
    return (
        <span className={`text-[9px] font-bold uppercase tracking-wider border px-1.5 py-0.5 ${tone}`}>
            {verb} {days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`}
        </span>
    );
}

function MomBadge({ pointId }: { pointId?: number | null }) {
    if (!pointId) return null;
    return (
        <span
            title="A MoM action point has already been raised for this — it will not be raised again while it stays open"
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5"
        >
            <MessageSquare size={9} />
            MoM #{pointId}
        </span>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
   Equipment
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Why fewer machines were on site than the plan asked for.
 */
const SHORTFALL_STATUSES = [
    'Breakdown',
    'Under maintenance',
    'Not mobilised',
    'Not required',
    'Other'
] as const;

export function EquipmentSection({ rows, setRows, readOnly }: {
    rows: any[];
    setRows: (rows: any[]) => void;
    readOnly?: boolean;
}) {
    const patch = (i: number, next: any) => {
        const copy = [...rows];
        copy[i] = { ...copy[i], ...next };
        setRows(copy);
    };

    const addRow = () => setRows([
        ...rows,
        { id: `eq-${Date.now()}`, type: '', planned: 0, actual: null, breakdown: '', available: null, is_manual: true }
    ]);

    const patchUnit = (rowIdx: number, uIdx: number, next: any, currentUnits: any[]) => {
        const copy = [...currentUnits];
        copy[uIdx] = { ...copy[uIdx], ...next };
        /* Only the unit changes.
           This used to mirror Unit #1's status and reason up onto the row, so
           typing a reason for the *second* machine rewrote the row's breakdown
           with the *first* machine's text — and that text then leaked into the
           new machine's action point. Once a row has units, the row-level
           fields are not the record of anything; the units are. */
        patch(rowIdx, { units: copy });
    };

    const addUnitBreakdown = (rowIdx: number, currentUnits: any[]) => {
        const nextUnits = [
            ...currentUnits,
            {
                id: `u-${Date.now()}-${currentUnits.length + 1}`,
                unit_label: `Unit #${currentUnits.length + 1}`,
                is_new_today: true,
                shortfall_status: 'Breakdown',
                shortfall_reason: '',
                status: 'open'
            }
        ];
        patch(rowIdx, { units: nextUnits });
    };

    const removeUnitBreakdown = (rowIdx: number, uIdx: number, currentUnits: any[]) => {
        const nextUnits = currentUnits.filter((_, idx) => idx !== uIdx);
        patch(rowIdx, { units: nextUnits.length > 0 ? nextUnits : null });
    };

    const carried = rows.reduce((acc, r) => {
        if (!named(r.type)) return acc;
        if (r.units && Array.isArray(r.units) && r.units.length > 0) {
            return acc + r.units.filter((u: any) => u.breakdown_open).length;
        }
        return acc + (r.breakdown_open ? 1 : 0);
    }, 0);

    return (
        <Section
            id="dpr-equipment"
            title="Equipment Tracking"
            caption="What was on site, and anything still down. Each broken machine gets its own status, reason, and tracked MoM point."
            icon={<Wrench size={16} />}
            accent="slate"
            badge={carried > 0 ? (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5">
                    {carried} still down
                </span>
            ) : undefined}
            actions={readOnly ? undefined : (
                <ToolButton onClick={addRow} icon={<Plus size={13} />}>Add equipment</ToolButton>
            )}
        >
            {rows.length === 0 ? (
                <EmptyRow
                    icon={<Wrench size={36} strokeWidth={1} />}
                    message="No equipment planned for this day"
                    hint="Add a row to report a machine that was on site anyway."
                />
            ) : (
                <div className="border border-slate-200 overflow-x-auto">
                    <div className="grid grid-cols-[1.4fr_0.5fr_0.6fr_0.6fr_2.2fr_auto] min-w-[880px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                        <div className={headCls}>Equipment</div>
                        <div className={`${headCls} text-center`}>Planned</div>
                        <div className={`${headCls} text-center`}>On site</div>
                        <div className={`${headCls} text-center`}>Variance</div>
                        <div className={headCls}>Status & Shortfall Breakdown</div>
                        <div className="w-8" />
                    </div>

                    <div className="divide-y divide-slate-100">
                        {rows.map((eq, i) => {
                            const planned = Number(eq.planned) || 0;
                            const onSite = eq.actual === null || eq.actual === undefined ? null : Number(eq.actual) || 0;
                            const variance = onSite === null ? null : onSite - planned;
                            const short = variance !== null && variance < 0;
                            const shortBy = short ? planned - (onSite ?? 0) : 0;

                            const wasDown = Boolean(eq.breakdown_open);
                            const isDown = eq.available === true
                                ? false
                                : Boolean(String(eq.breakdown || '').trim());

            /* Which machines of this type need answering for.
               Carried units are already explained — they were reported on an
               earlier day and are tracked with their own point. Only the gap
               *beyond* them is new, so a slot is opened for each newly missing
               machine and nothing is asked again about the ones already down.
               Showing only the carried units left a second pump that failed
               today with nowhere to be described. */
            /* Forms generated before per-unit tracking carry the breakdown on the
               row rather than in `units`. Without this the carried machine is
               invisible to the per-unit view, so it is counted as newly short
               and asked about all over again. */
                            const carriedUnits: any[] = (eq.units && Array.isArray(eq.units) && eq.units.length > 0)
                                ? eq.units
                                : wasDown
                                    ? [{
                                        id: `carried-row-${eq.id ?? i}`,
                                        unit_label: 'Unit #1',
                                        breakdown: eq.breakdown,
                                        breakdown_since: eq.breakdown_since,
                                        breakdown_open: true,
                                        tracked_id: eq.tracked_id,
                                        ref_key: eq.ref_key,
                                        mom_point_id: eq.mom_point_id,
                                        days_open: eq.days_open,
                                        shortfall_status: eq.shortfall_status || 'Breakdown',
                                        status: eq.status || 'open'
                                    }]
                                    : [];
                            const newlyShort = Math.max(0, shortBy - carriedUnits.length);
                            let effectiveUnits: any[] | null = null;
                            if (carriedUnits.length > 0 || shortBy > 1) {
                                effectiveUnits = [
                                    ...carriedUnits,
                                    ...Array.from({ length: newlyShort }, (_, idx) => ({
                                        id: `u-new-${carriedUnits.length + idx + 1}`,
                                        unit_label: `Unit #${carriedUnits.length + idx + 1}`,
                                        // Seed the first fresh slot from the row-level fields, so a
                                        // reason typed before the row split into units is not lost.
                                        shortfall_status: (carriedUnits.length === 0 && idx === 0) ? (eq.shortfall_status || '') : '',
                                        shortfall_reason: (carriedUnits.length === 0 && idx === 0) ? (eq.shortfall_reason || '') : '',
                                        breakdown: (carriedUnits.length === 0 && idx === 0) ? (eq.breakdown || '') : '',
                                        status: 'open',
                                        is_new_today: true
                                    }))
                                ];
                            }

                            return (
                                <div key={eq.id ?? i} className={isDown || short || (effectiveUnits && effectiveUnits.length > 0) ? 'bg-rose-50/20' : ''}>
                                    <div className="grid grid-cols-[1.4fr_0.5fr_0.6fr_0.6fr_2.2fr_auto] min-w-[880px] gap-3 px-4 py-3 items-start group hover:bg-slate-50/40 transition-colors">
                                        <div className="min-w-0">
                                            {eq.is_manual ? (
                                                <input
                                                    type="text"
                                                    disabled={readOnly}
                                                    value={eq.type || ''}
                                                    onChange={e => patch(i, { type: e.target.value })}
                                                    placeholder="e.g. Concrete Pump"
                                                    className={inputCls}
                                                />
                                            ) : (
                                                <p className="text-xs font-semibold text-slate-800 truncate">{eq.type}</p>
                                            )}
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                {wasDown && !effectiveUnits && <AgeBadge since={eq.breakdown_since} days={eq.days_open} verb="Down" />}
                                                {!effectiveUnits && <MomBadge pointId={eq.mom_point_id} />}
                                            </div>
                                        </div>

                                        <div className="text-center text-xs font-semibold text-slate-500 tabular-nums pt-2">
                                            {planned || <span className="text-slate-300">—</span>}
                                        </div>

                                        <input
                                            type="number"
                                            min="0"
                                            disabled={readOnly}
                                            value={eq.actual ?? ''}
                                            onWheel={e => (e.currentTarget as HTMLInputElement).blur()}
                                            onChange={e => patch(i, { actual: Math.max(0, parseInt(e.target.value) || 0) })}
                                            placeholder="0"
                                            className={numCls}
                                        />

                                        <div className={`text-center text-xs font-semibold tabular-nums pt-2 ${variance === null ? 'text-slate-300'
                                            : variance < 0 ? 'text-rose-600'
                                                : variance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {variance === null ? '—' : `${variance > 0 ? '+' : ''}${variance}`}
                                        </div>

                                        <div className="space-y-3 min-w-0">
                                            {effectiveUnits && effectiveUnits.length > 0 ? (
                                                <div className="space-y-2.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                                                            {carriedUnits.length > 0 && newlyShort > 0
                                                                ? `${carriedUnits.length} already down · ${newlyShort} newly short today`
                                                                : carriedUnits.length > 0
                                                                    ? `${carriedUnits.length} down, already tracked`
                                                                    : `${shortBy} machine(s) short`} — status per machine:
                                                        </span>
                                                        {!readOnly && (
                                                            <button
                                                                type="button"
                                                                onClick={() => addUnitBreakdown(i, effectiveUnits!)}
                                                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                                                            >
                                                                <Plus size={11} /> Add Unit / Breakdown
                                                            </button>
                                                        )}
                                                    </div>

                                                    {effectiveUnits.map((u, uIdx) => {
                                                        const uWasDown = Boolean(u.breakdown_open);
                                                        const uIsFixed = u.status === 'fixed';
                                                        const uIsBreakdown = u.shortfall_status === 'Breakdown' || Boolean(String(u.breakdown || '').trim());

                                                        return (
                                                            <div key={u.id ?? uIdx} className="p-2 bg-white border border-slate-200 rounded-sm shadow-xs space-y-1.5">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                            {u.unit_label || `Unit #${uIdx + 1}`}
                                                                        </span>
                                                                        {uWasDown && <AgeBadge since={u.breakdown_since} days={u.days_open} verb="Down" />}
                                                                        <MomBadge pointId={u.mom_point_id} />
                                                                    </div>
                                                                    {uWasDown && (
                                                                        <div className="flex items-center gap-1">
                                                                            {(['open', 'fixed'] as const).map(state => (
                                                                                <button
                                                                                    key={state}
                                                                                    type="button"
                                                                                    disabled={readOnly}
                                                                                    onClick={() => patchUnit(i, uIdx, {
                                                                                        status: state,
                                                                                        available: state === 'fixed' ? true : null
                                                                                    }, effectiveUnits!)}
                                                                                    className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded ${u.status === state || (!u.status && state === 'open')
                                                                                        ? state === 'fixed'
                                                                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                                                                            : 'bg-amber-500 text-white border-amber-500'
                                                                                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-800'
                                                                                        }`}
                                                                                >
                                                                                    {state === 'fixed' ? 'Fixed' : 'Still down'}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {!readOnly && effectiveUnits!.length > (shortBy || 1) && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeUnitBreakdown(i, uIdx, effectiveUnits!)}
                                                                            className="text-slate-300 hover:text-rose-600 p-0.5"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {uWasDown && (
                                                                    <p className="text-[11px] text-slate-600 italic">{u.breakdown}</p>
                                                                )}

                                                                {/* A carried breakdown is answered, not re-asked. Its cause
                                                                    was recorded on the day it happened and its action point
                                                                    already names it — the only question left is whether it is
                                                                    fixed. Letting today's filler rewrite the category or the
                                                                    reason would quietly restate history. */}
                                                                {uWasDown && !uIsFixed && (
                                                                    <p className="text-[10px] text-slate-400">
                                                                        Reported {u.shortfall_status ? `as ${String(u.shortfall_status).toLowerCase()}` : ''} when it
                                                                        went down. Mark it fixed once it is back in service.
                                                                    </p>
                                                                )}

                                                                {!uWasDown && !uIsFixed && (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                                        <select
                                                                            disabled={readOnly}
                                                                            value={u.shortfall_status || ''}
                                                                            onChange={e => patchUnit(i, uIdx, {
                                                                                shortfall_status: e.target.value,
                                                                                breakdown: e.target.value === 'Breakdown' ? (u.shortfall_reason || u.breakdown || '') : '',
                                                                                available: null
                                                                            }, effectiveUnits!)}
                                                                            className={`${inputCls} text-[11px] ${!uWasDown && !u.shortfall_status ? 'border-rose-300 bg-rose-50/30' : ''}`}
                                                                        >
                                                                            <option value="">Status / Reason Category *</option>
                                                                            {SHORTFALL_STATUSES.map(st => (
                                                                                <option key={st} value={st}>{st}</option>
                                                                            ))}
                                                                        </select>
                                                                        <input
                                                                            type="text"
                                                                            disabled={readOnly}
                                                                            value={u.shortfall_reason || ''}
                                                                            onChange={e => patchUnit(i, uIdx, {
                                                                                shortfall_reason: e.target.value,
                                                                                breakdown: u.shortfall_status === 'Breakdown' ? e.target.value : u.breakdown
                                                                            }, effectiveUnits!)}
                                                                            placeholder={uWasDown ? "Today's update (optional)" : "What happened to this unit? *"}
                                                                            className={`${inputCls} text-[11px] ${!uWasDown && !String(u.shortfall_reason || '').trim() ? 'border-rose-300 bg-rose-50/30' : ''}`}
                                                                        />
                                                                    </div>
                                                                )}

                                                                {uIsBreakdown && !uIsFixed && (
                                                                    <p className="text-[9px] text-amber-700 font-medium">
                                                                        Tracked as breakdown — raises distinct MoM action point for {u.unit_label || `Unit #${uIdx + 1}`}
                                                                    </p>
                                                                )}
                                                                {uIsFixed && (
                                                                    <p className="text-[9px] text-emerald-700 font-medium">
                                                                        Closes breakdown and resolves MoM action point for {u.unit_label || `Unit #${uIdx + 1}`}.
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                /* Single Unit View */
                                                <>
                                                    {wasDown ? (
                                                        <div className="space-y-2">
                                                            <p className="text-[11px] text-slate-600">{eq.breakdown}</p>
                                                            <div className="flex items-center gap-1.5">
                                                                {(['open', 'fixed'] as const).map(state => {
                                                                    const active = (eq.status || 'open') === state;
                                                                    return (
                                                                        <button
                                                                            key={state}
                                                                            type="button"
                                                                            disabled={readOnly}
                                                                            onClick={() => patch(i, {
                                                                                status: state,
                                                                                available: state === 'fixed' ? true : null
                                                                            })}
                                                                            className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-colors ${active
                                                                                ? state === 'fixed'
                                                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                                                    : 'bg-amber-500 text-white border-amber-500'
                                                                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-900 hover:text-slate-700'
                                                                                }`}
                                                                        >
                                                                            {state === 'fixed' && <CheckCircle2 size={11} />}
                                                                            {state === 'fixed' ? 'Fixed' : 'Still down'}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ) : null}

                                                    {short && !wasDown ? (
                                                        <>
                                                            <select
                                                                disabled={readOnly}
                                                                value={eq.shortfall_status || ''}
                                                                onChange={e => {
                                                                    const status = e.target.value;
                                                                    patch(i, {
                                                                        shortfall_status: status,
                                                                        breakdown: wasDown
                                                                            ? (eq.breakdown || '')
                                                                            : status === 'Breakdown'
                                                                                ? (eq.shortfall_reason || eq.breakdown || '')
                                                                                : '',
                                                                        available: null
                                                                    });
                                                                }}
                                                                className={`${inputCls} ${!eq.shortfall_status ? 'border-rose-300 bg-rose-50/40' : ''}`}
                                                            >
                                                                <option value="">Why the shortfall? *</option>
                                                                {SHORTFALL_STATUSES.map(st => (
                                                                    <option key={st} value={st}>{st}</option>
                                                                ))}
                                                            </select>
                                                            <input
                                                                type="text"
                                                                disabled={readOnly}
                                                                value={eq.shortfall_reason || ''}
                                                                onChange={e => patch(i, {
                                                                    shortfall_reason: e.target.value,
                                                                    breakdown: wasDown
                                                                        ? (eq.breakdown || '')
                                                                        : eq.shortfall_status === 'Breakdown' ? e.target.value : (eq.breakdown || '')
                                                                })}
                                                                placeholder="What happened? *"
                                                                className={`${inputCls} ${!wasDown && !String(eq.shortfall_reason || '').trim() ? 'border-rose-300 bg-rose-50/40' : ''}`}
                                                            />
                                                            {eq.shortfall_status === 'Breakdown' && String(eq.shortfall_reason || '').trim() && (
                                                                <p className="text-[10px] text-amber-700 font-medium">
                                                                    Tracked as a breakdown — raises MoM action point for equipment owner.
                                                                </p>
                                                            )}
                                                            {!readOnly && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addUnitBreakdown(i, [{
                                                                        id: 'u-1',
                                                                        unit_label: 'Unit #1',
                                                                        shortfall_status: eq.shortfall_status || '',
                                                                        shortfall_reason: eq.shortfall_reason || '',
                                                                        breakdown: eq.breakdown || '',
                                                                        status: eq.status || 'open'
                                                                    }])}
                                                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 pt-0.5"
                                                                >
                                                                    <Plus size={11} /> Add breakdown for another unit / machine
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="space-y-1.5">
                                                            <input
                                                                type="text"
                                                                disabled={readOnly}
                                                                value={eq.breakdown || ''}
                                                                onChange={e => patch(i, { breakdown: e.target.value, available: null })}
                                                                placeholder="Working — note a fault if any"
                                                                className={inputCls}
                                                            />
                                                            {!readOnly && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addUnitBreakdown(i, [{
                                                                        id: 'u-1',
                                                                        unit_label: 'Unit #1',
                                                                        shortfall_status: 'Breakdown',
                                                                        shortfall_reason: eq.breakdown || '',
                                                                        breakdown: eq.breakdown || '',
                                                                        status: 'open'
                                                                    }])}
                                                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                                                                >
                                                                    <Plus size={11} /> Report breakdown for specific unit
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        <div className="w-8">
                                            {eq.is_manual && !readOnly && (
                                                <button
                                                    type="button"
                                                    onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                                                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </Section>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
   Materials
   ──────────────────────────────────────────────────────────────────────────── */

export function MaterialsSection({ rows, setRows, readOnly }: {
    rows: any[];
    setRows: (rows: any[]) => void;
    readOnly?: boolean;
}) {
    const patch = (i: number, next: any) => {
        const copy = [...rows];
        copy[i] = { ...copy[i], ...next };
        setRows(copy);
    };

    const addRow = () => setRows([
        ...rows,
        { id: `mat-${Date.now()}`, name: '', quantity: '', requiredDate: '', status: 'open', is_manual: true }
    ]);

    const outstanding = rows.filter(r => named(r.name)
        && !['received', 'fixed', 'closed'].includes(String(r.status || '').toLowerCase())).length;

    return (
        <Section
            id="dpr-materials"
            title="Material Tracking"
            caption="Materials the site is waiting on. Each stays outstanding until it is marked received."
            icon={<Layers size={16} />}
            accent="blue"
            badge={outstanding > 0 ? (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5">
                    {outstanding} outstanding
                </span>
            ) : undefined}
            actions={readOnly ? undefined : (
                <ToolButton onClick={addRow} icon={<Plus size={13} />}>Add material</ToolButton>
            )}
        >
            {rows.length === 0 ? (
                <EmptyRow
                    icon={<Layers size={36} strokeWidth={1} />}
                    message="Nothing outstanding"
                    hint="Add a material the site is waiting on and it will be tracked until it lands."
                />
            ) : (
                <div className="border border-slate-200 overflow-x-auto">
                    <div className="grid grid-cols-[1.8fr_0.9fr_1fr_1.2fr_auto] min-w-[720px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                        <div className={headCls}>Material</div>
                        <div className={headCls}>Quantity</div>
                        <div className={headCls}>Required by</div>
                        <div className={headCls}>Status</div>
                        <div className="w-8" />
                    </div>

                    <div className="divide-y divide-slate-100">
                        {rows.map((m, i) => {
                            const received = ['received', 'fixed', 'closed'].includes(String(m.status || '').toLowerCase());
                            // Carried in from an earlier report: the request itself is settled.
            /* What was asked for is settled the moment the row exists.
               Gating on `tracked_id` alone left a plan-sourced material editable
               on its first day, and left anything from a schema generated before
               tracking editable for ever. A row that arrived already named came
               from the plan or from an earlier report either way — the quantity
               and the required-by date are its own, and today's only question is
               whether it has landed. Only a row being added right now is open
               for editing. */
                            const carriedRow = m.is_manual !== true && named(m.name);
                            return (
                                <div key={m.id ?? i} className={`grid grid-cols-[1.8fr_0.9fr_1fr_1.2fr_auto] min-w-[720px] gap-3 px-4 py-2.5 items-start group transition-colors ${received ? 'bg-emerald-50/30' : 'hover:bg-slate-50/40'}`}>
                                    <div className="min-w-0">
                                        {carriedRow ? (
                                            <p className="text-xs font-semibold text-slate-800 truncate">{m.name}</p>
                                        ) : (
                                            <input
                                                type="text"
                                                disabled={readOnly}
                                                value={m.name || ''}
                                                onChange={e => patch(i, { name: e.target.value })}
                                                placeholder="e.g. TMT Steel 12mm"
                                                className={inputCls}
                                            />
                                        )}
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <AgeBadge since={m.raised_on} days={m.days_open} />
                                            <MomBadge pointId={m.mom_point_id} />
                                        </div>
                                    </div>

                                    {/* Once a material is being tracked, what was asked for is
                                        settled — the quantity and the required-by date belong to
                                        the day it was raised. Today's only question is whether it
                                        has landed. Leaving them editable invited a later report to
                                        quietly rewrite the original request. */}
                                    {carriedRow ? (
                                        <div className="px-2.5 py-2 text-xs font-medium text-slate-600 truncate">
                                            {m.quantity || <span className="text-slate-300">—</span>}
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            disabled={readOnly}
                                            value={m.quantity || ''}
                                            onChange={e => patch(i, { quantity: e.target.value })}
                                            placeholder="e.g. 40 MT"
                                            className={inputCls}
                                        />
                                    )}

                                    {carriedRow ? (
                                        <div className="px-2.5 py-2 text-xs font-medium text-slate-600 truncate">
                                            {m.requiredDate
                                                ? new Date(m.requiredDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : <span className="text-slate-300">—</span>}
                                        </div>
                                    ) : (
                                        <input
                                            type="date"
                                            disabled={readOnly}
                                            value={(m.requiredDate || '').toString().substring(0, 10)}
                                            onChange={e => patch(i, { requiredDate: e.target.value })}
                                            className={inputCls}
                                        />
                                    )}

                                    <div className="flex items-center gap-1.5">
                                        {(['Pending', 'Received'] as const).map(state => (
                                            <button
                                                key={state}
                                                type="button"
                                                disabled={readOnly}
                                                onClick={() => patch(i, { status: state === 'Received' ? 'fixed' : 'open' })}
                                                className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-colors ${(state === 'Received') === received
                                                    ? state === 'Received'
                                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                                        : 'bg-amber-500 text-white border-amber-500'
                                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-900 hover:text-slate-700'
                                                    }`}
                                            >
                                                {state}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="w-8">
                                        {!readOnly && !carriedRow && (
                                            <button
                                                type="button"
                                                onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </Section>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
   Issues
   ──────────────────────────────────────────────────────────────────────────── */

export function IssuesSection({ rows, setRows, readOnly }: {
    rows: any[];
    setRows: (rows: any[]) => void;
    readOnly?: boolean;
}) {
    const patch = (i: number, next: any) => {
        const copy = [...rows];
        copy[i] = { ...copy[i], ...next };
        setRows(copy);
    };

    const addRow = () => setRows([
        ...rows,
        { id: `issue-${Date.now()}`, description: '', towerName: '', assignee_id: null, status: 'open', is_manual: true }
    ]);

    const open = rows.filter(r => named(r.description)
        && !['closed', 'fixed'].includes(String(r.status || 'open').toLowerCase())).length;

    return (
        <Section
            id="dpr-issues"
            title="Site Issues"
            caption="Issues stay on the form until closed. Naming someone raises an action point they will see."
            icon={<AlertCircle size={16} />}
            accent="emerald"
            badge={open > 0 ? (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5">
                    {open} open
                </span>
            ) : undefined}
            actions={readOnly ? undefined : (
                <ToolButton onClick={addRow} icon={<Plus size={13} />}>Add issue</ToolButton>
            )}
        >
            {rows.length === 0 ? (
                <EmptyRow
                    icon={<AlertCircle size={36} strokeWidth={1} />}
                    message="No open issues"
                    hint="Anything raised here is tracked day to day until it is closed."
                />
            ) : (
                <div className="space-y-2">
                    {rows.map((issue, i) => {
                        const closed = ['closed', 'fixed'].includes(String(issue.status || 'open').toLowerCase());
                        // An issue that arrived already described came from an earlier
                        // report; its text is the record and only its status is today's
                        // business. Keyed off the text so a pre-tracking schema behaves
                        // the same way as a tracked one.
                        const settledIssue = issue.is_manual !== true && named(issue.description);
                        return (
                            <div
                                key={issue.id ?? i}
                                className={`border p-4 space-y-3 group ${closed ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <label className={headCls}>Issue</label>
                                        <textarea
                                            disabled={readOnly || settledIssue}
                                            value={issue.description || ''}
                                            onChange={e => patch(i, { description: e.target.value })}
                                            rows={2}
                                            placeholder="Describe what is blocking work…"
                                            className={`${inputCls} resize-none`}
                                        />
                                        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                                            <AgeBadge since={issue.raised_on} days={issue.days_open} />
                                            <MomBadge pointId={issue.mom_point_id} />
                                        </div>
                                    </div>
                                    {!readOnly && !settledIssue && (
                                        <button
                                            type="button"
                                            onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <label className="flex flex-col gap-1">
                                        <span className={headCls}>Location</span>
                                        <input
                                            type="text"
                                            disabled={readOnly}
                                            value={issue.towerName || ''}
                                            onChange={e => patch(i, { towerName: e.target.value })}
                                            placeholder="Tower or area"
                                            className={inputCls}
                                        />
                                    </label>

                                    <div className="flex flex-col gap-1">
                                        <span className={headCls}>Assign to</span>
                                        <AssigneePicker
                                            value={issue.assignee_id}
                                            valueName={issue.assignee_name}
                                            disabled={readOnly || Boolean(issue.mom_point_id)}
                                            onChange={(id, name) => patch(i, { assignee_id: id, assignee_name: name })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <span className={headCls}>Status</span>
                                        <div className="flex items-center gap-1.5">
                                            {(['Open', 'Closed'] as const).map(state => (
                                                <button
                                                    key={state}
                                                    type="button"
                                                    disabled={readOnly}
                                                    onClick={() => patch(i, { status: state === 'Closed' ? 'fixed' : 'open' })}
                                                    className={`flex-1 px-2 py-2 text-[10px] font-bold uppercase tracking-wider border transition-colors ${(state === 'Closed') === closed
                                                        ? state === 'Closed'
                                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                                            : 'bg-amber-500 text-white border-amber-500'
                                                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-900 hover:text-slate-700'
                                                        }`}
                                                >
                                                    {state}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {!issue.mom_point_id && issue.assignee_id && !closed && (
                                    <p className="text-[10px] text-violet-700">
                                        On submit this raises an action point for {issue.assignee_name || 'the assignee'}.
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Section>
    );
}
