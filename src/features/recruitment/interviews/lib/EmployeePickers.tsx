'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { cx } from '@/theme/tokens';
import type { EmployeeOptionDto } from '../../shared/types/recruitment.dto';
import { initials } from './ui';

export interface EmployeeLite {
  id: number;
  name: string;
  meta?: string;
}

export function searchEmployees(search: string) {
  return apiClient.get<EmployeeOptionDto[] | { items: EmployeeOptionDto[] }>(
    '/recruitment/options/employees',
    { search: search || undefined },
    { withAuth: true }
  );
}

function toLite(e: EmployeeOptionDto): EmployeeLite {
  return { id: e.id, name: e.name, meta: [e.code, e.designation].filter(Boolean).join(' · ') || undefined };
}

/** Debounced server search of /recruitment/options/employees (limit 20 server side). */
export function useEmployeeSearch() {
  const [results, setResults] = useState<EmployeeLite[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const run = useCallback((term: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const mine = ++seq.current;
      setLoading(true);
      try {
        const res = await searchEmployees(term.trim());
        if (mine !== seq.current) return;
        const list = Array.isArray(res) ? res : res?.items || [];
        setResults(list.map(toLite));
      } catch {
        if (mine === seq.current) setResults([]);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 250);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { results, loading, search: run };
}

function toOption(e: EmployeeLite): ComboboxOption {
  return { value: e.id, label: e.name, description: e.meta };
}

/** Single employee select with server search. */
export function EmployeeSelect({
  value,
  onChange,
  placeholder = 'Search employee…',
  invalid,
  ariaLabel,
}: {
  value: EmployeeLite | null;
  onChange: (value: EmployeeLite | null) => void;
  placeholder?: string;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  const { results, loading, search } = useEmployeeSearch();
  const options = [...(value ? [value] : []), ...results.filter((r) => r.id !== value?.id)].map(toOption);
  return (
    <Combobox
      options={options}
      value={value?.id ?? null}
      loading={loading}
      onSearch={search}
      placeholder={placeholder}
      searchPlaceholder="Type a name or code"
      invalid={invalid}
      ariaLabel={ariaLabel}
      onChange={(v) => {
        if (v === null) return onChange(null);
        const found = results.find((r) => r.id === Number(v)) || (value?.id === Number(v) ? value : null);
        onChange(found);
      }}
    />
  );
}

/** Multi employee picker: a search box adds people, chips remove them. */
export function EmployeeMultiPicker({
  value,
  onChange,
  invalid,
  placeholder = 'Add interviewer…',
}: {
  value: EmployeeLite[];
  onChange: (value: EmployeeLite[]) => void;
  invalid?: boolean;
  placeholder?: string;
}) {
  const { results, loading, search } = useEmployeeSearch();
  const chosen = new Set(value.map((v) => v.id));
  const options = results.filter((r) => !chosen.has(r.id)).map(toOption);

  return (
    <div className="space-y-2">
      <Combobox
        options={options}
        value={null}
        loading={loading}
        onSearch={search}
        placeholder={placeholder}
        searchPlaceholder="Type a name or code"
        emptyLabel="No employees found"
        clearable={false}
        invalid={invalid}
        ariaLabel="Add panel member"
        onChange={(v) => {
          if (v === null) return;
          const found = results.find((r) => r.id === Number(v));
          if (found && !chosen.has(found.id)) onChange([...value, found]);
        }}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((e) => (
            <span key={e.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-subtle py-0.5 pl-0.5 pr-1.5 text-xs font-medium text-fg">
              <Avatar name={e.name} size="sm" />
              <span className="max-w-[10rem] truncate">{e.name}</span>
              <button
                type="button"
                aria-label={`Remove ${e.name}`}
                onClick={() => onChange(value.filter((v) => v.id !== e.id))}
                className="rounded p-0.5 text-fg-subtle hover:bg-surface hover:text-fg"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span
      title={name}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-surface font-bold text-fg',
        size === 'sm' ? 'h-5 w-5 text-[9px]' : 'h-7 w-7 text-[10px]',
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
