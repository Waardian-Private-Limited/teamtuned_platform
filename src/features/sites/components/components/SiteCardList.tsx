'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import { cx, text } from '@/theme/tokens';
import type { Site } from '../../types/sites.model';
import { formatCurrency } from '../../utils/format';
import { SiteRowActions } from './SiteRowActions';

interface SiteCardListProps {
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

export function SiteCardList({
  sites,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleStatus,
  onOpenBudget,
  onOpenIncharges,
  togglingId,
}: SiteCardListProps) {
  return (
    <>
      {sites.map((site) => (
        <div key={site.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="truncate text-sm font-medium text-fg">{site.name}</div>
                {site.isHeadOffice && (
                  <span className="inline-flex items-center rounded-full bg-[var(--tt-primary)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--tt-primary)]">
                    HQ
                  </span>
                )}
              </div>
              <div className={cx(text.caption, 'mt-0.5')}>
                {site.code}
                {[site.city, site.state].filter(Boolean).length > 0 && (
                  <> · {[site.city, site.state].filter(Boolean).join(', ')}</>
                )}
              </div>
            </div>
            <StatusPill label={site.status} tone={site.status} />
          </div>

          {site.hasBudget && site.budgetAmount !== null && (
            <div className="mt-2">
              <div className={cx(text.caption, 'text-[11px]')}>
                <span className="font-medium text-fg">{formatCurrency(site.budgetUsed)}</span> used of{' '}
                {formatCurrency(site.budgetAmount)}
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
                <div
                  className={cx(
                    'h-full rounded-full',
                    site.budgetUsed > site.budgetAmount ? 'bg-[var(--tt-danger)]' : 'bg-[var(--tt-primary)]'
                  )}
                  style={{
                    width: `${site.budgetAmount > 0 ? Math.min(100, (site.budgetUsed / site.budgetAmount) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="mt-3 flex justify-end">
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
          </div>
        </div>
      ))}
    </>
  );
}
