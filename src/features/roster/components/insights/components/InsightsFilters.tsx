'use client';

import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SelectField, TextField } from '@/components/ui/FormControls';
import type { RosterUnit } from '../../../types/roster.types';
import type { PeriodMode } from '../../../hooks/useInsights';

interface Props {
  units: RosterUnit[];
  unitId: number | null;
  onUnit: (id: number | null) => void;
  mode: PeriodMode;
  onMode: (m: PeriodMode) => void;
  month: string;
  onMonth: (v: string) => void;
  from: string;
  onFrom: (v: string) => void;
  to: string;
  onTo: (v: string) => void;
  rangeError: string;
}

export function InsightsFilters(p: Props) {
  return (
    <div className="grid gap-3 rounded-xl border border-line bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end sm:p-4">
      <SelectField<number>
        label="Team"
        value={p.unitId}
        numeric
        placeholder="Choose a team"
        onChange={p.onUnit}
        options={p.units.map((u) => ({ value: u.id, label: u.name }))}
      />
      <div>
        <span className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Period</span>
        <SegmentedControl
          options={[{ value: 'month', label: 'Month' }, { value: 'custom', label: 'Custom' }]}
          value={p.mode}
          onChange={p.onMode}
          className="w-full sm:w-44"
        />
      </div>
      {p.mode === 'month' ? (
        <TextField label="Month" type="month" value={p.month} onChange={p.onMonth} />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <TextField label="From" type="date" value={p.from} onChange={p.onFrom} />
          <TextField label="To" type="date" value={p.to} min={p.from} onChange={p.onTo} error={p.rangeError || undefined} />
        </div>
      )}
    </div>
  );
}
