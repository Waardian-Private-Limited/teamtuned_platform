'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { messageOf, statusOf } from '@/lib/api/errors';
import { orgToday } from '@/lib/datetime';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/exits.api';
import { HR_REASONS, HR_TYPES, REASON_LABEL, TYPE_LABEL } from '../constants/exits.constants';
import type { ExitType, ReasonCategory } from '../types/exits';

/** HR starts an exit: the type, a reason and the last working day. It skips retention; a last day of today ends access now. */
export function StartExitDialog({ employee, onClose, onStarted }: { employee: { id: number; name: string; employee_code?: string | null } | null; onClose: () => void; onStarted: () => void }) {
  const router = useRouter();
  const [type, setType] = React.useState<ExitType | null>('termination');
  const [reason, setReason] = React.useState<ReasonCategory | null>(null);
  const [text, setText] = React.useState('');
  const [lwd, setLwd] = React.useState('');
  const [waived, setWaived] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { if (employee) { setType('termination'); setReason(null); setText(''); setLwd(orgToday()); setWaived(false); setErrors({}); } }, [employee]);
  React.useEffect(() => { const list = type ? HR_REASONS[type] : []; setReason(list.length === 1 ? list[0] : null); }, [type]);

  if (!employee) return null;
  const today = orgToday();

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!type) next.type = 'Choose a type';
    if (!reason) next.reason = 'Choose a reason';
    if (!lwd) next.lwd = 'Last working day is required';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const c = await api.startExit({ employee_id: employee.id, type: type!, reason_category: reason!, reason_text: text.trim() || undefined, last_working_day: lwd, notice_waived: waived || undefined });
      showSuccess(lwd <= today ? `${employee.name}'s exit is complete` : `Exit started for ${employee.name}`);
      onStarted();
      router.push(`/${window.location.pathname.startsWith('/employee') ? 'employee' : 'org-admin'}/exits/${c.id}`);
    } catch (e) {
      setErrors({ form: statusOf(e) === 409 ? 'This employee already has an exit in progress.' : messageOf(e) });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} title={<h2 className="text-sm font-bold text-fg sm:text-base">Start exit</h2>}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="danger" busy={busy} onClick={submit}>{lwd && lwd <= today ? 'End employment now' : 'Start exit'}</Btn></>}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted"><span className="font-semibold text-fg">{employee.name}</span>{employee.employee_code ? ` (${employee.employee_code})` : ''} stays active and keeps access until the last working day, then employment ends automatically. A last day of today ends access immediately.</p>
        {errors.form && <Alert message={errors.form} />}
        <SelectField<ExitType> label="Type" required value={type} onChange={setType} error={errors.type} options={HR_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />
        <SelectField<ReasonCategory> label="Reason" required value={reason} onChange={setReason} error={errors.reason} options={(type ? HR_REASONS[type] : []).map((r) => ({ value: r, label: REASON_LABEL[r] }))} />
        <Textarea label="Details" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} />
        <TextField label="Last working day" required type="date" value={lwd} onChange={setLwd} error={errors.lwd} />
        <label className="flex items-start gap-2 text-sm text-fg">
          <input type="checkbox" checked={waived} onChange={(e) => setWaived(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>Waive the notice period</span>
        </label>
      </div>
    </Dialog>
  );
}
