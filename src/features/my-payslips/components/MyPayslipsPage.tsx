'use client';

import { Download } from 'lucide-react';
import { useMyPayslips } from '../hooks/useMyPayslips';
import { YearSelector } from './components/YearSelector';
import { PayslipCard } from './components/PayslipCard';
import { PayslipCardSkeleton } from './components/PayslipCardSkeleton';
import { MyPayslipsEmptyState } from './components/MyPayslipsEmptyState';

export function MyPayslipsPage() {
  const m = useMyPayslips();

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-fg sm:text-2xl">My payslips</h1>
          <p className="text-sm text-fg-muted">Monthly salary statements released by your employer</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!m.loading && m.payslips.length > 0 && (
            <button
              type="button"
              onClick={m.downloadAll}
              disabled={m.downloadingAll}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-fg bg-fg px-3 text-xs font-semibold text-fg-inverted transition-opacity hover:opacity-90 disabled:opacity-50 sm:text-sm"
            >
              {m.downloadingAll ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download all for {m.year}
            </button>
          )}
          <YearSelector year={m.year} years={m.years} onChange={m.setYear} />
        </div>
      </header>

      {m.error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{m.error}</p>}

      {m.loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <PayslipCardSkeleton />
        </div>
      ) : m.payslips.length === 0 ? (
        !m.error && <MyPayslipsEmptyState year={m.year} />
      ) : (
        <div className="grid grid-cols-1 gap-3 tt-fade-in sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {m.payslips.map((slip) => (
            <PayslipCard key={slip.id} slip={slip} downloading={m.downloadingId === slip.id} onDownload={m.download} />
          ))}
        </div>
      )}
    </div>
  );
}
