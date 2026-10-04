'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { FieldLabel, FieldMessage } from '@/components/ui/FormControls';
import { searchEmployees } from '../../../api/roster.api';
import type { OpenShift } from '../../../types/roster.types';
import { formatDay } from '../../../utils/rosterTime';

interface Props {
  shift: OpenShift;
  onClose: () => void;
  onAssign: (id: number, employeeId: number) => Promise<string | null>;
}

export function AssignDialog({ shift, onClose, onAssign }: Props) {
  const [term, setTerm] = useState('');
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<string | number | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchEmployees({ q: term });
        if (live) {
          setOptions(res.employees.map((e) => ({
            value: e.id,
            label: `${e.first_name} ${e.last_name}`.trim(),
            description: [e.role_name, e.employee_code].filter(Boolean).join(' · ') || undefined,
          })));
        }
      } catch {
        if (live) setOptions([]);
      } finally {
        if (live) setLoading(false);
      }
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [term]);

  const submit = async () => {
    if (!value) return setError('Choose who should work this shift');
    setSaving(true);
    setError('');
    const err = await onAssign(shift.id, Number(value));
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Assign open shift"
      footer={
        <>
          <Button variant="secondary" className="!h-10 !w-auto !px-4 !text-sm" onClick={onClose}>Close</Button>
          <Button className="!h-10 !w-auto !px-4 !text-sm" loading={saving} onClick={submit}>Assign</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          {shift.shift_name} on {formatDay(shift.work_date, { weekday: 'long', day: 'numeric', month: 'long' })}
          {shift.unit_name ? ` · ${shift.unit_name}` : ''}
        </p>
        <div>
          <FieldLabel label="Employee" />
          <div className={error ? 'rounded-lg ring-1 ring-[var(--tt-danger)]' : ''}>
            <Combobox options={options} value={value} onChange={setValue} onSearch={setTerm} loading={loading} searchPlaceholder="Search by name or code" clearable={false} placeholder="Choose an employee" />
          </div>
          <FieldMessage error={error} />
        </div>
      </div>
    </Dialog>
  );
}
