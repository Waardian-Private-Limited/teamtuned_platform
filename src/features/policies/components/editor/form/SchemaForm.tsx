'use client';

import React from 'react';
import { Info, Plus, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { getAtPath, setAtPath, type PathKey } from './configPath';
import { explainCard } from './explainers';
import {
  isArrayFieldNode,
  isFieldNode,
  isVisible,
  labelOf,
  optionLabel,
  sectionEntries,
  groupMeta,
  type ArrayFieldNode,
  type ScalarFieldNode,
  type SchemaNode,
  type SectionNode,
} from './schemaTypes';
import { LeaveRulesConfigurator, type LeaveRuleConfig } from './LeaveRulesConfigurator';
import { WeeklyOffScheduleEditor, type DayKey, type DayScheduleConfig } from './WeeklyOffScheduleEditor';

export interface LeaveTypeOption {
  id: number;
  name: string;
}

export interface SalaryComponentOption {
  id: number;
  name: string;
}

const GROSS_SALARY_COMPONENT: SalaryComponentOption = { id: 0, name: 'Gross (all active components)' };

// Every control has uniform 40px height, consistent borders, and responsive font
const CONTROL =
  'h-10 w-full min-w-0 rounded-lg border border-line bg-surface px-3 text-xs text-fg outline-none transition-all duration-150 focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] sm:text-[13px]';
// No truncate: a clipped "Maximum overtime minutes per…" tells the admin
// nothing. Labels wrap onto a second line instead of losing words.
const LABEL = 'text-[11px] font-semibold leading-snug text-fg sm:text-xs';

/**
 * Modern High-Affordance Switch
 * - OFF: Soft neutral with crisp contrast
 * - ON: Vibrant emerald green with smooth spring slide
 */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cx(
        'relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
        checked ? 'bg-emerald-600' : 'bg-zinc-200 dark:bg-zinc-700'
      )}
    >
      <span
        className={cx(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
        )}
      />
    </button>
  );
}

function FieldHelp({ text }: { text?: string }) {
  if (!text) return <div className="min-h-[14px]" />;
  return <p className="mt-1 min-h-[14px] text-[10px] leading-snug text-fg-subtle sm:text-[11px]">{text}</p>;
}

function ScalarControl({
  label,
  node,
  value,
  onChange,
  leaveTypeOptions,
  isLeaveTypeIdField,
  salaryComponentOptions,
  isSalaryComponentField,
}: {
  label: string;
  node: ScalarFieldNode;
  value: unknown;
  onChange: (v: unknown) => void;
  leaveTypeOptions?: LeaveTypeOption[];
  isLeaveTypeIdField?: boolean;
  salaryComponentOptions?: SalaryComponentOption[];
  isSalaryComponentField?: boolean;
}) {
  if (isLeaveTypeIdField) {
    return (
      <div className="flex flex-col">
        <div className="flex min-h-[20px] flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
          <label className={LABEL}>{label}</label>
        </div>
        <div className="mt-1">
          <select value={String(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} className={CONTROL}>
            <option value="0">Select leave type…</option>
            {(leaveTypeOptions || []).map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-h-[14px]" />
      </div>
    );
  }

  if (isSalaryComponentField) {
    const options = [GROSS_SALARY_COMPONENT, ...(salaryComponentOptions || [])];
    return (
      <div className="flex flex-col">
        <div className="flex min-h-[20px] flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
          <label className={LABEL}>{label}</label>
        </div>
        <div className="mt-1">
          <select value={String(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} className={CONTROL}>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <FieldHelp text={node.help} />
      </div>
    );
  }

  switch (node.type) {
    case 'bool':
      return (
        <div className="flex flex-col">
          <div className="flex min-h-[20px] flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
            <label className={LABEL}>{label}</label>
            <span
              className={cx(
                'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider',
                Boolean(value)
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-fg-subtle border border-line'
              )}
            >
              {Boolean(value) ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className="mt-1">
            <div
              role="button"
              tabIndex={0}
              onClick={() => onChange(!value)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onChange(!value);
                }
              }}
              className={cx(
                'flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 transition-all select-none',
                Boolean(value)
                  ? 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/60'
                  : 'border-line bg-surface hover:bg-bg-subtle hover:border-line-strong'
              )}
            >
              <span className="text-xs font-semibold text-fg truncate">
                {Boolean(value) ? 'Active' : 'Disabled'}
              </span>
              <Switch checked={Boolean(value)} onChange={onChange} label={label} />
            </div>
          </div>
          <FieldHelp text={node.help} />
        </div>
      );

    case 'enum':
      return (
        <div className="flex flex-col">
          <div className="flex min-h-[20px] flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
            <label className={LABEL}>{label}</label>
          </div>
          <div className="mt-1">
            <select value={String(value ?? node.default)} onChange={(e) => onChange(e.target.value)} className={CONTROL}>
              {(node.values || []).map((v) => (
                <option key={v} value={v}>
                  {optionLabel(v)}
                </option>
              ))}
            </select>
          </div>
          <FieldHelp text={node.help} />
        </div>
      );

    case 'time':
      return (
        <div className="flex flex-col">
          <div className="flex min-h-[20px] flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
            <label className={LABEL}>{label}</label>
          </div>
          <div className="mt-1">
            <input
              type="time"
              step={60}
              value={String(value ?? node.default).slice(0, 5)}
              onChange={(e) => onChange(e.target.value ? `${e.target.value}:00` : node.default)}
              className={CONTROL}
            />
          </div>
          <FieldHelp text={node.help} />
        </div>
      );

    case 'number':
    case 'int':
      return (
        <div className="flex flex-col">
          <div className="flex min-h-[20px] flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
            <label className={LABEL}>{label}</label>
          </div>
          <div className="mt-1">
            <input
              type="number"
              step={node.type === 'int' ? 1 : 'any'}
              min={node.min}
              max={node.max}
              value={value === undefined || value === null ? '' : Number(value)}
              onChange={(e) => onChange(e.target.value === '' ? node.default : Number(e.target.value))}
              className={CONTROL}
            />
          </div>
          <FieldHelp text={node.help} />
        </div>
      );

    case 'string':
    default:
      return (
        <div className="flex flex-col">
          <div className="flex min-h-[20px] flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
            <label className={LABEL}>{label}</label>
          </div>
          <div className="mt-1">
            <input
              type="text"
              value={String(value ?? '')}
              maxLength={node.maxLength}
              onChange={(e) => onChange(e.target.value)}
              className={CONTROL}
            />
          </div>
          <FieldHelp text={node.help} />
        </div>
      );
  }
}

function CardSummaryBlock({
  section,
  group,
  value,
  sectionValue,
}: {
  section: string;
  group: string;
  value: unknown;
  sectionValue: unknown;
}) {
  const summary = React.useMemo(() => explainCard(section, group, value, sectionValue), [section, group, value, sectionValue]);
  if (!summary) return null;

  return (
    <div className="mt-3 rounded-lg border border-line bg-bg-subtle p-2.5">
      <div className="mb-1 flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">What this means for an employee</span>
      </div>
      <ul className="space-y-0.5">
        {summary.rule.map((line, i) => (
          <li key={i} className="text-[11px] leading-snug text-fg-muted sm:text-xs">
            {line}
          </li>
        ))}
      </ul>
      {summary.example && <p className="mt-1.5 text-[11px] leading-snug text-fg sm:text-xs">{summary.example}</p>}
    </div>
  );
}

interface RenderContext {
  value: unknown;
  scopeValue: unknown;
  onChange: (path: PathKey[], value: unknown) => void;
  path: PathKey[];
  leaveTypeOptions?: LeaveTypeOption[];
  salaryComponentOptions?: SalaryComponentOption[];
  section: string;
}

const DAY_KEYS = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

/** The controls of one group, plus any nested sub-groups it contains. */
function GroupFields({ node, value, scopeValue, onChange, path, leaveTypeOptions, salaryComponentOptions, section }: RenderContext & { node: SectionNode }) {
  const entries = sectionEntries(node).filter(([, child]) => isVisible(child, scopeValue));
  const leaves = entries.filter(([, child]) => isFieldNode(child) && child.type !== 'array');
  const branches = entries.filter(([, child]) => !isFieldNode(child) || child.type === 'array');
  const val = (value || {}) as Record<string, unknown>;

  const isDefaultSchedule = entries.some(([k]) => DAY_KEYS.has(k));
  const filteredBranches = isDefaultSchedule ? branches.filter(([key]) => !DAY_KEYS.has(key)) : branches;
  const showWeeklyOffEditor = isDefaultSchedule && val.enabled !== false && (val.weeklyOffMode === 'fixed_days' || !val.weeklyOffMode);

  return (
    <div className="flex flex-col gap-3">
      {leaves.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leaves.map(([key, child]) => (
            <ScalarControl
              key={key}
              label={labelOf(child, key)}
              node={child as ScalarFieldNode}
              value={val[key]}
              onChange={(v) => onChange([...path, key], v)}
              leaveTypeOptions={leaveTypeOptions}
              isLeaveTypeIdField={key === 'leaveTypeId'}
              salaryComponentOptions={salaryComponentOptions}
              isSalaryComponentField={key === 'salaryComponentId'}
            />
          ))}
        </div>
      )}
      {showWeeklyOffEditor && (
        <WeeklyOffScheduleEditor
          value={val}
          onChange={(dayKey: DayKey, dayConfig: DayScheduleConfig) => onChange([...path, dayKey], dayConfig)}
        />
      )}
      {filteredBranches.map(([key, child]) => (
        <SchemaNodeRenderer
          key={key}
          node={child}
          value={val[key]}
          scopeValue={scopeValue}
          onChange={onChange}
          path={[...path, key]}
          label={labelOf(child, key)}
          leaveTypeOptions={leaveTypeOptions}
          salaryComponentOptions={salaryComponentOptions}
          section={section}
          groupKey={key}
        />
      ))}
    </div>
  );
}

interface RendererProps extends RenderContext {
  node: SchemaNode;
  label?: string;
  groupKey?: string;
}

function GroupCard(props: RendererProps & { node: SectionNode }) {
  const { node, value, section, groupKey, label } = props;
  const meta = groupMeta(node);

  return (
    <section className="rounded-xl border border-line bg-surface p-3.5 shadow-xs">
      <header className="mb-3">
        <h3 className="text-xs font-bold text-fg sm:text-sm">{meta?.label || label}</h3>
        {meta?.description && <p className="mt-0.5 text-[11px] leading-snug text-fg-muted">{meta.description}</p>}
      </header>
      <GroupFields {...props} />
      {groupKey && <CardSummaryBlock section={section} group={groupKey} value={value} sectionValue={props.scopeValue} />}
    </section>
  );
}

function StringArrayControl({ label, value, onChange }: { label: string; value: unknown; onChange: (v: string[]) => void }) {
  const items: string[] = Array.isArray(value) ? (value as string[]) : [];
  return (
    <div>
      <label className="text-[11px] font-semibold text-fg sm:text-xs mb-1 block">{label}</label>
      <div className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="text"
              value={item}
              onChange={(e) => onChange(items.map((v, idx) => (idx === i ? e.target.value : v)))}
              className={CONTROL}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              aria-label="Remove"
              className="h-10 shrink-0 rounded-lg border border-line px-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          className="inline-flex h-8 w-fit items-center gap-1 rounded-lg border border-dashed border-line px-2.5 text-[11px] font-semibold text-fg-muted transition-colors hover:border-[var(--tt-primary)] hover:text-fg"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
    </div>
  );
}

function ShapeArrayControl({ node, value, onChange, path, label, leaveTypeOptions, salaryComponentOptions, section }: RendererProps & { node: ArrayFieldNode }) {
  const items: unknown[] = Array.isArray(value) ? value : [];
  const itemShape = node.item as SectionNode;

  return (
    <div className="flex flex-col gap-3">
      {label && <div className="text-xs font-semibold text-fg sm:text-[13px]">{label}</div>}
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-line p-3 text-[11px] text-fg-muted sm:text-xs">
          No items configured yet.
        </p>
      )}
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-line-strong bg-bg-subtle p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Item {i + 1}</span>
            <button
              type="button"
              onClick={() => onChange(path, items.filter((_, idx) => idx !== i))}
              aria-label={`Remove item ${i + 1}`}
              className="rounded-lg border border-line bg-surface p-1.5 text-fg-muted transition-colors hover:text-[var(--tt-danger)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <GroupFields
            node={itemShape}
            value={item}
            scopeValue={item}
            onChange={onChange}
            path={[...path, i]}
            leaveTypeOptions={leaveTypeOptions}
            salaryComponentOptions={salaryComponentOptions}
            section={section}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange(path, [...items, {}])}
        className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg border border-dashed border-line px-3 text-xs font-semibold text-fg-muted transition-colors hover:border-[var(--tt-primary)] hover:text-fg"
      >
        <Plus className="h-3.5 w-3.5" /> Add item
      </button>
    </div>
  );
}

export function SchemaNodeRenderer(props: RendererProps) {
  const { node, value, onChange, path, label } = props;

  if (isArrayFieldNode(node)) {
    const itemIsScalar = isFieldNode(node.item) && node.item.type !== 'array';
    if (itemIsScalar) {
      return <StringArrayControl label={label || ''} value={value} onChange={(v) => onChange(path, v)} />;
    }
    return <ShapeArrayControl {...props} node={node} />;
  }

  if (isFieldNode(node)) {
    return (
      <ScalarControl
        label={label || ''}
        node={node as ScalarFieldNode}
        value={value}
        onChange={(v) => onChange(path, v)}
        leaveTypeOptions={props.leaveTypeOptions}
        salaryComponentOptions={props.salaryComponentOptions}
      />
    );
  }

  return <GroupCard {...props} node={node as SectionNode} />;
}

/**
 * One config section as a stack of cards.
 * If section is 'leave', routes to LeaveRulesConfigurator for an intuitive experience.
 */
export function SchemaForm({
  node,
  value,
  onChange,
  leaveTypeOptions,
  salaryComponentOptions,
  section,
}: {
  node: SectionNode;
  value: Record<string, unknown>;
  onChange: (nextValue: Record<string, unknown>) => void;
  leaveTypeOptions?: LeaveTypeOption[];
  salaryComponentOptions?: SalaryComponentOption[];
  section: string;
}) {
  // Seamlessly delegate leave configuration to the specialized configurator
  if (section === 'leave') {
    return (
      <LeaveRulesConfigurator
        rules={(value.rules as LeaveRuleConfig[]) || []}
        onChange={(nextRules) => onChange({ ...value, rules: nextRules })}
        leaveYear={(value.leaveYear as { startMonth?: number; startDay?: number }) || { startMonth: 1, startDay: 1 }}
        onLeaveYearChange={(nextLy) => onChange({ ...value, leaveYear: nextLy })}
        leaveTypeOptions={leaveTypeOptions}
      />
    );
  }

  const handleChange = (path: PathKey[], v: unknown) => onChange(setAtPath(value, path, v));

  const entries = sectionEntries(node).filter(([, child]) => isVisible(child, value));
  const topLevelScalars = entries.filter(([, child]) => isFieldNode(child) && child.type !== 'array');
  const groups = entries.filter(([, child]) => !isFieldNode(child) || child.type === 'array');

  return (
    <div className="flex flex-col gap-3.5">
      {topLevelScalars.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-3.5 shadow-xs">
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topLevelScalars.map(([key, child]) => (
              <ScalarControl
                key={key}
                label={labelOf(child, key)}
                node={child as ScalarFieldNode}
                value={getAtPath(value, [key])}
                onChange={(v) => handleChange([key], v)}
                leaveTypeOptions={leaveTypeOptions}
                salaryComponentOptions={salaryComponentOptions}
                isSalaryComponentField={key === 'salaryComponentId'}
              />
            ))}
          </div>
        </section>
      )}

      {groups.map(([key, child]) => (
        <SchemaNodeRenderer
          key={key}
          node={child}
          value={getAtPath(value, [key])}
          scopeValue={value}
          onChange={handleChange}
          path={[key]}
          label={labelOf(child, key)}
          leaveTypeOptions={leaveTypeOptions}
          salaryComponentOptions={salaryComponentOptions}
          section={section}
          groupKey={key}
        />
      ))}
    </div>
  );
}
