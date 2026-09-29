'use client';

import React from 'react';
import { AlertCircle, Calendar, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { PathKey } from './configPath';
import { summarizeLeaveRule } from './explainers';
import { LEAVE_PRESETS, deepMerge } from './leavePresets';
import { defaultsFor } from './schemaDefaults';
import { configPathKey, SchemaNodeRenderer, Switch, useAllFieldErrors, type LeaveTypeOption, type SalaryComponentOption } from './SchemaForm';
import { groupMeta, isArrayFieldNode, isVisible, sectionEntries, type SchemaNode, type SectionNode } from './schemaTypes';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// The steps a leave type's rule is laid out in. A group names its step in
// the schema (`tab`), so a new rule group lands in the right step with no
// change here.
const STEPS: Array<{ key: string; label: string }> = [
  { key: 'who', label: 'Who gets it' },
  { key: 'credit', label: 'How much' },
  { key: 'apply', label: 'Applying' },
  { key: 'limits', label: 'Limits' },
  { key: 'combine', label: 'Balance & combining' },
  { key: 'yearEnd', label: 'Year end' },
  { key: 'exit', label: 'Exit' },
];

type Rule = Record<string, unknown> & { leaveTypeId: number };

interface LeaveRulesConfiguratorProps {
  /** The leave section's schema node (leaveYear, changeHandling, rules). */
  node: SectionNode;
  value: Record<string, unknown>;
  onChange: (path: PathKey[], value: unknown) => void;
  leaveTypeOptions: LeaveTypeOption[];
  salaryComponentOptions?: SalaryComponentOption[];
}

function yearBasis(startMonth: number) {
  return startMonth === 1 ? 'calendar' : startMonth === 4 ? 'financial' : 'custom';
}

/**
 * The rule a leave type starts with when switched on: schema defaults, then
 * the catalogue preset for its code, then what the leave type itself says
 * (a female-only leave type starts female-only), on the policy's leave year.
 */
function newRuleFor(itemShape: SchemaNode, option: LeaveTypeOption, leaveYear: { startMonth: number; startDay: number }): Rule {
  let rule = defaultsFor(itemShape) as Rule;
  rule = deepMerge(rule, LEAVE_PRESETS[option.code || ''] || {});
  if (option.genderEligibility && option.genderEligibility !== 'any') {
    rule = deepMerge(rule, { eligibility: { genders: [option.genderEligibility] } });
  }
  return {
    ...rule,
    leaveTypeId: option.id,
    leaveYear: { basis: yearBasis(leaveYear.startMonth), startMonth: leaveYear.startMonth, startDay: leaveYear.startDay },
  };
}

function LeaveYearCard({ startMonth, onChange }: { startMonth: number; onChange: (month: number) => void }) {
  const endMonth = ((startMonth + 10) % 12) + 1;
  const endDay = new Date(Date.UTC(2026, endMonth, 0)).getUTCDate();
  const presets = [
    { month: 1, label: 'Calendar (Jan – Dec)' },
    { month: 4, label: 'Financial (Apr – Mar)' },
    { month: 7, label: 'Fiscal (Jul – Jun)' },
  ];
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-xs">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-fg" />
            <h3 className="text-xs font-bold text-fg sm:text-sm">Leave year</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-fg-muted">The 12 months balances are counted in. Each leave type can still pick its own below.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((p) => (
            <button
              key={p.month}
              type="button"
              onClick={() => onChange(p.month)}
              className={cx(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                startMonth === p.month ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border border-line bg-surface text-fg hover:bg-bg-subtle'
              )}
            >
              {p.label}
            </button>
          ))}
          <select
            value={startMonth}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label="Leave year start month"
            className="h-7 rounded-lg border border-line bg-surface px-2 text-xs text-fg outline-none focus:border-[var(--tt-primary)]"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx + 1}>
                Starts {m}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="rounded-lg border border-line bg-bg-subtle px-3 py-1.5 text-[11px] text-fg-muted">
        Runs {MONTH_NAMES[startMonth - 1]} 1 – {MONTH_NAMES[endMonth - 1]} {endDay}. Unused balance is carried or lapses on {MONTH_NAMES[endMonth - 1]} {endDay}.
      </p>
    </section>
  );
}

interface LeaveTypeCardProps {
  option: LeaveTypeOption;
  index: number;
  rule?: Rule;
  itemShape: SectionNode;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleEnabled: () => void;
  onChange: (path: PathKey[], value: unknown) => void;
  leaveTypeOptions: LeaveTypeOption[];
  salaryComponentOptions?: SalaryComponentOption[];
  errors: Record<string, string>;
}

function LeaveTypeCard({ option, index, rule, itemShape, expanded, onToggleExpanded, onToggleEnabled, onChange, leaveTypeOptions, salaryComponentOptions, errors }: LeaveTypeCardProps) {
  const [step, setStep] = React.useState('credit');
  const enabled = Boolean(rule);

  // Groups of this rule that currently apply, by step. A step with nothing
  // in force (e.g. "Year end" for unlimited leave) is not offered at all.
  const groupsByStep = React.useMemo(() => {
    const out: Record<string, Array<[string, SchemaNode]>> = {};
    if (!rule) return out;
    for (const [key, child] of sectionEntries(itemShape)) {
      const tab = groupMeta(child)?.tab;
      if (!tab || !isVisible(child, rule)) continue;
      (out[tab] ||= []).push([key, child]);
    }
    return out;
  }, [itemShape, rule]);

  const steps = STEPS.filter((s) => groupsByStep[s.key]?.length);
  const activeStep = steps.some((s) => s.key === step) ? step : steps[0]?.key;

  const rulePrefix = configPathKey('leave', ['rules', index]);
  const stepHasError = (key: string) =>
    (groupsByStep[key] || []).some(([group]) => Object.keys(errors).some((p) => p.startsWith(`${rulePrefix}.${group}`)));
  const hasError = enabled && Object.keys(errors).some((p) => p.startsWith(`${rulePrefix}.`) || p === `${rulePrefix}`);

  return (
    <div className={cx('overflow-hidden rounded-xl border bg-surface transition-colors', hasError ? 'border-[var(--tt-danger)]' : enabled ? 'border-line-strong shadow-xs' : 'border-line')}>
      <div className="flex items-center justify-between gap-3 p-3.5">
        <button type="button" onClick={enabled ? onToggleExpanded : onToggleEnabled} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div
            className={cx(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-bold',
              enabled ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line bg-bg-subtle text-fg-subtle'
            )}
          >
            {option.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cx('truncate text-xs font-bold sm:text-[13px]', enabled ? 'text-fg' : 'text-fg-muted')}>{option.name}</span>
              {hasError && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[var(--tt-danger)]" />}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-fg-muted">{rule ? summarizeLeaveRule(rule) : 'Not part of this policy — switch on to add it'}</p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {enabled && (
            <button type="button" onClick={onToggleExpanded} aria-label={expanded ? 'Collapse rules' : 'Edit rules'} className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <Switch checked={enabled} onChange={onToggleEnabled} label={`Include ${option.name}`} />
        </div>
      </div>

      {rule && expanded && activeStep && (
        <div className="border-t border-line bg-bg-subtle/40 p-3.5">
          <div role="tablist" aria-label={`${option.name} rules`} className="mb-3 flex gap-1 overflow-x-auto tt-scroll-hidden">
            {steps.map((s) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={activeStep === s.key}
                onClick={() => setStep(s.key)}
                className={cx(
                  'relative inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-[11px] font-semibold transition-colors sm:text-xs',
                  activeStep === s.key ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'text-fg-muted hover:bg-surface hover:text-fg'
                )}
              >
                {s.label}
                {stepHasError(s.key) && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-[var(--tt-danger)]" aria-label="has errors" />}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {(groupsByStep[activeStep] || []).map(([key, child]) => (
              <SchemaNodeRenderer
                key={key}
                node={child}
                value={rule[key]}
                scopeValue={rule}
                onChange={onChange}
                path={['rules', index, key]}
                leaveTypeOptions={leaveTypeOptions.filter((o) => o.id !== option.id)}
                salaryComponentOptions={salaryComponentOptions}
                section="leave"
                groupKey={key}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The leave section of a policy: the leave year, what a change to the
 * policy does to balances in flight, and one card per leave type. Every
 * control inside a leave type's card comes from the backend schema, so a
 * new rule appears here without a frontend change.
 */
export function LeaveRulesConfigurator({ node, value, onChange, leaveTypeOptions, salaryComponentOptions }: LeaveRulesConfiguratorProps) {
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

  const rules = React.useMemo(() => (Array.isArray(value.rules) ? (value.rules as Rule[]) : []), [value.rules]);
  const rulesNode = (node as Record<string, unknown>).rules as SchemaNode;
  const itemShape = (isArrayFieldNode(rulesNode) ? rulesNode.item : {}) as SectionNode;
  // Policy-wide leave groups (e.g. change handling):
  // everything in the section except the leave year card and the rules.
  const policyGroups = sectionEntries(node).filter(([key]) => key !== 'leaveYear' && key !== 'rules');

  const leaveYear = (value.leaveYear || {}) as { startMonth?: number; startDay?: number };
  const startMonth = leaveYear.startMonth || 1;
  const startDay = leaveYear.startDay || 1;

  const errors = useAllFieldErrors();

  // Switching absence adjustment on for a leave type puts it last in the
  // order, so it never clashes with a type already covering absences.
  const changeRule = (path: PathKey[], next: unknown) => {
    const [, index, group, field] = path;
    if (group === 'absenceAdjustment' && field === 'enabled' && next === true && typeof index === 'number') {
      const taken = rules
        .filter((r, i) => i !== index && (r.absenceAdjustment as { enabled?: boolean } | undefined)?.enabled)
        .map((r) => Number((r.absenceAdjustment as { priority?: number }).priority) || 0);
      const current = rules[index].absenceAdjustment as Record<string, unknown>;
      onChange(['rules', index, 'absenceAdjustment'], { ...current, enabled: true, priority: taken.length ? Math.max(...taken) + 1 : 1 });
      return;
    }
    onChange(path, next);
  };

  // Moving the policy's leave year moves every leave type with it — one
  // write, so neither half is lost to the other.
  const changeLeaveYear = (month: number) => {
    onChange([], {
      ...value,
      leaveYear: { startMonth: month, startDay: 1 },
      rules: rules.map((r) => ({ ...r, leaveYear: { ...(r.leaveYear as object), basis: yearBasis(month), startMonth: month, startDay: 1 } })),
    });
  };

  // Catalogue types first, then any rule whose type is no longer listed
  // (inactive or deleted), so its rule stays visible and removable.
  const cards = React.useMemo(() => {
    const known = new Set(leaveTypeOptions.map((o) => o.id));
    const orphans = rules.filter((r) => !known.has(r.leaveTypeId)).map((r) => ({ id: r.leaveTypeId, name: `Leave type #${r.leaveTypeId}` }));
    return [...leaveTypeOptions, ...orphans];
  }, [leaveTypeOptions, rules]);

  const toggle = (option: LeaveTypeOption) => {
    const index = rules.findIndex((r) => r.leaveTypeId === option.id);
    if (index >= 0) {
      onChange(['rules'], rules.filter((_, i) => i !== index));
      if (expandedId === option.id) setExpandedId(null);
    } else {
      onChange(['rules'], [...rules, newRuleFor(itemShape, option, { startMonth, startDay })]);
      setExpandedId(option.id);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <LeaveYearCard startMonth={startMonth} onChange={changeLeaveYear} />

      {policyGroups.map(([key, child]) => (
        <SchemaNodeRenderer
          key={key}
          node={child}
          value={value[key]}
          scopeValue={value}
          onChange={onChange}
          path={[key]}
          leaveTypeOptions={leaveTypeOptions}
          salaryComponentOptions={salaryComponentOptions}
          section="leave"
          groupKey={key}
        />
      ))}

      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-fg sm:text-sm">Leave types</h3>
          <p className="text-[11px] text-fg-muted">Switch on the leave this policy gives, then open a leave type to tune its rules step by step.</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-fg-subtle">
          <RefreshCw className="h-3 w-3" /> {rules.length} of {cards.length} on
        </span>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-fg-subtle" />
          <p className="text-xs font-semibold text-fg sm:text-sm">No leave types yet</p>
          <p className="mt-1 text-[11px] text-fg-muted sm:text-xs">Add leave types under Leave types first, then switch them on here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
              {cards.map((option) => {
                const index = rules.findIndex((r) => r.leaveTypeId === option.id);
                return (
                  <LeaveTypeCard
                    key={option.id}
                    option={option}
                    index={index}
                    rule={index >= 0 ? rules[index] : undefined}
                    itemShape={itemShape}
                    expanded={expandedId === option.id}
                    onToggleExpanded={() => setExpandedId(expandedId === option.id ? null : option.id)}
                    onToggleEnabled={() => toggle(option)}
                    onChange={changeRule}
                    leaveTypeOptions={leaveTypeOptions}
                    salaryComponentOptions={salaryComponentOptions}
                    errors={errors}
                  />
                );
              })}
        </div>
      )}
    </div>
  );
}
