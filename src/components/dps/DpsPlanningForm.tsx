"use client";

import React from 'react';
import {
    HardHat,
    Plus,
    Trash2,
    RefreshCw,
    Clock,
    Wrench,
    Layers,
    History as HistoryIcon,
    Calendar,
    Users,
    Sparkles,
    Check,
    X,
    Search,
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronDown,
    Info
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import {
    ACCENTS, Section, SegmentedToggle, ToolButton, Metric, EmptyRow,
    inputCls, numCls, headCls, fmt
} from './DpsUi';
import type { Accent } from './DpsUi';

/* ────────────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────────────── */

type Mode = 'Date-wise' | 'Monthly';
type Scope = 'Tower-wise' | 'Overall';

/** One suggestible resource row from /planning-resources. */
interface ResourceRow {
    key: string;
    label: string;
    sublabel?: string;
    assigned: number;
    present_today: number;
    avg_present: number;
    suggested: number;
}

interface PlanningResources {
    meta: { date: string; window: { from: string; to: string; days: number } };
    departments: any[];
    staff: { byDepartment: any[]; byDesignation: any[]; configuredRoles: any[] };
    labour: { byCategory: any[]; configuredTypes: any[]; contractors: any[] };
    equipments: { name: string; source: string }[];
    concrete: { total_planned: number; cumulative_till_date: number };
}

interface ConcreteTracking {
    schedule: any;
    days: {
        period: string;
        planned: number;
        achieved: number;
        variance: number;
        cumulative_planned: number;
        cumulative_achieved: number;
    }[];
    totals: { planned: number; achieved: number; variance: number; completion_percent: number } | null;
}

interface DpsPlanningFormProps {
    isEditMode: boolean;
    isExpired: () => boolean;
    scheduleValidFrom: string;
    setScheduleValidFrom: (v: string) => void;
    scheduleValidTill: string;
    setScheduleValidTill: (v: string) => void;
    getValidityDuration: () => number;
    concreteMode: Mode;
    setConcreteMode: (v: Mode) => void;
    concreteScope: Scope;
    setConcreteScope: (v: Scope) => void;
    handleGeneratePlanning: () => void;
    concretePlanning: any[];
    setConcretePlanning: (v: any) => void;
    /** Cumulative planned per period, keyed by the period label the grid uses. */
    concreteCumulative: Record<string, number>;
    setConcreteCumulative: (v: any) => void;
    addRecord: (setter: any, baseItem: any) => void;
    removeRecord: (setter: any, id: any) => void;
    updateRecord: (setter: any, id: any, field: string, value: any) => void;
    siteConfig: any;
    staffMode: Mode;
    setStaffMode: (v: Mode) => void;
    staffScope: Scope;
    setStaffScope: (v: Scope) => void;
    staffPlanning: any[];
    setStaffPlanning: (v: any) => void;
    labourMode: Mode;
    setLabourMode: (v: Mode) => void;
    labourScope: Scope;
    setLabourScope: (v: Scope) => void;
    labourPlanning: any[];
    setLabourPlanning: (v: any) => void;
    monthlySchedules: any[];
    setMonthlySchedules: (v: any) => void;
    equipments: any[];
    setEquipments: (v: any) => void;
    equipmentList: string[];
    equipmentMode: Mode;
    setEquipmentMode: (v: Mode) => void;
    equipmentScope: Scope;
    setEquipmentScope: (v: Scope) => void;
    latestStats?: {
        todayAchieved: number;
        monthlyPlanned: number;
        monthlyAchieved: number;
        totalPlanned: number;
        totalAchieved: number;
    };
    onViewTargetHistory?: (id: string | number) => void;
    readOnly?: boolean;
    /** Enables the attendance-driven auto-fill and live concrete tracking. */
    siteId?: string | number;
    scheduleId?: number | null;
}

/* ────────────────────────────────────────────────────────────────────────────
   Small UI primitives — squared, low-chrome, one shared visual language
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Empties a section in one go.
 *
 * Auto-fill writes a row per resource per period, so a wrong pick can leave
 * hundreds of rows to delete one at a time. Confirms in place rather than
 * through a modal — two clicks, and it backs out on its own if you walk away.
 */
function ClearAllButton({ count, label, onClear }: {
    count: number;
    label: string;
    onClear: () => void;
}) {
    const [armed, setArmed] = React.useState(false);

    React.useEffect(() => {
        if (!armed) return;
        const t = setTimeout(() => setArmed(false), 4000);
        return () => clearTimeout(t);
    }, [armed]);

    if (count === 0) return null;

    return (
        <ToolButton
            onClick={() => {
                if (!armed) { setArmed(true); return; }
                onClear();
                setArmed(false);
                toast.success(`Cleared ${count} ${label} row${count === 1 ? '' : 's'}`);
            }}
            icon={<Trash2 size={13} />}
            variant={armed ? 'danger' : 'ghost'}
        >
            {armed ? `Clear ${count}?` : 'Clear all'}
        </ToolButton>
    );
}


/* ────────────────────────────────────────────────────────────────────────────
   Auto-fill drawer

   The planner's slowest step was retyping the same roles, trades and machines
   every cycle. Attendance already knows who actually turns up, so the drawer
   lists each resource with its real head-count and a suggested planned figure
   (the 30-day average, rounded up, never below today's actual). Everything is
   pre-ticked and every number stays editable — this proposes, it does not decide.
   ──────────────────────────────────────────────────────────────────────────── */

function AutoFillDrawer({
    open, onClose, title, caption, accent, rows, windowLabel, loading, onApply, applyLabel, allowCustom, customPlaceholder
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    caption: string;
    accent: Accent;
    rows: ResourceRow[];
    windowLabel?: string;
    loading: boolean;
    onApply: (picked: { row: ResourceRow; count: number }[]) => void;
    applyLabel: string;
    allowCustom?: boolean;
    customPlaceholder?: string;
}) {
    const a = ACCENTS[accent];
    const [picked, setPicked] = React.useState<Record<string, number>>({});
    const [query, setQuery] = React.useState('');
    const [custom, setCustom] = React.useState<ResourceRow[]>([]);
    const [customName, setCustomName] = React.useState('');

    // Everything starts ticked at its suggestion — the common case is "take all".
    React.useEffect(() => {
        if (!open) return;
        setQuery('');
        setCustom([]);
        setCustomName('');
        const initial: Record<string, number> = {};
        rows.forEach(r => { initial[r.key] = r.suggested; });
        setPicked(initial);
    }, [open, rows]);

    if (!open) return null;

    const allRows = [...rows, ...custom];
    const visible = query.trim()
        ? allRows.filter(r => r.label.toLowerCase().includes(query.toLowerCase().trim()))
        : allRows;

    const toggle = (row: ResourceRow) => {
        setPicked(prev => {
            const next = { ...prev };
            if (next[row.key] !== undefined) delete next[row.key];
            else next[row.key] = row.suggested;
            return next;
        });
    };

    const setCount = (key: string, count: number) => {
        setPicked(prev => ({ ...prev, [key]: Math.max(0, count) }));
    };

    const addCustom = () => {
        const name = customName.trim();
        if (!name) return;
        if (allRows.some(r => r.label.toLowerCase() === name.toLowerCase())) {
            toast.error(`"${name}" is already in the list`);
            return;
        }
        const row: ResourceRow = {
            key: `custom:${name}`,
            label: name,
            sublabel: 'Added manually',
            assigned: 0, present_today: 0, avg_present: 0, suggested: 1
        };
        setCustom(prev => [...prev, row]);
        setPicked(prev => ({ ...prev, [row.key]: 1 }));
        setCustomName('');
    };

    const pickedCount = Object.keys(picked).length;
    const totalHeads = Object.values(picked).reduce((s, n) => s + (Number(n) || 0), 0);

    const apply = () => {
        const out = allRows
            .filter(r => picked[r.key] !== undefined)
            .map(r => ({ row: r, count: Number(picked[r.key]) || 0 }));
        if (out.length === 0) {
            toast.error('Nothing selected');
            return;
        }
        onApply(out);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/40 backdrop-blur-sm">
            <div className="w-full max-w-xl bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl">
                <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 ${a.soft} ${a.text} flex-shrink-0`}><Sparkles size={16} /></div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">{caption}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {windowLabel && (
                    <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                        <Info size={12} className="text-slate-400 flex-shrink-0" />
                        <p className="text-[11px] text-slate-500">{windowLabel}</p>
                    </div>
                )}

                <div className="px-5 py-3 border-b border-slate-200">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Filter..."
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 text-sm outline-none focus:border-slate-900 transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-5 space-y-2">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-slate-100 animate-pulse" />)}
                        </div>
                    ) : visible.length === 0 ? (
                        <div className="p-10">
                            <EmptyRow
                                icon={<Users size={36} strokeWidth={1} />}
                                message="Nothing to suggest yet"
                                hint="Once staff or labour are mapped to this site and start punching attendance, their counts show up here automatically."
                            />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-5 py-2 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <div className="w-4" />
                                <div className={headCls}>Resource</div>
                                <div className={`${headCls} w-14 text-center`}>Roster</div>
                                <div className={`${headCls} w-14 text-center`}>Avg</div>
                                <div className={`${headCls} w-20 text-center`}>Planned</div>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {visible.map(row => {
                                    const isPicked = picked[row.key] !== undefined;
                                    return (
                                        <div
                                            key={row.key}
                                            className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-5 py-3 items-center transition-colors ${isPicked ? a.soft : 'hover:bg-slate-50'}`}
                                        >
                                            <button
                                                onClick={() => toggle(row)}
                                                className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 transition-colors ${isPicked ? `${a.bar} border-transparent` : 'border-slate-300 bg-white'}`}
                                            >
                                                {isPicked && <Check size={11} className="text-white" strokeWidth={3} />}
                                            </button>

                                            <button onClick={() => toggle(row)} className="min-w-0 text-left">
                                                <p className="text-xs font-semibold text-slate-800 truncate">{row.label}</p>
                                                {row.sublabel && <p className="text-[10px] text-slate-400 truncate mt-0.5">{row.sublabel}</p>}
                                            </button>

                                            <div className="w-14 text-center text-xs font-semibold text-slate-500 tabular-nums">{row.assigned}</div>
                                            <div className="w-14 text-center text-xs font-semibold text-slate-500 tabular-nums">{row.avg_present}</div>

                                            <input
                                                type="number"
                                                min="0"
                                                disabled={!isPicked}
                                                value={isPicked ? picked[row.key] : ''}
                                                onWheel={e => (e.currentTarget as HTMLInputElement).blur()}
                                                onChange={e => setCount(row.key, parseInt(e.target.value) || 0)}
                                                className="w-20 px-2 py-1.5 bg-white border border-slate-200 text-xs font-semibold text-center tabular-nums outline-none focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-300 transition-colors"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {allowCustom && (
                    <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 flex gap-2">
                        <input
                            value={customName}
                            onChange={e => setCustomName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                            placeholder={customPlaceholder || 'Add another...'}
                            className="flex-1 px-3 py-2 bg-white border border-slate-200 text-sm outline-none focus:border-slate-900 transition-colors"
                        />
                        <button
                            onClick={addCustom}
                            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-colors"
                        >
                            <Plus size={14} /> Add
                        </button>
                    </div>
                )}

                <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between gap-4">
                    <div className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-900 tabular-nums">{pickedCount}</span> selected
                        <span className="text-slate-300 mx-2">·</span>
                        <span className="font-semibold text-slate-900 tabular-nums">{totalHeads}</span> planned per period
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={apply}
                            disabled={pickedCount === 0}
                            className="px-5 py-2 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 transition-colors"
                        >
                            {applyLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────────────── */

const iso = (d: Date) => d.toISOString().split('T')[0];
const monthLabel = (d: Date) => d.toLocaleString('default', { month: 'long', year: 'numeric' });

/** Every period between two dates, in the granularity the section is set to. */
function periodsBetween(from: string, till: string, mode: Mode): string[] {
    if (!from || !till) return [];
    const start = new Date(from);
    const end = new Date(till);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

    const out: string[] = [];
    if (mode === 'Date-wise') {
        // UTC arithmetic: `iso()` formats from UTC, and stepping in local time
        // adds 23 or 25 hours across a DST boundary, which duplicates or skips a day.
        for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) out.push(iso(d));
    } else {
        const d = new Date(start.getFullYear(), start.getMonth(), 1);
        while (d <= end) { out.push(monthLabel(d)); d.setMonth(d.getMonth() + 1); }
    }
    // 400 rows is already past the point of a usable grid; the plan-per-period
    // sections stay bounded so a long validity cannot lock the browser up.
    return out.slice(0, 400);
}

/**
 * The period a plan row belongs to.
 *
 * In Monthly mode this is read-only: the month is a property of the plan being
 * prepared, so asking the planner to type it invites it to disagree with the
 * cycle's own dates. Date-wise rows stay editable.
 *
 * Declared at module scope on purpose — a component defined inside the form's
 * body is a fresh type on every render, which remounts this input and loses
 * focus on each keystroke.
 */
function PeriodCell({ mode, value, fallback, onChange }: {
    mode: Mode;
    value: string;
    fallback: string;
    onChange: (v: string) => void;
}) {
    if (mode === 'Monthly') {
        return (
            <div className="px-2.5 py-2 text-xs font-semibold text-slate-600 truncate" title="Set by the plan period">
                {value || fallback || '—'}
            </div>
        );
    }
    return <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} className={inputCls} />;
}

/**
 * Cumulative planned is only worth asking for when it says something the
 * Planned column does not.
 *
 * Monthly + Overall is one number for one period — its cumulative is that same
 * number, so the field would just be a second box for the figure next to it.
 * Every other combination splits the total across towers, across days, or both,
 * and the cumulative is genuinely its own figure.
 */
export const asksCumulative = (mode: Mode, scope: Scope) => !(mode === 'Monthly' && scope === 'Overall');

/**
 * The one period a Monthly plan covers: the cycle itself.
 *
 * A plan *is* a month — that is what the cycle means — so Monthly is one bucket
 * for the whole schedule, not a row per calendar month. Splitting by calendar
 * month put two rows in front of a planner whose cycle happened to straddle a
 * month boundary, asking them to divide a figure they think of as one number.
 */
export function planPeriodKey(validFrom: string, validTill: string): string {
    const from = validFrom ? new Date(validFrom) : null;
    if (!from || isNaN(from.getTime())) return '';
    const till = validTill ? new Date(validTill) : null;
    if (!till || isNaN(till.getTime())) return monthLabel(from);
    if (from.getFullYear() === till.getFullYear() && from.getMonth() === till.getMonth()) return monthLabel(from);
    return `${monthLabel(from)} — ${monthLabel(till)}`;
}

/**
 * The periods any per-period section lays out.
 *
 * Monthly is the cycle itself — a plan *is* a month, so it is one bucket, not a
 * row per calendar month. Only Date-wise walks the calendar.
 */
export function periodsForMode(validFrom: string, validTill: string, mode: Mode): string[] {
    if (mode === 'Monthly') {
        const key = planPeriodKey(validFrom, validTill);
        return key ? [key] : [];
    }
    return periodsBetween(validFrom, validTill, mode);
}

/**
 * The periods the concrete grid lays out.
 *
 * Monthly is the single cycle period; Date-wise lists only the days the planner
 * added, because concrete is not poured every day.
 */
export function concretePeriods(concretePlanning: any[], validFrom: string, validTill: string, mode: Mode): string[] {
    if (mode === 'Monthly') return periodsForMode(validFrom, validTill, mode);
    return Array.from(new Set(
        (concretePlanning || []).map(r => String(r.date || '')).filter(Boolean)
    )).sort();
}

/**
 * Where the plan's own cumulative lives inside the per-period map.
 *
 * The cycle has a cumulative target whether or not the pour has been broken
 * down into dates yet, so it cannot hang off a period. It shares the map rather
 * than taking a second column because period keys are dates or month labels and
 * can never collide with it.
 */
export const PLAN_CUMULATIVE_KEY = '__plan';

const isSet = (v: any) => v !== undefined && v !== null && (v as any) !== '';

/** Whether the plan still owes its cumulative figure. */
export function needsPlanCumulative(
    cumulative: Record<string, number>,
    mode: Mode,
    scope: Scope
): boolean {
    return asksCumulative(mode, scope) && !isSet(cumulative?.[PLAN_CUMULATIVE_KEY]);
}

/**
 * The levels a tower or area is made of, straight from Site Config.
 *
 * These strings are a contract with the backend's milestone generator, which
 * writes the identical names — so the dropdown must derive them the same way
 * rather than carrying its own hardcoded list that can drift out of step.
 */
function levelsForScope(siteConfig: any, scopeId: string): string[] {
    const id = String(scopeId ?? '').trim();
    if (!id) return [];

    const tower = (siteConfig?.towers || []).find((t: any) => String(t.id ?? '').trim() === id);
    if (tower) {
        const count = (v: any) => Number(v) || 0;
        const out: string[] = [];
        for (let i = 1; i <= count(tower.basements); i++) out.push(`Basement ${i}`);
        for (let i = 1; i <= count(tower.plinths); i++) out.push(count(tower.plinths) === 1 ? 'Plinth' : `Plinth ${i}`);
        for (let i = 1; i <= count(tower.floors); i++) out.push(`Floor ${i}`);
        for (let i = 1; i <= count(tower.terraces); i++) out.push(count(tower.terraces) === 1 ? 'Terrace' : `Terrace ${i}`);
        return out;
    }

    const area = (siteConfig?.areas || []).find((a: any) => String(a.name ?? '').trim() === id);
    if (area) return (area.subNames || []).map((sub: string) => String(sub ?? '').trim()).filter(Boolean);

    return [];
}

/** Tower and area names a plan row can be scoped to. */
function scopeNames(siteConfig: any, scope: Scope): string[] {
    if (scope === 'Overall') return ['Overall'];
    const names = [
        ...(siteConfig?.towers || []).map((t: any) => t.name),
        ...(siteConfig?.areas || []).map((a: any) => a.name)
    ].filter(Boolean);
    return names.length > 0 ? names : ['Overall'];
}

/* ────────────────────────────────────────────────────────────────────────────
   Daily concrete planner

   Concrete is the number the whole DPR hangs off, so it gets its own grid: one
   row per day of validity (or per month), the plan on the left and — once daily
   forms come back — what was actually poured beside it, with the running gap.
   ──────────────────────────────────────────────────────────────────────────── */

function ConcreteDailyGrid({
    mode, scope, siteConfig, concretePlanning, setConcretePlanning,
    concreteCumulative, setConcreteCumulative, validFrom, validTill, tracking
}: {
    mode: Mode;
    scope: Scope;
    siteConfig: any;
    concretePlanning: any[];
    setConcretePlanning: (v: any) => void;
    /** Cumulative planned per period, keyed by the period label the grid uses. */
    concreteCumulative: Record<string, number>;
    setConcreteCumulative: (v: any) => void;
    validFrom: string;
    validTill: string;
    tracking: ConcreteTracking | null;
}) {
    const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

    const towers = React.useMemo(() => scopeNames(siteConfig, scope), [siteConfig, scope]);

    // Group the flat plan array into the periods the grid renders.
    const byPeriod = React.useMemo(() => {
        const map = new Map<string, any[]>();
        concretePlanning.forEach(row => {
            const key = String(row.date || '');
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(row);
        });
        return map;
    }, [concretePlanning]);

    const achievedByPeriod = React.useMemo(() => {
        const map = new Map<string, number>();
        (tracking?.days || []).forEach(d => map.set(d.period, d.achieved));
        return map;
    }, [tracking]);

    /**
     * Which periods the grid shows.
     *
     * Monthly still enumerates the window: every month in a cycle has a figure.
     * Date-wise does not — concrete is not poured every day, and generating a
     * row per calendar day buried the handful of real pour dates in a month of
     * empty ones. Date-wise lists only the dates the planner has added, plus any
     * day a daily report actually recorded a pour on, so an unplanned pour is
     * still visible rather than silently dropped.
     */
    const periods = React.useMemo(() => {
        const base = concretePeriods(concretePlanning, validFrom, validTill, mode);
        if (mode === 'Monthly') return base;
        // A day a report recorded a pour on but nobody planned still belongs on
        // screen — otherwise it counts in the totals while being invisible.
        const poured = (tracking?.days || []).filter(d => d.achieved > 0).map(d => d.period);
        return Array.from(new Set([...base, ...poured])).sort();
    }, [concretePlanning, validFrom, validTill, mode, tracking]);

    const showCumulative = asksCumulative(mode, scope);
    // Columns hold their shape and the container scrolls; squashed
    // numeric columns are unreadable in a way a scrollbar is not.
    const gridCls = 'grid-cols-[minmax(120px,1.2fr)_1fr_1fr_auto] min-w-[560px]';

    // Monthly is one bucket now. Rows written when it meant "one per calendar
    // month" are folded onto the cycle's single period — summed per scope, so a
    // two-month plan keeps its total instead of showing only the first month's.
    const monthlyKey = mode === 'Monthly' ? concretePeriods([], validFrom, validTill, 'Monthly')[0] : '';
    React.useEffect(() => {
        if (mode !== 'Monthly' || !monthlyKey) return;
        const strays = concretePlanning.filter(r => r.date && String(r.date) !== monthlyKey);
        if (strays.length === 0) return;
        setConcretePlanning((prev: any[]) => {
            const merged = new Map<string, any>();
            prev.forEach(row => {
                const tower = row.towerId || 'Overall';
                const existing = merged.get(tower);
                if (existing) {
                    existing.concretePlanned =
                        (Number(existing.concretePlanned) || 0) + (Number(row.concretePlanned) || 0);
                } else {
                    merged.set(tower, { ...row, date: monthlyKey });
                }
            });
            return Array.from(merged.values());
        });
    }, [mode, monthlyKey, concretePlanning]);

    /** Next unused day inside the window, so "Add date" lands somewhere sensible. */
    const nextFreeDate = () => {
        const taken = new Set(periods);
        const window = periodsBetween(validFrom, validTill, 'Date-wise');
        const free = window.find(d => !taken.has(d));
        return free || validFrom || iso(new Date());
    };

    const addPeriod = () => {
        const date = nextFreeDate();
        if (periods.includes(date)) {
            toast.error('Every day in the plan period already has a row');
            return;
        }
        setConcretePlanning((prev: any[]) => [
            ...prev,
            { id: `${date}-${towers[0] || 'Overall'}-${Date.now()}`, date, towerId: towers[0] || 'Overall', concretePlanned: '' }
        ]);
    };

    const removePeriod = (period: string) => {
        setConcretePlanning((prev: any[]) => prev.filter(r => String(r.date) !== period));
    };

    /** Moving a row's date moves every tower's cell for that date with it. */
    const renamePeriod = (from: string, to: string) => {
        if (!to || to === from) return;
        if (periods.includes(to)) {
            toast.error('That date is already in the plan');
            return;
        }
        setConcretePlanning((prev: any[]) =>
            prev.map(r => (String(r.date) === from ? { ...r, date: to } : r))
        );
    };

    const setCell = (period: string, tower: string, value: number) => {
        setConcretePlanning((prev: any[]) => {
            const idx = prev.findIndex(r => String(r.date) === period && (r.towerId || 'Overall') === tower);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], concretePlanned: value };
                return next;
            }
            return [...prev, {
                id: `${period}-${tower}-${Date.now()}`,
                date: period,
                towerId: tower,
                concretePlanned: value
            }];
        });
    };

    const cellValue = (period: string, tower: string) => {
        const row = (byPeriod.get(period) || []).find(r => (r.towerId || 'Overall') === tower);
        return row?.concretePlanned ?? '';
    };

    /**
     * Cumulative planned for a period.
     *
     * The running sum of what is in this grid is only ever the cumulative for
     * this plan — the real figure carries work poured before the cycle started.
     * So the running sum is the default the input shows, and the planner can
     * state the true number over it. One figure per period whatever the scope:
     * in Monthly that is simply the month's overall cumulative.
     */
    const setCumulative = (period: string, value: string) => {
        setConcreteCumulative((prev: Record<string, number>) => {
            const next = { ...prev };
            if (value === '') delete next[period];
            else next[period] = Math.max(0, parseFloat(value) || 0);
            return next;
        });
    };

    const periodTotal = (period: string) =>
        (byPeriod.get(period) || []).reduce((s, r) => s + (Number(r.concretePlanned) || 0), 0);

    /** Copy a period's numbers forward to every later period — the usual pattern
     *  is a steady pour rate, so typing it once should be enough. */
    const fillDown = (fromPeriod: string) => {
        const idx = periods.indexOf(fromPeriod);
        if (idx < 0) return;
        const source = towers.map(t => ({ tower: t, value: Number(cellValue(fromPeriod, t)) || 0 }));
        if (source.every(s => s.value === 0)) {
            toast.error('Enter a value on this row first');
            return;
        }
        setConcretePlanning((prev: any[]) => {
            const next = [...prev];
            periods.slice(idx + 1).forEach(period => {
                source.forEach(({ tower, value }) => {
                    const i = next.findIndex(r => String(r.date) === period && (r.towerId || 'Overall') === tower);
                    if (i >= 0) next[i] = { ...next[i], concretePlanned: value };
                    else next.push({ id: `${period}-${tower}-${Math.random()}`, date: period, towerId: tower, concretePlanned: value });
                });
            });
            return next;
        });
        toast.success(`Copied to ${periods.length - idx - 1} following ${mode === 'Date-wise' ? 'days' : 'months'}`);
    };

    const hasWindow = Boolean(validFrom && validTill);

    // Computed before the early returns: the plan's own cumulative is asked for
    // whether or not any pour dates exist yet, so its default has to exist too.
    /** What this plan alone adds up to — the default the plan cumulative offers. */
    const plannedTotal = periods.reduce((sum, p) => sum + periodTotal(p), 0);

    const planCumulative = concreteCumulative[PLAN_CUMULATIVE_KEY];

    /**
     * The cycle's cumulative target.
     *
     * Separate from the per-period column because it is a property of the plan,
     * not of any one day: a plan with no pour dates broken out yet still has a
     * number it is working towards.
     *
     * Held as an element rather than an inner component: a component declared in
     * this body is a new type on every render, which would remount the input and
     * drop focus on each keystroke.
     */
    const planCumulativeStrip = !showCumulative ? null : (
        <div className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border ${planCumulative === undefined ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-slate-50/60'}`}>
            <div className="min-w-0 flex-1">
                <p className={headCls}>
                    Cumulative Planned for this plan <span className="text-rose-500">*</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                    Total concrete planned by the end of this cycle, including everything poured before it.
                </p>
            </div>
            <input
                type="number"
                min="0"
                value={planCumulative ?? ''}
                placeholder={plannedTotal > 0 ? fmt(plannedTotal) : '0'}
                onWheel={e => (e.currentTarget as HTMLInputElement).blur()}
                onChange={e => setCumulative(PLAN_CUMULATIVE_KEY, e.target.value)}
                className="w-full sm:w-40 px-3 py-2 bg-white border border-slate-200 text-sm font-semibold text-slate-800 text-center tabular-nums outline-none focus:border-slate-900 transition-colors"
            />
        </div>
    );

    if (!hasWindow) {
        return (
            <EmptyRow
                icon={<Calendar size={36} strokeWidth={1} />}
                message="Set the schedule validity first"
                hint="The plan needs a start and end date before pour dates can be added to it."
            />
        );
    }

    if (periods.length === 0) {
        return (
            <div className="space-y-3">
                {planCumulativeStrip}
                <EmptyRow
                    icon={<Calendar size={36} strokeWidth={1} />}
                    message="No pour dates yet"
                    hint="Add the days concrete is planned for. There is no need to cover every day of the month — only the days you actually pour."
                />
                <div className="flex justify-center">
                    <ToolButton onClick={addPeriod} icon={<Plus size={13} />} variant="accent">Add pour date</ToolButton>
                </div>
            </div>
        );
    }

    /** Running total down the Planned column. */
    let plannedRunning = 0;

    return (
        <div className="space-y-3">
        {planCumulativeStrip}
        <div className="border border-slate-200 overflow-x-auto">
            <div className={`grid ${gridCls} gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 sticky top-0 z-10`}>
                <div className={headCls}>{mode === 'Date-wise' ? 'Date' : 'Plan Period'}</div>
                <div className={`${headCls} text-center`}>Planned (m³)</div>
                <div className={`${headCls} text-center`}>Achieved</div>
                <div className="w-8" />
            </div>

            <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
                {periods.map(period => {
                    const total = periodTotal(period);
                    plannedRunning += total;
                    const achieved = achievedByPeriod.get(period);
                    const hasActual = achieved !== undefined;
                    const variance = hasActual ? achieved - total : 0;
                    const isOpen = scope === 'Tower-wise' && !collapsed[period];
                    const isToday = period === iso(new Date());

                    return (
                        <div key={period} className={isToday ? 'bg-blue-50/40' : ''}>
                            <div className={`grid ${gridCls} gap-3 px-4 py-2 items-center group`}>
                                <div className="flex items-center gap-2 min-w-0">
                                    {scope === 'Tower-wise' && (
                                        <button
                                            onClick={() => setCollapsed(p => ({ ...p, [period]: !p[period] }))}
                                            className="p-0.5 text-slate-300 hover:text-slate-700 transition-colors flex-shrink-0"
                                        >
                                            <ChevronDown size={14} className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                                        </button>
                                    )}
                                    {mode === 'Date-wise' ? (
                                        <input
                                            type="date"
                                            value={period}
                                            min={validFrom || undefined}
                                            max={validTill || undefined}
                                            onChange={e => renamePeriod(period, e.target.value)}
                                            className={`${inputCls} py-1.5`}
                                        />
                                    ) : (
                                        <span className="text-xs font-semibold text-slate-700 tabular-nums truncate">{period}</span>
                                    )}
                                    {isToday && (
                                        <span className="text-[8px] font-bold uppercase tracking-wider bg-blue-600 text-white px-1.5 py-0.5 flex-shrink-0">Today</span>
                                    )}
                                </div>

                                {scope === 'Overall' ? (
                                    <input
                                        type="number"
                                        min="0"
                                        value={cellValue(period, 'Overall')}
                                        onWheel={e => (e.currentTarget as HTMLInputElement).blur()}
                                        onChange={e => setCell(period, 'Overall', Math.max(0, parseFloat(e.target.value) || 0))}
                                        placeholder="0"
                                        className={numCls}
                                    />
                                ) : (
                                    <div className="text-center text-xs font-semibold text-slate-700 tabular-nums">{fmt(total)}</div>
                                )}

                                <div className={`text-center text-xs font-semibold tabular-nums ${hasActual ? 'text-slate-900' : 'text-slate-300'}`}>
                                    {hasActual ? fmt(achieved) : '—'}
                                    {hasActual && variance !== 0 && (
                                        <span className={`ml-1.5 inline-flex items-center gap-0.5 text-[10px] ${variance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {variance > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                            {fmt(Math.abs(variance))}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => fillDown(period)}
                                        title={mode === 'Date-wise' ? 'Copy this row to every later pour date' : 'Copy this row to all following periods'}
                                        className="w-8 p-1.5 text-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                    {mode === 'Date-wise' && (
                                        <button
                                            onClick={() => removePeriod(period)}
                                            title="Remove this pour date"
                                            className="w-8 p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {isOpen && (
                                <div className="pl-10 pr-4 pb-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {towers.map(tower => (
                                        <label key={tower} className="flex flex-col gap-1">
                                            <span className="text-[10px] font-semibold text-slate-400 truncate">{tower}</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={cellValue(period, tower)}
                                                onWheel={e => (e.currentTarget as HTMLInputElement).blur()}
                                                onChange={e => setCell(period, tower, Math.max(0, parseFloat(e.target.value) || 0))}
                                                placeholder="0"
                                                className={numCls}
                                            />
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {mode === 'Date-wise' && (
                <div className="px-4 py-2 border-t border-slate-100 bg-white">
                    <ToolButton onClick={addPeriod} icon={<Plus size={13} />}>Add pour date</ToolButton>
                </div>
            )}

            <div className={`grid ${gridCls} gap-3 px-4 py-3 bg-slate-50 border-t border-slate-200 items-center`}>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {mode === 'Date-wise' ? `Total · ${periods.length} pour date${periods.length === 1 ? '' : 's'}` : 'Total for the cycle'}
                </div>
                <div className="text-center text-sm font-semibold text-slate-900 tabular-nums">{fmt(plannedRunning)}</div>
                <div className="text-center text-sm font-semibold text-slate-900 tabular-nums">
                    {tracking?.totals ? fmt(tracking.totals.achieved) : '—'}
                    {tracking?.totals && plannedRunning > 0 && (
                        <span className={`block text-[10px] font-medium ${tracking.totals.achieved >= plannedRunning ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {Math.round((tracking.totals.achieved / plannedRunning) * 100)}% of plan
                        </span>
                    )}
                </div>
                <div className={mode === 'Date-wise' ? 'w-16' : 'w-8'} />
            </div>
        </div>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
   Main form
   ──────────────────────────────────────────────────────────────────────────── */

export function DpsPlanningForm({
    isEditMode,
    isExpired,
    scheduleValidFrom,
    setScheduleValidFrom,
    scheduleValidTill,
    setScheduleValidTill,
    getValidityDuration,
    concreteMode,
    setConcreteMode,
    concreteScope,
    setConcreteScope,
    handleGeneratePlanning,
    concretePlanning,
    setConcretePlanning,
    concreteCumulative,
    setConcreteCumulative,
    addRecord,
    removeRecord,
    updateRecord,
    siteConfig,
    staffMode,
    setStaffMode,
    staffScope,
    setStaffScope,
    staffPlanning,
    setStaffPlanning,
    labourMode,
    setLabourMode,
    labourScope,
    setLabourScope,
    labourPlanning,
    setLabourPlanning,
    monthlySchedules,
    setMonthlySchedules,
    equipments,
    setEquipments,
    equipmentList,
    equipmentMode,
    setEquipmentMode,
    equipmentScope,
    setEquipmentScope,
    latestStats,
    onViewTargetHistory,
    readOnly = false,
    siteId,
    scheduleId
}: DpsPlanningFormProps) {
    const disabled = !isEditMode || readOnly;

    /* ── Automation feeds ────────────────────────────────────────────────── */
    const [resources, setResources] = React.useState<PlanningResources | null>(null);
    const [resourcesLoading, setResourcesLoading] = React.useState(false);
    const [tracking, setTracking] = React.useState<ConcreteTracking | null>(null);
    const [drawer, setDrawer] = React.useState<null | 'staff' | 'labour' | 'equipment'>(null);

    const loadResources = React.useCallback(async () => {
        if (!siteId) return;
        setResourcesLoading(true);
        try {
            const params = new URLSearchParams();
            // Average over the plan's own window when it has one, so the suggestion
            // reflects the season being planned rather than an arbitrary month.
            if (scheduleValidFrom) params.set('from', scheduleValidFrom);
            if (scheduleValidTill) params.set('to', scheduleValidTill);
            const res = await apiClient<PlanningResources>(
                `/dps-schedule/${siteId}/planning-resources${params.toString() ? `?${params}` : ''}`,
                { method: 'GET', withAuth: true }
            );
            setResources(res);
        } catch {
            toast.error('Could not load the staff and labour catalogue');
        } finally {
            setResourcesLoading(false);
        }
    }, [siteId, scheduleValidFrom, scheduleValidTill]);

    const loadTracking = React.useCallback(async () => {
        if (!siteId) return;
        try {
            const q = scheduleId ? `?scheduleId=${scheduleId}` : '';
            const res = await apiClient<ConcreteTracking>(
                `/dps-schedule/${siteId}/concrete-tracking${q}`,
                { method: 'GET', withAuth: true }
            );
            setTracking(res);
        } catch {
            /* tracking is a read-only overlay; a failure must not block planning */
        }
    }, [siteId, scheduleId]);

    React.useEffect(() => { loadResources(); }, [loadResources]);
    React.useEffect(() => { loadTracking(); }, [loadTracking]);

    const windowLabel = resources
        ? `Roster and Avg are the ${resources.meta.window.days}-day attendance history from ${resources.meta.window.from} to ${resources.meta.window.to}, shown for reference. Planned is yours to set.`
        : undefined;

    /* ── Drawer rows, derived from the live attendance feed ──────────────── */

    const staffRows: ResourceRow[] = React.useMemo(() => {
        if (!resources) return [];
        const rows: ResourceRow[] = resources.staff.byDesignation.map((d: any) => ({
            key: `desig:${d.designation}:${d.department_id ?? 'none'}`,
            label: d.designation,
            sublabel: `${d.department} · ${d.present_today} present today`,
            assigned: d.assigned,
            present_today: d.present_today,
            avg_present: d.avg_present,
            suggested: d.suggested
        }));
        // Configured roles with nobody mapped yet still deserve a line.
        const seen = new Set(rows.map(r => r.label.toLowerCase()));
        resources.staff.configuredRoles.forEach((r: any) => {
            if (seen.has(String(r.name).toLowerCase())) return;
            rows.push({
                key: `role:${r.name}`,
                label: r.name,
                sublabel: `From ${r.source === 'site' ? 'site' : 'master'} config · no attendance yet`,
                assigned: 0, present_today: 0, avg_present: 0,
                suggested: Number(r.required) || 1
            });
        });
        return rows;
    }, [resources]);

    const labourRows: ResourceRow[] = React.useMemo(() => {
        if (!resources) return [];
        const rows: ResourceRow[] = [];
        // Category level only. Attendance rolls up to the category, so planning at
        // that grain says everything a subcategory row would while keeping the
        // list short. The feed still carries subcategories if that changes.
        //
        // The whole catalogue is listed, so a category with nobody deployed yet
        // is a normal row — it just has no history to report.
        const trades = (n: number) => n ? ` · ${n} trade${n === 1 ? '' : 's'}` : '';
        resources.labour.byCategory.forEach((c: any) => {
            rows.push({
                key: `cat:${c.category_id ?? c.category}`,
                label: c.category,
                sublabel: c.assigned > 0
                    ? `${c.present_today} present today${trades(c.subcategories?.length)}`
                    : `No labour on site yet${trades(c.subcategories?.length)}`,
                assigned: c.assigned,
                present_today: c.present_today,
                avg_present: c.avg_present,
                suggested: c.suggested
            });
        });
        const seen = new Set(rows.map(r => r.label.toLowerCase()));
        resources.labour.configuredTypes.forEach((t: any) => {
            if (seen.has(String(t.name).toLowerCase())) return;
            rows.push({
                key: `ltype:${t.name}`,
                label: t.name,
                sublabel: `From ${t.source === 'site' ? 'site' : 'master'} config · no attendance yet`,
                assigned: 0, present_today: 0, avg_present: 0, suggested: 0
            });
        });
        return rows;
    }, [resources]);

    const equipmentRows: ResourceRow[] = React.useMemo(() => {
        const fromResources = (resources?.equipments || []).map((e: any) => ({
            key: `eq:${e.name}`,
            label: e.name,
            sublabel: e.source === 'site' ? 'Site equipment' : 'Master list',
            assigned: 0, present_today: 0, avg_present: 0,
            suggested: Number(e.required) || 1
        }));
        if (fromResources.length > 0) return fromResources;
        // Fall back to whatever the parent already knows about.
        return (equipmentList || []).filter(Boolean).map(name => ({
            key: `eq:${name}`,
            label: name,
            sublabel: 'Site equipment',
            assigned: 0, present_today: 0, avg_present: 0, suggested: 1
        }));
    }, [resources, equipmentList]);

    /* ── Apply handlers: expand a drawer selection across periods × scopes ── */

    const expand = (mode: Mode, scope: Scope) => {
        const periods = periodsForMode(scheduleValidFrom, scheduleValidTill, mode);
        const scopes = scopeNames(siteConfig, scope);
        if (periods.length === 0) {
            toast.error('Set the schedule validity dates first');
            return null;
        }
        return { periods, scopes };
    };

    const applyStaff = (picked: { row: ResourceRow; count: number }[]) => {
        const grid = expand(staffMode, staffScope);
        if (!grid) return;
        let id = Date.now();
        const records: any[] = [];
        grid.periods.forEach(period => {
            grid.scopes.forEach(tower => {
                picked.forEach(({ row, count }) => {
                    records.push({
                        id: id++,
                        date: period,
                        towerId: tower,
                        designation: row.label,
                        role: row.label,
                        plannedCount: count,
                        source: 'attendance'
                    });
                });
            });
        });
        setStaffPlanning(records);
        toast.success(`${records.length} staff rows added to the plan`);
    };

    const applyLabour = (picked: { row: ResourceRow; count: number }[]) => {
        const grid = expand(labourMode, labourScope);
        if (!grid) return;
        let id = Date.now();
        const records: any[] = [];
        grid.periods.forEach(period => {
            grid.scopes.forEach(tower => {
                picked.forEach(({ row, count }) => {
                    records.push({
                        id: id++,
                        date: period,
                        towerId: tower,
                        labourName: '',
                        type: row.label,
                        plannedCount: count,
                        source: 'attendance'
                    });
                });
            });
        });
        setLabourPlanning(records);
        toast.success(`${records.length} labour rows added to the plan`);
    };

    const applyEquipment = async (picked: { row: ResourceRow; count: number }[]) => {
        const grid = expand(equipmentMode, equipmentScope);
        if (!grid) return;
        let id = Date.now();
        const records: any[] = [];
        grid.periods.forEach(period => {
            grid.scopes.forEach(tower => {
                picked.forEach(({ row, count }) => {
                    records.push({
                        id: id++,
                        date: period,
                        towerId: tower,
                        name: row.label,
                        required: count
                    });
                });
            });
        });
        setEquipments(records);
        toast.success(`${records.length} equipment rows planned`);

        // Anything typed into the drawer joins the master list, so the next plan
        // (and every daily form) can pick it instead of retyping it.
        const known = new Set(equipmentRows.map(r => r.label.toLowerCase()));
        const novel = picked
            .map(p => p.row.label)
            .filter(name => !known.has(name.toLowerCase()));
        if (novel.length === 0) return;
        try {
            await apiClient('/dps-schedule/master-config/append', {
                method: 'POST',
                body: { equipments: novel.map(name => ({ name })) },
                withAuth: true
            });
            toast.success(`Added to master list: ${novel.join(', ')}`);
            loadResources();
        } catch {
            toast.error('Planned locally, but could not save to the master list');
        }
    };

    /* ── Derived summaries ───────────────────────────────────────────────── */

    const concreteTotal = React.useMemo(
        () => concretePlanning.reduce((s, p) => s + (Number(p.concretePlanned) || 0), 0),
        [concretePlanning]
    );
    const staffTotal = React.useMemo(
        () => staffPlanning.reduce((s, p) => s + (Number(p.plannedCount) || 0), 0),
        [staffPlanning]
    );
    const labourTotal = React.useMemo(
        () => labourPlanning.reduce((s, p) => s + (Number(p.plannedCount) || 0), 0),
        [labourPlanning]
    );
    const equipmentTotal = React.useMemo(
        () => equipments.reduce((s, p) => s + (Number(p.required) || 0), 0),
        [equipments]
    );

    const uniqueTowers = React.useMemo(() => {
        const t = siteConfig?.towers?.map((x: any) => x.name) || [];
        const a = siteConfig?.areas?.map((x: any) => x.name) || [];
        const existing = Array.from(new Set(labourPlanning.map(p => p.towerId)));
        return Array.from(new Set(['Overall', ...t, ...a, ...existing])).filter(Boolean);
    }, [siteConfig, labourPlanning]);

    /** Labour rows folded into a period → trade matrix, which is how planners
     *  actually read a manpower sheet. */
    const labourMatrix = React.useMemo(() => {
        const trades = Array.from(new Set(labourPlanning.map(p => p.type).filter(Boolean)));
        const periods = Array.from(new Set(labourPlanning.map(p => p.date).filter(Boolean)));
        return { trades, periods };
    }, [labourPlanning]);

    /* ── Milestone cycle fill ───────────────────────────────────────────────
       Floors are generated automatically but every target date had to be typed
       one at a time — 40 floors meant 40 date pickers. Construction plans them
       on a cycle time instead ("one slab every 7 days"), so let the planner
       enter that once and lay the dates out. Achieved rows are never touched. */
    const [cycleOpen, setCycleOpen] = React.useState(false);
    const [cycleStart, setCycleStart] = React.useState('');
    const [cycleDays, setCycleDays] = React.useState(7);
    const [cycleTarget, setCycleTarget] = React.useState('all');

    const milestoneScopes = React.useMemo(() => {
        const seen = new Map<string, string>();
        (siteConfig?.towers || []).forEach((t: any) => seen.set(String(t.id ?? '').trim(), t.name));
        (siteConfig?.areas || []).forEach((a: any) => seen.set(String(a.name ?? '').trim(), a.name));
        return Array.from(seen, ([id, name]) => ({ id, name }));
    }, [siteConfig]);

    const applyCycle = () => {
        if (!cycleStart) {
            toast.error('Pick a start date');
            return;
        }
        const days = Math.max(1, Number(cycleDays) || 1);
        const start = new Date(cycleStart);
        if (isNaN(start.getTime())) {
            toast.error('That start date is not valid');
            return;
        }

        // Each scope runs on its own cycle, so towers advance in parallel rather
        // than queueing behind one another.
        //
        // Built eagerly rather than inside a state updater: React re-invokes
        // updaters under StrictMode, which would advance these counters twice
        // and shift every date.
        const cursor: Record<string, number> = {};
        let filled = 0;

        const next = monthlySchedules.map(m => {
            const done = m.is_achieved === 'Yes' || m.is_achieved === true;
            const scope = String(m.towerId ?? '').trim();
            if (done) return m;
            if (cycleTarget !== 'all' && scope !== cycleTarget) return m;

            const step = cursor[scope] ?? 0;
            cursor[scope] = step + 1;
            // UTC throughout: the date input parses as UTC midnight and `iso()`
            // formats from UTC, so local-offset arithmetic would drift a day.
            const d = new Date(start);
            d.setUTCDate(d.getUTCDate() + step * days);
            filled++;
            return { ...m, target_date: iso(d) };
        });

        if (filled === 0) {
            toast.error('No open milestones matched that selection');
            return;
        }
        setMonthlySchedules(next);

        setCycleOpen(false);
        toast.success(`Set ${filled} target date${filled === 1 ? '' : 's'} on a ${days}-day cycle`);
    };

    /* ── Period column ──────────────────────────────────────────────────────
       The month a row belongs to is a property of the plan, not something to ask
       the planner for: the cycle already says which month is being planned. So
       Monthly rows render the period read-only, and any row added by hand is
       stamped with the plan's own period instead of arriving blank. */
    const planPeriods = React.useMemo(
        () => ({
            monthly: periodsForMode(scheduleValidFrom, scheduleValidTill, 'Monthly'),
            firstDay: scheduleValidFrom || ''
        }),
        [scheduleValidFrom, scheduleValidTill]
    );

    const defaultPeriod = (mode: Mode) =>
        mode === 'Monthly' ? (planPeriods.monthly[0] || '') : planPeriods.firstDay;

    // Every per-period section expands across the validity window, so nothing can
    // be generated until it exists. Say so once, up front, rather than on click.
    const hasValidity = Boolean(scheduleValidFrom && scheduleValidTill);
    const needsValidity = 'Set the schedule validity dates first';

    const ValidityNotice = () => hasValidity ? null : (
        <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200">
            <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
                Set <span className="font-semibold">Valid From</span> and <span className="font-semibold">Valid Till</span> above
                to unlock planning — every section builds one row per day in that window.
            </p>
        </div>
    );

    const SectionNav = () => {
        const items = [
            { id: 'sec-concrete', label: 'Concrete', total: `${fmt(concreteTotal)} m³` },
            { id: 'sec-staff', label: 'Staff', total: `${staffTotal}` },
            { id: 'sec-labour', label: 'Labour', total: `${labourTotal}` },
            { id: 'sec-milestones', label: 'Milestones', total: `${monthlySchedules.length}` },
            { id: 'sec-equipment', label: 'Equipment', total: `${equipmentTotal}` }
        ];
        return (
            <nav className="sticky top-0 z-20 bg-white border border-slate-200 flex overflow-x-auto no-scrollbar">
                {items.map(item => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        className="flex-1 min-w-[110px] px-4 py-3 text-left border-r border-slate-100 last:border-r-0 hover:bg-slate-50 transition-colors"
                    >
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                        <span className="block text-sm font-semibold text-slate-900 tabular-nums mt-0.5">{item.total}</span>
                    </button>
                ))}
            </nav>
        );
    };

    return (
        <>
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                fieldset:disabled .edit-btn, fieldset:disabled button { display: none !important; }
                fieldset:disabled input, fieldset:disabled select, fieldset:disabled textarea {
                    background-color: transparent !important; border-color: transparent !important;
                    opacity: 1; -webkit-appearance: none; appearance: none; color: #0f172a; user-select: none;
                }
            `}</style>

            {/* Drawers live outside the fieldset so read-only mode hides them entirely */}
            {!disabled && (
                <>
                    <AutoFillDrawer
                        open={drawer === 'staff'}
                        onClose={() => setDrawer(null)}
                        title="Add staff designations"
                        caption="Designations mapped to this site. Head-counts are shown for reference."
                        accent="blue"
                        rows={staffRows}
                        windowLabel={windowLabel}
                        loading={resourcesLoading}
                        onApply={applyStaff}
                        applyLabel="Apply to staff plan"
                        allowCustom
                        customPlaceholder="Add a role not in the list..."
                    />
                    <AutoFillDrawer
                        open={drawer === 'labour'}
                        onClose={() => setDrawer(null)}
                        title="Add labour categories"
                        caption="Every labour category in your organization. Head-counts are shown for reference."
                        accent="rose"
                        rows={labourRows}
                        windowLabel={windowLabel}
                        loading={resourcesLoading}
                        onApply={applyLabour}
                        applyLabel="Apply to labour plan"
                        allowCustom
                        customPlaceholder="Add a trade not in the catalogue..."
                    />
                    <AutoFillDrawer
                        open={drawer === 'equipment'}
                        onClose={() => setDrawer(null)}
                        title="Plan equipment"
                        caption="Your master equipment list. Anything you add here is saved back to it."
                        accent="slate"
                        rows={equipmentRows}
                        loading={resourcesLoading}
                        onApply={applyEquipment}
                        applyLabel="Apply to equipment plan"
                        allowCustom
                        customPlaceholder="Add new equipment (saved to master)..."
                    />
                </>
            )}

            <fieldset disabled={disabled} className="p-0 m-0 border-none space-y-4 w-full min-w-0">

                {/* ── Validity ────────────────────────────────────────────── */}
                <div className="bg-white border border-slate-200 relative">
                    {isExpired() && (
                        <div className="absolute top-0 right-0 bg-rose-600 text-white text-[9px] font-bold px-3 py-1 uppercase tracking-widest z-10">
                            Expired
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-px bg-slate-100">
                        <div className="bg-white px-5 py-4">
                            <label className={`${headCls} block mb-2`}>Schedule Valid From</label>
                            <input
                                type="date"
                                value={scheduleValidFrom}
                                onChange={e => setScheduleValidFrom(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 text-sm font-medium text-slate-800 outline-none focus:border-slate-900 transition-colors"
                            />
                        </div>
                        <div className="bg-white px-5 py-4">
                            <label className={`${headCls} block mb-2`}>Schedule Valid Till</label>
                            <input
                                type="date"
                                value={scheduleValidTill}
                                onChange={e => setScheduleValidTill(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 text-sm font-medium text-slate-800 outline-none focus:border-slate-900 transition-colors"
                            />
                        </div>
                        <div className="bg-slate-900 px-8 py-4 flex flex-col items-center justify-center min-w-[120px]">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Duration</span>
                            <span className="text-2xl font-semibold text-white tabular-nums leading-tight">{getValidityDuration()}</span>
                            <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Days</span>
                        </div>
                    </div>
                </div>

                {/* Is this plan live, and is it keeping up? */}
                {(() => {
                    const today = iso(new Date());
                    const started = scheduleValidFrom && scheduleValidFrom <= today;
                    const expired = isExpired();
                    const daysLeft = scheduleValidTill
                        ? Math.ceil((new Date(scheduleValidTill).getTime() - new Date(today).getTime()) / 86400000)
                        : null;

                    const lastDay = [...(tracking?.days || [])].reverse().find(d => d.achieved > 0);
                    const totals = tracking?.totals;

                    // Plan-to-date is what should have been poured by now, which is
                    // the cumulative up to today — not the whole schedule.
                    const dueToDate = (tracking?.days || [])
                        .filter(d => d.period <= today)
                        .reduce((s, d) => s + d.planned, 0);
                    const behind = totals ? dueToDate - totals.achieved : 0;

                    const state = expired ? 'Expired' : started ? 'Active' : scheduleValidFrom ? 'Scheduled' : 'Draft';
                    const stateCls = expired ? 'bg-rose-600' : started ? 'bg-emerald-600' : scheduleValidFrom ? 'bg-blue-600' : 'bg-slate-400';

                    return (
                        <div className="bg-white border border-slate-200 flex flex-wrap items-stretch divide-x divide-slate-100">
                            <div className="px-4 py-3 flex items-center gap-2">
                                <span className={`text-[9px] font-bold uppercase tracking-widest text-white px-2 py-1 ${stateCls}`}>{state}</span>
                                {daysLeft !== null && !expired && (
                                    <span className="text-[11px] text-slate-500">
                                        {daysLeft > 0 ? `${daysLeft} days left` : 'ends today'}
                                    </span>
                                )}
                            </div>
                            <div className="px-4 py-3 min-w-0">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Last report received</p>
                                <p className="text-xs font-semibold text-slate-900 mt-0.5 truncate">
                                    {lastDay
                                        ? `${new Date(lastDay.period).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} · ${fmt(lastDay.achieved)} m³`
                                        : 'None yet'}
                                </p>
                            </div>
                            <div className="px-4 py-3 min-w-0">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Against plan to date</p>
                                <p className={`text-xs font-semibold mt-0.5 tabular-nums ${!totals ? 'text-slate-300' : behind > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {!totals ? '—'
                                        : behind > 0 ? `${fmt(behind)} m³ behind`
                                            : behind < 0 ? `${fmt(-behind)} m³ ahead`
                                                : 'On plan'}
                                </p>
                            </div>
                        </div>
                    );
                })()}

                <SectionNav />
                <ValidityNotice />

                {/* ── 1. Concrete ─────────────────────────────────────────── */}
                <Section
                    id="sec-concrete"
                    title="Concrete Planning"
                    caption={`${concreteMode === 'Date-wise'
                                               }${asksCumulative(concreteMode, concreteScope) ? ' Cumulative planned is required on each period.' : ''}`}
                    icon={<Layers size={16} />}
                    accent="amber"
                    actions={
                        <>
                            <SegmentedToggle value={concreteMode} onChange={setConcreteMode} options={['Date-wise', 'Monthly'] as const} />
                            <SegmentedToggle value={concreteScope} onChange={setConcreteScope} options={['Tower-wise', 'Overall'] as const} />
                            {/* Date-wise has nothing to regenerate: the pour dates are the
                                planner's, not a grid laid out over the whole month. */}
                            {concreteMode === 'Monthly' && (
                                <ToolButton onClick={handleGeneratePlanning} icon={<RefreshCw size={13} />} disabled={!hasValidity} disabledReason={needsValidity}>Reset grid</ToolButton>
                            )}
                            <ToolButton onClick={loadTracking} icon={<TrendingUp size={13} />}>Refresh actuals</ToolButton>
                        </>
                    }
                >
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-slate-100 border border-slate-200">
                        <div className="bg-white"><Metric label="Planned in this schedule" value={fmt(concreteTotal)} unit="m³" /></div>
                        <div className="bg-white">
                            <Metric
                                label="Achieved so far"
                                value={tracking?.totals ? fmt(tracking.totals.achieved) : fmt(latestStats?.totalAchieved || 0)}
                                unit="m³"
                                tone="good"
                            />
                        </div>
                        <div className="bg-white">
                            <Metric
                                label="Variance"
                                value={
                                    tracking?.totals
                                        ? `${tracking.totals.variance >= 0 ? '+' : ''}${fmt(tracking.totals.variance)}`
                                        : '—'
                                }
                                unit={tracking?.totals ? 'm³' : undefined}
                                tone={!tracking?.totals ? 'muted' : tracking.totals.variance >= 0 ? 'good' : 'bad'}
                                hint={tracking?.totals ? 'Actual less plan, to date' : 'Awaiting daily submissions'}
                            />
                        </div>
                        <div className="bg-white"><Metric label="Today's achieved" value={fmt(latestStats?.todayAchieved || 0)} unit="m³" /></div>
                        <div className="bg-white">
                            <Metric
                                label="Site total planned"
                                value={fmt(siteConfig?.total_concrete_planned || siteConfig?.totalConcretePlanned || 0)}
                                unit="m³"
                                tone="muted"
                                hint="From site config"
                            />
                        </div>
                    </div>

                    {tracking?.totals && concreteTotal > 0 && (
                        <div className="border border-slate-200 px-4 py-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className={headCls}>Execution against this plan</span>
                                <span className="text-xs font-semibold text-slate-900 tabular-nums">
                                    {Math.round((tracking.totals.achieved / concreteTotal) * 100)}%
                                </span>
                            </div>
                            <div className="h-2 bg-slate-100 overflow-hidden">
                                <div
                                    className={`h-full transition-all ${tracking.totals.achieved >= concreteTotal ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    style={{ width: `${Math.min(100, (tracking.totals.achieved / concreteTotal) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <ConcreteDailyGrid
                        mode={concreteMode}
                        scope={concreteScope}
                        siteConfig={siteConfig}
                        concretePlanning={concretePlanning}
                        setConcretePlanning={setConcretePlanning}
                        concreteCumulative={concreteCumulative}
                        setConcreteCumulative={setConcreteCumulative}
                        validFrom={scheduleValidFrom}
                        validTill={scheduleValidTill}
                        tracking={tracking}
                    />
                </Section>

                {/* ── 2. Staff ────────────────────────────────────────────── */}
                <Section
                    id="sec-staff"
                    title="Staff Planning"
                    caption="Designations for this site, planned per period."
                    icon={<Users size={16} />}
                    accent="blue"
                    badge={
                        resources && resources.staff.byDesignation.length > 0 ? (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5">
                                {resources.staff.byDesignation.length} roles on site
                            </span>
                        ) : undefined
                    }
                    actions={
                        <>
                            <SegmentedToggle value={staffMode} onChange={setStaffMode} options={['Date-wise', 'Monthly'] as const} />
                            <SegmentedToggle value={staffScope} onChange={setStaffScope} options={['Tower-wise', 'Overall'] as const} />
                            <ToolButton onClick={() => setDrawer('staff')} icon={<Sparkles size={13} />} variant="accent" disabled={!hasValidity} disabledReason={needsValidity}>
                                Add designations
                            </ToolButton>
                            <ToolButton
                                onClick={() => addRecord(setStaffPlanning, { towerId: 'Overall', date: defaultPeriod(staffMode), role: '', designation: '', plannedCount: '', is_manual: true })}
                                icon={<Plus size={13} />}
                            >
                                Add row
                            </ToolButton>
                            <ClearAllButton count={staffPlanning.length} label="staff" onClear={() => setStaffPlanning([])} />
                        </>
                    }
                >
                    {staffPlanning.length === 0 ? (
                        <EmptyRow
                            icon={<Users size={36} strokeWidth={1} />}
                            message="No staff planned yet"
                            hint="Add designations to load every role for this site, then set the count you plan for each."
                        />
                    ) : (
                        <div className="border border-slate-200">
                            <div className="grid grid-cols-[1fr_1fr_1.6fr_0.8fr_auto] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <div className={headCls}>{staffMode === 'Date-wise' ? 'Date' : 'Month'}</div>
                                <div className={headCls}>Tower / Area</div>
                                <div className={headCls}>Designation</div>
                                <div className={`${headCls} text-center`}>Planned</div>
                                <div className="w-8" />
                            </div>
                            <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100">
                                {staffPlanning.map((plan, idx) => (
                                    <div key={plan.id ?? `staff-${idx}`} className="grid grid-cols-[1fr_1fr_1.6fr_0.8fr_auto] gap-3 px-4 py-2 items-center group hover:bg-slate-50/60 transition-colors">
                                        <PeriodCell
                                            mode={staffMode}
                                            fallback={planPeriods.monthly[0] || ''}
                                            value={plan.date || ''}
                                            onChange={v => updateRecord(setStaffPlanning, plan.id, 'date', v)}
                                        />
                                        <select value={plan.towerId || 'Overall'} onChange={e => updateRecord(setStaffPlanning, plan.id, 'towerId', e.target.value)} className={inputCls}>
                                            {uniqueTowers.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <input
                                                type="text"
                                                value={plan.role || plan.designation || ''}
                                                onChange={e => setStaffPlanning((prev: any) => prev.map((item: any) =>
                                                    item.id === plan.id ? { ...item, role: e.target.value, designation: e.target.value } : item
                                                ))}
                                                className={inputCls}
                                                placeholder="e.g. Site Engineer"
                                            />
                                            {plan.source === 'attendance' && (
                                                <span title="Added from the catalogue" className="text-blue-500 flex-shrink-0"><Sparkles size={12} /></span>
                                            )}
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            value={plan.plannedCount ?? ''}
                                            onWheel={e => (e.currentTarget as HTMLInputElement).blur()}
                                            onChange={e => updateRecord(setStaffPlanning, plan.id, 'plannedCount', Math.max(0, parseInt(e.target.value) || 0))}
                                            className={numCls}
                                            placeholder="0"
                                        />
                                        <button onClick={() => removeRecord(setStaffPlanning, plan.id)} className="w-8 p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-[1fr_1fr_1.6fr_0.8fr_auto] gap-3 px-4 py-3 bg-slate-50 border-t border-slate-200 items-center">
                                <div className="col-span-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Total staff planned</div>
                                <div className="text-center text-sm font-semibold text-slate-900 tabular-nums">{staffTotal}</div>
                                <div className="w-8" />
                            </div>
                        </div>
                    )}
                </Section>

                {/* ── 3. Labour ───────────────────────────────────────────── */}
                <Section
                    id="sec-labour"
                    title="Labour Planning"
                    caption="Every labour category your organization defines, planned per period."
                    icon={<HardHat size={16} />}
                    accent="rose"
                    badge={
                        resources && resources.labour.byCategory.length > 0 ? (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5">
                                {resources.labour.byCategory.length} categories available
                            </span>
                        ) : undefined
                    }
                    actions={
                        <>
                            <SegmentedToggle value={labourMode} onChange={setLabourMode} options={['Date-wise', 'Monthly'] as const} />
                            <SegmentedToggle value={labourScope} onChange={setLabourScope} options={['Tower-wise', 'Overall'] as const} />
                            <ToolButton onClick={() => setDrawer('labour')} icon={<Sparkles size={13} />} variant="accent" disabled={!hasValidity} disabledReason={needsValidity}>
                                Add categories
                            </ToolButton>
                            <ToolButton
                                onClick={() => addRecord(setLabourPlanning, { towerId: 'Overall', date: defaultPeriod(labourMode), labourName: '', type: '', plannedCount: '' })}
                                icon={<Plus size={13} />}
                            >
                                Add row
                            </ToolButton>
                            <ClearAllButton count={labourPlanning.length} label="labour" onClear={() => setLabourPlanning([])} />
                        </>
                    }
                >
                    {labourPlanning.length === 0 ? (
                        <EmptyRow
                            icon={<HardHat size={36} strokeWidth={1} />}
                            message="No labour planned yet"
                            hint="Add categories to load every labour category your organization tracks, then set the count you plan for each."
                        />
                    ) : (
                        <div className="border border-slate-200">
                            <div className="grid grid-cols-[1fr_1fr_1.4fr_1.4fr_0.8fr_auto] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <div className={headCls}>{labourMode === 'Date-wise' ? 'Date' : 'Month'}</div>
                                <div className={headCls}>Tower / Area</div>
                                <div className={headCls}>Trade / Category</div>
                                <div className={headCls}>Contractor / Agency</div>
                                <div className={`${headCls} text-center`}>Planned</div>
                                <div className="w-8" />
                            </div>
                            <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
                                {labourPlanning.map((plan, idx) => (
                                    <div key={plan.id ?? `labour-${idx}`} className="grid grid-cols-[1fr_1fr_1.4fr_1.4fr_0.8fr_auto] gap-3 px-4 py-2 items-center group hover:bg-slate-50/60 transition-colors">
                                        <PeriodCell
                                            mode={labourMode}
                                            fallback={planPeriods.monthly[0] || ''}
                                            value={plan.date || ''}
                                            onChange={v => updateRecord(setLabourPlanning, plan.id, 'date', v)}
                                        />
                                        <select value={plan.towerId || 'Overall'} onChange={e => updateRecord(setLabourPlanning, plan.id, 'towerId', e.target.value)} className={inputCls}>
                                            {uniqueTowers.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <input
                                                type="text"
                                                list="dps-labour-trades"
                                                value={plan.type || ''}
                                                onChange={e => updateRecord(setLabourPlanning, plan.id, 'type', e.target.value)}
                                                className={inputCls}
                                                placeholder="Trade..."
                                            />
                                            {plan.source === 'attendance' && (
                                                <span title="Added from the catalogue" className="text-rose-500 flex-shrink-0"><Sparkles size={12} /></span>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            list="dps-labour-contractors"
                                            value={plan.labourName || ''}
                                            onChange={e => updateRecord(setLabourPlanning, plan.id, 'labourName', e.target.value)}
                                            className={inputCls}
                                            placeholder="Optional..."
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            value={plan.plannedCount ?? ''}
                                            onWheel={e => (e.currentTarget as HTMLInputElement).blur()}
                                            onChange={e => updateRecord(setLabourPlanning, plan.id, 'plannedCount', Math.max(0, parseInt(e.target.value) || 0))}
                                            className={numCls}
                                            placeholder="0"
                                        />
                                        <button onClick={() => removeRecord(setLabourPlanning, plan.id)} className="w-8 p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-[1fr_1fr_1.4fr_1.4fr_0.8fr_auto] gap-3 px-4 py-3 bg-slate-50 border-t border-slate-200 items-center">
                                <div className="col-span-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                                    Total manpower planned · {labourMatrix.trades.length} trades over {labourMatrix.periods.length} periods
                                </div>
                                <div className="text-center text-sm font-semibold text-slate-900 tabular-nums">{labourTotal}</div>
                                <div className="w-8" />
                            </div>
                        </div>
                    )}

                    {/* Typeahead sources — keeps the free-text inputs honest without locking them */}
                    <datalist id="dps-labour-trades">
                        {labourRows.map(r => <option key={r.key} value={r.label} />)}
                    </datalist>
                    <datalist id="dps-labour-contractors">
                        {(resources?.labour.contractors || []).map((c: any, i: number) => <option key={c.id ?? `contractor-${i}`} value={c.name} />)}
                    </datalist>
                </Section>

                {/* ── 4. Milestones ───────────────────────────────────────── */}
                <Section
                    id="sec-milestones"
                    title="Milestone Schedule"
                    caption="Target dates for every level in Site Config. Completed milestones lock so history stays intact."
                    icon={<Clock size={16} />}
                    accent="violet"
                    actions={
                        <>
                            <ToolButton
                                onClick={() => setCycleOpen(o => !o)}
                                icon={<Calendar size={13} />}
                                variant="accent"
                                disabled={monthlySchedules.length === 0}
                                disabledReason="Add towers and floors in Site Config first"
                            >
                                Set dates by cycle
                            </ToolButton>
                            <ToolButton
                                onClick={() => addRecord(setMonthlySchedules, { towerId: siteConfig?.towers?.[0]?.id || '', floor: '', target_date: '', purpose: '', is_achieved: false })}
                                icon={<Plus size={13} />}
                            >
                                Add milestone
                            </ToolButton>
                        </>
                    }
                >
                    {cycleOpen && (
                        <div className="border border-violet-200 bg-violet-50/40 p-4 space-y-3">
                            <div className="flex items-start gap-2">
                                <Info size={14} className="text-violet-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-violet-900">
                                    Lays out target dates from a start date, one milestone every N days.
                                    Each tower or area runs its own cycle in parallel. Milestones already
                                    marked done are left alone.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                <label className="flex flex-col gap-1">
                                    <span className={headCls}>Start date</span>
                                    <input type="date" value={cycleStart} onChange={e => setCycleStart(e.target.value)} className={inputCls} />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className={headCls}>Cycle (days)</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={cycleDays}
                                        onWheel={e => (e.currentTarget as HTMLInputElement).blur()}
                                        onChange={e => setCycleDays(Math.max(1, parseInt(e.target.value) || 1))}
                                        className={numCls}
                                    />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className={headCls}>Apply to</span>
                                    <select value={cycleTarget} onChange={e => setCycleTarget(e.target.value)} className={inputCls}>
                                        <option value="all">All towers &amp; areas</option>
                                        {milestoneScopes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </label>
                                <div className="flex items-end gap-2">
                                    <button
                                        type="button"
                                        onClick={applyCycle}
                                        className="flex-1 px-4 py-2 bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                                    >
                                        Apply
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCycleOpen(false)}
                                        className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {monthlySchedules.length === 0 ? (
                        <EmptyRow
                            icon={<Clock size={36} strokeWidth={1} />}
                            message="No milestones set"
                            hint="Milestones are generated automatically when you save towers and floors in Site Config."
                        />
                    ) : (
                        <div className="border border-slate-200">
                            <div className="grid grid-cols-[1fr_1.2fr_1fr_1.6fr_0.9fr_auto] gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <div className={headCls}>Tower / Area</div>
                                <div className={headCls}>Level</div>
                                <div className={headCls}>Target</div>
                                <div className={headCls}>Purpose</div>
                                <div className={headCls}>Status</div>
                                <div className="w-8" />
                            </div>
                            <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
                                {monthlySchedules.map(sched => {
                                    const done = sched.is_achieved === 'Yes' || sched.is_achieved === true;
                                    return (
                                        <div
                                            key={sched.id}
                                            className={`grid grid-cols-[1fr_1.2fr_1fr_1.6fr_0.9fr_auto] gap-2 px-4 py-2 items-start group transition-colors ${done ? 'bg-emerald-50/40' : 'hover:bg-slate-50/60'}`}
                                        >
                                            {/* Trimmed on both sides: milestones written before the
                                                generator was fixed carry ids padded with spaces, and an
                                                untrimmed compare leaves the row showing "Select...". */}
                                            <select
                                                disabled={done}
                                                value={String(sched.towerId ?? '').trim()}
                                                onChange={e => updateRecord(setMonthlySchedules, sched.id, 'towerId', e.target.value)}
                                                className={inputCls}
                                            >
                                                <option value="">Select...</option>
                                                {(siteConfig?.towers || []).length > 0 && (
                                                    <optgroup label="Towers">
                                                        {siteConfig.towers.map((t: any, idx: number) => (
                                                            <option key={t.id || idx} value={String(t.id ?? '').trim()}>{t.name}</option>
                                                        ))}
                                                    </optgroup>
                                                )}
                                                {(siteConfig?.areas || []).length > 0 && (
                                                    <optgroup label="Other Areas">
                                                        {siteConfig.areas.map((a: any, idx: number) => (
                                                            <option key={idx} value={String(a.name ?? '').trim()}>{a.name}</option>
                                                        ))}
                                                    </optgroup>
                                                )}
                                            </select>

                                            {(() => {
                                                // Levels come from Site Config — the basements, plinths, floors
                                                // and terraces recorded against this tower, or the area's
                                                // sub-zones. A value the config no longer offers is still
                                                // listed so an existing milestone never silently blanks out.
                                                const levels = levelsForScope(siteConfig, sched.towerId);
                                                const current = String(sched.floor ?? '').trim();
                                                const options = current && !levels.includes(current)
                                                    ? [...levels, current]
                                                    : levels;
                                                return (
                                                    <select
                                                        disabled={done}
                                                        value={current}
                                                        onChange={e => updateRecord(setMonthlySchedules, sched.id, 'floor', e.target.value)}
                                                        className={inputCls}
                                                    >
                                                        <option value="">
                                                            {sched.towerId
                                                                ? (levels.length ? 'Select level...' : 'No levels in Site Config')
                                                                : 'Pick a tower or area first'}
                                                        </option>
                                                        {options.map(name => <option key={name} value={name}>{name}</option>)}
                                                    </select>
                                                );
                                            })()}

                                            <div className="flex items-center gap-1">
                                                <input
                                                    disabled={done}
                                                    type="date"
                                                    value={sched.target_date || sched.date || ''}
                                                    onChange={e => updateRecord(setMonthlySchedules, sched.id, 'target_date', e.target.value)}
                                                    className={inputCls}
                                                />
                                                {onViewTargetHistory && sched.id && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onViewTargetHistory(sched.id)}
                                                        title="Revision history"
                                                        className="edit-btn p-1.5 text-slate-300 hover:text-violet-600 transition-colors flex-shrink-0"
                                                    >
                                                        <HistoryIcon size={13} />
                                                    </button>
                                                )}
                                            </div>

                                            <input
                                                disabled={done}
                                                type="text"
                                                value={sched.purpose || ''}
                                                onChange={e => updateRecord(setMonthlySchedules, sched.id, 'purpose', e.target.value)}
                                                className={inputCls}
                                                placeholder="Activity..."
                                            />

                                            {/* Read-only: a milestone you are planning is pending by
                                                definition, and completion is recorded by the daily
                                                report, not chosen here. */}
                                            <div className="px-2.5 py-2 min-w-0">
                                                {done ? (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                                        Done
                                                        {sched.achieved_date && (
                                                            <span className="block text-[10px] font-medium normal-case tracking-normal text-emerald-600/80 mt-0.5">
                                                                {new Date(sched.achieved_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Pending</span>
                                                )}
                                            </div>

                                            <button
                                                disabled={done}
                                                onClick={() => removeRecord(setMonthlySchedules, sched.id)}
                                                className="w-8 p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 disabled:hidden"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </Section>

                {/* ── 5. Equipment ────────────────────────────────────────── */}
                <Section
                    id="sec-equipment"
                    title="Equipment Planning"
                    caption="Pick from the master list. Anything new you add is saved back so it stays trackable."
                    icon={<Wrench size={16} />}
                    accent="slate"
                    badge={
                        equipmentRows.length > 0 ? (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5">
                                {equipmentRows.length} in master list
                            </span>
                        ) : undefined
                    }
                    actions={
                        <>
                            <SegmentedToggle value={equipmentMode} onChange={setEquipmentMode} options={['Date-wise', 'Monthly'] as const} />
                            <SegmentedToggle value={equipmentScope} onChange={setEquipmentScope} options={['Tower-wise', 'Overall'] as const} />
                            <ToolButton onClick={() => setDrawer('equipment')} icon={<Sparkles size={13} />} variant="accent" disabled={!hasValidity} disabledReason={needsValidity}>
                                Pick from master list
                            </ToolButton>
                            <ToolButton onClick={() => addRecord(setEquipments, { towerId: 'Overall', date: defaultPeriod(equipmentMode), name: '', required: '' })} icon={<Plus size={13} />}>
                                Add row
                            </ToolButton>
                            <ClearAllButton count={equipments.length} label="equipment" onClear={() => setEquipments([])} />
                        </>
                    }
                >
                    {equipments.length === 0 ? (
                        <EmptyRow
                            icon={<Wrench size={36} strokeWidth={1} />}
                            message="No equipment planned yet"
                            hint="Pick from the master list to load every machine your organization tracks, with a required count per period."
                        />
                    ) : (
                        <div className="border border-slate-200">
                            <div className="grid grid-cols-[1fr_1fr_1.6fr_0.8fr_auto] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <div className={headCls}>{equipmentMode === 'Date-wise' ? 'Date' : 'Month'}</div>
                                <div className={headCls}>Tower / Area</div>
                                <div className={headCls}>Equipment</div>
                                <div className={`${headCls} text-center`}>Required</div>
                                <div className="w-8" />
                            </div>
                            <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100">
                                {equipments.map((eq, idx) => (
                                    <div key={eq.id ?? `eq-${idx}`} className="grid grid-cols-[1fr_1fr_1.6fr_0.8fr_auto] gap-3 px-4 py-2 items-center group hover:bg-slate-50/60 transition-colors">
                                        <PeriodCell
                                            mode={equipmentMode}
                                            fallback={planPeriods.monthly[0] || ''}
                                            value={eq.date || ''}
                                            onChange={v => updateRecord(setEquipments, eq.id, 'date', v)}
                                        />
                                        <select value={eq.towerId || 'Overall'} onChange={e => updateRecord(setEquipments, eq.id, 'towerId', e.target.value)} className={inputCls}>
                                            {uniqueTowers.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <input
                                            type="text"
                                            list="dps-equipment-master"
                                            value={eq.name || ''}
                                            onChange={e => updateRecord(setEquipments, eq.id, 'name', e.target.value)}
                                            className={inputCls}
                                            placeholder="Type or pick..."
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            value={eq.required ?? ''}
                                            onWheel={e => (e.currentTarget as HTMLInputElement).blur()}
                                            onChange={e => updateRecord(setEquipments, eq.id, 'required', Math.max(0, parseInt(e.target.value) || 0))}
                                            className={numCls}
                                            placeholder="0"
                                        />
                                        <button onClick={() => removeRecord(setEquipments, eq.id)} className="w-8 p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-[1fr_1fr_1.6fr_0.8fr_auto] gap-3 px-4 py-3 bg-slate-50 border-t border-slate-200 items-center">
                                <div className="col-span-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Total equipment required</div>
                                <div className="text-center text-sm font-semibold text-slate-900 tabular-nums">{equipmentTotal}</div>
                                <div className="w-8" />
                            </div>
                        </div>
                    )}

                    <datalist id="dps-equipment-master">
                        {equipmentRows.map(r => <option key={r.key} value={r.label} />)}
                    </datalist>
                </Section>

                {/* Issues and priority materials belong to the daily report, not the
                    plan: they are raised and chased day by day. The parent still
                    carries both through so the daily form keeps receiving them. */}

            </fieldset>
        </>
    );
}
