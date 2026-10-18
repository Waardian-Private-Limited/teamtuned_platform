'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { cx } from '@/theme/tokens';
import * as api from '../api/recruitment.api';
import { toEmployeeOptions } from '../types/recruitment.mapper';
import type { EmployeeOption, NamedRef } from '../types/recruitment.model';

/** Debounced server search against GET /recruitment/options/employees (limit 20). */
export function useEmployeeSearch() {
  const [results, setResults] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const search = useCallback((term: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const mine = ++seq.current;
      setLoading(true);
      try {
        const dto = await api.searchEmployees(term);
        if (mine === seq.current) setResults(toEmployeeOptions(dto));
      } catch {
        if (mine === seq.current) setResults([]);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 250);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { results, loading, search };
}

function toOption(e: EmployeeOption): ComboboxOption {
  return { value: e.id, label: e.name, description: [e.code, e.designation].filter(Boolean).join(' · ') || undefined };
}

interface EmployeePickerProps {
  value: NamedRef | null;
  onChange: (value: NamedRef | null) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  /** Ids to leave out of the results (e.g. already picked). */
  exclude?: number[];
}

/** Single employee picker with server search. Value carries the name so it renders before any search. */
export function EmployeePicker({ value, onChange, placeholder = 'Search employees…', invalid, disabled, ariaLabel, exclude }: EmployeePickerProps) {
  const { results, loading, search } = useEmployeeSearch();
  const options = useMemo(() => {
    const list = results.filter((r) => !exclude?.includes(r.id)).map(toOption);
    if (value?.id && !list.some((o) => o.value === value.id)) list.unshift({ value: value.id, label: value.name });
    return list;
  }, [results, value, exclude]);

  return (
    <Combobox
      options={options}
      value={value?.id ?? null}
      onChange={(v) => {
        if (v === null) { onChange(null); return; }
        const hit = results.find((r) => r.id === v);
        onChange({ id: Number(v), name: hit?.name || value?.name || `#${v}` });
      }}
      onSearch={search}
      loading={loading}
      placeholder={placeholder}
      searchPlaceholder="Type a name or code…"
      emptyLabel="No employees found"
      invalid={invalid}
      disabled={disabled}
      ariaLabel={ariaLabel}
    />
  );
}

interface EmployeeMultiPickerProps {
  value: NamedRef[];
  onChange: (value: NamedRef[]) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

/** Chips + an "add" picker. Used for default interviewers and interview panels. */
export function EmployeeMultiPicker({ value, onChange, placeholder = 'Add employee…', invalid, disabled, ariaLabel }: EmployeeMultiPickerProps) {
  const [resetKey, setResetKey] = useState(0);
  const ids = value.map((v) => v.id).filter((id): id is number => id !== null);
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((emp) => (
            <span key={emp.id ?? emp.name} className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-bg-subtle pl-2 pr-1 text-xs font-medium text-fg">
              {emp.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v.id !== emp.id))}
                  aria-label={`Remove ${emp.name}`}
                  className="rounded p-0.5 text-fg-muted hover:bg-surface hover:text-fg"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <div className={cx(disabled && 'pointer-events-none opacity-50')}>
        <EmployeePicker
          key={resetKey}
          value={null}
          exclude={ids}
          placeholder={placeholder}
          invalid={invalid}
          disabled={disabled}
          ariaLabel={ariaLabel}
          onChange={(emp) => {
            if (emp && !ids.includes(emp.id as number)) onChange([...value, emp]);
            setResetKey((k) => k + 1);
          }}
        />
      </div>
    </div>
  );
}
