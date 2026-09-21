'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { StatusPill } from '@/components/ui/StatusPill';
import { SubOrganizationRowActions } from './SubOrganizationRowActions';
import type { SubOrganization } from '../../types/sub-organizations.model';

const headerClass =
  'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle';
const cellClass = 'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4 border-b border-line/60';
const textClass = 'text-xs sm:text-sm 2xl:text-base';

export interface SubOrgRowProps {
  subOrganizations: SubOrganization[];
  canEdit: boolean;
  canDelete: boolean;
  settingPrimaryId: number | null;
  togglingId: number | null;
  onEdit: (subOrg: SubOrganization) => void;
  onDelete: (subOrg: SubOrganization) => void;
  onToggleStatus: (subOrg: SubOrganization) => void;
  onSetPrimary: (subOrg: SubOrganization) => void;
}

export function SubOrganizationTable({
  subOrganizations,
  canEdit,
  canDelete,
  settingPrimaryId,
  togglingId,
  onEdit,
  onDelete,
  onToggleStatus,
  onSetPrimary,
}: SubOrgRowProps) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[680px] md:min-w-0 border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={headerClass}>Entity</th>
            <th className={cx(headerClass, 'w-32 sm:w-36 lg:w-40')}>Code</th>
            <th className={cx(headerClass, 'hidden lg:table-cell')}>GST</th>
            <th className={cx(headerClass, 'w-28 sm:w-32')}>Status</th>
            <th className={cx(headerClass, 'w-28 sm:w-32 text-right')}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {subOrganizations.map((subOrg) => (
            <tr key={subOrg.id} className="transition-colors hover:bg-bg-subtle/50">
              <td className={cellClass}>
                <div className="flex items-center gap-2">
                  <span className={cx(textClass, 'font-semibold text-fg')}>{subOrg.name}</span>
                  {subOrg.isPrimary && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tt-primary)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--tt-primary)]">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      Primary
                    </span>
                  )}
                </div>
                {subOrg.address && (
                  <div className="mt-0.5 max-w-xs truncate text-[11px] text-fg-muted">{subOrg.address}</div>
                )}
              </td>
              <td className={cellClass}>
                <span className={cx(textClass, 'tabular-nums text-fg-muted')}>{subOrg.code}</span>
              </td>
              <td className={cx(cellClass, 'hidden lg:table-cell')}>
                <span className="text-xs tabular-nums text-fg-muted">{subOrg.gstNumber || '—'}</span>
              </td>
              <td className={cellClass}>
                <StatusPill label={subOrg.status} tone={subOrg.status} />
              </td>
              <td className={cellClass}>
                <SubOrganizationRowActions
                  subOrganization={subOrg}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleStatus={onToggleStatus}
                  onSetPrimary={onSetPrimary}
                  isToggling={togglingId === subOrg.id}
                  isSettingPrimary={settingPrimaryId === subOrg.id}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
