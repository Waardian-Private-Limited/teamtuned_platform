'use client';

import React from 'react';
import { Eye, FileSpreadsheet, Play, RefreshCw, X } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { PAGE_SIZE_OPTIONS } from '../../constants/payrollRuns.constants';
import type { usePreview } from '../../hooks/usePreview';
import type { FilterOption, PayItem, Run } from '../../types/payrollRuns.model';
import { dateText, money } from '../../utils/format';
import { actionBtn, Spinner } from './controls';
import { ItemCardList, ItemsTable } from './ItemsTable';
import { ItemsToolbar } from './ItemsToolbar';
import { PayrollEmptyState } from './PayrollEmptyState';

type PreviewState = ReturnType<typeof usePreview>;

async function exportExcel(run: Run, items: PayItem[]) {
  const XLSX = await import('xlsx');
  const rows = items.map((i) => ({
    'Employee code': i.employee.code || '',
    Employee: i.employee.name,
    Site: i.site || '',
    Department: i.department || '',
    Status: i.status,
    'Cycle days': i.cycleDays,
    'Payable days': i.payableDays,
    'LOP days': i.lopDays,
    'Leave days': i.leaveDays,
    'Monthly gross': i.monthlyGross ?? 0,
    Earnings: i.earnings,
    Deductions: i.deductions,
    'Employer cost': i.employer,
    'Net pay': i.netPay,
    Notes: i.warnings.map((w) => w.message).join('; '),
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Preview');
  const name = `Payroll_preview_${run.companyName.replace(/[^\w]+/g, '_')}_${run.month}.xlsx`;
  XLSX.writeFile(book, name);
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-fg-muted sm:text-[11px]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-fg">{value}</p>
    </div>
  );
}

export function PreviewPanel({
  run,
  pv,
  canEdit,
  starting,
  onStart,
  onClose,
  onView,
  sites,
  departments,
}: {
  run: Run;
  pv: PreviewState;
  canEdit: boolean;
  starting: boolean;
  onStart: () => void;
  onClose: () => void;
  onView: (item: PayItem) => void;
  sites: FilterOption[];
  departments: FilterOption[];
}) {
  const [exporting, setExporting] = React.useState(false);
  const p = pv.preview;
  const done = p?.state === 'done';
  const pct = p && p.total > 0 ? Math.min(100, Math.round((p.done / p.total) * 100)) : 0;

  return (
    <section className="relative flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-xl border border-dashed border-line-strong bg-surface shadow-xs">
      <div className="flex flex-col gap-3 border-b border-line bg-bg-subtle/60 p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface">
            <Eye className="h-3.5 w-3.5 text-fg" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-fg">
              Preview · {run.companyName} · {run.periodLabel}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              Calculated like a real payroll, but nothing is saved and nobody is paid.
              {done && p?.computedAt ? ` Calculated ${dateText(p.computedAt)}.` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={actionBtn.secondary} onClick={pv.refresh} disabled={pv.running || pv.loading}>
            {pv.running ? <Spinner /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
          </button>
          <button
            type="button"
            className={actionBtn.secondary}
            disabled={!done || exporting || pv.all.length === 0}
            onClick={async () => {
              setExporting(true);
              try {
                await exportExcel(run, pv.all);
              } finally {
                setExporting(false);
              }
            }}
          >
            {exporting ? <Spinner /> : <FileSpreadsheet className="h-3.5 w-3.5" />} Export Excel
          </button>
          {canEdit && (
            <button type="button" className={actionBtn.primary} onClick={onStart} disabled={starting || !done}>
              {starting ? <Spinner /> : <Play className="h-3.5 w-3.5" />} Start this payroll
            </button>
          )}
          <button type="button" aria-label="Close preview" className={actionBtn.secondary} onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {done && p?.totals && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-b border-line px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
          <Figure label="Net pay" value={money(p.totals.net)} />
          <Figure label="Employees" value={String(p.totals.employees)} />
          <Figure label="Gross" value={money(p.totals.gross)} />
          <Figure label="Deductions" value={money(p.totals.deductions)} />
          <Figure label="Employer cost" value={money(p.totals.employer)} />
          <Figure label="Errors · warnings" value={`${p.totals.errors} · ${p.totals.warnings}`} />
        </div>
      )}

      {pv.error && <p className="border-b border-line px-4 py-2.5 text-xs font-medium text-[var(--tt-danger)]">{pv.error}</p>}
      {p?.state === 'failed' && <p className="border-b border-line px-4 py-2.5 text-xs font-medium text-[var(--tt-danger)]">{p.error}</p>}

      {!done ? (
        pv.error || p?.state === 'failed' ? null : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm font-semibold text-fg">Calculating salaries…</p>
            <div className="w-64">
              <div className="flex items-center justify-between text-[11px] font-semibold text-fg-muted">
                <span>{p ? 'Employees done' : 'Starting'}</span>
                <span className="tabular-nums">
                  {p?.done ?? 0}/{p?.total || run.totals.employees || '—'}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
                <div className="h-full origin-left rounded-full bg-fg transition-transform duration-500" style={{ transform: `scaleX(${pct / 100})` }} />
              </div>
            </div>
            <p className="max-w-sm text-xs text-fg-muted">You can keep working; the preview stays ready for about 10 minutes.</p>
          </div>
        )
      ) : (
        <>
          <ItemsToolbar
            title="Employees"
            total={pv.total}
            searchValue={pv.searchInput}
            onSearchChange={pv.setSearchInput}
            filters={pv.filters}
            onChange={pv.update}
            sites={sites}
            departments={departments}
            counts={pv.counts}
          />
          {pv.items.length === 0 ? (
            pv.narrowed ? (
              <PayrollEmptyState
                image="/vectors/review.svg"
                title="No employees match"
                description="Nobody in this preview matches the search and filters you picked."
                action={{ label: 'Clear filters', onClick: pv.clear, icon: 'reset' }}
              />
            ) : (
              <PayrollEmptyState image="/vectors/credit.svg" title="Nobody to pay" description="No employee is paid by this company in this period." />
            )
          ) : (
            <>
              <div className="hidden min-h-0 flex-1 md:block">
                <ItemsTable items={pv.items} filters={pv.filters} onSort={pv.toggleSort} onView={onView} />
              </div>
              <div className="md:hidden">
                <ItemCardList items={pv.items} onView={onView} />
              </div>
              <div className="border-t border-line px-4 py-2.5">
                <Pagination
                  currentPage={pv.page}
                  totalPages={pv.totalPages}
                  totalItems={pv.total}
                  pageSize={pv.pageSize}
                  onPageChange={pv.setPage}
                  onPageSizeChange={pv.setPageSize}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                />
              </div>
            </>
          )}
        </>
      )}
      <span className="sr-only" aria-live="polite">
        {done ? 'Preview ready' : 'Calculating preview'}
      </span>
    </section>
  );
}
