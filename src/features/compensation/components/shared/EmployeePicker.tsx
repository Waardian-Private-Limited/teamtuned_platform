'use client';

import React from 'react';
import { Check, Search, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FieldLabel, FieldMessage } from '@/components/ui/FormControls';
import * as api from '../../api/compensation.api';
import type { CompEmployeeDto } from '../../types/compensation.dto';
import { inr } from '../../utils/format';

export function EmployeePicker({ multiple = false, value, onChange, error, label = 'Employee' }: {
  multiple?: boolean;
  value: CompEmployeeDto[];
  onChange: (v: CompEmployeeDto[]) => void;
  error?: string;
  label?: string;
}) {
  const [term, setTerm] = React.useState('');
  const [results, setResults] = React.useState<CompEmployeeDto[]>([]);
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
        .then((dto) => id === request.current && setResults(dto.employees))
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

  const selected = new Set(value.map((v) => v.id));
  const pick = (e: CompEmployeeDto) => {
    if (!multiple) {
      onChange([e]);
      setOpen(false);
      setTerm('');
      return;
    }
    onChange(selected.has(e.id) ? value.filter((v) => v.id !== e.id) : [...value, e]);
  };

  return (
    <div ref={root} className="relative">
      <FieldLabel label={label} required aside={multiple && value.length ? <span className="mb-1.5 text-[11px] text-fg-muted">{value.length} selected</span> : undefined} />
      <div
        className={cx(
          'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border bg-surface px-2.5 py-1.5 transition-colors',
          error ? 'border-[var(--tt-danger)]' : open ? 'border-[var(--tt-primary)] ring-1 ring-[var(--tt-primary)]' : 'border-line'
        )}
        onClick={() => setOpen(true)}
      >
        {value.map((v) => (
          <span key={v.id} className="inline-flex items-center gap-1 rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg">
            {v.name}
            <button type="button" aria-label={`Remove ${v.name}`} onClick={(ev) => { ev.stopPropagation(); onChange(value.filter((x) => x.id !== v.id)); }}>
              <X className="h-3 w-3 text-fg-muted" />
            </button>
          </span>
        ))}
        {(multiple || !value.length) && (
          <span className="flex min-w-[8rem] flex-1 items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-fg-subtle" />
            <input
              value={term}
              onFocus={() => setOpen(true)}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search name or code"
              className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
            />
          </span>
        )}
      </div>
      {open && (
        <ul className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-[var(--tt-shadow-md)] tt-scroll-hidden">
          {loading && <li className="px-3 py-2.5 text-xs text-fg-muted">Searching…</li>}
          {!loading && !results.length && <li className="px-3 py-2.5 text-xs text-fg-muted">No employees with a salary match</li>}
          {!loading && results.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => pick(e)} className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left hover:bg-bg-subtle">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-fg">{e.name}</span>
                  <span className="block truncate text-[11px] text-fg-muted">{[e.employee_code, e.designation, e.ctc ? `CTC ${inr(e.ctc)}` : null].filter(Boolean).join(' · ')}</span>
                </span>
                {selected.has(e.id) && <Check className="h-4 w-4 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      <FieldMessage error={error} />
    </div>
  );
}
