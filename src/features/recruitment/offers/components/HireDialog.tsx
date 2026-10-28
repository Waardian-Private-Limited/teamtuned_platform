'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, MailCheck } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, FieldMessage, SelectField, TextField } from '@/components/ui/FormControls';
import { ApiError } from '@/lib/api/errors';
import { messageOf } from '@/lib/api/errors';
import { RehireDialog } from '@/features/exits/components/RehireDialog';
import { formatDate } from '@/lib/datetime';
import { showError } from '@/lib/toast';
import { useEmployeeRoutes } from '@/features/employees/hooks/useEmployeeRoutes';
import { listPolicies } from '@/features/policies/api/policies.api';
import { btn, fieldOf, formatInr } from '../../interviews/lib/ui';
import { EmployeeSelect, type EmployeeLite } from '../../interviews/lib/EmployeePickers';
import * as api from '../api/offers.api';
import type { HireFormDto, HireFormFieldDto, HireResultDto } from '../types/offers.dto';

export interface HireDialogProps {
  /** The accepted offer to convert; null closes the dialog. */
  offerId: number | null;
  candidateName?: string;
  onClose: () => void;
  onHired?: (result: HireResultDto) => void;
}

interface Field {
  field: string;
  label: string;
  type: string;
  required: boolean;
  options: { value: string; label: string }[];
  hint?: string;
  placeholder?: string;
}

const LABELS: Record<string, string> = {
  first_name: 'First name', firstName: 'First name',
  last_name: 'Last name', lastName: 'Last name',
  email: 'Email', phone: 'Phone',
  designation: 'Designation',
  department: 'Department', department_id: 'Department', departmentId: 'Department',
  role: 'Role', role_id: 'Role', roleId: 'Role',
  employment_type: 'Employment type', employment_type_id: 'Employment type', employmentType: 'Employment type', employmentTypeId: 'Employment type',
  site: 'Site', site_id: 'Site', siteId: 'Site',
  sub_organization: 'Company', sub_organization_id: 'Company', subOrganization: 'Company', subOrganizationId: 'Company',
  joining_date: 'Joining date', joiningDate: 'Joining date', date_of_joining: 'Joining date',
  annual_ctc: 'Annual CTC', annualCtc: 'Annual CTC', ctc: 'Annual CTC',
  gross_salary: 'Monthly gross', grossSalary: 'Monthly gross',
  probation_months: 'Probation', probationMonths: 'Probation',
  notice_period_days: 'Notice period', noticePeriodDays: 'Notice period',
  policy_id: 'Policy', policyId: 'Policy',
  reporting_manager_id: 'Reporting manager', reportingManagerId: 'Reporting manager',
  employee_code: 'Employee code', employeeCode: 'Employee code',
  gender: 'Gender', date_of_birth: 'Date of birth', dateOfBirth: 'Date of birth',
};

function humanize(key: string) {
  if (LABELS[key]) return LABELS[key];
  const s = key.replace(/_id$|Id$/, '').replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function display(key: string, v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (Array.isArray(v)) return v.map((x) => display(key, x)).filter(Boolean).join(', ') || null;
  if (typeof v === 'object') {
    const o = v as { name?: unknown; label?: unknown };
    return typeof o.name === 'string' ? o.name : typeof o.label === 'string' ? o.label : null;
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  const s = String(v);
  if (/ctc|salary|gross/i.test(key) && Number.isFinite(Number(s))) return formatInr(s);
  if (/date|_on$|On$/i.test(key) && /^\d{4}-\d{2}-\d{2}/.test(s)) return formatDate(s.slice(0, 10));
  if (/probation/i.test(key)) return `${s} months`;
  if (/notice/i.test(key)) return `${s} days`;
  return s;
}

function guessType(f: string) {
  if (/manager|employee_id$/.test(f) && f !== 'employee_code') return 'employee';
  if (/date|_on$/.test(f)) return 'date';
  if (/_id$/.test(f)) return 'select';
  return 'text';
}

function normalizeField(raw: HireFormFieldDto | string): Field {
  const f: HireFormFieldDto = typeof raw === 'string' ? { field: raw } : raw;
  return {
    field: f.field,
    label: f.label || humanize(f.field),
    type: f.type || guessType(f.field),
    required: f.required !== false,
    options: (f.options || []).map((o) => ({ value: String(o.value ?? o.id ?? ''), label: String(o.label ?? o.name ?? o.value ?? o.id ?? '') })),
    hint: f.hint || undefined,
    placeholder: f.placeholder || undefined,
  };
}

function initialValue(f: HireFormFieldDto | string): string {
  if (typeof f === 'string' || f.value === null || f.value === undefined) return '';
  return String(f.value);
}

export function HireDialog({ offerId, candidateName, onClose, onHired }: HireDialogProps) {
  const routes = useEmployeeRoutes();
  const [form, setForm] = useState<HireFormDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [people, setPeople] = useState<Record<string, EmployeeLite | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [policyOptions, setPolicyOptions] = useState<{ value: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<HireResultDto | null>(null);
  // The PAN / UAN belongs to a former employee: offer Rehire instead of a second record.
  const [rehireCand, setRehireCand] = useState<{ id: number; name: string } | null>(null);
  const [rehireOpen, setRehireOpen] = useState(false);

  useEffect(() => {
    if (offerId === null) return;
    let alive = true;
    setForm(null);
    setResult(null);
    setErrors({});
    setRehireCand(null);
    setLoadError('');
    setLoading(true);
    api.getHireForm(offerId)
      .then((dto) => {
        if (!alive) return;
        setForm(dto);
        const v: Record<string, string> = {};
        (dto.fields || dto.missing || []).forEach((f) => { v[typeof f === 'string' ? f : f.field] = initialValue(f); });
        if (dto.employeeCodeEditable && v.employee_code === undefined) v.employee_code = dto.employeeCode || '';
        setValues(v);
        setPeople({});
      })
      .catch((err) => { if (alive) setLoadError(messageOf(err)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [offerId]);

  const fields = useMemo<Field[]>(() => {
    if (!form) return [];
    const list = (form.fields || form.missing || []).map(normalizeField);
    if (form.employeeCodeEditable && !list.some((f) => f.field === 'employee_code')) {
      list.push({ field: 'employee_code', label: 'Employee code', type: 'text', required: true, options: [], hint: form.employeeCode ? `Suggested: ${form.employeeCode}` : undefined });
    }
    return list;
  }, [form]);

  // A policy field the server did not give options for: load the policy list.
  const needsPolicies = fields.some((f) => f.field === 'policy_id' && f.options.length === 0);
  useEffect(() => {
    if (!needsPolicies) return;
    listPolicies({ status: 'active' })
      .then((res) => setPolicyOptions((res.policies || []).map((p) => ({ value: String(p.id), label: p.name }))))
      .catch(() => {});
  }, [needsPolicies]);

  const summary = useMemo(() => {
    if (!form) return [];
    if (form.summary?.length) return form.summary.map((s) => ({ label: s.label, value: display(s.label, s.value) ?? '—' }));
    const skip = new Set(fields.map((f) => f.field));
    return Object.entries(form.prefill || {})
      .filter(([k, v]) => !skip.has(k) && display(k, v) !== null && !/password|token|hash/i.test(k))
      .map(([k, v]) => ({ label: humanize(k), value: display(k, v) as string }));
  }, [form, fields]);

  function setValue(k: string, v: string) {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  }

  async function submit() {
    if (offerId === null) return;
    const e: Record<string, string> = {};
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === 'employee') {
        const p = people[f.field];
        if (!p && f.required) e[f.field] = `Choose the ${f.label.toLowerCase()}`;
        body[f.field] = p?.id ?? null;
        continue;
      }
      const raw = (values[f.field] ?? '').trim();
      if (!raw && f.required) { e[f.field] = `Enter the ${f.label.toLowerCase()}`; continue; }
      if (!raw) { body[f.field] = null; continue; }
      body[f.field] = /_id$/.test(f.field) && /^\d+$/.test(raw) ? Number(raw) : f.type === 'number' ? Number(raw) : raw;
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const res = await api.hire(offerId, body);
      setResult(res);
      onHired?.(res);
    } catch (err) {
      const data = err instanceof ApiError ? (err.data as { rehire_candidate_employee_id?: number | null; matches?: { id: number; name: string }[] } | null) : null;
      if (data?.rehire_candidate_employee_id) {
        const m = data.matches?.find((x) => x.id === data.rehire_candidate_employee_id);
        setRehireCand({ id: data.rehire_candidate_employee_id, name: m?.name || candidateName || 'Former employee' });
      }
      const f = fieldOf(err);
      if (f && fields.some((x) => x.field === f)) setErrors({ [f]: messageOf(err) });
      else showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  const done = Boolean(result);

  return (
    <>
    <Dialog
      open={offerId !== null}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      title={
        <div>
          <h2 className="text-base font-semibold text-fg sm:text-lg">{done ? 'Employee created' : 'Create employee'}</h2>
          {candidateName && <p className="text-xs text-fg-muted">{candidateName}</p>}
        </div>
      }
      footer={
        done ? (
          <button type="button" onClick={onClose} className={btn.primary}>Done</button>
        ) : (
          <>
            <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
            <button type="button" onClick={submit} disabled={saving || loading || !form} className={btn.primary}>
              {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              Create employee
            </button>
          </>
        )
      }
    >
      {result ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-fg" />
          <div>
            <p className="text-sm text-fg-muted">Employee code</p>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-fg">{result.employeeCode}</p>
          </div>
          <div className="flex max-w-sm items-start gap-2 rounded-lg border border-line bg-bg-subtle px-3 py-2.5 text-left text-xs text-fg-muted sm:text-sm">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-fg" />
            <span>An onboarding invite was emailed. They complete onboarding when they first sign in.</span>
          </div>
          <Link href={routes.edit(result.employeeId)} className={btn.secondary}>Open employee</Link>
        </div>
      ) : loading ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-bg-subtle" />)}</div>
      ) : loadError ? (
        <p className="py-6 text-center text-sm text-fg-muted">{loadError}</p>
      ) : form?.alreadyHired ? (
        <div className="space-y-3 py-4 text-center">
          <p className="text-sm text-fg">This candidate is already an employee.</p>
          {form.employeeId && <Link href={routes.edit(form.employeeId)} className={btn.secondary}>Open employee</Link>}
        </div>
      ) : (
        <div className="space-y-5">
          {rehireCand && (
            <div className="rounded-xl border border-line bg-bg-subtle p-3 text-sm text-fg">
              <p>This PAN or UAN belongs to a former employee, {rehireCand.name}. Rehire them to keep one career history.</p>
              <button type="button" onClick={() => setRehireOpen(true)} className={`${btn.primary} mt-2`}>Rehire {rehireCand.name}</button>
            </div>
          )}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">From the offer</h3>
            <dl className="divide-y divide-line/60 rounded-xl border border-line px-3.5">
              {summary.length === 0 && <p className="py-3 text-sm text-fg-muted">Nothing prefilled.</p>}
              {summary.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-3 py-2 text-xs sm:text-sm">
                  <dt className="text-fg-muted">{s.label}</dt>
                  <dd className="text-right font-semibold tabular-nums text-fg">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {fields.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Still needed</h3>
              {fields.map((f) => {
                const err = errors[f.field] || undefined;
                if (f.type === 'employee') {
                  return (
                    <div key={f.field}>
                      <FieldLabel label={f.label} required={f.required} />
                      <EmployeeSelect
                        value={people[f.field] ?? null}
                        onChange={(p) => { setPeople((s) => ({ ...s, [f.field]: p })); setErrors((x) => ({ ...x, [f.field]: '' })); }}
                        invalid={Boolean(err)}
                        ariaLabel={f.label}
                      />
                      <FieldMessage error={err} hint={f.hint} />
                    </div>
                  );
                }
                const opts = f.options.length ? f.options : f.field === 'policy_id' ? policyOptions : [];
                if (f.type === 'select' || opts.length) {
                  return (
                    <SelectField<string>
                      key={f.field}
                      label={f.label}
                      required={f.required}
                      value={values[f.field] || null}
                      options={opts}
                      onChange={(v) => setValue(f.field, v ?? '')}
                      error={err}
                      hint={f.hint}
                    />
                  );
                }
                return (
                  <TextField
                    key={f.field}
                    label={f.label}
                    required={f.required}
                    type={f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : 'text'}
                    inputMode={f.type === 'number' ? 'numeric' : undefined}
                    value={values[f.field] ?? ''}
                    onChange={(v) => setValue(f.field, v)}
                    error={err}
                    hint={f.hint}
                    placeholder={f.placeholder}
                  />
                );
              })}
            </section>
          )}

          <p className="text-xs text-fg-muted">
            The employee is created as Invited and gets an onboarding email. Bank, ID and address details are collected in their own onboarding, not here.
          </p>
        </div>
      )}
    </Dialog>
    {rehireOpen && rehireCand && <RehireDialog employee={{ id: rehireCand.id, name: rehireCand.name }} onClose={() => setRehireOpen(false)} />}
    </>
  );
}
