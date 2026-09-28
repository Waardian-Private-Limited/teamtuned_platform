'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { useManageableSubOrgs } from '../hooks/useManageableSubOrgs';

interface SubOrgMultiPickerProps {
  value: number[];
  onChange: (value: number[]) => void;
  // OrgAdmin may leave the set empty (site becomes org-wide/shared). A scoped
  // user with a single sub-org has it auto-selected and locked.
  allowShared?: boolean;
  disabled?: boolean;
}

// Multi-select for entities that belong to several sub-organizations (sites,
// via site_sub_org_mappings). Empty selection = shared/org-wide.
export function SubOrgMultiPicker({ value, onChange, allowShared = false, disabled = false }: SubOrgMultiPickerProps) {
  const { subOrgs, loading, error } = useManageableSubOrgs();

  const lockedSingle = subOrgs.length === 1 && !allowShared;

  // A scoped single-sub-org user always maps to their one sub-org.
  React.useEffect(() => {
    if (lockedSingle && (value.length !== 1 || value[0] !== subOrgs[0].id)) {
      onChange([subOrgs[0].id]);
    }
  }, [lockedSingle, subOrgs, value, onChange]);

  if (loading) {
    return <div className="h-10 w-full animate-pulse rounded-lg border border-line bg-bg-subtle" />;
  }
  if (error) {
    return <p className="text-[11px] text-[var(--tt-danger)]">{error}</p>;
  }
  if (subOrgs.length === 0) {
    return null;
  }

  const toggle = (id: number) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  if (lockedSingle) {
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
        Sub-organizations {!allowShared && <span className="text-[var(--tt-danger)]">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {subOrgs.map((s) => {
          const selected = value.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(s.id)}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
                selected
                  ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 text-fg ring-1 ring-[var(--tt-primary)]'
                  : 'border-line bg-surface text-fg-muted hover:bg-bg-subtle'
              )}
            >
              {selected && <Check className="h-3.5 w-3.5" />}
              {s.name}
              <span className="text-[11px] text-fg-muted">({s.code})</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[11px] text-fg-muted">
        {allowShared
          ? 'Select none to keep this site org-wide (shared across every sub-organization).'
          : 'Select the sub-organizations this site belongs to.'}
      </p>
    </div>
  );
}
