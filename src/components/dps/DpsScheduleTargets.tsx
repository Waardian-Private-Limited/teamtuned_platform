"use client";

/**
 * Schedule targets on a daily report.
 *
 * Only what is actually owed: a milestone dated to the reported day, or one
 * whose date has passed without it being achieved. Everything else is noise on
 * a morning form — listing every floor of every tower buried the two that
 * mattered, and a milestone that has already been given a later target date is
 * re-planned, not overdue, so it drops out rather than being asked about again.
 *
 * The full list is still one click away, read-only, for context.
 */

import React from 'react';
import { Clock, CheckCircle2, CalendarClock, ListChecks, X } from 'lucide-react';
import { Section, ToolButton, EmptyRow, inputCls, headCls } from './DpsUi';

const baseDate = (d: any) => {
    if (!d) return '';
    if (typeof d === 'string') return d.substring(0, 10);
    try {
        const obj = new Date(d);
        if (!isNaN(obj.getTime())) return obj.toISOString().substring(0, 10);
    } catch (_) { }
    return '';
};

const pretty = (d: any) => {
    const iso = baseDate(d);
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATE_STYLES: Record<string, string> = {
    due: 'bg-blue-100 text-blue-700',
    overdue: 'bg-rose-100 text-rose-700',
    upcoming: 'bg-slate-100 text-slate-500',
    done: 'bg-emerald-100 text-emerald-700',
    undated: 'bg-amber-100 text-amber-700'
};

export function ScheduleTargets({
    rows, setRows, allTargets, summary, reportDate, readOnly
}: {
    /** What is due or overdue — the only rows the filler answers for. */
    rows: any[];
    setRows: (rows: any[]) => void;
    /** Every milestone in the plan, for the read-only "show all" view. */
    allTargets: any[];
    summary?: { due: number; overdue: number; upcoming: number; done: number; total: number };
    reportDate: string;
    readOnly?: boolean;
}) {
    const [showAll, setShowAll] = React.useState(false);

    const patch = (item: any, next: any) => {
        const i = rows.findIndex(r => r === item);
        if (i < 0) return;
        const copy = [...rows];
        copy[i] = { ...copy[i], ...next };
        setRows(copy);
    };

    const overdueCount = rows.filter(r => r.state === 'overdue').length;
    const dueCount = rows.filter(r => r.state !== 'overdue').length;

    /**
     * Pull a milestone that is not yet due onto the form, marked achieved.
     *
     * Work sometimes finishes early, and there was no way to say so: upcoming
     * milestones are deliberately kept off the main list, so without this the
     * only way to record one was to wait for its date to arrive. It is claimed
     * from the full list on demand rather than rendered there by default.
     */
    const markAheadOfSchedule = (target: any) => {
        if (rows.some(r => String(r.id) === String(target.id))) return;
        setRows([
            ...rows,
            {
                ...target,
                achieved: true,
                achieved_date: reportDate,
                previously_achieved: false,
                ahead_of_schedule: true,
                revised_date: '',
                missed_reason: ''
            }
        ]);
        setShowAll(false);
    };

    const claimed = (id: any) => rows.some(r => String(r.id) === String(id));

    return (
        <>
            <Section
                id="dpr-targets"
                title="Schedule Targets"
                caption="Milestones due on this day, plus anything still outstanding from before."
                icon={<Clock size={16} />}
                accent="violet"
                badge={
                    rows.length > 0 ? (
                        <span className="flex items-center gap-1.5">
                            {dueCount > 0 && (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5">
                                    {dueCount} due
                                </span>
                            )}
                            {overdueCount > 0 && (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5">
                                    {overdueCount} overdue
                                </span>
                            )}
                        </span>
                    ) : undefined
                }
                actions={
                    <ToolButton onClick={() => setShowAll(true)} icon={<ListChecks size={13} />}>
                        View all targets{summary ? ` (${summary.total})` : ''}
                    </ToolButton>
                }
            >
                {rows.length === 0 ? (
                    <div className="py-10 flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 text-center">
                        <CheckCircle2 size={32} strokeWidth={1} className="text-emerald-300" />
                        <p className="text-sm font-semibold text-slate-600">No schedule target due today</p>
                        <p className="text-xs text-slate-400 max-w-md">
                            {summary && summary.done > 0
                                ? `${summary.done} of ${summary.total} milestone${summary.total === 1 ? '' : 's'} already achieved. Nothing is overdue.`
                                : 'Nothing is dated to this day and nothing is overdue.'}
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowAll(true)}
                            className="mt-2 text-xs font-semibold text-slate-700 underline underline-offset-4 hover:text-slate-900"
                        >
                            View all targets
                        </button>
                    </div>
                ) : (
                    <div className="border border-slate-200 overflow-x-auto">
                        <div className="grid grid-cols-[1.8fr_1fr_1.2fr_1.6fr] min-w-[720px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                            <div className={headCls}>Tower / Area</div>
                            <div className={headCls}>Target</div>
                            <div className={headCls}>Achieved?</div>
                            <div className={headCls}>Detail</div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {rows.map((item, i) => {
                                const isOverdue = item.state === 'overdue';
                                return (
                                    <div key={item.id ?? i} className={isOverdue && item.achieved !== true ? 'bg-rose-50/30' : ''}>
                                        <div className="grid grid-cols-[1.8fr_1fr_1.2fr_1.6fr] min-w-[720px] gap-3 px-4 py-3 items-start">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                                    {item.tower_name || 'Site'}
                                                </p>
                                                <p className="text-sm font-semibold text-slate-900 truncate">{item.floor || '—'}</p>
                                                {item.purpose && (
                                                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.purpose}</p>
                                                )}
                                            </div>

                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-slate-700 tabular-nums">
                                                    {pretty(item.planned_target_date)}
                                                </p>
                                                <span className={`inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${item.ahead_of_schedule ? 'bg-emerald-100 text-emerald-700' : STATE_STYLES[item.state] || STATE_STYLES.upcoming}`}>
                                                    {item.ahead_of_schedule ? 'Ahead of schedule' : isOverdue ? 'Overdue' : 'Due today'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {(['yes', 'no'] as const).map(choice => {
                                                    const active = choice === 'yes' ? item.achieved === true : item.achieved === false;
                                                    return (
                                                        <button
                                                            key={choice}
                                                            type="button"
                                                            disabled={readOnly || item.previously_achieved}
                                                            onClick={() => patch(item, choice === 'yes'
                                                                ? {
                                                                    achieved: true,
                                                                    // Always this report's own day.
                                                                    achieved_date: item.previously_achieved ? item.achieved_date : reportDate,
                                                                    revised_date: '',
                                                                    missed_reason: ''
                                                                }
                                                                : { achieved: false, achieved_date: null })}
                                                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-colors disabled:opacity-50 ${active
                                                                ? choice === 'yes'
                                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                                    : 'bg-rose-600 text-white border-rose-600'
                                                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-900 hover:text-slate-700'
                                                                }`}
                                                        >
                                                            {choice}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="min-w-0">
                                                {item.achieved === true && (
                                                    // Not editable: this form reports on one day, so an
                                                    // achievement recorded here happened on that day. A free
                                                    // date field invited a milestone to be back-dated into a
                                                    // day some other report already answered for.
                                                    <div className="flex flex-col gap-1">
                                                        <span className={headCls}>Achieved on</span>
                                                        <div className="px-2.5 py-2 border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 tabular-nums">
                                                            {pretty(item.previously_achieved ? item.achieved_date : reportDate)}
                                                        </div>
                                                        {item.previously_achieved && (
                                                            <span className="text-[10px] text-slate-400">Recorded earlier</span>
                                                        )}
                                                    </div>
                                                )}
                                                {item.achieved !== true && item.achieved !== false && (
                                                    <p className="text-[11px] text-slate-400 pt-1">Answer to continue</p>
                                                )}
                                            </div>
                                        </div>

                                        {item.achieved === false && (
                                            <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3 bg-rose-50/40">
                                                <label className="flex flex-col gap-1">
                                                    <span className={`${headCls} ${!item.revised_date ? 'text-rose-600' : ''}`}>
                                                        Next target date *
                                                    </span>
                                                    <input
                                                        type="date"
                                                        disabled={readOnly}
                                                        value={item.revised_date || ''}
                                                        onChange={e => patch(item, { revised_date: e.target.value })}
                                                        className={`${inputCls} ${!item.revised_date ? 'border-rose-300' : ''}`}
                                                    />
                                                </label>
                                                <label className="flex flex-col gap-1">
                                                    <span className={`${headCls} ${!item.missed_reason ? 'text-rose-600' : ''}`}>
                                                        Reason for delay *
                                                    </span>
                                                    <input
                                                        type="text"
                                                        disabled={readOnly}
                                                        value={item.missed_reason || ''}
                                                        onChange={e => patch(item, { missed_reason: e.target.value })}
                                                        placeholder="Why did this slip?"
                                                        className={`${inputCls} ${!item.missed_reason ? 'border-rose-300' : ''}`}
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </Section>

            {showAll && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-200 shadow-2xl">
                        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">All schedule targets</h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    The whole milestone plan for this department. Only due and overdue
                                    milestones are asked about on the form — mark an upcoming one done
                                    here if it finished early.
                                </p>
                            </div>
                            <button onClick={() => setShowAll(false)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {summary && (
                            <div className="grid grid-cols-4 gap-px bg-slate-100 border-b border-slate-200">
                                {([
                                    ['Due today', summary.due, 'text-blue-600'],
                                    ['Overdue', summary.overdue, 'text-rose-600'],
                                    ['Upcoming', summary.upcoming, 'text-slate-500'],
                                    ['Achieved', summary.done, 'text-emerald-600']
                                ] as const).map(([label, value, tone]) => (
                                    <div key={label} className="bg-white px-4 py-3">
                                        <p className={headCls}>{label}</p>
                                        <p className={`text-lg font-semibold tabular-nums mt-0.5 ${tone}`}>{value}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto">
                            {allTargets.length === 0 ? (
                                <div className="p-8">
                                    <EmptyRow
                                        icon={<CalendarClock size={32} strokeWidth={1} />}
                                        message="No milestones in this plan"
                                        hint="Milestones come from the towers and levels set in Site Config."
                                    />
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {allTargets.map((t, i) => (
                                        <div key={t.id ?? i} className="px-5 py-3 flex items-center gap-4">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                                    {t.tower_name || 'Site'}
                                                </p>
                                                <p className="text-sm font-semibold text-slate-900 truncate">
                                                    {t.floor}{t.purpose ? ` — ${t.purpose}` : ''}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0 flex items-center gap-3">
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-600 tabular-nums">
                                                        {pretty(t.planned_target_date)}
                                                    </p>
                                                    <span className={`inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${STATE_STYLES[t.state] || STATE_STYLES.upcoming}`}>
                                                        {t.state === 'done' ? 'Achieved' : t.state}
                                                    </span>
                                                </div>
                                                {/* Finished early? Claim it here rather than waiting for
                                                    its date to come round. */}
                                                {!readOnly && (t.state === 'upcoming' || t.state === 'undated') && (
                                                    claimed(t.id) ? (
                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 px-2">
                                                            On form
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => markAheadOfSchedule(t)}
                                                            className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-slate-200 text-slate-600 hover:border-emerald-600 hover:text-emerald-600 transition-colors whitespace-nowrap"
                                                        >
                                                            Mark done
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-slate-200 flex justify-end">
                            <button
                                onClick={() => setShowAll(false)}
                                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
