'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useManageableSubOrgs } from '../hooks/useManageableSubOrgs';

interface SubOrgFilterProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

// List-toolbar dropdown to narrow a list to one sub-organization. Hidden when
// the user has fewer than two sub-orgs (nothing to choose between). Selecting a
// value sends ?subOrgId to the list API, which filters server-side.
export function SubOrgFilter({ value, onChange }: SubOrgFilterProps) {
  const { subOrgs, loading } = useManageableSubOrgs();

  if (loading || subOrgs.length < 2) return null;

  return (
    <div className="relative">
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="h-9 appearance-none rounded-lg border border-line bg-surface pl-3 pr-8 text-xs font-semibold text-fg outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] cursor-pointer sm:text-sm"
        aria-label="Filter by sub-organization"
      >
        <option value="">All sub-orgs</option>
        {subOrgs.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
    </div>
  );
}
