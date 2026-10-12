import type { FormOptionsDto, SalaryAllocationDto } from '../types/employees.dto';
import { computeSalary, defaultInputs, inputsFromAmounts, type ComponentInput, type SalaryDriver, type SalaryPlan } from './salary';

export interface AllocationSeed {
  breakdown: { component_id: number; amount: number }[];
  debitIds: number[];
}

export interface AllocationDraft {
  key: number;
  subOrganizationId: number | null;
  isPrimary: boolean;
  driver: SalaryDriver;
  componentInputs: Record<number, ComponentInput>;
  debitOverrides: Record<number, boolean>;
  initFor: string | null;
  seed: AllocationSeed | null;
}

export interface AllocationPayload {
  sub_organization_id: number | null;
  is_primary: boolean;
  ctc: number | null;
  monthly_gross: number;
  salary_breakdown: { component_id: number; amount: number }[];
  debit_ids: number[];
}

export const subOrgKey = (id: number | null | undefined) => String(id ?? 0);

let sequence = 0;

export function newAllocation(subOrganizationId: number | null, isPrimary: boolean, patch: Partial<AllocationDraft> = {}): AllocationDraft {
  sequence += 1;
  return {
    key: sequence,
    subOrganizationId,
    isPrimary,
    driver: { source: 'ctc', value: 0 },
    componentInputs: {},
    debitOverrides: {},
    initFor: null,
    seed: null,
    ...patch,
  };
}

export function allocationFromSnapshot(a: {
  sub_organization_id: number | null;
  is_primary: boolean;
  ctc: number | null;
  gross: number;
  breakdown: { component_id: number; amount: number }[];
  debit_ids: number[];
}): AllocationDraft {
  return newAllocation(a.sub_organization_id, Boolean(a.is_primary), {
    driver: a.ctc ? { source: 'ctc', value: Number(a.ctc) } : { source: 'gross', value: Number(a.gross) || 0 },
    seed: { breakdown: a.breakdown || [], debitIds: a.debit_ids || [] },
  });
}

export function allocationFromDto(a: SalaryAllocationDto): AllocationDraft {
  return allocationFromSnapshot({
    sub_organization_id: a.sub_organization_id,
    is_primary: a.is_primary,
    ctc: a.ctc,
    gross: a.monthly_gross,
    breakdown: a.salary_breakdown,
    debit_ids: a.debit_ids,
  });
}

export function initAllocation(a: AllocationDraft, dto: FormOptionsDto): AllocationDraft {
  const componentInputs = a.seed?.breakdown.length
    ? inputsFromAmounts(dto.salary_components, a.seed.breakdown)
    : defaultInputs(dto.salary_components);
  const debitOverrides: Record<number, boolean> = {};
  if (a.seed) for (const rule of dto.debit_rules) debitOverrides[rule.id] = a.seed.debitIds.includes(rule.id);
  return { ...a, componentInputs, debitOverrides, initFor: subOrgKey(a.subOrganizationId), seed: null };
}

export function initPending(list: AllocationDraft[], byKey: Record<string, FormOptionsDto>) {
  let changed = false;
  const next = list.map((a) => {
    const key = subOrgKey(a.subOrganizationId);
    const dto = byKey[key];
    if (!dto || a.initFor === key) return a;
    changed = true;
    return initAllocation(a, dto);
  });
  return changed ? next : list;
}

export function allocationPlan(
  a: AllocationDraft,
  dto: FormOptionsDto | undefined,
  ctx: { siteState: string | null; gender: string | null }
): SalaryPlan {
  return computeSalary({
    driver: a.driver,
    components: dto?.salary_components || [],
    inputs: a.componentInputs,
    debitRules: dto?.debit_rules || [],
    debitOverrides: a.debitOverrides,
    siteState: ctx.siteState,
    gender: ctx.gender,
    tax: dto?.tax ?? null,
    primary: a.isPrimary,
  });
}

export function allocationPayload(a: AllocationDraft, plan: SalaryPlan): AllocationPayload {
  return {
    sub_organization_id: a.subOrganizationId,
    is_primary: a.isPrimary,
    ctc: plan.gross > 0 ? plan.ctcAnnual : null,
    monthly_gross: plan.gross,
    salary_breakdown: plan.lines.map((l) => ({ component_id: l.componentId, amount: l.amount })),
    debit_ids: plan.debits.filter((d) => d.selected).map((d) => d.rule.id),
  };
}

export function allocationTotals(plans: SalaryPlan[]) {
  return {
    ctc: plans.reduce((s, p) => s + p.ctcAnnual, 0),
    gross: plans.reduce((s, p) => s + p.gross, 0),
  };
}

export function allocationErrorIndex(field: string | undefined) {
  const m = /^salary_allocations\[(\d+)\]/.exec(field || '');
  return m ? Number(m[1]) : null;
}
