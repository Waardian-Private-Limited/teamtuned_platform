'use client';

import React from 'react';
import { Info, Plus, Trash2, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { getAtPath, setAtPath, type PathKey } from './configPath';
import { explainCard } from './explainers';
import {
  groupMeta,
  isArrayFieldNode,
  isCapNode,
  isFieldNode,
  isVisible,
  labelOf,
  optionLabel,
  sectionEntries,
  type ArrayFieldNode,
  type CapValue,
  type ScalarFieldNode,
  type SchemaNode,
  type SectionNode,
} from './schemaTypes';
import { LeaveRulesConfigurator } from './LeaveRulesConfigurator';
import { WeeklyOffScheduleEditor, type DayKey, type DayScheduleConfig } from './WeeklyOffScheduleEditor';

export interface LeaveTypeOption {
  id: number;
  name: string;
  /** Catalogue code, which picks the starting preset for a new rule. */
  code?: string;
  genderEligibility?: 'any' | 'male' | 'female' | 'other';
}

export interface SalaryComponentOption {
  id: number;
  name: string;
}

const GROSS_SALARY_COMPONENT: SalaryComponentOption = { id: 0, name: 'Gross (all active components)' };

// Every control has uniform 40px height, consistent borders, and responsive font
const CONTROL =
  'h-10 w-full min-w-0 rounded-lg border bg-surface px-3 text-xs text-fg outline-none transition-all duration-150 focus:ring-1 sm:text-[13px]';
const CONTROL_OK = 'border-line focus:border-[var(--tt-primary)] focus:ring-[var(--tt-primary)]';
const CONTROL_ERROR = 'border-[var(--tt-danger)] focus:border-[var(--tt-danger)] focus:ring-[var(--tt-danger)]';
function controlClass(error?: string) {
  return cx(CONTROL, error ? CONTROL_ERROR : CONTROL_OK);
}
// No truncate: a clipped "Maximum overtime minutes per…" tells the admin
// nothing. Labels wrap onto a second line instead of losing words.
const LABEL = 'text-[11px] font-semibold leading-snug text-fg sm:text-xs';

/* ------------------------------------------------------------------ *
 * Server-side field errors
 * ------------------------------------------------------------------ */

// Violations from the backend keyed by their full config path
// ("leave.rules[0].block.blockDays"), resolved per control through the
// section and the control's path inside it.
interface FieldErrorsValue {
  section: string;
  errors: Record<string, string>;
}
const FieldErrorsContext = React.createContext<FieldErrorsValue>({ section: '', errors: {} });

export function configPathKey(section: string, path: PathKey[]): string {
  return path.reduce<string>((acc, key) => (typeof key === 'number' ? `${acc}[${key}]` : `${acc}.${key}`), section);
}

function useFieldError(path: PathKey[]): string | undefined {
  const { section, errors } = React.useContext(FieldErrorsContext);
  return errors[configPathKey(section, path)];
}

/** Every violation in the current section, for summaries across fields. */
export function useAllFieldErrors(): Record<string, string> {
  return React.useContext(FieldErrorsContext).errors;
}

export function FieldErrorsProvider({ section, errors, children }: FieldErrorsValue & { children: React.ReactNode }) {
  const value = React.useMemo(() => ({ section, errors }), [section, errors]);
  return <FieldErrorsContext.Provider value={value}>{children}</FieldErrorsContext.Provider>;
}

/* ------------------------------------------------------------------ *
 * Controls
 * ------------------------------------------------------------------ */

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
        'relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)] focus-visible:ring-offset-2',
        checked ? 'bg-[var(--tt-primary)]' : 'bg-line-strong'
      )}
    >
      <span
        className={cx(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow-sm ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
        )}
      />
    </button>
  );
}

function FieldHelp({ text, error }: { text?: string; error?: string }) {
  if (error) return <p className="mt-1 min-h-[14px] text-[10px] font-medium leading-snug text-[var(--tt-danger)] sm:text-[11px]">{error}</p>;
  if (!text) return <div className="min-h-[14px]" />;
  return <p className="mt-1 min-h-[14px] text-[10px] leading-snug text-fg-subtle sm:text-[11px]">{text}</p>;
}

function FieldShell({ label, help, error, children }: { label: string; help?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="flex min-h-[20px] flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
        <label className={LABEL}>{label}</label>
      </div>
      <div className="mt-1">{children}</div>
      <FieldHelp text={help} error={error} />
    </div>
  );
}

const CHIP = 'inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors sm:text-xs';
const CHIP_ON = 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]';
const CHIP_OFF = 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg';

/** Multi-select over fixed values, shown as toggle chips. */
function EnumListControl({ node, value, onChange }: { node: ScalarFieldNode; value: unknown; onChange: (v: string[]) => void }) {
  const selected = new Set(Array.isArray(value) ? (value as string[]) : []);
  const values = node.values || [];
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => {
        const on = selected.has(v);
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(values.filter((x) => (x === v ? !on : selected.has(x))))}
            className={cx(CHIP, on ? CHIP_ON : CHIP_OFF)}
          >
            {optionLabel(v)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * An ordered list of leave types: the chips keep the order they were added
 * in (a fallback chain is drawn from first to last), and the picker offers
 * whatever is not chosen yet.
 */
function LeaveTypeListControl({ value, onChange, options, ordered }: { value: unknown; onChange: (v: number[]) => void; options: LeaveTypeOption[]; ordered: boolean }) {
  const ids = Array.isArray(value) ? (value as number[]) : [];
  const nameOf = (id: number) => options.find((o) => o.id === id)?.name || `Leave type #${id}`;
  const remaining = options.filter((o) => !ids.includes(o.id));
  return (
    <div className="flex flex-col gap-1.5">
      {ids.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ids.map((id, i) => (
            <span key={id} className={cx(CHIP, CHIP_ON)}>
              {ordered && <span className="opacity-60">{i + 1}.</span>}
              {nameOf(id)}
              <button type="button" aria-label={`Remove ${nameOf(id)}`} onClick={() => onChange(ids.filter((x) => x !== id))} className="ml-0.5 opacity-70 hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {remaining.length > 0 && (
        <select value="" onChange={(e) => e.target.value && onChange([...ids, Number(e.target.value)])} className={controlClass()}>
          <option value="">Add a leave type…</option>
          {remaining.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

interface ScalarControlProps {
  label: string;
  node: ScalarFieldNode;
  value: unknown;
  onChange: (v: unknown) => void;
  leaveTypeOptions?: LeaveTypeOption[];
  salaryComponentOptions?: SalaryComponentOption[];
  /** Field key, for fields that predate `ref` on the schema. */
  fieldKey?: string;
  error?: string;
}

export function ScalarControl({ label, node, value, onChange, leaveTypeOptions, salaryComponentOptions, fieldKey, error }: ScalarControlProps) {
  const ref = node.ref || (fieldKey === 'leaveTypeId' ? 'leaveType' : fieldKey === 'salaryComponentId' ? 'salaryComponent' : undefined);

  if (node.type === 'idList' && ref === 'leaveType') {
    return (
      <FieldShell label={label} help={node.help} error={error}>
        <LeaveTypeListControl value={value} onChange={onChange} options={leaveTypeOptions || []} ordered={Boolean(node.ordered)} />
      </FieldShell>
    );
  }

  if (ref === 'leaveType') {
    return (
      <FieldShell label={label} help={node.help} error={error}>
        <select value={String(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} className={controlClass(error)}>
          <option value="0">{fieldKey === 'leaveTypeId' ? 'Select leave type…' : 'None'}</option>
          {(leaveTypeOptions || []).map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.name}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  }

  if (ref === 'salaryComponent') {
    const options = [GROSS_SALARY_COMPONENT, ...(salaryComponentOptions || [])];
    return (
      <FieldShell label={label} help={node.help} error={error}>
        <select value={String(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} className={controlClass(error)}>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  }

  switch (node.type) {
    case 'bool':
      return (
        <FieldShell label={label} help={node.help} error={error}>
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
              'flex h-10 w-full cursor-pointer select-none items-center justify-between gap-3 rounded-lg border px-3 transition-all',
              error ? 'border-[var(--tt-danger)]' : Boolean(value) ? 'border-line-strong bg-bg-subtle' : 'border-line bg-surface hover:bg-bg-subtle'
            )}
          >
            <span className={cx('truncate text-xs font-semibold', Boolean(value) ? 'text-fg' : 'text-fg-muted')}>{Boolean(value) ? 'On' : 'Off'}</span>
            <Switch checked={Boolean(value)} onChange={onChange} label={label} />
          </div>
        </FieldShell>
      );

    case 'enum':
      return (
        <FieldShell label={label} help={node.help} error={error}>
          <select value={String(value ?? node.default)} onChange={(e) => onChange(e.target.value)} className={controlClass(error)}>
            {(node.values || []).map((v) => (
              <option key={v} value={v}>
                {optionLabel(v)}
              </option>
            ))}
          </select>
        </FieldShell>
      );

    case 'enumList':
      return (
        <FieldShell label={label} help={node.help} error={error}>
          <EnumListControl node={node} value={value} onChange={onChange} />
        </FieldShell>
      );

    case 'time':
      return (
        <FieldShell label={label} help={node.help} error={error}>
          <input
            type="time"
            step={60}
            value={String(value ?? node.default).slice(0, 5)}
            onChange={(e) => onChange(e.target.value ? `${e.target.value}:00` : node.default)}
            className={controlClass(error)}
          />
        </FieldShell>
      );

    case 'number':
    case 'int':
      return (
        <FieldShell label={label} help={node.help} error={error}>
          <input
            type="number"
            step={node.type === 'int' ? 1 : 'any'}
            min={node.min}
            max={node.max}
            value={value === undefined || value === null ? '' : Number(value)}
            onChange={(e) => onChange(e.target.value === '' ? node.default : Number(e.target.value))}
            className={controlClass(error)}
          />
        </FieldShell>
      );

    case 'string':
    default:
      return (
        <FieldShell label={label} help={node.help} error={error}>
          <input type="text" value={String(value ?? '')} maxLength={node.maxLength} onChange={(e) => onChange(e.target.value)} className={controlClass(error)} />
        </FieldShell>
      );
  }
}

/**
 * An optional limit ({ enabled, value }): one switch, and the number only
 * once the limit is on — so "no limit" is the switch being off, never a 0
 * an admin has to be told about.
 */
function CapControl({ node, label, value, onChange, error }: { node: SectionNode; label: string; value: unknown; onChange: (v: CapValue) => void; error?: string }) {
  const meta = groupMeta(node);
  const cap = { enabled: false, value: 0, ...((value || {}) as Partial<CapValue>) } as CapValue;
  const valueNode = (node as Record<string, unknown>).value as ScalarFieldNode;
  return (
    <div className="flex flex-col">
      <div className="flex min-h-[20px] flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
        <label className={LABEL}>{label}</label>
      </div>
      <div
        className={cx(
          'mt-1 flex h-10 items-center justify-between gap-2 rounded-lg border px-3 transition-colors',
          error ? 'border-[var(--tt-danger)]' : cap.enabled ? 'border-line-strong bg-bg-subtle' : 'border-line bg-surface'
        )}
      >
        {cap.enabled ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <input
              type="number"
              aria-label={label}
              step={valueNode?.type === 'int' ? 1 : 'any'}
              min={valueNode?.min}
              max={valueNode?.max}
              value={cap.value}
              onChange={(e) => onChange({ ...cap, value: e.target.value === '' ? Number(valueNode?.default ?? 0) : Number(e.target.value) })}
              className="h-7 w-20 min-w-0 rounded-md border border-line bg-surface px-2 text-xs font-semibold text-fg outline-none focus:border-[var(--tt-primary)]"
            />
            {meta?.unit && <span className="truncate text-[11px] text-fg-muted">{meta.unit}</span>}
          </div>
        ) : (
          <span className="text-xs font-semibold text-fg-muted">No limit</span>
        )}
        <Switch checked={cap.enabled} onChange={(on) => onChange({ ...cap, enabled: on })} label={label} />
      </div>
      <FieldHelp text={meta?.description} error={error} />
    </div>
  );
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

export interface RenderContext {
  value: unknown;
  scopeValue: unknown;
  onChange: (path: PathKey[], value: unknown) => void;
  path: PathKey[];
  leaveTypeOptions?: LeaveTypeOption[];
  salaryComponentOptions?: SalaryComponentOption[];
  section: string;
}

const DAY_KEYS = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

/** A field or limit rendered as one cell of the group's grid. */
function LeafCell({ fieldKey, node, value, ctx }: { fieldKey: string; node: SchemaNode; value: unknown; ctx: RenderContext }) {
  const path = [...ctx.path, fieldKey];
  const error = useFieldError(path);
  if (isCapNode(node)) {
    return <CapControl node={node} label={labelOf(node, fieldKey)} value={value} onChange={(v) => ctx.onChange(path, v)} error={error} />;
  }
  return (
    <ScalarControl
      label={labelOf(node, fieldKey)}
      node={node as ScalarFieldNode}
      value={value}
      onChange={(v) => ctx.onChange(path, v)}
      leaveTypeOptions={ctx.leaveTypeOptions}
      salaryComponentOptions={ctx.salaryComponentOptions}
      fieldKey={fieldKey}
      error={error}
    />
  );
}

function isLeafNode(node: SchemaNode): boolean {
  return (isFieldNode(node) && node.type !== 'array') || isCapNode(node);
}

/** The controls of one group, plus any nested sub-groups it contains. */
export function GroupFields(props: RenderContext & { node: SectionNode }) {
  const { node, value, scopeValue, onChange, path, leaveTypeOptions, salaryComponentOptions, section } = props;
  const entries = sectionEntries(node).filter(([, child]) => isVisible(child, scopeValue));
  const leaves = entries.filter(([, child]) => isLeafNode(child));
  const branches = entries.filter(([, child]) => !isLeafNode(child));
  const val = (value || {}) as Record<string, unknown>;

  const isDefaultSchedule = entries.some(([k]) => DAY_KEYS.has(k));
  const filteredBranches = isDefaultSchedule ? branches.filter(([key]) => !DAY_KEYS.has(key)) : branches;
  // A roster decides each date's off days itself, so the fixed weekly grid only
  // applies to fixed and flexible timings.
  const showWeeklyOffEditor =
    isDefaultSchedule &&
    val.enabled !== false &&
    val.timingMode !== 'roster' &&
    (val.weeklyOffMode === 'fixed_days' || !val.weeklyOffMode);

  return (
    <div className="flex flex-col gap-3">
      {leaves.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leaves.map(([key, child]) => (
            <LeafCell key={key} fieldKey={key} node={child} value={val[key]} ctx={props} />
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
              className={controlClass()}
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
  const itemLabel = node.itemLabel || 'Item';
  const error = useFieldError(path);

  return (
    <div className="flex flex-col gap-3">
      {label && <div className="text-xs font-semibold text-fg sm:text-[13px]">{label}</div>}
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-line p-3 text-[11px] text-fg-muted sm:text-xs">
          No {itemLabel.toLowerCase()}s yet.
        </p>
      )}
      {items.map((item, i) => (
        <div key={i} className={cx('rounded-xl border bg-bg-subtle p-3', error ? 'border-[var(--tt-danger)]' : 'border-line-strong')}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
              {itemLabel} {i + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(path, items.filter((_, idx) => idx !== i))}
              aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`}
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
      {error && <p className="text-[11px] font-medium text-[var(--tt-danger)]">{error}</p>}
      <button
        type="button"
        onClick={() => onChange(path, [...items, {}])}
        className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg border border-dashed border-line px-3 text-xs font-semibold text-fg-muted transition-colors hover:border-[var(--tt-primary)] hover:text-fg"
      >
        <Plus className="h-3.5 w-3.5" /> Add {itemLabel.toLowerCase()}
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

  if (isFieldNode(node) || isCapNode(node)) {
    return <LeafCell fieldKey={String(path[path.length - 1])} node={node} value={value} ctx={{ ...props, path: path.slice(0, -1) }} />;
  }

  return <GroupCard {...props} node={node as SectionNode} />;
}

/**
 * One config section as a stack of cards.
 * The leave section routes to LeaveRulesConfigurator: one card per leave
 * type, its rule groups laid out in steps.
 */
export function SchemaForm({
  node,
  value,
  onChange,
  leaveTypeOptions,
  salaryComponentOptions,
  section,
  fieldErrors = {},
}: {
  node: SectionNode;
  value: Record<string, unknown>;
  onChange: (nextValue: Record<string, unknown>) => void;
  leaveTypeOptions?: LeaveTypeOption[];
  salaryComponentOptions?: SalaryComponentOption[];
  section: string;
  /** Backend violations keyed by full config path. */
  fieldErrors?: Record<string, string>;
}) {
  const handleChange = (path: PathKey[], v: unknown) => onChange(setAtPath(value, path, v));

  if (section === 'leave') {
    return (
      <FieldErrorsProvider section={section} errors={fieldErrors}>
        <LeaveRulesConfigurator
          node={node}
          value={value}
          onChange={handleChange}
          leaveTypeOptions={leaveTypeOptions || []}
          salaryComponentOptions={salaryComponentOptions}
        />
      </FieldErrorsProvider>
    );
  }

  const entries = sectionEntries(node).filter(([, child]) => isVisible(child, value));
  const topLevelScalars = entries.filter(([, child]) => isLeafNode(child));
  const groups = entries.filter(([, child]) => !isLeafNode(child));
  const ctx: RenderContext = { value, scopeValue: value, onChange: handleChange, path: [], leaveTypeOptions, salaryComponentOptions, section };

  return (
    <FieldErrorsProvider section={section} errors={fieldErrors}>
      <div className="flex flex-col gap-3.5">
        {topLevelScalars.length > 0 && (
          <section className="rounded-xl border border-line bg-surface p-3.5 shadow-xs">
            <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topLevelScalars.map(([key, child]) => (
                <LeafCell key={key} fieldKey={key} node={child} value={getAtPath(value, [key])} ctx={ctx} />
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
    </FieldErrorsProvider>
  );
}
