'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { SubOrganizationRowActions } from './SubOrganizationRowActions';
import type { SubOrgRowProps } from './SubOrganizationTable';

export function SubOrganizationCardList({
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
    <>
      {subOrganizations.map((subOrg) => (
        <div key={subOrg.id} className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold text-fg">{subOrg.name}</span>
                {subOrg.isPrimary && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tt-primary)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--tt-primary)]">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    Primary
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[11px] tabular-nums text-fg-muted">{subOrg.code}</div>
              {subOrg.gstNumber && (
                <div className="mt-0.5 text-[11px] tabular-nums text-fg-subtle">GST {subOrg.gstNumber}</div>
              )}
              {subOrg.address && (
                <div className="mt-1 line-clamp-2 text-[11px] text-fg-muted">{subOrg.address}</div>
              )}
            </div>
            <StatusPill label={subOrg.status} tone={subOrg.status} />
          </div>

          <div className="mt-2.5 flex items-center justify-end">
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
          </div>
        </div>
      ))}
    </>
  );
}
