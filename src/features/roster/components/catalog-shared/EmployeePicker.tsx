'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { useTeamsEmployeeSearch } from '../../hooks/useTeamsEmployeeSearch';
import type { EmployeeLite } from '../../types/roster.types';
import { personName } from './catalogUi';
import { Spinner } from './Spinner';

interface Props {
  subOrgId?: number | null;
  placeholder?: string;
  excludeIds?: number[];
  onPick: (e: EmployeeLite) => void;
  keepOpen?: boolean;
}

export function EmployeePicker({ subOrgId, placeholder = 'Search by name or employee code…', excludeIds = [], onPick, keepOpen }: Props) {
  const [term, setTerm] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);
  const { results, loading } = useTeamsEmployeeSearch(term, subOrgId, open);

  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const list = results.filter((r) => !excludeIds.includes(r.id)).slice(0, 30);

  return (
    <div ref={root} className="relative">
      <div className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)]">
        <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
        <input
          value={term}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          className="w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle focus:ring-0"
        />
        {loading && <Spinner />}
      </div>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-[var(--tt-shadow-lg)]">
          {list.length === 0 && <li className="px-3 py-2 text-xs text-fg-muted">{loading ? 'Searching…' : 'No people found'}</li>}
          {list.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(e);
                  if (!keepOpen) {
                    setOpen(false);
                    setTerm('');
                  }
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left hover:bg-bg-subtle"
              >
                <span className="truncate text-sm font-medium text-fg">{personName(e)}</span>
                <span className="shrink-0 text-[11px] text-fg-muted">{[e.employee_code, e.role_name].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
