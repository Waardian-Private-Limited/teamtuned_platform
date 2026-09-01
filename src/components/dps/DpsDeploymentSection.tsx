"use client";

/**
 * Staff and labour deployment on a daily report.
 *
 * Both are the same shape — a roster of roles or trades, a planned figure, and
 * what actually turned up — so they share one component rather than two copies
 * that drift.
 *
 * The reported number is a **cumulative site head-count**. Attendance is
 * recorded at the gate, not at a tower: a mason punches in once for the site,
 * so no split can be derived from it. The cumulative is prefilled from the
 * record and is what gets saved; a tower breakdown is offered underneath as
 * optional detail for the person on site, who is the only one who knows where
 * people actually worked. Nothing depends on them filling it in.
 */

import React from 'react';
import { Plus, Trash2, Sparkles, ChevronDown, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { Section, ToolButton, EmptyRow, inputCls, numCls, headCls } from './DpsUi';
import type { Accent } from './DpsUi';

interface DeploymentRow {
    id?: any;
    planned?: number;
    actual?: number | null;
    actual_source?: string | null;
    scopes?: string[];
    split?: Record<string, number>;
    is_manual?: boolean;
    [key: string]: any;
}

export function DeploymentSection({
    id, title, caption, icon, accent, nameKey, namePlaceholder,
    rows, setRows, scopes, attendance, attendanceDate, attendanceLoading,
    onFillFromAttendance, readOnly, unitLabel
}: {
    id: string;
    title: string;
    caption: string;
    icon: React.ReactNode;
    accent: Accent;
    /** Which field carries the row's name — `role` for staff, `type` for labour. */
    nameKey: 'role' | 'type';
    namePlaceholder: string;
    rows: DeploymentRow[];
    setRows: (rows: DeploymentRow[]) => void;
    /** Towers and areas a row can be split across. */
    scopes: string[];
    /** name (lower-cased) -> head-count on the record for the reported day. */
    attendance: Map<string, number>;
    attendanceDate: string;
    attendanceLoading?: boolean;
    onFillFromAttendance: () => void;
    readOnly?: boolean;
    unitLabel: string;
}) {
    const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

    const nameOf = (r: DeploymentRow) => r[nameKey] || r.designation || r.name || '';

    /** "Tower A 5 · Tower B 7" — how the plan expected the row to fall. */
    const planScopeLabel = (r: DeploymentRow) => {
        const byScope = r.planned_by_scope || {};
        const parts = Object.entries(byScope).filter(([, n]) => Number(n) > 0);
        if (parts.length === 0) return '';
        return parts.map(([scope, n]) => `${scope} ${n}`).join(' · ');
    };
    const norm = (v: any) => String(v ?? '').trim().toLowerCase();

    const patch = (i: number, next: Partial<DeploymentRow>) => {
        const copy = [...rows];
        copy[i] = { ...copy[i], ...next };
        setRows(copy);
    };

    const setSplit = (i: number, scope: string, value: number) => {
        const row = rows[i];
        const split = { ...(row.split || {}) };
        if (!value) delete split[scope];
        else split[scope] = value;
        patch(i, { split });
    };

    const addRow = () => {
        setRows([
            ...rows,
            {
                id: `manual-${Date.now()}`,
                [nameKey]: '',
                designation: '',
                planned: 0,
                actual: null,
                split: {},
                scopes: [],
                is_manual: true
            }
        ]);
    };

    const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

    const totalPlanned = rows.reduce((sum, r) => sum + (Number(r.planned) || 0), 0);
    const totalActual = rows.reduce((sum, r) => sum + (Number(r.actual) || 0), 0);
    const matchable = rows.filter(r => attendance.has(norm(nameOf(r)))).length;
    const prefilled = rows.filter(r => r.actual_source === 'attendance').length;
    /** True when the plan itself names towers, rather than being an Overall plan. */
    const planIsTowerWise = rows.some(r => (r.scopes?.length ?? 0) > 0);

    const dateLabel = attendanceDate
        ? new Date(attendanceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        : '';

    return (
        <Section
            id={id}
            title={title}
            caption={caption}
            icon={icon}
            accent={accent}
            badge={
                <span className="flex items-center gap-1.5">
                    {/* Say how the plan was written, so a tower-wise plan is not
                        mistaken for an Overall one at a glance. */}
                    {planIsTowerWise && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5">
                            Planned tower-wise
                        </span>
                    )}
                    {totalActual > 0 && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5">
                            {totalActual} on site
                        </span>
                    )}
                </span>
            }
            actions={readOnly ? undefined : (
                <>
                    <ToolButton
                        onClick={onFillFromAttendance}
                        icon={<Sparkles size={13} />}
                        variant="accent"
                        disabled={attendanceLoading || matchable === 0}
                        disabledReason={
                            attendanceLoading
                                ? 'Loading attendance…'
                                : `No ${unitLabel} row matches an attendance record for ${dateLabel}`
                        }
                    >
                        Re-fill from attendance
                    </ToolButton>
                    <ToolButton onClick={addRow} icon={<Plus size={13} />}>Add row</ToolButton>
                </>
            )}
        >
            {/* The counts arrive already filled from the day's attendance — the
                button is for putting them back after an edit, not for getting
                them in the first place. Saying so stops people hunting for it. */}
            {prefilled > 0 && (
                <div className="flex items-start gap-2 px-3 py-2 bg-blue-50/60 border border-blue-200 -mt-1">
                    <Sparkles size={13} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-900">
                        {prefilled} of {rows.length} row{rows.length === 1 ? '' : 's'} already filled from
                        attendance for {dateLabel}. Change anything that does not match what you saw.
                    </p>
                </div>
            )}

            {rows.length === 0 ? (
                <EmptyRow
                    icon={<Users size={36} strokeWidth={1} />}
                    message={`No ${unitLabel} planned for this day`}
                    hint={`Add a row to report ${unitLabel} that were on site anyway.`}
                />
            ) : (
                <div className="border border-slate-200 overflow-x-auto">
                    <div className="grid grid-cols-[1.8fr_0.7fr_0.9fr_0.7fr_auto] min-w-[640px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                        <div className={headCls}>{nameKey === 'role' ? 'Designation' : 'Category'}</div>
                        <div className={`${headCls} text-center`}>Planned</div>
                        <div className={`${headCls} text-center`}>On site</div>
                        <div className={`${headCls} text-center`}>Variance</div>
                        <div className="w-16" />
                    </div>

                    <div className="divide-y divide-slate-100">
                        {rows.map((row, i) => {
                            const key = String(row.id ?? i);
                            const name = nameOf(row);
                            const planned = Number(row.planned) || 0;
                            const actual = Number(row.actual) || 0;
                            const variance = actual - planned;
                            const recorded = attendance.get(norm(name));
                            const splitTotal = Object.values(row.split || {}).reduce((s, n) => s + (Number(n) || 0), 0);
                            // A plan written tower-wise carries its own scopes; anything
                            // else falls back to the site's towers as optional detail.
                            const planIsTowerWise = Boolean(row.scopes && row.scopes.length > 0);
                            const rowScopes = planIsTowerWise ? row.scopes! : scopes;
                            // Open by default when the plan *is* tower-wise. It used to
                            // start collapsed regardless, so a tower-wise plan looked
                            // like an Overall-only form and the breakdown went unseen.
                            // An explicit collapse still wins.
                            const isOpen = expanded[key] ?? planIsTowerWise;
                            const unallocated = actual - splitTotal;

                            return (
                                <div key={key}>
                                    <div className="grid grid-cols-[1.8fr_0.7fr_0.9fr_0.7fr_auto] min-w-[640px] gap-3 px-4 py-2 items-center group hover:bg-slate-50/60 transition-colors">
                                        <div className="min-w-0">
                                            {row.is_manual ? (
                                                <input
                                                    type="text"
                                                    value={name}
                                                    disabled={readOnly}
                                                    onChange={e => patch(i, { [nameKey]: e.target.value, designation: e.target.value })}
                                                    placeholder={namePlaceholder}
                                                    className={inputCls}
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-xs font-semibold text-slate-800 truncate">{name}</span>
                                                    {row.actual_source === 'attendance' && (
                                                        <span title={`Prefilled from attendance for ${dateLabel}`} className="text-blue-500 flex-shrink-0">
                                                            <Sparkles size={11} />
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {recorded !== undefined && recorded !== actual && (
                                                <p className="text-[10px] text-amber-600 mt-0.5">
                                                    Attendance says {recorded} on {dateLabel}
                                                </p>
                                            )}
                                        </div>

                                        <div className="text-center">
                                            <span className="text-xs font-semibold text-slate-500 tabular-nums">
                                                {planned || <span className="text-slate-300">—</span>}
                                            </span>
                                            {/* A tower-wise plan says where the people were meant to be. */}
                                            {planScopeLabel(row) && (
                                                <p className="text-[9px] text-slate-400 truncate mt-0.5" title={planScopeLabel(row)}>
                                                    {planScopeLabel(row)}
                                                </p>
                                            )}
                                        </div>

                                        <input
                                            type="number"
                                            min="0"
                                            disabled={readOnly}
                                            value={row.actual ?? ''}
                                            onWheel={e => (e.currentTarget as HTMLInputElement).blur()}
                                            onChange={e => patch(i, { actual: Math.max(0, parseInt(e.target.value) || 0) })}
                                            placeholder="0"
                                            className={numCls}
                                        />

                                        <div className={`text-center text-xs font-semibold tabular-nums ${!row.actual && row.actual !== 0 ? 'text-slate-300'
                                            : variance === 0 ? 'text-slate-400'
                                                : variance > 0 ? 'text-emerald-600' : 'text-rose-600'
                                            }`}>
                                            {row.actual === null || row.actual === undefined
                                                ? '—'
                                                : `${variance > 0 ? '+' : ''}${variance}`}
                                        </div>

                                        <div className="flex items-center w-16">
                                            {rowScopes.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setExpanded(p => ({ ...p, [key]: !isOpen }))}
                                                    title={planIsTowerWise
                                                        ? 'Planned tower-wise — show the breakdown'
                                                        : 'Split across towers and areas (optional)'}
                                                    className={`w-8 p-1.5 transition-colors ${splitTotal > 0 || planIsTowerWise ? 'text-slate-700' : 'text-slate-300 hover:text-slate-700'}`}
                                                >
                                                    <ChevronDown size={14} className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                                                </button>
                                            )}
                                            {row.is_manual && !readOnly && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(i)}
                                                    className="w-8 p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {isOpen && rowScopes.length > 0 && (
                                        <div className="pl-8 pr-4 pb-3 bg-slate-50/40">
                                            <div className="flex items-center justify-between mb-2 gap-3">
                                                <span className={headCls}>
                                                    {planIsTowerWise
                                                        ? 'Planned tower-wise — record what worked where'
                                                        : 'Split across towers and areas — optional'}
                                                </span>
                                                <span className={`text-[10px] font-semibold tabular-nums whitespace-nowrap ${splitTotal > actual ? 'text-rose-600'
                                                    : unallocated > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                    {splitTotal} of {actual} placed
                                                    {splitTotal > actual
                                                        ? ' · more than reported'
                                                        : unallocated > 0 ? ` · ${unallocated} unallocated` : ''}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                                {rowScopes.map(scope => {
                                                    // What the plan asked for here, so the split is guided by
                                                    // the plan rather than guessed at.
                                                    const plannedHere = row.planned_by_scope?.[scope];
                                                    return (
                                                        <label key={scope} className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-semibold text-slate-400 truncate">
                                                                {scope}
                                                                {plannedHere !== undefined && (
                                                                    <span className="text-slate-300"> · plan {plannedHere}</span>
                                                                )}
                                                            </span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                disabled={readOnly}
                                                                value={row.split?.[scope] ?? ''}
                                                                onWheel={e => (e.currentTarget as HTMLInputElement).blur()}
                                                                onChange={e => setSplit(i, scope, Math.max(0, parseInt(e.target.value) || 0))}
                                                                placeholder={plannedHere !== undefined ? String(plannedHere) : '0'}
                                                                className={numCls}
                                                            />
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2">
                                                The site total above is what gets saved — this breakdown is extra detail.
                                                Attendance is taken at the gate, so only you know where people actually worked.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-[1.8fr_0.7fr_0.9fr_0.7fr_auto] min-w-[640px] gap-3 px-4 py-3 bg-slate-50 border-t border-slate-200 items-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Total {unitLabel}
                        </div>
                        <div className="text-center text-sm font-semibold text-slate-900 tabular-nums">{totalPlanned}</div>
                        <div className="text-center text-sm font-semibold text-slate-900 tabular-nums">{totalActual}</div>
                        <div className={`text-center text-sm font-semibold tabular-nums ${totalActual - totalPlanned >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {totalActual - totalPlanned > 0 ? '+' : ''}{totalActual - totalPlanned}
                        </div>
                        <div className="w-16" />
                    </div>
                </div>
            )}
        </Section>
    );
}

/** Applies a cumulative head-count map onto rows, matching on name. */
export function fillFromAttendance(
    rows: DeploymentRow[],
    nameKey: 'role' | 'type',
    attendance: Map<string, number>,
    unitLabel: string
): DeploymentRow[] | null {
    const norm = (v: any) => String(v ?? '').trim().toLowerCase();
    let matched = 0;
    const next = rows.map(r => {
        const hit = attendance.get(norm(r[nameKey] || r.designation || r.name));
        if (hit === undefined) return r;
        matched++;
        return { ...r, actual: hit, actual_source: 'attendance' };
    });
    if (matched === 0) {
        toast.error(`No ${unitLabel} row matched an attendance record`);
        return null;
    }
    toast.success(`Filled ${matched} row${matched === 1 ? '' : 's'} from attendance`);
    return next;
}
