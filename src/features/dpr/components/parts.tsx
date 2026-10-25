'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { addMonths, formatMonth } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/dpr.api';
import type { ItemKind, Location, MilestoneState, Person, PlanStatus, Role } from '../api/dpr.api';

export const DPR_FEATURE = 'DPR_FEATURE';

export const ROLE_LABEL: Record<Role, string> = {
  reporter: 'Fills the daily report', billing_reporter: 'Fills the billing report', reviewer: 'Reviews the site',
  equipment_owner: 'Owns breakdowns', material_owner: 'Owns material requests',
};
export const ROLE_SHORT: Record<Role, string> = { reporter: 'Reporter', billing_reporter: 'Billing', reviewer: 'Reviewer', equipment_owner: 'Equipment', material_owner: 'Materials' };
export const ITEM_LABEL: Record<ItemKind, string> = { breakdown: 'Breakdowns', material: 'Materials', issue: 'Site issues', action: 'Actions' };
export const ITEM_ONE: Record<ItemKind, string> = { breakdown: 'Breakdown', material: 'Material', issue: 'Issue', action: 'Action' };
export const STATE_LABEL: Record<MilestoneState, string> = { done: 'Done', due: 'Due', overdue: 'Overdue', upcoming: 'Upcoming', undated: 'No date' };
export const PLAN_LABEL: Record<PlanStatus, string> = { active: 'Active', upcoming: 'Scheduled', closed: 'Closed' };
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** A short key for a new item, so a resubmit never creates it twice. */
export const newKey = () => `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
export const n1 = (v: number | null | undefined) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: 1 }));
export const locName = (locations: Location[], id: string | null | undefined) => (id ? locations.find((l) => l.id === id)?.name || 'Removed location' : 'Overall');

/** A number tile. `tone` bad is the only colour: red for something late or short. */
export function Tile({ label, value, sub, tone, onClick }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'bad'; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={cx('min-w-0 rounded-xl border border-line bg-surface p-3 text-left sm:p-3.5', onClick && 'transition-colors hover:bg-bg-subtle')}>
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
      <p className={cx('mt-1.5 truncate text-xl font-extrabold leading-none tabular-nums sm:text-2xl', tone === 'bad' ? 'text-[var(--tt-danger)]' : 'text-fg')}>{value}</p>
      {sub && <p className="mt-1 truncate text-[11px] text-fg-muted">{sub}</p>}
    </Tag>
  );
}

/** A thin progress bar in ink. */
export function Bar({ pct }: { pct: number | null }) {
  const w = Math.max(0, Math.min(100, pct ?? 0));
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle"><div className="h-full rounded-full bg-[var(--tt-primary)]" style={{ width: `${w}%` }} /></div>;
}

/** A small status label with a dot: done is ink, waiting is grey, late is red. */
export function Tag({ tone, children }: { tone: 'done' | 'wait' | 'late' | 'plain'; children: React.ReactNode }) {
  const dot = tone === 'done' ? 'bg-[var(--tt-primary)]' : tone === 'late' ? 'bg-[var(--tt-danger)]' : 'bg-fg-subtle';
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold', tone === 'late' ? 'text-[var(--tt-danger)]' : 'text-fg', tone === 'done' ? 'bg-surface' : 'bg-bg-subtle')}>
      {tone !== 'plain' && <span className={cx('h-1.5 w-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}

export const stateTone = (s: MilestoneState): 'done' | 'wait' | 'late' => (s === 'done' ? 'done' : s === 'overdue' ? 'late' : 'wait');

/** A compact number box for tables. Red border when `error`. */
export function NumBox({ value, onChange, error, disabled, step = 1, placeholder, ariaLabel, wide }: { value: number | null | undefined; onChange: (v: number | null) => void; error?: string; disabled?: boolean; step?: number; placeholder?: string; ariaLabel: string; wide?: boolean }) {
  return (
    <div>
      <input
        type="number" inputMode="decimal" min={0} step={step} value={value ?? ''} disabled={disabled} placeholder={placeholder} aria-label={ariaLabel} aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={cx('h-9 rounded-lg border bg-surface px-2 text-right text-sm tabular-nums text-fg outline-none transition-colors focus:ring-1 disabled:bg-bg-subtle disabled:opacity-70', wide ? 'w-28' : 'w-20',
          error ? 'border-[var(--tt-danger)] focus:ring-[var(--tt-danger)]' : 'border-line focus:border-[var(--tt-primary)] focus:ring-[var(--tt-primary)]')}
      />
      {error && <p className="mt-1 max-w-[10rem] text-[11px] font-medium text-[var(--tt-danger)]">{error}</p>}
    </div>
  );
}

/** A plain text input for tables. */
export function TextBox({ value, onChange, error, disabled, placeholder, ariaLabel, className }: { value: string | null | undefined; onChange: (v: string) => void; error?: string; disabled?: boolean; placeholder?: string; ariaLabel: string; className?: string }) {
  return (
    <div className={className}>
      <input
        value={value ?? ''} disabled={disabled} placeholder={placeholder} aria-label={ariaLabel} aria-invalid={Boolean(error)} onChange={(e) => onChange(e.target.value)}
        className={cx('h-9 w-full rounded-lg border bg-surface px-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:ring-1 disabled:bg-bg-subtle disabled:opacity-70',
          error ? 'border-[var(--tt-danger)] focus:ring-[var(--tt-danger)]' : 'border-line focus:border-[var(--tt-primary)] focus:ring-[var(--tt-primary)]')}
      />
      {error && <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{error}</p>}
    </div>
  );
}

export function DateBox({ value, onChange, error, min, max, ariaLabel, disabled }: { value: string | null | undefined; onChange: (v: string | null) => void; error?: string; min?: string; max?: string; ariaLabel: string; disabled?: boolean }) {
  return (
    <div>
      <input type="date" value={value ?? ''} min={min} max={max} disabled={disabled} aria-label={ariaLabel} aria-invalid={Boolean(error)} onChange={(e) => onChange(e.target.value || null)}
        className={cx('h-9 w-full min-w-[9rem] rounded-lg border bg-surface px-2 text-sm text-fg outline-none focus:ring-1 disabled:bg-bg-subtle', error ? 'border-[var(--tt-danger)] focus:ring-[var(--tt-danger)]' : 'border-line focus:border-[var(--tt-primary)] focus:ring-[var(--tt-primary)]')} />
      {error && <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{error}</p>}
    </div>
  );
}

export function LocationSelect({ locations, value, onChange, ariaLabel, overallLabel = 'Overall', disabled }: { locations: Location[]; value: string | null; onChange: (v: string | null) => void; ariaLabel: string; overallLabel?: string; disabled?: boolean }) {
  return (
    <select value={value ?? ''} disabled={disabled} aria-label={ariaLabel} onChange={(e) => onChange(e.target.value || null)}
      className="h-9 w-full min-w-[8rem] rounded-lg border border-line bg-surface px-2 text-sm text-fg outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] disabled:bg-bg-subtle">
      <option value="">{overallLabel}</option>
      {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
    </select>
  );
}

/** Previous / next month with the month's name between. */
export function MonthNav({ month, onChange, max }: { month: string; onChange: (m: string) => void; max?: string }) {
  const next = addMonths(month, 1);
  return (
    <div className="inline-flex h-9 items-center rounded-lg border border-line bg-surface">
      <button type="button" aria-label="Previous month" onClick={() => onChange(addMonths(month, -1))} className="flex h-full w-9 items-center justify-center text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /></button>
      <span className="min-w-[7.5rem] text-center text-xs font-semibold text-fg sm:text-sm">{formatMonth(month)}</span>
      <button type="button" aria-label="Next month" disabled={Boolean(max && next > max)} onClick={() => onChange(next)} className="flex h-full w-9 items-center justify-center text-fg-muted hover:text-fg disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}

/** Searches active employees; picks one. */
export function PersonSearch({ onPick, exclude = [], placeholder = 'Search people', autoFocus }: { onPick: (p: Person) => void; exclude?: number[]; placeholder?: string; autoFocus?: boolean }) {
  const [q, setQ] = React.useState('');
  const [list, setList] = React.useState<Person[]>([]);
  const [error, setError] = React.useState('');
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => { api.people(q).then((r) => { setList(r.items); setError(''); }).catch((e) => setError(messageOf(e))); }, 200);
    return () => clearTimeout(t);
  }, [q, open]);
  const shown = list.filter((p) => !exclude.includes(p.employee_id));
  return (
    <div className="relative">
      <div className="flex h-9 items-center rounded-lg border border-line bg-surface px-2.5 focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)]">
        <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
        <input value={q} autoFocus={autoFocus} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder}
          className="ml-2 w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle focus:ring-0" />
      </div>
      {open && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-line bg-surface py-1 shadow-lg">
          {error && <p className="px-3 py-2 text-xs text-[var(--tt-danger)]">{error}</p>}
          {!error && !shown.length && <p className="px-3 py-2 text-xs text-fg-muted">No one found</p>}
          {shown.map((p) => (
            <button key={p.employee_id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(p); setQ(''); setOpen(false); }} className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-bg-subtle">
              <span className="text-sm font-medium text-fg">{p.name}</span>
              <span className="text-[11px] text-fg-muted">{[p.code, p.designation].filter(Boolean).join(' · ') || ' '}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** People chips with a search to add more. */
export function PeoplePicker({ value, onChange, disabled }: { value: Person[]; onChange: (v: Person[]) => void; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((p) => (
            <span key={p.employee_id} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle py-0.5 pl-2.5 pr-1 text-xs font-medium text-fg">
              {p.name}
              {!disabled && <button type="button" aria-label={`Remove ${p.name}`} onClick={() => onChange(value.filter((x) => x.employee_id !== p.employee_id))} className="rounded-full p-0.5 text-fg-muted hover:text-fg"><X className="h-3 w-3" /></button>}
            </span>
          ))}
        </div>
      )}
      {!disabled && <PersonSearch exclude={value.map((p) => p.employee_id)} onPick={(p) => onChange([...value, p])} placeholder="Add a person" />}
    </div>
  );
}

/** First field error of a list of paths, for a section summary. */
export const errorsUnder = (errors: Record<string, string>, prefix: string) => Object.keys(errors).filter((k) => k === prefix || k.startsWith(`${prefix}.`)).length;
