import React from 'react';
import { cx } from '@/theme/tokens';

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs', className)}>{children}</div>;
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2.5 border-b border-line p-3 sm:p-3.5">{children}</div>;
}

export const th = 'px-3.5 py-2.5 sm:px-4 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle whitespace-nowrap';
export const td = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 align-middle text-xs sm:text-sm text-fg';

export function Empty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <h3 className="text-sm font-bold text-fg sm:text-base">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-fg-muted sm:text-sm">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-surface px-3.5 py-3">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="mt-1 truncate text-base font-bold text-fg sm:text-lg">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-fg-muted">{hint}</p>}
    </div>
  );
}
