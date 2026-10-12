'use client';

import React from 'react';
import { AlertCircle, ChevronDown, ChevronUp, HandCoins, Layers } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { PathKey } from './configPath';
import { summarizeAdvanceRule } from './explainers';
import { defaultsFor } from './schemaDefaults';
import { configPathKey, SchemaNodeRenderer, Switch, useAllFieldErrors, type AdvanceTypeOption } from './SchemaForm';
import { groupMeta, isArrayFieldNode, isFieldNode, isVisible, sectionEntries, type SchemaNode, type SectionNode } from './schemaTypes';

const STEPS: Array<{ key: string; label: string; groups: string[] }> = [
  { key: 'who', label: 'Who & how often', groups: ['eligibility', 'frequency'] },
  { key: 'amount', label: 'Amount', groups: ['limit'] },
  { key: 'repay', label: 'Repayment', groups: ['repayment', 'interest'] },
  { key: 'payout', label: 'Payout & request', groups: ['disbursement', 'request', 'approval'] },
];
const OTHER_STEP = { key: 'other', label: 'More' };

type Rule = Record<string, unknown> & { advanceTypeId: number };

interface SalaryAdvanceRulesConfiguratorProps {
  node: SectionNode;
  value: Record<string, unknown>;
  onChange: (path: PathKey[], value: unknown) => void;
  advanceTypeOptions: AdvanceTypeOption[];
}

function stepOf(key: string, child: SchemaNode): string {
  const tab = groupMeta(child)?.tab;
  if (tab && (STEPS.some((s) => s.key === tab) || tab === OTHER_STEP.key)) return tab;
  return STEPS.find((s) => s.groups.includes(key))?.key ?? OTHER_STEP.key;
}

interface TypeCardProps {
  option: AdvanceTypeOption;
  index: number;
  rule?: Rule;
  itemShape: SectionNode;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleEnabled: () => void;
  onChange: (path: PathKey[], value: unknown) => void;
  errors: Record<string, string>;
}

function AdvanceTypeCard({ option, index, rule, itemShape, expanded, onToggleExpanded, onToggleEnabled, onChange, errors }: TypeCardProps) {
  const [step, setStep] = React.useState(STEPS[0].key);
  const enabled = Boolean(rule);

  const groupsByStep = React.useMemo(() => {
    const out: Record<string, Array<[string, SchemaNode]>> = {};
    if (!rule) return out;
    for (const [key, child] of sectionEntries(itemShape)) {
      if (key === 'advanceTypeId' || isFieldNode(child) || !isVisible(child, rule)) continue;
      (out[stepOf(key, child)] ||= []).push([key, child]);
    }
    return out;
  }, [itemShape, rule]);

  const steps = [...STEPS, OTHER_STEP].filter((s) => groupsByStep[s.key]?.length);
  const activeStep = steps.some((s) => s.key === step) ? step : steps[0]?.key;

  const rulePrefix = configPathKey('salaryAdvance', ['rules', index]);
  const stepHasError = (key: string) => (groupsByStep[key] || []).some(([group]) => Object.keys(errors).some((p) => p.startsWith(`${rulePrefix}.${group}`)));
  const hasError = enabled && Object.keys(errors).some((p) => p === rulePrefix || p.startsWith(`${rulePrefix}.`));

  return (
    <div className={cx('overflow-hidden rounded-xl border bg-surface transition-colors', hasError ? 'border-[var(--tt-danger)]' : enabled ? 'border-line-strong shadow-xs' : 'border-line')}>
      <div className="flex items-center justify-between gap-3 p-3.5">
        <button type="button" onClick={enabled ? onToggleExpanded : onToggleEnabled} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div
            className={cx(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
              enabled ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line bg-bg-subtle text-fg-subtle'
            )}
          >
            <HandCoins className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cx('truncate text-xs font-bold sm:text-[13px]', enabled ? 'text-fg' : 'text-fg-muted')}>{option.name}</span>
              {option.active === false && <span className="rounded border border-line px-1.5 text-[10px] font-semibold text-fg-subtle">Inactive</span>}
              {hasError && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[var(--tt-danger)]" />}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-fg-muted">{rule ? summarizeAdvanceRule(rule) : 'Not offered by this policy — switch on to add it'}</p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {enabled && (
            <button type="button" onClick={onToggleExpanded} aria-label={expanded ? 'Collapse rules' : 'Edit rules'} className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <Switch checked={enabled} onChange={onToggleEnabled} label={`Offer ${option.name}`} />
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
                section="salaryAdvance"
                groupKey={key}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SalaryAdvanceRulesConfigurator({ node, value, onChange, advanceTypeOptions }: SalaryAdvanceRulesConfiguratorProps) {
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const errors = useAllFieldErrors();

  const rules = React.useMemo(() => (Array.isArray(value.rules) ? (value.rules as Rule[]) : []), [value.rules]);
  const rulesNode = (node as Record<string, unknown>).rules as SchemaNode | undefined;
  const itemShape = (rulesNode && isArrayFieldNode(rulesNode) ? rulesNode.item : {}) as SectionNode;
  const enabled = value.enabled === true;
  const otherEntries = sectionEntries(node).filter(([key]) => key !== 'enabled' && key !== 'rules');

  const cards = React.useMemo(() => {
    const known = new Set(advanceTypeOptions.map((o) => o.id));
    const orphans: AdvanceTypeOption[] = rules.filter((r) => !known.has(r.advanceTypeId)).map((r) => ({ id: r.advanceTypeId, name: `Advance type #${r.advanceTypeId}` }));
    return [...advanceTypeOptions.filter((o) => o.active !== false || rules.some((r) => r.advanceTypeId === o.id)), ...orphans];
  }, [advanceTypeOptions, rules]);

  const toggle = (option: AdvanceTypeOption) => {
    const index = rules.findIndex((r) => r.advanceTypeId === option.id);
    if (index >= 0) {
      onChange(['rules'], rules.filter((_, i) => i !== index));
      if (expandedId === option.id) setExpandedId(null);
    } else {
      onChange(['rules'], [...rules, { ...(defaultsFor(itemShape) as Record<string, unknown>), advanceTypeId: option.id }]);
      setExpandedId(option.id);
    }
  };

  const enabledError = errors[configPathKey('salaryAdvance', ['enabled'])];
  const rulesError = errors[configPathKey('salaryAdvance', ['rules'])];

  return (
    <div className="flex flex-col gap-4">
      <section className={cx('flex items-center justify-between gap-3 rounded-xl border bg-surface p-3.5 shadow-xs', enabledError ? 'border-[var(--tt-danger)]' : 'border-line')}>
        <div>
          <div className="flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-fg" />
            <h3 className="text-xs font-bold text-fg sm:text-sm">Salary advances</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-fg-muted">
            {enabled
              ? 'Employees on this policy can request the advance types switched on below, within their limits.'
              : 'Off: employees on this policy cannot request advances. HR can still create one on their behalf.'}
          </p>
          {enabledError && <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{enabledError}</p>}
        </div>
        <Switch checked={enabled} onChange={(on) => onChange(['enabled'], on)} label="Allow salary advances" />
      </section>

      {otherEntries.map(([key, child]) => (
        <SchemaNodeRenderer key={key} node={child} value={value[key]} scopeValue={value} onChange={onChange} path={[key]} section="salaryAdvance" groupKey={key} />
      ))}

      {enabled && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-fg sm:text-sm">Advance types</h3>
              <p className="text-[11px] text-fg-muted">Switch on what this policy offers, then open a type to set its limits, repayment and approval.</p>
            </div>
            <span className="shrink-0 text-[11px] text-fg-subtle">
              {rules.length} of {cards.length} on
            </span>
          </div>
          {rulesError && <p className="text-[11px] font-medium text-[var(--tt-danger)]">{rulesError}</p>}
          {cards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
              <Layers className="mx-auto mb-2 h-8 w-8 text-fg-subtle" />
              <p className="text-xs font-semibold text-fg sm:text-sm">No advance types yet</p>
              <p className="mt-1 text-[11px] text-fg-muted sm:text-xs">Create them under Salary Advance › Advance types, then switch them on here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {cards.map((option) => {
                const index = rules.findIndex((r) => r.advanceTypeId === option.id);
                return (
                  <AdvanceTypeCard
                    key={option.id}
                    option={option}
                    index={index}
                    rule={index >= 0 ? rules[index] : undefined}
                    itemShape={itemShape}
                    expanded={expandedId === option.id}
                    onToggleExpanded={() => setExpandedId(expandedId === option.id ? null : option.id)}
                    onToggleEnabled={() => toggle(option)}
                    onChange={onChange}
                    errors={errors}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
