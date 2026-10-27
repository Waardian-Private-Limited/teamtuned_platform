'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { OptionCard, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { REG_ACTIONS } from '../../constants/labour.constants';
import type { Labourer, LabourSettings, RegAction } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { daysAgo, getOrgTimezone, today } from '../../utils/format';
import { LabourerPicker } from '../shared/FormBits';
import { FormError, primaryBtn, secondaryBtn } from '../shared/Primitives';

export interface RegPrefill {
  action?: RegAction;
  lockAction?: boolean;
  labourer?: { id: number; code: string; name: string };
  workDate?: string;
  inTime?: string;
  outTime?: string;
}

export const hhmm = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // HH:MM on the organization's clock, which is what the server reads back.
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: getOrgTimezone() }).format(d);
};

export function allowedActions(s: LabourSettings | null): RegAction[] {
  if (!s?.regularization.enabled) return [];
  return REG_ACTIONS.filter((a) => s.regularization[a.flag]).map((a) => a.value);
}

const KNOWN = ['action', 'labourerId', 'workDate', 'inTime', 'outTime', 'reason'];

export function RegularizeDialog({ settings, prefill, onClose, onDone }: { settings: LabourSettings; prefill: RegPrefill; onClose: () => void; onDone: () => void }) {
  const actions = allowedActions(settings);
  const [action, setAction] = useState<RegAction>(prefill.action && actions.includes(prefill.action) ? prefill.action : actions[0]);
  const [labourer, setLabourer] = useState<Labourer | null>(null);
  const fixed = prefill.labourer || null;
  const [workDate, setWorkDate] = useState(prefill.workDate || daysAgo(1));
  const [inTime, setInTime] = useState(prefill.inTime || '');
  const [outTime, setOutTime] = useState(prefill.outTime || '');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const clear = (k: string) => setErrors((e) => (e[k] ? { ...e, [k]: '' } : e));
  const needsIn = action !== 'mark_out';

  const save = async () => {
    const labourerId = fixed?.id ?? labourer?.id;
    const errs: Record<string, string> = {};
    if (!labourerId) errs.labourerId = 'Choose the labourer';
    if (!workDate) errs.workDate = 'Choose the work date';
    if (needsIn && !inTime) errs.inTime = 'Enter the IN time';
    if (!outTime) errs.outTime = 'Enter the OUT time';
    if (!reason.trim()) errs.reason = 'Write why this change is needed';
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length || !labourerId) return;
    setBusy(true);
    try {
      await api.regularize({ action, labourerId, workDate, inTime: needsIn ? inTime : undefined, outTime, reason: reason.trim() });
      showSuccess('Attendance updated');
      onDone();
    } catch (err) {
      const p = placeError(err, (f) => KNOWN.includes(f));
      setErrors(p.fields);
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };

  const max = settings.regularization.maxBackDays;
  return (
    <Dialog open onClose={onClose} title="Regularize attendance" maxWidthClassName="max-w-lg"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={save}>{busy ? 'Saving…' : 'Save change'}</button></>}>
      <div className="space-y-4">
        {!prefill.lockAction && actions.length > 1 && (
          <div role="radiogroup" aria-label="What to do" className="grid gap-2">
            {REG_ACTIONS.filter((a) => actions.includes(a.value)).map((a) => <OptionCard key={a.value} selected={action === a.value} onClick={() => { setAction(a.value); setErrors({}); }} title={a.label} description={a.description} />)}
          </div>
        )}
        {fixed ? (
          <div className="rounded-lg bg-bg-subtle px-3 py-2 text-sm"><span className="font-semibold text-fg">{fixed.name}</span> <span className="text-fg-muted">· {fixed.code}</span></div>
        ) : (
          <LabourerPicker value={labourer} onChange={(l) => { setLabourer(l); clear('labourerId'); }} error={errors.labourerId} />
        )}
        <TextField label="Work date" type="date" required value={workDate} max={today()} min={max ? daysAgo(max) : undefined} error={errors.workDate} hint={max ? `Up to ${max} days back.` : undefined} disabled={prefill.lockAction && Boolean(prefill.workDate)} onChange={(v) => { setWorkDate(v); clear('workDate'); }} />
        <div className="grid gap-4 sm:grid-cols-2">
          {needsIn && <TextField label="IN time" type="time" required value={inTime} error={errors.inTime} onChange={(v) => { setInTime(v); clear('inTime'); }} />}
          <TextField label="OUT time" type="time" required value={outTime} error={errors.outTime} onChange={(v) => { setOutTime(v); clear('outTime'); }} />
        </div>
        <p className="-mt-2 text-[11px] text-fg-muted">Times are in your organization’s time zone. A time before the work day start counts as the next calendar date.</p>
        <Textarea label="Reason" required value={reason} error={errors.reason} onChange={(e) => { setReason(e.target.value); clear('reason'); }} hint="Kept in the audit log with your name." />
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}
