'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface YearSelectorProps {
  year: number;
  years: number[];
  onChange: (year: number) => void;
}

const stepClass =
  'inline-flex h-9 w-9 items-center justify-center text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';

export function YearSelector({ year, years, onChange }: YearSelectorProps) {
  const newest = Math.max(...years);
  const oldest = Math.min(...years);
  return (
    <div className="inline-flex h-9 items-stretch overflow-hidden rounded-lg border border-line bg-surface">
      <button type="button" aria-label="Previous year" disabled={year <= oldest} onClick={() => onChange(year - 1)} className={stepClass}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <select
        value={year}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Year"
        className="cursor-pointer appearance-none border-x border-line bg-surface px-4 text-center text-sm font-semibold text-fg outline-none focus:ring-1 focus:ring-[var(--tt-primary)]"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button type="button" aria-label="Next year" disabled={year >= newest} onClick={() => onChange(year + 1)} className={stepClass}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
