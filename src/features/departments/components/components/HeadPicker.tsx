'use client';

import { useMemo } from 'react';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import type { DepartmentHead, HeadCandidate } from '../../types/departments.model';

interface HeadPickerProps {
  label: string;
  head: DepartmentHead | null;
  candidates: HeadCandidate[];
  candidatesLoading: boolean;
  disabled?: boolean;
  onSearch: (term: string) => void;
  onAssign: (employeeId: number) => void;
  onRemove: () => void;
}

export function HeadPicker({
  label,
  head,
  candidates,
  candidatesLoading,
  disabled,
  onSearch,
  onAssign,
  onRemove,
}: HeadPickerProps) {
  // The currently-assigned head must always resolve to an option, even when
  // they don't appear in the latest search results (a name search that
  // doesn't match them, or a since-changed department) — otherwise the
  // picker would silently show the placeholder instead of who is assigned.
  const options = useMemo<ComboboxOption[]>(() => {
    const base = candidates.map((c) => ({
      value: c.id,
      label: c.name,
      description: [c.designation, c.departmentName].filter(Boolean).join(' · ') || undefined,
    }));
    if (head && !base.some((o) => o.value === head.employeeId)) {
      base.unshift({ value: head.employeeId, label: head.name, description: head.designation ?? undefined });
    }
    return base;
  }, [candidates, head]);

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">{label}</label>
      <Combobox
        options={options}
        value={head?.employeeId ?? null}
        onChange={(value) => {
          if (value === null) onRemove();
          else onAssign(Number(value));
        }}
        placeholder="Unassigned"
        searchPlaceholder="Search employees…"
        disabled={disabled}
        loading={candidatesLoading}
        onSearch={onSearch}
        clearable={Boolean(head)}
      />
    </div>
  );
}
