'use client';

import React from 'react';
import { useManageableSubOrgs } from '../hooks/useManageableSubOrgs';

interface SubOrgPickerProps {
  value: number | null;
  onChange: (value: number | null) => void;
  // When true, offers an "Organization-wide (shared)" option (value null).
  // Typically enabled for OrgAdmin, who may create shared records.
  allowShared?: boolean;
  disabled?: boolean;
}

// Sub-organization selector for create/edit forms. Behavior follows the
// user's manageable set:
//   - 0 sub-orgs: nothing to pick — renders nothing, value stays null (shared).
//   - exactly 1 and no shared option: auto-selects it, shows a read-only chip.
//   - otherwise: a dropdown (with an org-wide/shared option when allowShared).
export function SubOrgPicker({ value, onChange, allowShared = false, disabled = false }: SubOrgPickerProps) {
  const { subOrgs, loading, error } = useManageableSubOrgs();

  const single = subOrgs.length === 1 && !allowShared;

  // Auto-select the only option so a scoped single-sub-org user submits it
  // without an extra tap.
  React.useEffect(() => {
    if (single && value !== subOrgs[0].id) {
      onChange(subOrgs[0].id);
    }
  }, [single, subOrgs, value, onChange]);

  if (loading) {
    return <div className="h-10 w-full animate-pulse rounded-lg border border-line bg-bg-subtle" />;
  }
  if (error) {
    return <p className="text-[11px] text-[var(--tt-danger)]">{error}</p>;
  }
  if (subOrgs.length === 0) {
    return null; // no sub-orgs configured / assigned — record is org-wide
  }

  if (single) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Sub-organization</label>
        <div className="flex h-10 w-full items-center rounded-lg border border-line bg-bg-subtle px-3 text-sm text-fg">
          {subOrgs[0].name}
          <span className="ml-2 text-[11px] text-fg-muted">({subOrgs[0].code})</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">
        Sub-organization {!allowShared && <span className="text-[var(--tt-danger)]">*</span>}
      </label>
      <div className="relative flex h-10 w-full items-center rounded-lg border border-line bg-surface px-3 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)]">
        <select
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none focus:ring-0"
        >
          {allowShared ? (
            <option value="">Organization-wide (shared)</option>
          ) : (
            <option value="" disabled>
              Select a sub-organization…
            </option>
          )}
          {subOrgs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </div>
      <p className="mt-1 text-[11px] text-fg-muted">
        {allowShared
          ? 'Leave org-wide to share across every sub-organization, or scope to one.'
          : 'This record belongs to the selected sub-organization.'}
      </p>
    </div>
  );
}
