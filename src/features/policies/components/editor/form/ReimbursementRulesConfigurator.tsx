'use client';

import React from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Layers, Receipt } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { categoryIcon } from '@/features/reimbursement/constants/reimbursement.constants';
import type { PathKey } from './configPath';
import { defaultsFor } from './schemaDefaults';
import { configPathKey, SchemaNodeRenderer, Switch, useAllFieldErrors, type ExpenseCategoryOption } from './SchemaForm';
import { isArrayFieldNode, isFieldNode, isVisible, sectionEntries, type SchemaNode, type SectionNode } from './schemaTypes';

type Rule = Record<string, unknown> & { categoryId: number };
type Config = Record<string, unknown>;

const SECTION = 'reimbursement';

function rupees(v: number) {
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** One line describing a category rule, for the collapsed card. */
export function summarizeExpenseRule(rule: Config, kind?: string): string {
  const parts: string[] = [];
  const limits = (rule.limits || {}) as Config;
  const caps = [
    num(limits.perClaim) > 0 ? `${rupees(num(limits.perClaim))} a report` : null,
    num(limits.perMonth) > 0 ? `${rupees(num(limits.perMonth))} a month` : null,
    num(limits.perYear) > 0 ? `${rupees(num(limits.perYear))} a year` : null,
  ].filter(Boolean) as string[];
  parts.push(caps.length ? `up to ${caps.join(', ')}${limits.whenExceeded === 'block' ? ' (blocked above)' : ''}` : 'no limit');
  if (kind === 'distance') {
    const rate = num((rule.distance as Config | undefined)?.ratePerKm);
    parts.push(rate > 0 ? `${rupees(rate)} per km` : 'no rate per km set');
  }
  const receipt = (rule.receipt || {}) as Config;
  const required = String(receipt.required || 'above');
  parts.push(required === 'always' ? 'receipt always' : required === 'never' ? 'no receipt needed' : `receipt above ${rupees(num(receipt.above))}`);
  return parts.join(' · ');
}

interface CategoryCardProps {
  option: ExpenseCategoryOption;
  index: number;
  rule?: Rule;
  itemShape: SectionNode;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleEnabled: () => void;
  onChange: (path: PathKey[], value: unknown) => void;
  errors: Record<string, string>;
}

function CategoryCard({ option, index, rule, itemShape, expanded, onToggleExpanded, onToggleEnabled, onChange, errors }: CategoryCardProps) {
  const enabled = Boolean(rule);
  const Icon = categoryIcon(option.icon);
  const rulePrefix = configPathKey(SECTION, ['rules', index]);
  const hasError = enabled && Object.keys(errors).some((p) => p === rulePrefix || p.startsWith(`${rulePrefix}.`));

  const groups = React.useMemo(() => {
    if (!rule) return [] as Array<[string, SchemaNode]>;
    return sectionEntries(itemShape).filter(([key, child]) => {
      if (key === 'categoryId' || isFieldNode(child) || !isVisible(child, rule)) return false;
      // The rate per km only applies to distance categories.
      if (key === 'distance' && option.kind && option.kind !== 'distance') return false;
      return true;
    });
  }, [itemShape, rule, option.kind]);

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
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cx('truncate text-xs font-bold sm:text-[13px]', enabled ? 'text-fg' : 'text-fg-muted')}>{option.name}</span>
              {option.kind === 'distance' && <span className="rounded border border-line px-1.5 text-[10px] font-semibold text-fg-muted">Per km</span>}
              {option.active === false && <span className="rounded border border-line px-1.5 text-[10px] font-semibold text-fg-subtle">Inactive</span>}
              {hasError && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[var(--tt-danger)]" />}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-fg-muted">{rule ? summarizeExpenseRule(rule, option.kind) : 'Not allowed by this policy — switch on to allow it'}</p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {enabled && (
            <button type="button" onClick={onToggleExpanded} aria-label={expanded ? 'Collapse rules' : 'Edit rules'} className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <Switch checked={enabled} onChange={onToggleEnabled} label={`Allow ${option.name}`} />
        </div>
      </div>

      {rule && expanded && (
        <div className="flex flex-col gap-3 border-t border-line bg-bg-subtle/40 p-3.5">
          {groups.map(([key, child]) => (
            <SchemaNodeRenderer key={key} node={child} value={rule[key]} scopeValue={rule} onChange={onChange} path={['rules', index, key]} section={SECTION} groupKey={key} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ReimbursementRulesConfiguratorProps {
  node: SectionNode;
  value: Record<string, unknown>;
  onChange: (path: PathKey[], value: unknown) => void;
  categoryOptions: ExpenseCategoryOption[];
  /** Which org features are on: the claims group needs claims, the wallet group needs the wallet. */
  features?: { claims: boolean; wallet: boolean };
}

export function ReimbursementRulesConfigurator({ node, value, onChange, categoryOptions, features }: ReimbursementRulesConfiguratorProps) {
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const errors = useAllFieldErrors();

  const rules = React.useMemo(() => (Array.isArray(value.rules) ? (value.rules as Rule[]) : []), [value.rules]);
  const rulesNode = (node as Record<string, unknown>).rules as SchemaNode | undefined;
  const itemShape = (rulesNode && isArrayFieldNode(rulesNode) ? rulesNode.item : {}) as SectionNode;
  const enabled = value.enabled === true;
  const entries = sectionEntries(node).filter(([key, child]) => {
    if (key === 'enabled' || key === 'rules' || !isVisible(child, value)) return false;
    if (key === 'claims' && features && !features.claims) return false;
    if (key === 'wallet' && features && !features.wallet) return false;
    return true;
  });
  const scalars = entries.filter(([, child]) => isFieldNode(child));
  const groups = entries.filter(([, child]) => !isFieldNode(child));

  const cards = React.useMemo(() => {
    const known = new Set(categoryOptions.map((o) => o.id));
    const orphans: ExpenseCategoryOption[] = rules.filter((r) => !known.has(r.categoryId)).map((r) => ({ id: r.categoryId, name: `Category #${r.categoryId}` }));
    return [...categoryOptions.filter((o) => o.active !== false || rules.some((r) => r.categoryId === o.id)), ...orphans];
  }, [categoryOptions, rules]);

  const toggle = (option: ExpenseCategoryOption) => {
    const index = rules.findIndex((r) => r.categoryId === option.id);
    if (index >= 0) {
      onChange(['rules'], rules.filter((_, i) => i !== index));
      if (expandedId === option.id) setExpandedId(null);
    } else {
      onChange(['rules'], [...rules, { ...(defaultsFor(itemShape) as Record<string, unknown>), categoryId: option.id }]);
      setExpandedId(option.id);
    }
  };

  const enabledError = errors[configPathKey(SECTION, ['enabled'])];
  const rulesError = errors[configPathKey(SECTION, ['rules'])];

  return (
    <div className="flex flex-col gap-4">
      <section className={cx('flex items-center justify-between gap-3 rounded-xl border bg-surface p-3.5 shadow-xs', enabledError ? 'border-[var(--tt-danger)]' : 'border-line')}>
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-fg" />
            <h3 className="text-xs font-bold text-fg sm:text-sm">Expenses</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-fg-muted">
            {enabled
              ? 'Employees on this policy can submit expenses in the categories switched on below, within their limits.'
              : 'Off: employees on this policy cannot submit expenses. HR can still file one on their behalf.'}
          </p>
          {enabledError && <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{enabledError}</p>}
        </div>
        <Switch checked={enabled} onChange={(on) => onChange(['enabled'], on)} label="Allow expenses" />
      </section>

      {enabled && (
        <>
          {scalars.length > 0 && (
            <section className="rounded-xl border border-line bg-surface p-3.5 shadow-xs">
              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {scalars.map(([key, child]) => (
                  <SchemaNodeRenderer key={key} node={child} value={value[key]} scopeValue={value} onChange={onChange} path={[key]} section={SECTION} groupKey={key} />
                ))}
              </div>
            </section>
          )}

          {groups.map(([key, child]) => (
            <SchemaNodeRenderer key={key} node={child} value={value[key]} scopeValue={value} onChange={onChange} path={[key]} section={SECTION} groupKey={key} />
          ))}

          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-fg sm:text-sm">Expense categories</h3>
              <p className="text-[11px] text-fg-muted">An employee can only claim in a category switched on here. Open one to set its limits and receipt rule.</p>
            </div>
            <span className="shrink-0 text-[11px] text-fg-subtle">
              {rules.length} of {cards.length} on
            </span>
          </div>
          {rulesError && <p className="text-[11px] font-medium text-[var(--tt-danger)]">{rulesError}</p>}
          {cards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
              <Layers className="mx-auto mb-2 h-8 w-8 text-fg-subtle" />
              <p className="text-xs font-semibold text-fg sm:text-sm">No expense categories yet</p>
              <p className="mt-1 text-[11px] text-fg-muted sm:text-xs">Create them under Expenses › Categories, then switch them on here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {cards.map((option) => {
                const index = rules.findIndex((r) => r.categoryId === option.id);
                return (
                  <CategoryCard
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
