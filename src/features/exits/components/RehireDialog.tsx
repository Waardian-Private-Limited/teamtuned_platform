'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import * as employeesApi from '@/features/employees/api/employees.api';
import { usePermission } from '@/lib/hooks/usePermission';
import { messageOf, statusOf } from '@/lib/api/errors';
import { orgToday } from '@/lib/datetime';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/exits.api';
import { EXIT_PERMISSIONS, REHIRE_LABEL } from '../constants/exits.constants';
import type { RehireEligibility } from '../types/exits';

export interface RehireTarget { id: number; name: string; employee_code?: string | null }

/**
 * Rejoin an exited employee as a new record. Warns when the last exit marked them not eligible (or conditional);
 * only someone with EXIT_MANAGE can override a "not eligible" mark, and must give a reason.
 */
export function RehireDialog({ employee, onClose, onDone }: { employee: RehireTarget | null; onClose: () => void; onDone?: (newEmployeeId: number) => void }) {
  const router = useRouter();
  const { can } = usePermission();
  const canOverride = can(EXIT_PERMISSIONS.MANAGE);
  const [eligibility, setEligibility] = React.useState<RehireEligibility | null>(null);
  const [types, setTypes] = React.useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [joining, setJoining] = React.useState('');
  const [code, setCode] = React.useState('');
  const [typeId, setTypeId] = React.useState<number | null>(null);
  const [ctc, setCtc] = React.useState('');
  const [pastService, setPastService] = React.useState(false);
  const [override, setOverride] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!employee) return;
    setJoining(orgToday()); setCode(''); setTypeId(null); setCtc(''); setPastService(false); setOverride(''); setErrors({}); setEligibility(null); setLoading(true);
    let live = true;
    Promise.all([
      api.career(employee.id).catch(() => []),
      employeesApi.getFormOptions(null, false).catch(() => null),
    ]).then(([stints, opts]) => {
      if (!live) return;
      const own = stints.find((s) => s.employee_id === employee.id) ?? stints[stints.length - 1];
      setEligibility(own?.rehire_eligibility ?? null);
      setTypes((opts?.employment_types ?? []).map((t) => ({ id: t.id, name: t.name })));
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [employee]);

  if (!employee) return null;
  const blocked = eligibility === 'no';
  const needsOverride = blocked;

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!joining) next.joining = 'Joining date is required';
    if (!typeId) next.type = 'Choose an employment type';
    if (!(Number(ctc) > 0)) next.ctc = 'Enter the annual CTC';
    if (needsOverride && !override.trim()) next.override = 'A reason is required to rehire someone marked not eligible';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const r = await api.rehire(employee.id, {
        joining_date: joining, employee_code: code.trim() || undefined, employment_type_id: typeId!, count_past_service: pastService || undefined,
        override_reason: needsOverride ? override.trim() : undefined, salary: { ctc: Number(ctc) },
      });
      showSuccess(`${employee.name} is rehired`);
      onDone?.(r.employee_id);
      const portal = window.location.pathname.startsWith('/org-admin') ? '/org-admin/employees' : '/employee/employee-management';
      if (r.employee_id) router.push(`${portal}/${r.employee_id}`);
    } catch (e) {
      setErrors({ form: statusOf(e) === 409 && !needsOverride ? `${messageOf(e)} Add an override reason to continue.` : messageOf(e) });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} maxWidthClassName="max-w-xl" title={<h2 className="text-sm font-bold text-fg sm:text-base">Rehire {employee.name}</h2>}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} disabled={loading || (blocked && !canOverride)} onClick={submit}>Rehire</Btn></>}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">A new employee record is created from the old one (personal, bank and identity details). Leave starts fresh and the career history links both stints.</p>
        {errors.form && <Alert message={errors.form} />}
        {eligibility === 'no' && <Alert message={canOverride ? `Last exit: ${REHIRE_LABEL.no}. Give a reason to override.` : `Last exit: ${REHIRE_LABEL.no}. Only HR with exit management access can override this.`} />}
        {eligibility === 'conditional' && <Alert message="Last exit: rehire is conditional. Check the exit note before continuing." />}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="New joining date" required type="date" value={joining} onChange={setJoining} error={errors.joining} />
          <TextField label="Employee code" value={code} onChange={setCode} hint="Leave empty to use the next code" />
          <SelectField<number> label="Employment type" required value={typeId} onChange={setTypeId} error={errors.type} options={types.map((t) => ({ value: t.id, label: t.name }))} />
          <TextField label="Annual CTC" required inputMode="decimal" prefix="₹" value={ctc} onChange={(v) => setCtc(v.replace(/[^\d.]/g, ''))} error={errors.ctc} />
        </div>
        <label className="flex items-start gap-2 text-sm text-fg">
          <input type="checkbox" checked={pastService} onChange={(e) => setPastService(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>Count past service for gratuity<span className="block text-xs text-fg-muted">Otherwise gratuity counts from the new joining date.</span></span>
        </label>
        {needsOverride && canOverride && <Textarea label="Override reason" required value={override} error={errors.override} maxLength={500} onChange={(e) => setOverride(e.target.value)} />}
      </div>
    </Dialog>
  );
}
