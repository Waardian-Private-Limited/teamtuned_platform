'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, FieldMessage, SelectField, TextField, shellClass } from '@/components/ui/FormControls';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import * as api from '../../api/salaryRevisions.api';
import { CHANGE_MODES } from '../../constants/salaryRevisions.constants';
import type { ChangeMode, CompEmployeeDto, RevisionDto, RevisionPreviewDto } from '@/features/compensation/types/compensation.dto';
import { inr, pct, today } from '@/features/compensation/utils/format';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { EmployeePicker } from '@/features/compensation/components/shared/EmployeePicker';

interface Props {
  open: boolean;
  revision?: RevisionDto | null;
  revisionTypes: { value: string; label: string }[];
  onClose: () => void;
  onSaved: () => void;
}

export function RevisionFormDialog({ open, revision, revisionTypes, onClose, onSaved }: Props) {
  const [employee, setEmployee] = React.useState<CompEmployeeDto[]>([]);
  const [type, setType] = React.useState('increment');
  const [effectiveFrom, setEffectiveFrom] = React.useState(today());
  const [mode, setMode] = React.useState<ChangeMode>('percent');
  const [value, setValue] = React.useState('');
  const [designation, setDesignation] = React.useState('');
  const [roleId, setRoleId] = React.useState<number | null>(null);
  const [reason, setReason] = React.useState('');
  const [roles, setRoles] = React.useState<{ id: number; name: string }[]>([]);
  const [preview, setPreview] = React.useState<RevisionPreviewDto | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState<'draft' | 'submit' | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setPreview(null);
    if (revision) {
      setEmployee([{ id: revision.employee.id, name: revision.employee.name, employee_code: revision.employee.employee_code, designation: null, sub_organization_id: revision.sub_organization_id, ctc: revision.previous_ctc, monthly_gross: revision.previous_gross }]);
      setType(revision.revision_type);
      setEffectiveFrom(revision.effective_from);
      setMode('ctc');
      setValue(String(revision.new_ctc ?? ''));
      setDesignation(revision.new_designation || '');
      setRoleId(revision.new_role_id);
      setReason(revision.reason || '');
    } else {
      setEmployee([]);
      setType('increment');
      setEffectiveFrom(today());
      setMode('percent');
      setValue('');
      setDesignation('');
      setRoleId(null);
      setReason('');
    }
    api.listRoles().then((r) => setRoles(Array.isArray(r) ? r : [])).catch(() => setRoles([]));
  }, [open, revision]);

  const body = React.useCallback(() => ({
    employee_id: employee[0]?.id,
    revision_type: type,
    effective_from: effectiveFrom,
    change_mode: mode,
    change_value: value === '' ? undefined : Number(value),
    new_designation: designation.trim() || null,
    new_role_id: roleId,
    reason: reason.trim() || null,
  }), [employee, type, effectiveFrom, mode, value, designation, roleId, reason]);

  React.useEffect(() => {
    if (!open || !employee[0] || value === '' || !Number.isFinite(Number(value))) {
      setPreview(null);
      return;
    }
    let active = true;
    const t = setTimeout(() => {
      api.previewRevision(body())
        .then((p) => { if (active) { setPreview(p); setErrors((e) => ({ ...e, change_value: '' })); } })
        .catch((err) => active && setErrors((e) => ({ ...e, change_value: messageOf(err) })));
    }, 350);
    return () => { active = false; clearTimeout(t); };
  }, [open, employee, mode, value, body]);

  const save = async (submit: boolean) => {
    const found: Record<string, string> = {};
    if (!employee[0]) found.employee_id = 'Pick an employee';
    if (!effectiveFrom) found.effective_from = 'Effective date is required';
    if (value === '' || !Number.isFinite(Number(value))) found.change_value = 'Enter the change';
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(submit ? 'submit' : 'draft');
    try {
      if (revision) await api.updateRevision(revision.id, { ...body(), submit });
      else await api.createRevision({ ...body(), submit });
      showSuccess(revision ? 'Revision updated' : submit ? 'Revision sent for approval' : 'Draft saved');
      onSaved();
      onClose();
    } catch (err) {
      const field = err instanceof ApiError ? (err.data as { field?: string } | null)?.field : undefined;
      setErrors({ [field || 'change_value']: messageOf(err) });
    } finally {
      setSaving(null);
    }
  };

  const unit = mode === 'percent' ? '%' : '₹';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      title={<h2 className="text-sm font-bold text-fg sm:text-base">{revision ? 'Edit salary revision' : 'New salary revision'}</h2>}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          {!revision && <Btn busy={saving === 'draft'} disabled={Boolean(saving)} onClick={() => save(false)}>Save draft</Btn>}
          <Btn variant="primary" busy={saving === 'submit'} disabled={Boolean(saving)} onClick={() => save(true)}>
            {revision ? 'Save' : 'Submit'}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        {revision ? (
          <div className="rounded-lg border border-line bg-bg-subtle/60 px-3 py-2 text-sm font-semibold text-fg">{revision.employee.name}</div>
        ) : (
          <EmployeePicker value={employee} onChange={setEmployee} error={errors.employee_id} />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField<string> label="Type" required value={type} onChange={(v) => setType(v || 'increment')} options={revisionTypes} error={errors.revision_type} />
          <TextField label="Effective from" required type="date" value={effectiveFrom} onChange={setEffectiveFrom} error={errors.effective_from} hint="Back-dated changes pay arrears automatically" />
        </div>

        <div>
          <FieldLabel label="Change" required />
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="inline-flex h-10 shrink-0 rounded-lg border border-line bg-bg-subtle p-0.5">
              {CHANGE_MODES.map((m) => (
                <button key={m.value} type="button" onClick={() => { setMode(m.value); setValue(''); }} className={cx('rounded-md px-3 text-xs font-semibold transition-colors', mode === m.value ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted')}>
                  {m.label}
                </button>
              ))}
            </div>
            <div className={shellClass(Boolean(errors.change_value))}>
              <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.-]/g, ''))} placeholder={mode === 'percent' ? 'e.g., 10' : 'e.g., 900000'} className="w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none focus:ring-0" />
              <span className="text-xs text-fg-muted">{unit}</span>
            </div>
          </div>
          <FieldMessage error={errors.change_value} />
        </div>

        {preview && (
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-bg-subtle/50 p-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">CTC</p>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-fg">{inr(preview.previous_ctc)} <ArrowRight className="h-3 w-3" /> <b>{inr(preview.new_ctc)}</b></p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Monthly gross</p>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-fg">{inr(preview.previous_gross)} <ArrowRight className="h-3 w-3" /> <b>{inr(preview.new_gross)}</b></p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Change</p>
              <p className="mt-0.5 text-sm font-bold text-fg">{pct(preview.change_percent)}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="New designation" value={designation} onChange={setDesignation} placeholder="For promotions" maxLength={255} error={errors.new_designation} />
          <SelectField<number> label="New role" numeric value={roleId} onChange={setRoleId} options={roles.map((r) => ({ value: r.id, label: r.name }))} placeholder="Keep current role" error={errors.new_role_id} />
        </div>
        <TextField label="Reason" value={reason} onChange={setReason} placeholder="Annual increment, market correction…" maxLength={1000} error={errors.reason} />
      </div>
    </Dialog>
  );
}
