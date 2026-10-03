'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useManageableSubOrgs } from '../hooks/useManageableSubOrgs';

interface SubOrgFilterProps {
  value: number | null;
  onChange: (value: number | null) => void;
  className?: string;
  allLabel?: string;
}

// List-toolbar dropdown to narrow a list to one sub-organization. Hidden when
// the user has fewer than two sub-orgs (nothing to choose between). Selecting a
// value sends ?subOrgId to the list API, which filters server-side.
export function SubOrgFilter({ value, onChange, className, allLabel = 'All sub-orgs' }: SubOrgFilterProps) {
  const { subOrgs, loading } = useManageableSubOrgs();

  if (loading || subOrgs.length < 2) return null;

  return (
    <div className={className ? `relative ${className}` : 'relative'}>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="h-9 w-full appearance-none rounded-lg border border-line bg-surface pl-3 pr-8 text-xs font-semibold text-fg outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] cursor-pointer sm:text-sm 2xl:h-10 2xl:pr-9 2xl:text-base"
        aria-label="Filter by sub-organization"
      >
        <option value="">{allLabel}</option>
        {subOrgs.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted 2xl:right-3 2xl:h-4 2xl:w-4" />
    </div>
  );
}
