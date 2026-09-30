'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as employeesApi from '../api/employees.api';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { FIELD_STEP, FORM_STEPS } from '../constants/employees.constants';
import type { EmployeeDetailDto, FormOptionsDto, PolicyOptionDto, PolicyPreviewDto } from '../types/employees.dto';
import { emptyForm, formFromDetail, toPayload, type EmployeeFormState, type FormErrors } from '../types/employees.form';
import { computeSalary, defaultInputs, inputsFromAmounts } from '../utils/salary';
import { validateStep } from '../utils/validators';
import { useEmployeeRoutes } from './useEmployeeRoutes';

const PREVIEW_DEBOUNCE_MS = 300;
const SCHEDULE_STEP = FORM_STEPS.findIndex((s) => s.key === 'schedule');

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
  return {
    ...form,
    employeeCode: !form.codeTouched && options.next_employee_code ? options.next_employee_code : form.employeeCode,
    employmentTypeId: keep(options.employment_types, form.employmentTypeId) ?? (options.employment_types.length === 1 ? options.employment_types[0].id : null),
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

  const optionsCache = useRef(new Map<string, FormOptionsDto>());
  const detailRef = useRef<EmployeeDetailDto | null>(null);
  const optionsRequest = useRef(0);

  const needsSubOrg = subOrgs.length > 0;

  useEffect(() => {
    if (!employeeId) return;
    let active = true;
    employeesApi.getEmployee(employeeId)
      .then((detail) => {
        if (!active) return;
        detailRef.current = detail;
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
      })
        .then((dto) => active && setInherited(dto))
        .catch(() => active && setInherited(null))
        .finally(() => active && setInheritedLoading(false));
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [options, maxStep, form.subOrganizationId, form.departmentId, form.roleId, form.siteIds, form.employmentTypeId]);

  const effectivePolicyId = form.policyId ?? inherited?.policy_id ?? null;
  const policy: PolicyOptionDto | null = useMemo(
    () => options?.policies.find((p) => p.id === effectivePolicyId) || null,
    [options, effectivePolicyId]
  );

  const siteState = useMemo(
    () => options?.sites.find((s) => s.id === form.primarySiteId)?.state || null,
    [options, form.primarySiteId]
  );

  const plan = useMemo(() => computeSalary({
    driver: form.driver,
    components: options?.salary_components || [],
    inputs: form.componentInputs,
    debitRules: options?.debit_rules || [],
    debitOverrides: form.debitOverrides,
    siteState,
    gender: form.gender || null,
    tax: options?.tax ?? null,
  }), [form.driver, form.componentInputs, form.debitOverrides, form.gender, options, siteState]);

  const set = useCallback(<K extends keyof EmployeeFormState>(key: K, value: EmployeeFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!Object.keys(e).length) return e;
      const next = { ...e };
      const field = String(key).replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      delete next[field];
      if (key === 'email' || key === 'phone') { delete next.email; delete next.phone; }
      if (key === 'joiningDate') delete next.employment_start_date;
      if (key === 'reportingManager') delete next.reporting_manager_id;
      if (key === 'customShiftStart') delete next.shift_start;
      if (key === 'customShiftEnd') delete next.shift_end;
      if (key === 'customBreak') delete next.shift_break_minutes;
      if (key === 'componentInputs' || key === 'driver') delete next.salary_breakdown;
      return next;
    });
  }, []);

  const timingMode = policy?.schedule.timingMode ?? null;
  const validate = useCallback((index: number) => validateStep(FORM_STEPS[index].key, form, { plan, effectivePolicyId, needsSubOrg, timingMode }), [form, plan, effectivePolicyId, needsSubOrg, timingMode]);

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

  const submit = useCallback(async () => {
    for (let i = 0; i < FORM_STEPS.length; i += 1) {
      const found = validate(i);
      if (Object.keys(found).length) {
        setErrors(found);
        setStep(i);
        return;
      }
    }
    setSaving(true);
    try {
      const payload = toPayload(form, plan, policy?.schedule.timingMode ?? null);
      if (employeeId) await employeesApi.updateEmployee(employeeId, payload);
      else await employeesApi.createEmployee(payload);
      showSuccess(employeeId ? 'Employee updated' : 'Employee added');
      router.push(routes.list);
    } catch (err) {
      const field = err instanceof ApiError ? (err.data as { field?: string } | null)?.field : undefined;
      if (field && FIELD_STEP[field]) {
        setErrors({ [field]: messageOf(err) });
        setStep(FORM_STEPS.findIndex((s) => s.key === FIELD_STEP[field]));
      } else {
        showError(messageOf(err));
      }
    } finally {
      setSaving(false);
    }
  }, [validate, form, plan, policy, employeeId, router, routes.list]);

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
    siteState,
    needsSubOrg,
    isEdit: Boolean(employeeId),
  };
}
