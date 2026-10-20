'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as employeesApi from '../api/employees.api';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { FIELD_STEP, FORM_STEPS } from '../constants/employees.constants';
import type { EmployeeDetailDto, FormOptionsDto, IdentityDuplicateDto, PolicyOptionDto, PolicyPreviewDto, SalaryAllocationDto } from '../types/employees.dto';
import { emptyForm, formFromDetail, salaryFields, toPayload, type EmployeeFormState, type FormErrors } from '../types/employees.form';
import { computeSalary, defaultInputs, inputsFromAmounts } from '../utils/salary';
import { allocationPlan, initPending, newAllocation, subOrgKey, type AllocationDraft } from '../utils/allocations';
import { validateStep } from '../utils/validators';
import { useEmployeeRoutes } from './useEmployeeRoutes';
import { useSalaryOptions } from './useSalaryOptions';

const PREVIEW_DEBOUNCE_MS = 300;
const SCHEDULE_STEP = FORM_STEPS.findIndex((s) => s.key === 'schedule');
const SALARY_STEP = FORM_STEPS.findIndex((s) => s.key === 'salary');
const SALARY_KEYS = new Set<keyof EmployeeFormState>(['driver', 'componentInputs', 'debitOverrides', 'multiCompany', 'allocations']);

export interface SalaryLock {
  month: string;
  allocations: SalaryAllocationDto[];
}

function lockOf(d: EmployeeDetailDto): SalaryLock | null {
  if (!d.salary_locked_month) return null;
  const allocations = d.salary_allocations?.length
    ? d.salary_allocations
    : d.monthly_gross
      ? [{ sub_organization_id: d.sub_organization_id, is_primary: true, ctc: d.ctc, monthly_gross: d.monthly_gross, salary_breakdown: d.salary_breakdown, debit_ids: d.debit_ids }]
      : [];
  return { month: d.salary_locked_month, allocations };
}

function stepOfField(field: string) {
  if (field.startsWith('salary_allocations')) return SALARY_STEP;
  const key = FIELD_STEP[field];
  return key ? FORM_STEPS.findIndex((s) => s.key === key) : -1;
}

function keep<T extends { id: number }>(list: T[], id: number | null) {
  return id !== null && list.some((x) => x.id === id) ? id : null;
}

function reconcile(form: EmployeeFormState, options: FormOptionsDto, detail: EmployeeDetailDto | null): EmployeeFormState {
  const siteIds = form.siteIds.filter((id) => options.sites.some((s) => s.id === id));
  const known = options.salary_components.every((c) => form.componentInputs[c.id]);
  const sameSet = known && Object.keys(form.componentInputs).length === options.salary_components.length;
  const componentInputs = sameSet
    ? form.componentInputs
    : detail?.salary_breakdown.length
      ? inputsFromAmounts(options.salary_components, detail.salary_breakdown)
      : defaultInputs(options.salary_components);
  const debitOverrides: Record<number, boolean> = {};
  for (const rule of options.debit_rules) {
    if (detail) debitOverrides[rule.id] = detail.debit_ids.includes(rule.id);
    else if (form.debitOverrides[rule.id] !== undefined) debitOverrides[rule.id] = form.debitOverrides[rule.id];
  }
  const employmentTypeId = keep(options.employment_types, form.employmentTypeId) ?? (options.employment_types.length === 1 ? options.employment_types[0].id : null);
  // A fixed-term type with no term entered yet starts from the type's default length.
  const type = options.employment_types.find((t) => t.id === employmentTypeId);
  const contractDefault = type?.is_fixed_term && type.default_contract_months !== null && !form.contractMonths.trim() && !form.contractEnd
    ? { contractBy: 'months' as const, contractMonths: String(type.default_contract_months) }
    : {};
  return {
    ...form,
    ...contractDefault,
    employeeCode: !form.codeTouched && options.next_employee_code ? options.next_employee_code : form.employeeCode,
    employmentTypeId,
    gradeId: keep(options.grades || [], form.gradeId),
    costCentreId: keep(options.cost_centres || [], form.costCentreId),
    departmentId: keep(options.departments, form.departmentId),
    roleId: keep(options.roles, form.roleId),
    siteIds,
    primarySiteId: keep(options.sites, form.primarySiteId),
    policyId: keep(options.policies, form.policyId),
    shiftTemplateId: keep(options.shift_templates, form.shiftTemplateId),
    componentInputs,
    debitOverrides,
  };
}

export function useEmployeeForm(employeeId: number | null) {
  const router = useRouter();
  const routes = useEmployeeRoutes();
  const { subOrgs, loading: subOrgsLoading } = useManageableSubOrgs();

  const [form, setForm] = useState<EmployeeFormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(employeeId ? FORM_STEPS.length - 1 : 0);
  const [options, setOptions] = useState<FormOptionsDto | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [ready, setReady] = useState(false);
  const [inherited, setInherited] = useState<PolicyPreviewDto | null>(null);
  const [inheritedLoading, setInheritedLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [salaryLock, setSalaryLock] = useState<SalaryLock | null>(null);
  const [duplicate, setDuplicate] = useState<IdentityDuplicateDto | null>(null);

  const optionsCache = useRef(new Map<string, FormOptionsDto>());
  const detailRef = useRef<EmployeeDetailDto | null>(null);
  const optionsRequest = useRef(0);
  const lastPayload = useRef<Record<string, unknown> | null>(null);

  const needsSubOrg = subOrgs.length > 0;

  useEffect(() => {
    if (!employeeId) return;
    let active = true;
    employeesApi.getEmployee(employeeId)
      .then((detail) => {
        if (!active) return;
        detailRef.current = detail;
        setSalaryLock(lockOf(detail));
        setForm(formFromDetail(detail));
        setReady(true);
      })
      .catch((err) => active && setLoadError(messageOf(err)));
    return () => { active = false; };
  }, [employeeId]);

  useEffect(() => {
    if (employeeId || ready || subOrgsLoading) return;
    const preferred = subOrgs.find((s) => s.isPrimary) || subOrgs[0] || null;
    setForm((f) => ({ ...f, subOrganizationId: preferred ? preferred.id : null }));
    setReady(true);
  }, [employeeId, ready, subOrgs, subOrgsLoading]);

  useEffect(() => {
    if (!ready) return;
    const key = String(form.subOrganizationId ?? 0);
    const requestId = ++optionsRequest.current;
    const apply = (dto: FormOptionsDto) => {
      if (requestId !== optionsRequest.current) return;
      const detail = detailRef.current;
      detailRef.current = null;
      setOptions(dto);
      setForm((f) => reconcile(f, dto, detail));
    };
    const cached = optionsCache.current.get(key);
    if (cached) {
      apply(cached);
      return;
    }
    setOptionsLoading(true);
    employeesApi.getFormOptions(form.subOrganizationId, !employeeId)
      .then((dto) => {
        optionsCache.current.set(key, dto);
        apply(dto);
      })
      .catch((err) => requestId === optionsRequest.current && setLoadError(messageOf(err)))
      .finally(() => requestId === optionsRequest.current && setOptionsLoading(false));
  }, [ready, form.subOrganizationId, employeeId]);

  useEffect(() => {
    if (!options || maxStep < SCHEDULE_STEP || !form.departmentId || !form.roleId) return;
    let active = true;
    setInheritedLoading(true);
    const timeout = setTimeout(() => {
      employeesApi.previewPolicy({
        subOrgId: form.subOrganizationId,
        departmentId: form.departmentId,
        roleId: form.roleId,
        siteIds: form.siteIds,
        employmentTypeId: form.employmentTypeId,
        gradeId: form.gradeId,
      })
        .then((dto) => active && setInherited(dto))
        .catch(() => active && setInherited(null))
        .finally(() => active && setInheritedLoading(false));
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [options, maxStep, form.subOrganizationId, form.departmentId, form.roleId, form.siteIds, form.employmentTypeId, form.gradeId]);

  const effectivePolicyId = form.policyId ?? inherited?.policy_id ?? null;
  const policy: PolicyOptionDto | null = useMemo(
    () => options?.policies.find((p) => p.id === effectivePolicyId) || null,
    [options, effectivePolicyId]
  );

  const siteState = useMemo(
    () => options?.sites.find((s) => s.id === form.primarySiteId)?.state || null,
    [options, form.primarySiteId]
  );
  // PT and LWF follow the work state; without one the server falls back to the primary site's state.
  const workState = form.workState || siteState;

  const employmentType = useMemo(
    () => options?.employment_types.find((t) => t.id === form.employmentTypeId) || null,
    [options, form.employmentTypeId]
  );
  const fixedTerm = Boolean(employmentType?.is_fixed_term);

  const plan = useMemo(() => computeSalary({
    driver: form.driver,
    components: options?.salary_components || [],
    inputs: form.componentInputs,
    debitRules: options?.debit_rules || [],
    debitOverrides: form.debitOverrides,
    siteState: workState,
    gender: form.gender || null,
    tax: options?.tax ?? null,
  }), [form.driver, form.componentInputs, form.debitOverrides, form.gender, options, workState]);

  const allocationSubOrgs = useMemo(
    () => [...form.allocations.filter((a) => a.subOrganizationId !== null || !needsSubOrg).map((a) => a.subOrganizationId), ...(salaryLock?.allocations.map((a) => a.sub_organization_id) || [])],
    [form.allocations, salaryLock, needsSubOrg]
  );
  const salaryOptions = useSalaryOptions(allocationSubOrgs, form.multiCompany || Boolean(salaryLock));

  useEffect(() => {
    setForm((f) => {
      const allocations = initPending(f.allocations, salaryOptions.byKey);
      return allocations === f.allocations ? f : { ...f, allocations };
    });
  }, [salaryOptions.byKey, form.allocations]);

  const allocationPlans = useMemo(
    () => form.allocations.map((a) => allocationPlan(a, salaryOptions.byKey[subOrgKey(a.subOrganizationId)], { siteState: workState, gender: form.gender || null })),
    [form.allocations, salaryOptions.byKey, workState, form.gender]
  );
  const allocationsReady = useMemo(
    () => form.allocations.map((a) => a.initFor === subOrgKey(a.subOrganizationId)),
    [form.allocations]
  );

  const set = useCallback(<K extends keyof EmployeeFormState>(key: K, value: EmployeeFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value, ...(SALARY_KEYS.has(key) ? { salaryTouched: true } : {}) }));
    setErrors((e) => {
      if (!Object.keys(e).length) return e;
      const next = { ...e };
      if (SALARY_KEYS.has(key)) {
        for (const k of Object.keys(next)) if (k.startsWith('salary_allocations')) delete next[k];
      }
      const field = String(key).replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      delete next[field];
      if (key === 'email' || key === 'phone') { delete next.email; delete next.phone; }
      if (key === 'joiningDate') { delete next.employment_start_date; delete next.contract_start; }
      if (key === 'contractMonths' || key === 'contractEnd') { delete next.contract_months; delete next.contract_end; }
      if (key === 'reportingManager') delete next.reporting_manager_id;
      if (key === 'customShiftStart') delete next.shift_start;
      if (key === 'customShiftEnd') delete next.shift_end;
      if (key === 'customBreak') delete next.shift_break_minutes;
      if (key === 'componentInputs' || key === 'driver') delete next.salary_breakdown;
      return next;
    });
  }, []);

  const setMultiCompany = useCallback((on: boolean) => {
    if (on && !form.allocations.length) {
      const home = newAllocation(form.subOrganizationId, true, {
        driver: form.driver,
        componentInputs: form.componentInputs,
        debitOverrides: form.debitOverrides,
        initFor: options ? subOrgKey(form.subOrganizationId) : null,
      });
      const other = subOrgs.find((s) => s.id !== form.subOrganizationId)?.id ?? null;
      set('allocations', [home, newAllocation(other, false)]);
    }
    set('multiCompany', on);
  }, [form.allocations.length, form.subOrganizationId, form.driver, form.componentInputs, form.debitOverrides, options, subOrgs, set]);

  const updateAllocation = useCallback((index: number, patch: Partial<AllocationDraft>) => {
    set('allocations', form.allocations.map((a, i) => {
      if (i !== index) return patch.isPrimary ? { ...a, isPrimary: false } : a;
      const moved = patch.subOrganizationId !== undefined && patch.subOrganizationId !== a.subOrganizationId;
      return { ...a, ...patch, ...(moved ? { initFor: null, seed: null, componentInputs: {}, debitOverrides: {} } : {}) };
    }));
  }, [form.allocations, set]);

  const addAllocation = useCallback(() => {
    const used = new Set(form.allocations.map((a) => a.subOrganizationId));
    const free = subOrgs.find((s) => !used.has(s.id))?.id ?? null;
    set('allocations', [...form.allocations, newAllocation(free, form.allocations.length === 0)]);
  }, [form.allocations, subOrgs, set]);

  const removeAllocation = useCallback((index: number) => {
    const rest = form.allocations.filter((_, i) => i !== index);
    if (rest.length && !rest.some((a) => a.isPrimary)) rest[0] = { ...rest[0], isPrimary: true };
    set('allocations', rest);
  }, [form.allocations, set]);

  const timingMode = policy?.schedule.timingMode ?? null;
  const sendSalary = !employeeId || (!salaryLock && form.salaryTouched);
  const validate = useCallback(
    (index: number) => validateStep(FORM_STEPS[index].key, form, { plan, allocationPlans, allocationsReady, sendSalary, effectivePolicyId, needsSubOrg, timingMode, fixedTerm }),
    [form, plan, allocationPlans, allocationsReady, sendSalary, effectivePolicyId, needsSubOrg, timingMode, fixedTerm]
  );

  // A new PAN / UAN value drops the "save anyway" offer made for the old one.
  useEffect(() => { setDuplicate(null); }, [form.panNumber, form.pfUan]);

  const next = useCallback(() => {
    const found = validate(step);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setErrors({});
    const target = Math.min(step + 1, FORM_STEPS.length - 1);
    setStep(target);
    setMaxStep((m) => Math.max(m, target));
  }, [step, validate]);

  const back = useCallback(() => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const goTo = useCallback((index: number) => {
    if (index > maxStep) return;
    setErrors({});
    setStep(index);
  }, [maxStep]);

  const send = useCallback(async (payload: Record<string, unknown>) => {
    lastPayload.current = payload;
    setSaving(true);
    try {
      if (employeeId) await employeesApi.updateEmployee(employeeId, payload);
      else await employeesApi.createEmployee(payload);
      showSuccess(employeeId ? 'Employee updated' : 'Employee added');
      router.push(routes.list);
    } catch (err) {
      const data = err instanceof ApiError ? (err.data as { field?: string } | null) : null;
      const field = data?.field;
      const locked = err instanceof ApiError && err.code === 'SALARY_LOCKED_BY_PAYROLL';
      // Another employee holds this PAN / UAN: shown under the field with a "save anyway".
      if (err instanceof ApiError && err.code === 'IDENTITY_DUPLICATE') setDuplicate(data as IdentityDuplicateDto);
      const target = locked ? SALARY_STEP : field ? stepOfField(field) : -1;
      if (target >= 0) {
        setErrors({ [locked ? 'salary_allocations' : field as string]: messageOf(err) });
        setStep(target);
      } else {
        showError(messageOf(err));
      }
    } finally {
      setSaving(false);
    }
  }, [employeeId, router, routes.list]);

  const submit = useCallback(async () => {
    for (let i = 0; i < FORM_STEPS.length; i += 1) {
      const found = validate(i);
      if (Object.keys(found).length) {
        setErrors(found);
        setStep(i);
        return;
      }
    }
    setDuplicate(null);
    await send(toPayload(form, policy?.schedule.timingMode ?? null, sendSalary ? salaryFields(form, plan, allocationPlans) : null, fixedTerm));
  }, [validate, send, form, plan, allocationPlans, sendSalary, policy, fixedTerm]);

  /** Resends the refused body, confirming the PAN / UAN is right (or a different person's). */
  const saveAnyway = useCallback(async () => {
    if (!duplicate || !lastPayload.current) return;
    const field = duplicate.field;
    setDuplicate(null);
    setErrors((e) => {
      const next = { ...e };
      delete next[field];
      return next;
    });
    await send({ ...lastPayload.current, confirm_duplicate_identity: true });
  }, [duplicate, send]);

  return {
    form,
    set,
    errors,
    step,
    maxStep,
    next,
    back,
    goTo,
    submit,
    saveAnyway,
    duplicate,
    saving,
    options,
    optionsLoading,
    loadError,
    loading: !ready || (!options && !loadError),
    inherited,
    inheritedLoading,
    effectivePolicyId,
    policy,
    plan,
    allocationPlans,
    allocationsReady,
    salaryOptions,
    salaryLock,
    setMultiCompany,
    updateAllocation,
    addAllocation,
    removeAllocation,
    salaryDebits: form.multiCompany ? allocationPlans.flatMap((p) => p.debits) : plan.debits,
    siteState,
    workState,
    employmentType,
    fixedTerm,
    needsSubOrg,
    subOrgs,
    isEdit: Boolean(employeeId),
  };
}
