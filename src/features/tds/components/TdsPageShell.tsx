import React from 'react';

const selectClass =
  'h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg outline-none focus:border-[var(--tt-primary)]';

/** Page header and scroll area shared by the Income Tax (TDS) pages. */
export function TdsPageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  /** One plain line under the title. */
  description: string;
  /** Page-level selects (financial year, company). */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto tt-scroll-hidden pb-2">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 2xl:p-4">
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">{title}</h1>
          <p className="mt-0.5 text-xs text-fg-muted sm:text-sm">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function FySelect({ value, options, onChange }: { value: string; options: string[]; onChange: (fy: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Financial year" className={selectClass}>
      {options.map((fy) => (
        <option key={fy} value={fy}>FY {fy}</option>
      ))}
    </select>
  );
}

export function CompanySelect({
  value,
  options,
  onChange,
}: {
  value: number | null;
  options: Array<{ value: number | null; label: string }>;
  onChange: (company: number | null) => void;
}) {
  if (options.length < 2) return null;
  const keyOf = (v: number | null) => (v === null ? 'org' : String(v));
  return (
    <select value={keyOf(value)} onChange={(e) => onChange(e.target.value === 'org' ? null : Number(e.target.value))} aria-label="Company" className={selectClass}>
      {options.map((o) => (
        <option key={keyOf(o.value)} value={keyOf(o.value)}>{o.label}</option>
      ))}
    </select>
  );
}
