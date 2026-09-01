"use client";

/**
 * The shared visual language of the DPS screens.
 *
 * The schedule form and the daily report are two halves of one workflow — you
 * plan a cycle here and report against it there — but they were built at
 * different times and looked it. These primitives were private to the schedule
 * form; both now import them, so a change to the language lands in both places
 * instead of drifting apart again.
 *
 * Squared, low-chrome, one accent bar per section.
 */

import React from 'react';

export const ACCENTS = {
    amber: { bar: 'bg-amber-500', text: 'text-amber-600', soft: 'bg-amber-50', ring: 'border-amber-200' },
    blue: { bar: 'bg-blue-600', text: 'text-blue-600', soft: 'bg-blue-50', ring: 'border-blue-200' },
    rose: { bar: 'bg-rose-500', text: 'text-rose-600', soft: 'bg-rose-50', ring: 'border-rose-200' },
    violet: { bar: 'bg-violet-500', text: 'text-violet-600', soft: 'bg-violet-50', ring: 'border-violet-200' },
    slate: { bar: 'bg-slate-700', text: 'text-slate-700', soft: 'bg-slate-50', ring: 'border-slate-300' },
    emerald: { bar: 'bg-emerald-500', text: 'text-emerald-600', soft: 'bg-emerald-50', ring: 'border-emerald-200' }
} as const;

export type Accent = keyof typeof ACCENTS;

export function Section({
    id, title, caption, icon, accent = 'slate', badge, actions, children
}: {
    id: string;
    title: string;
    caption: string;
    icon: React.ReactNode;
    accent?: Accent;
    badge?: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    const a = ACCENTS[accent];
    return (
        <section id={id} className="bg-white border border-slate-200 scroll-mt-24">
            <div className="flex">
                <div className={`w-1 flex-shrink-0 ${a.bar}`} />
                <div className="flex-1 min-w-0">
                    <header className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-2 ${a.soft} ${a.text} flex-shrink-0`}>{icon}</div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h2>
                                    {badge}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">{caption}</p>
                            </div>
                        </div>
                        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                    </header>
                    <div className="p-5 space-y-4">{children}</div>
                </div>
            </div>
        </section>
    );
}

export function SegmentedToggle<T extends string>({ value, onChange, options }: {
    value: T;
    onChange: (v: T) => void;
    options: readonly T[];
}) {
    return (
        <div className="flex border border-slate-200">
            {options.map(opt => (
                <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(opt)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${value === opt ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:text-slate-700'
                        }`}
                >
                    {opt}
                </button>
            ))}
        </div>
    );
}

export function ToolButton({ onClick, icon, children, variant = 'ghost', disabled, disabledReason }: {
    onClick: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
    variant?: 'ghost' | 'primary' | 'accent' | 'danger';
    disabled?: boolean;
    /** Shown on hover so a blocked button explains itself without a click. */
    disabledReason?: string;
}) {
    const cls = variant === 'primary'
        ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
        : variant === 'accent'
            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
            : variant === 'danger'
                ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-900 hover:text-slate-900';
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={disabled ? disabledReason : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-[11px] font-semibold transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600 ${cls}`}
        >
            {icon}
            {children}
        </button>
    );
}

/** A KPI cell in the metric strips. `tone` colours the value, not the frame. */
export function Metric({ label, value, unit, tone = 'default', hint }: {
    label: string;
    value: React.ReactNode;
    unit?: string;
    tone?: 'default' | 'good' | 'bad' | 'muted';
    hint?: string;
}) {
    const toneCls = tone === 'good' ? 'text-emerald-600'
        : tone === 'bad' ? 'text-rose-600'
            : tone === 'muted' ? 'text-slate-400'
                : 'text-slate-900';
    return (
        <div className="px-4 py-3 min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{label}</p>
            <p className={`text-lg font-semibold tabular-nums mt-1 ${toneCls}`}>
                {value}
                {unit && <span className="text-[10px] font-medium text-slate-400 ml-1">{unit}</span>}
            </p>
            {hint && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{hint}</p>}
        </div>
    );
}

export const inputCls =
    'w-full px-2.5 py-2 bg-white border border-slate-200 text-xs text-slate-800 outline-none focus:border-slate-900 transition-colors disabled:bg-transparent disabled:border-transparent';
export const numCls = `${inputCls} text-center font-semibold tabular-nums`;
export const headCls = 'text-[9px] font-bold text-slate-400 uppercase tracking-widest';

export function EmptyRow({ icon, message, hint }: { icon: React.ReactNode; message: string; hint?: string }) {
    return (
        <div className="py-12 flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 text-center">
            <div className="text-slate-200">{icon}</div>
            <p className="text-xs font-semibold text-slate-400">{message}</p>
            {hint && <p className="text-[11px] text-slate-300 max-w-sm">{hint}</p>}
        </div>
    );
}

/** Compact number: integers plain, fractions to one decimal. */
export const fmt = (n: number) => {
    const v = Number(n) || 0;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
};
