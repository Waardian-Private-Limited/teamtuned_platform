'use client';

import { SquarePen } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Dialog } from '@/components/ui/Dialog';
import { cx, text } from '@/theme/tokens';
import type { Site } from '../../types/sites.model';
import { useSiteBudget } from '../../hooks/useSiteBudget';
import { formatCurrency, formatDate } from '../../utils/format';

interface SiteBudgetDialogProps {
  open: boolean;
  site: Site | null;
  canEdit?: boolean;
  onClose: () => void;
  onEditBudget: (site: Site) => void;
}

interface StatCardProps {
  label: string;
  value: number;
  hint?: string;
  accent?: 'default' | 'spent' | 'danger' | 'primary';
}

const ACCENT_CLASSES: Record<NonNullable<StatCardProps['accent']>, string> = {
  default: 'text-fg',
  spent: 'text-amber-600',
  danger: 'text-[var(--tt-danger)]',
  primary: 'text-[var(--tt-primary)]',
};

function StatCard({ label, value, hint, accent = 'default' }: StatCardProps) {
  return (
    <div className="rounded-lg border border-line bg-bg-subtle/40 p-3">
      <div className={cx('text-sm font-bold sm:text-base 2xl:text-lg tabular-nums', ACCENT_CLASSES[accent])}>
        {formatCurrency(value)}
      </div>
      <div className="mt-0.5 text-[11px] font-medium text-fg-muted">{label}</div>
      {hint && <div className="mt-0.5 text-[10px] text-fg-subtle">{hint}</div>}
    </div>
  );
}

export function SiteBudgetDialog({ open, site, canEdit, onClose, onEditBudget }: SiteBudgetDialogProps) {
  const siteId = open && site ? site.id : null;
  const { budget, isLoading, error, activePage, goToPage } = useSiteBudget(siteId);

  const titleNode = (
    <div>
      <h2 className="text-sm font-bold text-fg sm:text-base">Site Budget</h2>
      <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
        {site?.name ? `${site.name} · ${site.code}` : 'Budget overview'}
      </p>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={titleNode}
      maxWidthClassName="max-w-2xl"
      footer={
        site && canEdit ? (
          <button
            type="button"
            onClick={() => onEditBudget(site)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:text-sm"
          >
            <SquarePen className="h-3.5 w-3.5" />
            <span>Edit Budget</span>
          </button>
        ) : undefined
      }
    >
      {error && <Alert message={error} tone="error" />}

      {!error && (isLoading || !budget) ? (
        <div className="animate-pulse space-y-3">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-bg-subtle" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-bg-subtle/70" />
            ))}
          </div>
        </div>
      ) : budget ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <StatCard label="Total Budget" value={budget.stats.budget} hint="Cap for this site" />
            <StatCard label="Used" value={budget.stats.used} accent="spent" hint="Salaries allocated" />
            <StatCard
              label="Remaining"
              value={budget.stats.remaining}
              accent={budget.stats.remaining < 0 ? 'danger' : 'default'}
              hint="Available to allocate"
            />
            <StatCard label="Final Allocated" value={budget.stats.finalAllocated} hint="Project total" />
            <StatCard label="Approved" value={budget.stats.actualApproved} hint="Officially approved" />
            <StatCard label="Remaining Final" value={budget.stats.remainingFinal} accent="primary" hint="After total usage" />
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
              Active Salary Allocations {budget.activeTotal > 0 && <span className="text-fg-muted">({budget.activeTotal})</span>}
            </h3>
            {budget.active.length === 0 ? (
              <p className={cx(text.caption, 'mt-2')}>
                No budget is being consumed right now. Primary employees with a salary will appear here.
              </p>
            ) : (
              <div className="mt-2 overflow-hidden rounded-lg border border-line">
                {budget.active.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 border-b border-line/60 px-3 py-2 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-fg sm:text-sm">{row.employeeName}</div>
                      <div className={cx(text.caption, 'text-[11px]')}>
                        {row.designation || 'Employee'} · since {formatDate(row.createdAt)}
                      </div>
                    </div>
                    <div className="text-xs font-semibold tabular-nums text-fg sm:text-sm">
                      {formatCurrency(row.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {budget.activePages > 1 && (
              <div className="mt-2.5 flex items-center justify-between">
                <span className={text.caption}>
                  Page {budget.activePage} of {budget.activePages}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={budget.activePage <= 1}
                    onClick={() => goToPage(budget.activePage - 1)}
                    className="inline-flex h-7 items-center rounded-md border border-line px-2.5 text-[11px] font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={budget.activePage >= budget.activePages}
                    onClick={() => goToPage(budget.activePage + 1)}
                    className="inline-flex h-7 items-center rounded-md border border-line px-2.5 text-[11px] font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
