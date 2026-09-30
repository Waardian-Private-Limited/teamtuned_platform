import type { DebitRuleOptionDto, SalaryComponentOptionDto, TaxThresholdDto } from '../types/employees.dto';
import { ptSlabFor } from '@/features/payroll-setup/utils/professionalTax';

export type SalaryDriver = { source: 'ctc' | 'gross'; value: number };
export type ComponentMode = 'percent' | 'amount';
export interface ComponentInput {
  mode: ComponentMode;
  value: number;
}

export interface SalaryLine {
  componentId: number;
  name: string;
  amount: number;
  balancing: boolean;
  configured: boolean;
  basisLabel: string;
  input: ComponentInput;
}

export interface DebitView {
  rule: DebitRuleOptionDto;
  eligible: boolean;
  selected: boolean;
  reason: string;
  employee: number | null;
  employer: number | null;
  employerInCtc: boolean;
  monthly: number | null;
}

export interface SalaryPlan {
  gross: number;
  ctcAnnual: number;
  ctcMonthly: number;
  basic: number;
  employerPf: number;
  employerEsi: number;
  employerOnTop: number;
  deductions: number;
  takeHome: number;
  lines: SalaryLine[];
  debits: DebitView[];
  error: string | null;
}

const round = (n: number) => Math.round(n);
const num = (v: unknown, fallback: number) => {
  const n = Number(v);
  return v === undefined || v === null || v === '' || !Number.isFinite(n) ? fallback : n;
};

export function basicComponent(components: SalaryComponentOptionDto[]) {
  return components.find((c) => c.is_basic) || null;
}

export function balancingComponent(components: SalaryComponentOptionDto[]) {
  return components.find((c) => c.calculation_type === 'balance') || null;
}

export function defaultInputs(components: SalaryComponentOptionDto[]): Record<number, ComponentInput> {
  const out: Record<number, ComponentInput> = {};
  for (const c of components) {
    out[c.id] = c.calculation_type === 'percentage' ? { mode: 'percent', value: num(c.percentage_value, 0) } : { mode: 'amount', value: 0 };
  }
  return out;
}

export function inputsFromAmounts(
  components: SalaryComponentOptionDto[],
  amounts: { component_id: number; amount: number }[]
): Record<number, ComponentInput> {
  const base = defaultInputs(components);
  const byId = new Map(amounts.map((a) => [a.component_id, Number(a.amount)]));
  for (const c of components) {
    if (c.calculation_type === 'flat' && byId.has(c.id)) base[c.id] = { mode: 'amount', value: byId.get(c.id) || 0 };
  }
  return base;
}

function buildLines(gross: number, components: SalaryComponentOptionDto[], inputs: Record<number, ComponentInput>) {
  const balancing = balancingComponent(components);
  const amounts = new Map<number, number>();
  const basic = basicComponent(components);

  for (const c of components) {
    const grossShare = c.calculation_type === 'percentage' && c.percentage_basis === 'gross';
    if ((c.calculation_type !== 'flat' && !grossShare) || c.id === balancing?.id) continue;
    const input = inputs[c.id] || { mode: 'amount', value: 0 };
    amounts.set(c.id, round(input.mode === 'percent' ? (gross * input.value) / 100 : input.value));
  }

  for (let pass = 0; pass < 4; pass += 1) {
    for (const c of components) {
      if (c.calculation_type !== 'percentage' || c.percentage_basis === 'gross') continue;
      const pct = (inputs[c.id]?.value ?? num(c.percentage_value, 0)) / 100;
      const base = c.percentage_basis === 'component' && c.basis_component_id
        ? amounts.get(c.basis_component_id) ?? 0
        : basic ? amounts.get(basic.id) ?? 0 : 0;
      amounts.set(c.id, round(base * pct));
    }
  }

  let others = [...amounts.entries()].reduce((sum, [, v]) => sum + v, 0);
  const rounded = components.filter((c) => c.id !== balancing?.id && (c.calculation_type === 'percentage' || inputs[c.id]?.mode === 'percent'));
  const drift = gross - others;
  if (!balancing && drift !== 0 && Math.abs(drift) <= rounded.length) {
    const target = [...rounded].reverse().find((c) => c.id !== basic?.id) || rounded[rounded.length - 1];
    amounts.set(target.id, (amounts.get(target.id) ?? 0) + drift);
    others += drift;
  }
  if (balancing) amounts.set(balancing.id, round(gross - others));

  const nameById = new Map(components.map((c) => [c.id, c.name]));
  const lines: SalaryLine[] = components.map((c) => {
    const input = inputs[c.id] || { mode: 'amount', value: 0 };
    let basisLabel = input.mode === 'percent' ? 'of gross' : 'fixed';
    if (c.calculation_type === 'percentage') {
      basisLabel = c.percentage_basis === 'gross'
        ? 'of gross'
        : c.percentage_basis === 'component'
          ? `of ${nameById.get(c.basis_component_id || 0) || 'component'}`
          : `of ${basic?.name || 'Basic'}`;
    }
    if (c.id === balancing?.id) basisLabel = 'balance';
    return {
      componentId: c.id,
      name: c.name,
      amount: amounts.get(c.id) ?? 0,
      balancing: c.id === balancing?.id,
      configured: c.calculation_type === 'percentage',
      basisLabel,
      input,
    };
  });

  const remainder = balancing ? amounts.get(balancing.id) ?? 0 : gross - others;
  const needsBasic = !basic && components.some((c) => c.calculation_type === 'percentage' && c.percentage_basis === 'basic');
  const error = needsBasic
    ? 'A component is set as "% of Basic" but no component is marked as Basic in Payroll Setup.'
    : remainder < 0
    ? 'Components add up to more than monthly gross. Lower a percentage or amount.'
    : !balancing && Math.abs(remainder) > 1
      ? 'Components must add up to monthly gross.'
      : null;
  return { lines, basic: basic ? amounts.get(basic.id) ?? 0 : 0, error };
}

function ruleOf(rules: DebitRuleOptionDto[], category: string) {
  return rules.find((r) => r.category === category) || null;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function limit(rule: DebitRuleOptionDto | null, key: string) {
  return num(rule?.config?.[key], Infinity);
}

function pfWage(rule: DebitRuleOptionDto, lines: SalaryLine[], basic: number) {
  const named = String(rule.config?.componentName || '').trim().toLowerCase();
  return named ? lines.find((l) => l.name.trim().toLowerCase() === named)?.amount ?? basic : basic;
}

function pfCapped(rule: DebitRuleOptionDto, wage: number) {
  return rule.config?.applyCeiling === false ? wage : Math.min(wage, limit(rule, 'wageCeiling'));
}

export function employerInCtc(rule: DebitRuleOptionDto | null) {
  return Boolean(rule?.config?.employerInCtc);
}

function employerPf(rule: DebitRuleOptionDto | null, on: boolean, lines: SalaryLine[], basic: number) {
  if (!rule || !on) return 0;
  return round((pfCapped(rule, pfWage(rule, lines, basic)) * num(rule.config?.employerRate, 0)) / 100);
}

function employerEsi(rule: DebitRuleOptionDto | null, on: boolean, gross: number) {
  if (!rule || !on || gross > limit(rule, 'eligibilityCeiling')) return 0;
  return round((gross * num(rule.config?.employerRate, 0)) / 100);
}

function stateMatches(rule: DebitRuleOptionDto, siteState: string | null) {
  const ruleState = String(rule.config?.state || '').trim();
  if (!ruleState) return { ok: true, reason: 'Applies to all states' };
  if (!siteState) return { ok: true, reason: `For ${ruleState}` };
  const ok = ruleState.toLowerCase() === siteState.trim().toLowerCase();
  return { ok, reason: ok ? `Primary site is in ${siteState}` : `Rule is for ${ruleState}, primary site is in ${siteState}` };
}

interface AutoContext {
  gross: number;
  basic: number;
  lines: SalaryLine[];
  siteState: string | null;
  gender: string | null;
  tax: TaxThresholdDto | null;
}

function autoDebit(rule: DebitRuleOptionDto, c: AutoContext) {
  switch (rule.category) {
    case 'epf': {
      const ceiling = limit(rule, 'wageCeiling');
      const wage = pfWage(rule, c.lines, c.basic);
      if (!Number.isFinite(ceiling)) return { eligible: true, auto: true, reason: 'Applies to all employees' };
      return wage <= ceiling
        ? { eligible: true, auto: true, reason: `Mandatory: PF wage ${inr(wage)} is within ${inr(ceiling)}` }
        : { eligible: true, auto: false, reason: `Optional: PF wage ${inr(wage)} is above ${inr(ceiling)}` };
    }
    case 'esi': {
      const ceiling = limit(rule, 'eligibilityCeiling');
      if (!Number.isFinite(ceiling)) return { eligible: true, auto: true, reason: 'Applies to all employees' };
      return c.gross <= ceiling
        ? { eligible: true, auto: true, reason: `Gross ${inr(c.gross)} is within ${inr(ceiling)}` }
        : { eligible: false, auto: false, reason: `Not applicable: gross above ${inr(ceiling)}` };
    }
    case 'professional_tax': {
      const m = stateMatches(rule, c.siteState);
      const slab = ptSlabFor(rule.config, c.gross, c.gender);
      const nil = !slab || (slab.amount === 0 && !slab.specialAmount);
      const who = slab && slab.gender !== 'all' ? ` (${slab.gender})` : '';
      if (m.ok && nil) return { eligible: true, auto: false, reason: `Nil slab${who} for gross ${inr(c.gross)}` };
      return { eligible: true, auto: m.ok, reason: m.reason };
    }
    case 'lwf': {
      const m = stateMatches(rule, c.siteState);
      return { eligible: true, auto: m.ok, reason: m.reason };
    }
    case 'tds': {
      if (!c.tax) return { eligible: true, auto: false, reason: 'Tax slabs for this year are not set up' };
      const annual = c.gross * 12;
      const free = c.tax.tax_free_up_to;
      const regime = `${c.tax.regime} regime, FY ${c.tax.financial_year}`;
      if (free === null) return { eligible: true, auto: false, reason: `No tax at any income (${regime})` };
      return annual > free
        ? { eligible: true, auto: true, reason: `Taxable: ${inr(annual)}/yr is above ${inr(free)} (${regime})` }
        : { eligible: true, auto: false, reason: `Not taxable up to ${inr(free)}/yr (${regime})` };
    }
    default:
      return { eligible: true, auto: false, reason: 'Optional: tick to apply' };
  }
}

function employeeDeduction(rule: DebitRuleOptionDto, gross: number, basic: number, lines: SalaryLine[], gender: string | null): number | null {
  const cfg = rule.config || {};
  switch (rule.category) {
    case 'epf':
      return round((pfCapped(rule, pfWage(rule, lines, basic)) * num(cfg.rate, 0)) / 100);
    case 'esi':
      return gross <= limit(rule, 'eligibilityCeiling') ? round((gross * num(cfg.rate, 0)) / 100) : 0;
    case 'professional_tax':
      return ptSlabFor(cfg, gross, gender)?.amount ?? 0;
    case 'lwf':
      return (cfg.frequency ?? rule.frequency) === 'monthly' ? num(cfg.amount, 0) : null;
    case 'tds':
      return null;
    default: {
      if (rule.frequency && rule.frequency !== 'monthly') return null;
      let amount: number | null = null;
      if (rule.debit_type === 'fixed') amount = num(rule.fixed_amount, 0);
      if (rule.debit_type === 'percentage') {
        const base = rule.reference_amount === 'breakdown_item'
          ? lines.find((l) => l.componentId === rule.breakdown_item_id)?.amount ?? 0
          : gross;
        amount = (base * num(rule.percentage_value, 0)) / 100;
      }
      if (amount === null) return null;
      return round(rule.max_cap !== null && rule.max_cap !== undefined ? Math.min(amount, rule.max_cap) : amount);
    }
  }
}

export function computeSalary(args: {
  driver: SalaryDriver;
  components: SalaryComponentOptionDto[];
  inputs: Record<number, ComponentInput>;
  debitRules: DebitRuleOptionDto[];
  debitOverrides: Record<number, boolean>;
  siteState: string | null;
  gender: string | null;
  tax: TaxThresholdDto | null;
}): SalaryPlan {
  const { driver, components, inputs, debitRules, debitOverrides, siteState, gender, tax } = args;
  const epf = ruleOf(debitRules, 'epf');
  const esi = ruleOf(debitRules, 'esi');

  const gross = driver.source === 'ctc' ? Math.max(0, round(driver.value / 12)) : Math.max(0, round(driver.value));
  const ctcAnnual = driver.source === 'ctc' ? Math.max(0, round(driver.value)) : gross * 12;
  const { lines, basic, error } = buildLines(gross, components, inputs);

  const autoContext: AutoContext = { gross, basic, lines, siteState, gender, tax };
  const debits: DebitView[] = debitRules.map((rule) => {
    const auto = autoDebit(rule, autoContext);
    const override = debitOverrides[rule.id];
    const selected = auto.eligible && (override ?? auto.auto);
    const employee = selected ? employeeDeduction(rule, gross, basic, lines, gender) : null;
    let employer: number | null = null;
    if (selected && rule.category === 'epf') employer = employerPf(rule, true, lines, basic);
    if (selected && rule.category === 'esi') employer = employerEsi(rule, true, gross);
    const inCtc = employer !== null && employerInCtc(rule);
    return {
      rule,
      eligible: auto.eligible,
      selected,
      reason: auto.reason,
      employee,
      employer,
      employerInCtc: inCtc,
      monthly: employee === null ? null : employee + (inCtc ? employer ?? 0 : 0),
    };
  });

  const pfView = epf ? debits.find((d) => d.rule.id === epf.id) : null;
  const esiView = esi ? debits.find((d) => d.rule.id === esi.id) : null;
  const employerOnTop = debits.reduce((sum, d) => sum + (d.employer && !d.employerInCtc ? d.employer : 0), 0);
  const deductions = debits.reduce((sum, d) => sum + (d.monthly ?? 0), 0);

  return {
    gross,
    ctcAnnual,
    ctcMonthly: round(ctcAnnual / 12),
    basic,
    employerPf: pfView?.employer ?? 0,
    employerEsi: esiView?.employer ?? 0,
    employerOnTop,
    deductions,
    takeHome: Math.max(gross - deductions, 0),
    lines,
    debits,
    error: gross > 0 ? error : null,
  };
}

export function formatInr(n: number | null | undefined) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
