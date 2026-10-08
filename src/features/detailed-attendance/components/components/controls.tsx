'use client';

import { cx } from '@/theme/tokens';

export const controlClass = 'h-9 w-full min-w-0 rounded-[var(--tt-radius-control)] border border-line bg-surface px-3 text-sm font-semibold text-fg outline-none transition-colors hover:border-line-strong focus:border-[var(--tt-primary)] disabled:opacity-50';

export function Select({ label, value, options, onChange, allLabel, disabled }: {
  label: string; value: number | null; options: Array<{ id: number; name: string }>; onChange: (v: number | null) => void; allLabel: string; disabled?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</span>
      <select aria-label={label} className={controlClass} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}>
        <option value="">{allLabel}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
}

export function StringSelect({ label, value, options, onChange, allLabel, disabled }: {
  label: string; value: string | null; options: Array<{ id: string; name: string }>; onChange: (v: string | null) => void; allLabel: string; disabled?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</span>
      <select aria-label={label} className={controlClass} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
}

export function IconButton({ label, onClick, children, disabled, className }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean; className?: string }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className={cx('inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg focus-visible:outline-2 focus-visible:outline-[var(--tt-primary)] disabled:cursor-not-allowed disabled:opacity-40', className)}>
      {children}
    </button>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-lg bg-bg-subtle', className)} />;
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-11 w-11 text-sm' : size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs';
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
  return <span aria-hidden className={cx('flex shrink-0 items-center justify-center rounded-full border border-line bg-bg-subtle font-bold text-fg-muted', box)}>{letters}</span>;
}
