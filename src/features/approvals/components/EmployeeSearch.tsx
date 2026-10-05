'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FieldLabel, FieldMessage } from '@/components/ui/FormControls';
import * as api from '../api/approvals.api';
import type { EmployeeRef } from '../types/approvals';

interface Props {
  label: string;
  value: EmployeeRef[];
  onChange: (value: EmployeeRef[]) => void;
  multiple?: boolean;
  error?: string;
  excludeIds?: number[];
}

export function EmployeeSearch({ label, value, onChange, multiple = false, error, excludeIds = [] }: Props) {
  const [term, setTerm] = React.useState('');
  const [results, setResults] = React.useState<EmployeeRef[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const request = React.useRef(0);
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const id = ++request.current;
    setLoading(true);
    const t = setTimeout(() => {
      api.searchEmployees(term.trim())
        .then((rows) => id === request.current && setResults(rows))
        .catch(() => id === request.current && setResults([]))
        .finally(() => id === request.current && setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [term, open]);

  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const chosen = new Set(value.map((v) => v.id));
  const pick = (e: EmployeeRef) => {
    if (!multiple) { onChange([e]); setOpen(false); setTerm(''); return; }
    onChange(chosen.has(e.id) ? value.filter((v) => v.id !== e.id) : [...value, e]);
  };
  const visible = results.filter((r) => !excludeIds.includes(r.id));

  return (
    <div ref={root} className="relative">
      <FieldLabel label={label} />
      <div
        className={cx('flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border bg-surface px-2.5 py-1.5', error ? 'border-[var(--tt-danger)]' : 'border-line')}
        onClick={() => setOpen(true)}
      >
        {value.map((v) => (
          <span key={v.id} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle px-2 py-0.5 text-xs text-fg">
            {v.name}
            <button type="button" aria-label={`Remove ${v.name}`} onClick={(ev) => { ev.stopPropagation(); onChange(value.filter((x) => x.id !== v.id)); }}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <span className="flex min-w-[8rem] flex-1 items-center gap-1.5">
          <Search className="h-3.5 w-3.5 text-fg-subtle" />
          <input
            value={term}
            onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={value.length && !multiple ? '' : 'Search by name or code'}
            className="h-7 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
        </span>
      </div>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-surface py-1 shadow-[var(--tt-shadow-lg)]">
          {loading && <li className="px-3 py-2 text-xs text-fg-muted">Searching…</li>}
          {!loading && visible.length === 0 && <li className="px-3 py-2 text-xs text-fg-muted">No employees found</li>}
          {visible.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => pick(r)} className={cx('flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg-subtle', chosen.has(r.id) && 'bg-bg-subtle')}>
                <span className="text-fg">{r.name}</span>
                <span className="text-xs text-fg-muted">{[r.code, r.department].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <FieldMessage error={error} />
    </div>
  );
}
