'use client';

import React from 'react';
import { Check, Info, Search } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { cx } from '@/theme/tokens';
import { CYCLE_STAGES } from '../constants/perf.constants';
import type { CycleStatus } from '../types/perf.types';
import type { PageHelp } from '../constants/help';

// Same compact controls as the Roles and Roster screens. The shared <Button> is the 52px full-width
// sign-in button, so admin screens use these instead.
const btnBase = 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40';
const BTN_TONE = {
  primary: 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)] shadow-xs hover:bg-[var(--tt-primary-hover)]',
  secondary: 'border border-line bg-surface text-fg shadow-xs hover:bg-bg-subtle',
  danger: 'bg-[var(--tt-danger)] text-[var(--tt-on-primary)] shadow-xs hover:bg-[var(--tt-danger)]/90',
  ghost: 'text-fg-muted hover:bg-bg-subtle hover:text-fg',
} as const;
const BTN_SIZE = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-xs sm:text-sm 2xl:h-10 2xl:px-4',
  // Sits on one line with a form field (FormControls fields are h-10).
  field: 'h-10 px-3.5 text-xs sm:text-sm',
} as const;

/** Button classes for a Link that should look like a button. */
export const btnClass = (variant: keyof typeof BTN_TONE = 'primary', size: keyof typeof BTN_SIZE = 'md') => cx(btnBase, BTN_TONE[variant], BTN_SIZE[size]);

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BTN_TONE;
  size?: keyof typeof BTN_SIZE;
  loading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export function Btn({ variant = 'primary', size = 'md', loading = false, icon: Icon, disabled, className, children, type = 'button', ...rest }: BtnProps) {
  return (
    <button {...rest} type={type} disabled={disabled || loading} className={cx(btnBase, BTN_TONE[variant], BTN_SIZE[size], className)}>
      {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

/** Square icon-only button for row actions. */
export function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="rounded-[var(--tt-radius-sm)] p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40">
      {children}
    </button>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-56 2xl:h-10 2xl:w-72">
      <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm" />
    </div>
  );
}

/** Page header: title with an optional count badge and a ⓘ "How it works" button, one short line, then filters and buttons. */
export function PageHead({ title, count, subtitle, actions, help, children }: { title: React.ReactNode; count?: number; subtitle?: React.ReactNode; actions?: React.ReactNode; help?: PageHelp; children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
        <div className="min-w-0 xl:max-w-[40%]">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h1 className="flex flex-wrap items-center gap-2 text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">{title}</h1>
            {count !== undefined && <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted 2xl:text-sm">{count}</span>}
            {help && <IconBtn label="How it works" onClick={() => setOpen(true)}><Info className="h-4 w-4" /></IconBtn>}
          </div>
          {subtitle && <p className="mt-0.5 truncate text-[11px] text-fg-muted sm:text-xs" title={typeof subtitle === 'string' ? subtitle : undefined}>{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5 xl:shrink-0 xl:justify-end">{actions}</div>}
      </div>
      {children}
      {help && open && <HelpDialog help={help} onClose={() => setOpen(false)} />}
    </div>
  );
}

function HelpDialog({ help, onClose }: { help: PageHelp; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} title={`How it works: ${help.title}`} maxWidthClassName="max-w-xl">
      <div className="space-y-4 text-sm text-fg">
        <p>{help.intro}</p>
        <ol className="space-y-2">
          {help.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--tt-primary)] text-[10px] font-bold text-[var(--tt-on-primary)]">{i + 1}</span><span>{s}</span></li>
          ))}
        </ol>
        {help.terms && help.terms.length > 0 && (
          <dl className="divide-y divide-line/60 rounded-lg border border-line">
            {help.terms.map(([t, d]) => <div key={t} className="grid grid-cols-[7rem_1fr] gap-2 px-3 py-2 text-xs"><dt className="font-semibold">{t}</dt><dd className="text-fg-muted">{d}</dd></div>)}
          </dl>
        )}
      </div>
    </Dialog>
  );
}

/** The bordered box a list or table sits in, under the page header. */
export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs', className)}>{children}</div>;
}

/** A titled block inside a page body: title, a short note, an optional button on the right. */
export function Card({ title, note, right, children }: { title: React.ReactNode; note?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-line bg-surface p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-fg sm:text-[13px]">{title}{note && <span className="font-normal text-fg-muted"> · {note}</span>}</p>
        {right}
      </div>
      {children}
    </section>
  );
}

// Table cells as on the Roles screen: sticky grey header with small capitals, soft row lines.
export const th = 'border-b border-line bg-bg-subtle px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted select-none sm:px-4 sm:py-3 sm:text-xs lg:px-5 2xl:px-6 2xl:text-sm';
export const td = 'border-b border-line/60 px-3.5 py-2.5 align-middle text-xs text-fg sm:px-4 sm:py-3 sm:text-sm lg:px-5 2xl:px-6';

export function Table({ head, children, minWidth = 640 }: { head: Array<{ label: React.ReactNode; className?: string }>; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full border-separate border-spacing-0" style={{ minWidth }}>
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>{head.map((h, i) => <th key={i} className={cx(th, h.className)}>{h.label}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** A thin ink bar: value out of total. */
export function Progress({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-[var(--tt-primary)] transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export const cycleTone = (s: CycleStatus) => (s === 'closed' ? 'terminated' : s === 'draft' ? 'neutral' : 'active');

/** Where a cycle is in its life: done stages ticked, the current one filled, the rest outlined. */
export function StageStepper({ status }: { status: CycleStatus }) {
  const at = CYCLE_STAGES.findIndex((s) => s.status === status);
  return (
    <ol className="flex w-full items-start overflow-x-auto pb-1 tt-scroll-hidden">
      {CYCLE_STAGES.map((s, i) => {
        const done = i < at;
        const current = i === at;
        return (
          <li key={s.status} className="flex min-w-[96px] flex-1 flex-col items-center text-center" title={s.hint}>
            <div className="flex w-full items-center">
              <span className={`h-px flex-1 ${i === 0 ? 'opacity-0' : done || current ? 'bg-[var(--tt-primary)]' : 'bg-line'}`} />
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${current ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : done ? 'border-[var(--tt-primary)] bg-surface text-fg' : 'border-line bg-surface text-fg-muted'}`}>
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className={`h-px flex-1 ${i === CYCLE_STAGES.length - 1 ? 'opacity-0' : done ? 'bg-[var(--tt-primary)]' : 'bg-line'}`} />
            </div>
            <span className={`mt-1 text-[11px] ${current ? 'font-bold text-fg' : 'text-fg-muted'}`}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** A number with a label, for the row of figures at the top of a page. */
export function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3 shadow-[var(--tt-shadow-sm)]">
      <p className="text-[11px] font-semibold text-fg-muted">{label}</p>
      <div className="mt-1 text-xl font-extrabold leading-none text-fg sm:text-2xl">{value}</div>
      {note && <div className="mt-1 text-[11px] text-fg-muted">{note}</div>}
    </div>
  );
}
