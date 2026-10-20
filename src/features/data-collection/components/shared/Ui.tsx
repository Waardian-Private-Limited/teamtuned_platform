'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '@/theme/tokens';

export function Card({ title, subtitle, action, children, className }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5', className)}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-bold text-fg">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-lg bg-bg-subtle', className)} />;
}

export function Tile({ icon: Icon, label, value, note, onClick }: { icon: LucideIcon; label: string; value: string | number; note?: string; onClick?: () => void }) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle"><Icon className="h-4 w-4" /></span>
        <span className="truncate text-xs font-semibold text-fg-muted">{label}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-2xl font-extrabold leading-none text-fg">{value}</div>
        {note && <div className="mt-1.5 truncate text-xs text-fg-muted">{note}</div>}
      </div>
    </>
  );
  const base = 'flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 text-left shadow-[var(--tt-shadow-sm)]';
  if (!onClick) return <div className={base}>{body}</div>;
  return <button type="button" onClick={onClick} className={cx(base, 'transition-colors hover:border-line-strong')}>{body}</button>;
}

const TONES: Record<string, string> = {
  good: 'border-[var(--tt-success)]/25 bg-[var(--tt-success-soft)] text-[var(--tt-success)]',
  bad: 'border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]',
  neutral: 'border-line bg-bg-subtle text-fg-muted',
  strong: 'border-fg bg-fg text-[var(--tt-on-primary)]',
};

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: keyof typeof TONES }) {
  return <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', TONES[tone])}>{label}</span>;
}

export const statusTone = (s: string): keyof typeof TONES =>
  ['approved', 'submitted', 'active'].includes(s) ? 'good' : ['rejected', 'missed', 'overdue', 'returned'].includes(s) ? 'bad' : ['open', 'in_review', 'in_progress'].includes(s) ? 'strong' : 'neutral';

export function Bar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-subtle"><div className="h-full rounded-full bg-fg" style={{ width: `${pct}%` }} /></div>
      <span className="w-9 text-right text-[11px] font-semibold tabular-nums text-fg-muted">{total ? `${pct}%` : '–'}</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-fg sm:text-xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-fg-muted sm:text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const BTN = 'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm';
const BTN_VARIANT = {
  primary: 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]',
  secondary: 'border border-line bg-surface text-fg hover:bg-bg-subtle',
  danger: 'bg-[var(--tt-danger)] text-white hover:opacity-90',
  ghost: 'text-fg-muted hover:bg-bg-subtle hover:text-fg',
};
export function Btn({ variant = 'secondary', busy, icon, children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN_VARIANT; busy?: boolean; icon?: ReactNode }) {
  return (
    <button type="button" {...rest} disabled={rest.disabled || busy} className={cx(BTN, BTN_VARIANT[variant], className)}>
      {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon}
      {children}
    </button>
  );
}

export function Checkbox({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-black" />
      <span className="min-w-0"><span className="block text-xs font-semibold text-fg sm:text-sm">{label}</span>{hint && <span className="block text-[11px] text-fg-muted">{hint}</span>}</span>
    </label>
  );
}

export const inputCls = (error?: boolean) =>
  cx('h-10 w-full min-w-0 rounded-lg border bg-surface px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:ring-1', error ? 'border-[var(--tt-danger)] focus:border-[var(--tt-danger)] focus:ring-[var(--tt-danger)]' : 'border-line focus:border-[var(--tt-primary)] focus:ring-[var(--tt-primary)]');

export function Labeled({ label, error, hint, children, required }: { label: string; error?: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">{label}{required && <span className="text-[var(--tt-danger)]"> *</span>}</span>
      {children}
      {error ? <span role="alert" className="mt-1.5 block text-xs font-medium text-[var(--tt-danger)]">{error}</span> : hint ? <span className="mt-1 block text-[11px] text-fg-muted">{hint}</span> : null}
    </label>
  );
}
