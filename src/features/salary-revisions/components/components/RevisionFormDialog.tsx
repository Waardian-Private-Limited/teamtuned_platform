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
import type { AllocationSnapshot, ChangeMode, CompEmployeeDto, RevisionDto, RevisionPreviewDto } from '@/features/compensation/types/compensation.dto';
import { inr, pct, today } from '@/features/compensation/utils/format';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { EmployeePicker } from '@/features/compensation/components/shared/EmployeePicker';
import { AllocationChanges } from '@/features/compensation/components/shared/AllocationChanges';
import { useSalaryOptions } from '@/features/employees/hooks/useSalaryOptions';
import {
  allocationErrorIndex,
  allocationFromSnapshot,
  allocationPayload,
  allocationPlan,
  allocationTotals,
  initPending,
  subOrgKey,
  type AllocationDraft,
  type AllocationPayload,
} from '@/features/employees/utils/allocations';
import { RevisionCompanyBlock } from './RevisionCompanyBlock';

function scaled(items: { component_id: number; amount: number }[], gross: number) {
  const total = items.reduce((s, b) => s + Number(b.amount), 0);
  if (!total || !items.length) return [];
  const out = items.map((b) => ({ component_id: b.component_id, amount: Math.round((Number(b.amount) * gross) / total) }));
  const drift = gross - out.reduce((s, b) => s + b.amount, 0);
  out[out.length - 1].amount += drift;
  return out;
}

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
  const [companies, setCompanies] = React.useState<AllocationDraft[] | null>(null);
  const [before, setBefore] = React.useState<AllocationSnapshot[] | null>(null);
  const seeds = React.useRef(new Map<number, AllocationDraft['seed']>());

  const perCompany = Boolean(companies) && mode !== 'percent';
  const salaryOptions = useSalaryOptions(companies?.map((a) => a.subOrganizationId) || [], perCompany);

  React.useEffect(() => {
    setCompanies((list) => {
      if (!list) return list;
      const next = initPending(list, salaryOptions.byKey);
      return next === list ? list : next;
    });
  }, [salaryOptions.byKey, companies]);

  const plans = React.useMemo(
    () => (companies || []).map((a) => allocationPlan(a, salaryOptions.byKey[subOrgKey(a.subOrganizationId)], { siteState: null, gender: null })),
    [companies, salaryOptions.byKey]
  );
  const totals = allocationTotals(plans);

  const allocations = React.useMemo<AllocationPayload[] | null>(() => {
    if (!perCompany || !companies) return null;
    return companies.map((a, i) => {
      const key = subOrgKey(a.subOrganizationId);
      if (salaryOptions.byKey[key] && a.initFor === key) return allocationPayload(a, plans[i]);
      const seed = seeds.current.get(a.key);
      return {
        sub_organization_id: a.subOrganizationId,
        is_primary: a.isPrimary,
        ctc: plans[i].gross > 0 ? plans[i].ctcAnnual : null,
        monthly_gross: plans[i].gross,
        salary_breakdown: scaled(seed?.breakdown || [], plans[i].gross),
        debit_ids: seed?.debitIds || [],
      };
    });
  }, [perCompany, companies, plans, salaryOptions.byKey]);

  const loadCompanies = React.useCallback((list: AllocationSnapshot[] | null | undefined, previous: AllocationSnapshot[] | null | undefined) => {
    if (!list || list.length < 2) {
      setCompanies(null);
      setBefore(null);
      return;
    }
    const drafts = list.map(allocationFromSnapshot);
    seeds.current = new Map(drafts.map((d) => [d.key, d.seed]));
    setCompanies(drafts);
    setBefore(previous || null);
  }, []);

  const updateCompany = (index: number, patch: Partial<AllocationDraft>) => {
    setCompanies((list) => (list ? list.map((a, i) => (i === index ? { ...a, ...patch } : a)) : list));
    setErrors((e) => ({ ...e, [`salary_allocations[${index}]`]: '', salary_allocations: '' }));
  };

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
      loadCompanies(revision.new_allocations, revision.previous_allocations);
    } else {
      setEmployee([]);
      setType('increment');
      setEffectiveFrom(today());
      setMode('percent');
      setValue('');
      setDesignation('');
      setRoleId(null);
      setReason('');
      loadCompanies(null, null);
    }
    api.listRoles().then((r) => setRoles(Array.isArray(r) ? r : [])).catch(() => setRoles([]));
  }, [open, revision, loadCompanies]);

  React.useEffect(() => {
    if (!open || revision) return;
    loadCompanies(null, null);
    const picked = employee[0];
    if (!picked) return;
    let active = true;
    api.previewRevision({ employee_id: picked.id, effective_from: today(), change_mode: 'percent', change_value: 0 })
      .then((p) => active && loadCompanies(p.previous_allocations, p.previous_allocations))
      .catch(() => undefined);
    return () => { active = false; };
  }, [open, revision, employee, loadCompanies]);

  const body = React.useCallback(() => ({
    employee_id: employee[0]?.id,
    revision_type: type,
    effective_from: effectiveFrom,
    change_mode: mode,
    change_value: allocations ? (mode === 'gross' ? totals.gross : totals.ctc) : value === '' ? undefined : Number(value),
    salary_allocations: allocations ?? undefined,
    new_designation: designation.trim() || null,
    new_role_id: roleId,
    reason: reason.trim() || null,
  }), [employee, type, effectiveFrom, mode, value, allocations, totals.gross, totals.ctc, designation, roleId, reason]);

  React.useEffect(() => {
    const ready = allocations ? allocations.every((a) => a.monthly_gross > 0) : value !== '' && Number.isFinite(Number(value));
    if (!open || !employee[0] || !ready) {
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
  }, [open, employee, mode, value, allocations, body]);

  const save = async (submit: boolean) => {
    const found: Record<string, string> = {};
    if (!employee[0]) found.employee_id = 'Pick an employee';
    if (!effectiveFrom) found.effective_from = 'Effective date is required';
    if (allocations && companies) {
      companies.forEach((a, i) => {
        const key = subOrgKey(a.subOrganizationId);
        const loaded = Boolean(salaryOptions.byKey[key]) && a.initFor === key;
        if (plans[i].gross <= 0) found[`salary_allocations[${i}]`] = 'Enter the new CTC or gross';
        else if (!loaded && !salaryOptions.failed[key]) found[`salary_allocations[${i}]`] = 'Salary setup for this company is still loading';
        else if (loaded && plans[i].error) found[`salary_allocations[${i}]`] = plans[i].error as string;
      });
    } else if (value === '' || !Number.isFinite(Number(value))) found.change_value = 'Enter the change';
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
      const index = allocationErrorIndex(field);
      const target = index !== null && perCompany ? `salary_allocations[${index}]` : field === 'salary_allocations' || !field || index !== null ? 'change_value' : field;
      setErrors({ [target]: messageOf(err) });
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
                <button key={m.value} type="button" onClick={() => { setMode(m.value); setValue(''); setErrors((e) => ({ ...e, change_value: '' })); }} className={cx('rounded-md px-3 text-xs font-semibold transition-colors', mode === m.value ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted')}>
                  {m.label}
                </button>
              ))}
            </div>
            {perCompany ? (
              <p className="self-center text-[11px] text-fg-muted sm:text-xs">Paid by {companies?.length} companies. Enter the new salary for each company below.</p>
            ) : (
              <div className={shellClass(Boolean(errors.change_value))}>
                <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.-]/g, ''))} placeholder={mode === 'percent' ? 'e.g., 10' : 'e.g., 900000'} className="w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none focus:ring-0" />
                <span className="text-xs text-fg-muted">{unit}</span>
              </div>
            )}
          </div>
          <FieldMessage error={errors.change_value} hint={companies && mode === 'percent' ? `Paid by ${companies.length} companies. The percent applies to every company.` : undefined} />
        </div>

        {perCompany && companies && (
          <div className="space-y-3">
            {companies.map((a, i) => (
              <RevisionCompanyBlock
                key={a.key}
                allocation={a}
                before={before?.find((b) => (b.sub_organization_id ?? 0) === (a.subOrganizationId ?? 0))}
                plan={plans[i]}
                options={salaryOptions.byKey[subOrgKey(a.subOrganizationId)]}
                failed={Boolean(salaryOptions.failed[subOrgKey(a.subOrganizationId)])}
                error={errors[`salary_allocations[${i}]`] || undefined}
                onChange={(patch) => updateCompany(i, patch)}
              />
            ))}
            <div className="flex flex-wrap justify-between gap-2 rounded-lg border border-line bg-bg-subtle/50 px-3 py-2 text-xs sm:text-sm">
              <span className="text-fg-muted">Total CTC <b className="text-fg">{inr(totals.ctc)}</b></span>
              <span className="text-fg-muted">Total monthly gross <b className="text-fg">{inr(totals.gross)}</b></span>
            </div>
          </div>
        )}

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
            <AllocationChanges previous={preview.previous_allocations} next={preview.new_allocations} className="sm:col-span-3" />
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
