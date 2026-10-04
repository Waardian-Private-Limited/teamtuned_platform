'use client';

import { Plus, Search } from 'lucide-react';
import { btnPrimary } from './catalogUi';

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-56 2xl:h-10 2xl:w-72">
      <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ml-2 w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle focus:ring-0"
      />
    </div>
  );
}

export function PageHeader({ title, count, hint, children }: { title: string; count?: number; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">{title}</h1>
          {count !== undefined && (
            <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted">{count}</span>
          )}
        </div>
        {hint && <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">{hint}</p>}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">{children}</div>
    </div>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={btnPrimary}>
      <Plus className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}
