'use client';

import React from 'react';
import { Combobox } from '@/components/ui/Combobox';
import * as employeesApi from '../../api/employees.api';
import type { ManagerDto } from '../../types/employees.dto';
import { FieldLabel, FieldMessage } from '@/components/ui/FormControls';

const DEBOUNCE_MS = 300;

export function ManagerPicker({ value, onChange, subOrgId, excludeId, error }: {
  value: ManagerDto | null;
  onChange: (value: ManagerDto | null) => void;
  subOrgId: number | null;
  excludeId: number | null;
  error?: string;
}) {
  const [results, setResults] = React.useState<ManagerDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = React.useRef(0);

  const search = React.useCallback((term: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const id = ++request.current;
      setLoading(true);
      employeesApi.searchManagers(term.trim(), subOrgId, excludeId)
        .then((dto) => id === request.current && setResults(dto.managers))
        .catch(() => id === request.current && setResults([]))
        .finally(() => id === request.current && setLoading(false));
    }, DEBOUNCE_MS);
  }, [subOrgId, excludeId]);

  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const options = React.useMemo(() => {
    const list = value && !results.some((r) => r.id === value.id) ? [value, ...results] : results;
    return list.map((m) => ({
      value: m.id,
      label: m.name,
      description: [m.employee_code, m.designation].filter(Boolean).join(' · ') || undefined,
    }));
  }, [results, value]);

  return (
    <div>
      <FieldLabel label="Reporting manager" />
      <Combobox
        options={options}
        value={value?.id ?? null}
        onChange={(id) => onChange(id === null ? null : [value, ...results].find((m) => m?.id === id) || null)}
        placeholder="Search by name or code"
        searchPlaceholder="Type a name, code, email…"
        emptyLabel="No matching employees"
        loading={loading}
        onSearch={search}
      />
      <FieldMessage error={error} />
    </div>
  );
}
