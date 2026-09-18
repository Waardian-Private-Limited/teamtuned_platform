'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import { cx, text } from '@/theme/tokens';
import type { Site } from '../../types/sites.model';
import { formatCurrency } from '../../utils/format';
import { SiteRowActions } from './SiteRowActions';

interface SiteTableProps {
  sites: Site[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (site: Site) => void;
  onDelete: (site: Site) => void;
  onToggleStatus: (site: Site) => void;
  onOpenBudget: (site: Site) => void;
  onOpenIncharges?: (site: Site) => void;
  togglingId?: number | null;
}

const cellHeaderClass =
  'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle';

function BudgetCell({ site }: { site: Site }) {
  if (!site.hasBudget || site.budgetAmount === null) {
    return <span className="text-xs 2xl:text-sm text-fg-subtle">No budget</span>;
  }
  const usedPct = site.budgetAmount > 0 ? Math.min(100, (site.budgetUsed / site.budgetAmount) * 100) : 0;
  const over = site.budgetUsed > site.budgetAmount;
  return (
    <div className="min-w-0">
      <span className="block text-[11px] 2xl:text-xs text-fg-muted">
        <span className="font-semibold text-fg">{formatCurrency(site.budgetUsed)}</span> used of{' '}
        {formatCurrency(site.budgetAmount)}
      </span>
      <div className="mt-1 h-1.5 w-full max-w-28 overflow-hidden rounded-full bg-bg-subtle">
        <div
          className={cx('h-full rounded-full', over ? 'bg-[var(--tt-danger)]' : 'bg-[var(--tt-primary)]')}
          style={{ width: `${usedPct}%` }}
        />
      </div>
    </div>
  );
}

export function SiteTable({
  sites,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleStatus,
  onOpenBudget,
  onOpenIncharges,
  togglingId,
}: SiteTableProps) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[680px] lg:min-w-0 border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={cx(cellHeaderClass, 'first:rounded-tl-xl')}>Site</th>
            <th className={cellHeaderClass}>Location</th>
            <th className={cx(cellHeaderClass, 'w-40 sm:w-48 lg:w-56 2xl:w-64')}>Budget</th>
            <th className={cx(cellHeaderClass, 'w-28 sm:w-32 lg:w-36 2xl:w-44')}>Status</th>
            <th className={cx(cellHeaderClass, 'w-28 sm:w-32 lg:w-36 2xl:w-44 text-right last:rounded-tr-xl')}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site) => (
            <tr key={site.id} className="transition-colors hover:bg-bg-subtle/50">
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <div className="flex items-center gap-2">
                  <div className="text-xs sm:text-sm 2xl:text-base font-semibold text-fg">{site.name}</div>
                  <span className="hidden lg:inline-flex items-center rounded-md border border-line bg-bg-subtle px-1.5 py-0.5 text-[10px] 2xl:text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    {site.code}
                  </span>
                  {site.isHeadOffice && (
                    <span className="inline-flex items-center rounded-full bg-[var(--tt-primary)]/10 px-1.5 py-0.5 text-[10px] 2xl:text-xs font-semibold text-[var(--tt-primary)]">
                      HQ
                    </span>
                  )}
                </div>
                <div className={cx(text.caption, 'mt-0.5')}>
                  <span className="lg:hidden">{site.code}</span>
                </div>
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <div className="text-xs sm:text-sm 2xl:text-base text-fg">
                  {[site.city, site.state].filter(Boolean).join(', ') || '—'}
                </div>
                {site.country && <div className={cx(text.caption, 'mt-0.5')}>{site.country}</div>}
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <BudgetCell site={site} />
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <StatusPill label={site.status} tone={site.status} />
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <SiteRowActions
                  site={site}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleStatus={onToggleStatus}
                  onOpenBudget={onOpenBudget}
                  onOpenIncharges={onOpenIncharges}
                  isToggling={togglingId === site.id}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
