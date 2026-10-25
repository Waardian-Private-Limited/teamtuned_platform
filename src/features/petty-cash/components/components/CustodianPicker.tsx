'use client';

import React from 'react';
import { Check, Search, Star, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FieldLabel, FieldMessage } from '@/components/ui/FormControls';
import * as employeesApi from '@/features/employees/api/employees.api';

export interface PickedCustodian {
  id: number;
  name: string;
  code: string | null;
}

interface CustodianPickerProps {
  value: PickedCustodian[];
  onChange: (v: PickedCustodian[]) => void;
  primaryId: number | null;
  onPrimaryChange: (id: number | null) => void;
  /** Narrows the search to one company's employees. */
  subOrgId?: number | null;
  error?: string;
}

/** Multi-picker over the employee search; one picked person can be starred as the primary custodian. */
export function CustodianPicker({ value, onChange, primaryId, onPrimaryChange, subOrgId, error }: CustodianPickerProps) {
  const [term, setTerm] = React.useState('');
  const [results, setResults] = React.useState<PickedCustodian[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const request = React.useRef(0);
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const id = ++request.current;
    setLoading(true);
    const t = setTimeout(() => {
      employeesApi
        .listEmployees({ search: term.trim(), status: 'Active', page: 1, pageSize: 20, subOrgId: subOrgId ?? null })
        .then((dto) => id === request.current && setResults((dto.employees || []).map((e) => ({ id: e.id, name: e.name, code: e.employee_code }))))
        .catch(() => id === request.current && setResults([]))
        .finally(() => id === request.current && setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [term, open, subOrgId]);

  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const picked = new Set(value.map((v) => v.id));
  const toggle = (e: PickedCustodian) => {
    if (picked.has(e.id)) remove(e.id);
    else onChange([...value, e]);
  };
  const remove = (id: number) => {
    onChange(value.filter((v) => v.id !== id));
    if (primaryId === id) onPrimaryChange(null);
  };

  return (
    <div ref={root} className="relative">
      <FieldLabel label="Custodians" required aside={value.length ? <span className="mb-1.5 text-[11px] text-fg-muted">{value.length} selected</span> : undefined} />
      <div
        className={cx(
          'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border bg-surface px-2.5 py-1.5 transition-colors',
          error ? 'border-[var(--tt-danger)]' : open ? 'border-[var(--tt-primary)] ring-1 ring-[var(--tt-primary)]' : 'border-line'
        )}
        onClick={() => setOpen(true)}
      >
        {value.map((v) => (
          <span key={v.id} className="inline-flex items-center gap-1 rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg">
            <button
              type="button"
              aria-label={primaryId === v.id ? `${v.name} is the primary custodian` : `Make ${v.name} the primary custodian`}
              aria-pressed={primaryId === v.id}
              onClick={(ev) => {
                ev.stopPropagation();
                onPrimaryChange(primaryId === v.id ? null : v.id);
              }}
            >
              <Star className={cx('h-3 w-3', primaryId === v.id ? 'fill-current text-fg' : 'text-fg-muted')} aria-hidden />
            </button>
            {v.name}
            <button type="button" aria-label={`Remove ${v.name}`} onClick={(ev) => { ev.stopPropagation(); remove(v.id); }}>
              <X className="h-3 w-3 text-fg-muted" aria-hidden />
            </button>
          </span>
        ))}
        <span className="flex min-w-[8rem] flex-1 items-center gap-1.5">
          <Search className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
          <input
            value={term}
            aria-label="Search employees"
            onFocus={() => setOpen(true)}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search name or code"
            className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
        </span>
      </div>
      {open && (
        <ul className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-[var(--tt-shadow-md)] tt-scroll-hidden">
          {loading && <li className="px-3 py-2.5 text-xs text-fg-muted">Searching…</li>}
          {!loading && !results.length && <li className="px-3 py-2.5 text-xs text-fg-muted">No employees match</li>}
          {!loading &&
            results.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => toggle(e)} className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left hover:bg-bg-subtle">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-fg">{e.name}</span>
                    {e.code && <span className="block truncate text-[11px] text-fg-muted">{e.code}</span>}
                  </span>
                  {picked.has(e.id) && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                </button>
              </li>
            ))}
        </ul>
      )}
      <FieldMessage error={error} hint="Tap the star to mark the primary custodian." />
    </div>
  );
}
