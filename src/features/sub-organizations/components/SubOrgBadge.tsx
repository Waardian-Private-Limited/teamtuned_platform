'use client';

import React from 'react';
import { useManageableSubOrgs } from '../hooks/useManageableSubOrgs';

interface SubOrgBadgeProps {
  // Single-owner entities (departments, roles, policies).
  subOrgId?: number | null;
  // Many-to-many entities (sites).
  subOrgIds?: number[];
  // If true, don't render "Org-wide" badge when no sub-org is assigned
  hideEmpty?: boolean;
}

const chipClass =
  'inline-flex items-center rounded-md border border-line bg-bg-subtle px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted';
const sharedClass =
  'inline-flex items-center rounded-md border border-dashed border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-subtle';

// Renders the owning sub-organization(s) for a row. NULL / empty is "Org-wide".
// Names resolve from the shared manageable-sub-orgs cache; an unknown id (e.g.
// a sub-org outside the viewer's scope) falls back to its code-less label.
export function SubOrgBadge({ subOrgId, subOrgIds, hideEmpty }: SubOrgBadgeProps) {
  const { subOrgs } = useManageableSubOrgs();
  const nameById = React.useMemo(() => new Map(subOrgs.map((s) => [s.id, s.name])), [subOrgs]);

  const ids = subOrgIds !== undefined ? subOrgIds : subOrgId != null ? [subOrgId] : [];

  if (ids.length === 0) {
    if (hideEmpty || subOrgs.length === 0) return null;
    return <span className={sharedClass}>Org-wide</span>;
  }

  return (
    <span className="inline-flex flex-wrap gap-1">
      {ids.map((id) => (
        <span key={id} className={chipClass}>
          {nameById.get(id) ?? `Sub-org #${id}`}
        </span>
      ))}
    </span>
  );
}
