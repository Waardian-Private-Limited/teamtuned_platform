'use client';

import React from 'react';
import { Plus, ChevronDown, X, Search, Check } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Switch } from '@/components/ui/Switch';
import { FieldLabel, Section, TextField } from '@/components/ui/FormControls';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { usePermission } from '@/lib/hooks/usePermission';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import * as api from '../api/approvals.api';
import { DIMENSION_LABEL, emptyStep } from '../constants';
import type { Dimension, EmployeeRef, Flow, FlowInput, FlowStep, Lookups, RequestTypeDef } from '../types/approvals';
import { StepEditor } from './StepEditor';
import { ChainPreview } from './ChainPreview';

interface Props {
  open: boolean;
  type: RequestTypeDef;
  allTypes: RequestTypeDef[];
  flow: Flow | null;
  lookups: Lookups | null;
  onClose: () => void;
  onSaved: () => void;
}

const LOOKUP_KEY: Record<Dimension, keyof Lookups> = {
  site: 'sites', department: 'departments', employment_type: 'employmentTypes', role: 'roles', roster_unit: 'rosterUnits',
};

function ScopeDimensionPicker({
  label,
  options,
  selectedIds,
  onChange,
  error,
}: {
  label: string;
  options: { id: number; name: string }[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  error?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const isAll = selectedIds.length === 0;

  const filtered = React.useMemo(() => {
    if (!search.trim()) return options;
    const term = search.toLowerCase();
    return options.filter((o) => o.name.toLowerCase().includes(term));
  }, [options, search]);

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const setAll = () => {
    onChange([]);
  };

  return (
    <div ref={rootRef} className="relative rounded-lg border border-line bg-surface/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-fg">{label}</span>
          <span
            className={cx(
              'rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
              isAll
                ? 'border border-[var(--tt-primary)]/20 bg-[var(--tt-primary)]/10 text-[var(--tt-primary)]'
                : 'border border-line bg-bg-subtle text-fg'
            )}
          >
            {isAll ? `All ${label} (Everyone)` : `${selectedIds.length} of ${options.length} selected`}
          </span>
        </div>
        {!isAll && (
          <button
            type="button"
            onClick={setAll}
            className="text-[11px] font-medium text-[var(--tt-primary)] hover:underline cursor-pointer"
          >
            Reset to All {label}
          </button>
        )}
      </div>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cx(
          'relative flex h-9 w-full items-center justify-between rounded-lg border bg-surface px-3 text-left transition-all cursor-pointer',
          open
            ? 'border-[var(--tt-primary)] ring-1 ring-[var(--tt-primary)]'
            : 'border-line hover:border-line-strong'
        )}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 truncate text-xs sm:text-sm font-medium">
          {isAll ? (
            <span className="inline-flex items-center gap-1.5 text-fg">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--tt-primary)] shrink-0" />
              All {label} (Everyone included)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-fg">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--tt-primary)] shrink-0" />
              {selectedIds.length} {label.toLowerCase()} selected
            </span>
          )}
        </div>
        <ChevronDown
          className={cx(
            'h-3.5 w-3.5 shrink-0 text-fg-muted transition-transform duration-150',
            open && 'rotate-180 text-fg'
          )}
        />
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute left-3 right-3 top-[calc(100%-4px)] z-30 flex max-h-72 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          {/* Search box */}
          <div className="border-b border-line bg-bg-subtle/50 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="h-8 w-full rounded-md border border-line bg-surface pl-8 pr-7 text-xs font-medium text-fg outline-none placeholder:text-fg-muted focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Explicit "All" Option at the top */}
          <div className="border-b border-line/60 bg-bg-subtle/25 px-2 py-1.5">
            <button
              type="button"
              onClick={() => {
                setAll();
              }}
              className={cx(
                'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                isAll
                  ? 'bg-[var(--tt-primary)]/10 text-[var(--tt-primary)] font-semibold'
                  : 'text-fg hover:bg-bg-subtle'
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cx(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                    isAll
                      ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-white'
                      : 'border-line-strong bg-surface'
                  )}
                >
                  {isAll && <Check className="h-3 w-3 stroke-[2.5]" />}
                </span>
                <span>All {label} (Applies to everyone)</span>
              </div>
              <span className="text-[10px] text-fg-muted font-normal">Default</span>
            </button>
          </div>

          {/* Scrollable Items List */}
          <ul className="flex-1 overflow-y-auto p-1.5 max-h-44 divide-y divide-line/30">
            {filtered.length === 0 ? (
              <li className="py-4 text-center text-xs text-fg-muted">
                {options.length === 0 ? `No ${label.toLowerCase()} found.` : 'No matches found.'}
              </li>
            ) : (
              filtered.map((item) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      className={cx(
                        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer',
                        selected
                          ? 'bg-[var(--tt-primary)]/10 text-fg font-medium'
                          : 'text-fg hover:bg-bg-subtle'
                      )}
                    >
                      <span
                        className={cx(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                          selected
                            ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-white'
                            : 'border-line-strong bg-surface'
                        )}
                      >
                        {selected && <Check className="h-3 w-3 stroke-[2.5]" />}
                      </span>
                      <span className="truncate flex-1">{item.name}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer inside Popover */}
          <div className="flex items-center justify-between border-t border-line bg-bg-subtle/50 px-3 py-1.5 text-[11px] text-fg-muted">
            <span>
              {isAll ? `All ${options.length} included` : `${selectedIds.length} of ${options.length} selected`}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-semibold text-[var(--tt-primary)] hover:underline cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Selected tags badges */}
      {!isAll ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {selectedIds.map((id) => {
            const item = options.find((o) => o.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-md border border-line bg-surface pl-2.5 pr-1 py-1 text-xs font-medium text-fg shadow-2xs"
              >
                <span className="truncate max-w-[200px]">{item?.name || `#${id}`}</span>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-label={`Remove ${item?.name || id}`}
                  className="rounded p-0.5 text-fg-muted hover:bg-bg-subtle hover:text-fg transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
        </div>
      ) : (
        <p className="mt-1.5 text-[11px] text-fg-muted">
          Applies to all {label.toLowerCase()}. Open dropdown to restrict to specific {label.toLowerCase()}.
        </p>
      )}

      {error && <p className="mt-1 text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
    </div>
  );
}

export function FlowBuilder({ open, type, allTypes, flow, lookups, onClose, onSaved }: Props) {
  const { isOrgAdmin } = usePermission();
  const [name, setName] = React.useState('');
  const [priority, setPriority] = React.useState(100);
  const [subOrg, setSubOrg] = React.useState<number | null>(null);
  const [steps, setSteps] = React.useState<FlowStep[]>([]);
  const [scopes, setScopes] = React.useState<Partial<Record<Dimension, number[]>>>({});
  const [slaOn, setSlaOn] = React.useState(false);
  const [remind, setRemind] = React.useState(24);
  const [escalate, setEscalate] = React.useState<number | ''>(48);
  const [employees, setEmployees] = React.useState<Record<number, EmployeeRef>>({});
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [saving, setSaving] = React.useState(false);
  const concreteTypes = allTypes.filter((t) => !t.global);
  const [previewKey, setPreviewKey] = React.useState('');
  const previewType = type.global ? (concreteTypes.find((t) => t.type === previewKey) || concreteTypes[0]) : type;

  React.useEffect(() => {
    if (!open) return;
    setName(flow?.name ?? '');
    setPriority(flow?.priority ?? 100);
    setSubOrg(flow?.subOrganizationId ?? null);
    setSteps(flow?.steps?.length ? flow.steps : [emptyStep(1)]);
    setScopes(flow?.scopes ?? {});
    setSlaOn(Boolean(flow?.sla));
    setRemind(flow?.sla?.remindAfterHours ?? 24);
    setEscalate(flow?.sla ? (flow.sla.escalateAfterHours ?? '') : 48);
    setErrors({});
    setEmployees({});
  }, [open, flow]);

  const draft: FlowInput = React.useMemo(() => ({
    requestType: type.type,
    subOrganizationId: subOrg,
    name: name.trim() || 'Draft',
    priority,
    steps,
    sla: slaOn ? { remindAfterHours: remind, ...(escalate === '' ? {} : { escalateAfterHours: Number(escalate) }) } : null,
    scopes: Object.fromEntries(Object.entries(scopes).filter(([, v]) => v && v.length)) as FlowInput['scopes'],
  }), [type.type, subOrg, name, priority, steps, slaOn, remind, escalate, scopes]);

  const patchStep = (i: number, next: FlowStep) => setSteps((s) => s.map((x, k) => (k === i ? next : x)));
  const move = (i: number, dir: -1 | 1) => setSteps((s) => { const n = [...s]; const j = i + dir; [n[i], n[j]] = [n[j], n[i]]; return n; });

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      if (flow) await api.updateFlow(flow.id, draft); else await api.createFlow(draft);
      showSuccess(flow ? 'Flow updated' : 'Flow created');
      onSaved();
      onClose();
    } catch (err) {
      const fields = (err as { data?: { fields?: { path: string; message: string }[] } })?.data?.fields;
      if (fields?.length) {
        const map: Record<string, string[]> = {};
        for (const f of fields) (map[f.path] ||= []).push(f.message);
        setErrors(map);
      } else if ((err as { status?: number }).status === 409) setErrors({ name: [messageOf(err)] });
      else showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-2.5">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={saving || !name.trim()}
        onClick={save}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
      >
        {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        <span>{flow ? 'Save changes' : 'Create flow'}</span>
      </button>
    </div>
  );

  return (
    <Dialog open={open} onClose={onClose} title={type.global ? `${flow ? 'Edit' : 'New'} flow for all requests` : `${flow ? 'Edit' : 'New'} ${type.label.toLowerCase()} flow`} maxWidthClassName="max-w-6xl" footer={footer}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <TextField label="Flow name" required value={name} onChange={(v) => setName(v)} error={errors.name?.[0]} />
            <TextField label="Priority" type="number" min={1} value={String(priority)} onChange={(v) => setPriority(Number(v) || 100)} hint="Lower wins a tie" error={errors.priority?.[0]} />
          </div>
          <div>
            <FieldLabel label="Sub-organization" />
            <SubOrgPicker value={subOrg} onChange={setSubOrg} allowShared={isOrgAdmin} />
          </div>

          <Section title="Applies to" description="Leave as 'All' to include everyone across the organization. Select specific sites, departments, or roles to restrict this flow.">
            <div className="space-y-3">
              {type.scopeDimensions.map((dim) => {
                const options = (lookups?.[LOOKUP_KEY[dim]] || []) as { id: number; name: string }[];
                const selectedIds = scopes[dim] || [];
                return (
                  <ScopeDimensionPicker
                    key={dim}
                    label={DIMENSION_LABEL[dim]}
                    options={options}
                    selectedIds={selectedIds}
                    onChange={(ids) => setScopes((s) => ({ ...s, [dim]: ids }))}
                    error={errors[`scopes.${dim}`]?.[0]}
                  />
                );
              })}
            </div>
          </Section>

          <Section
            title="Steps"
            description="Approvals run top to bottom. The last step is final. Rejecting at any step ends the request."
            aside={
              <button
                type="button"
                onClick={() => setSteps((s) => [...s, emptyStep(s.length + 1)])}
                disabled={steps.length >= 10}
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add step</span>
              </button>
            }
          >
            <div className="space-y-3">
              {errors.steps?.map((m) => <p key={m} className="text-xs font-medium text-[var(--tt-danger)]">{m}</p>)}
              {steps.map((s, i) => (
                <StepEditor key={i} index={i} count={steps.length} step={s} type={type} lookups={lookups} employees={employees}
                  errors={errors[`steps[${i}]`] || []}
                  onChange={(next) => patchStep(i, next)}
                  onEmployees={(list) => setEmployees((m) => ({ ...m, ...Object.fromEntries(list.map((e) => [e.id, e])) }))}
                  onMove={(d) => move(i, d)}
                  onRemove={() => setSteps((x) => x.filter((_, k) => k !== i))} />
              ))}
            </div>
          </Section>

          <Section title="Reminders" description="Nudge slow approvers. Requests are never approved or rejected automatically.">
            <div className="flex items-center justify-between text-sm text-fg"><span>Remind and escalate pending approvals</span><Switch label="Reminders" checked={slaOn} onChange={setSlaOn} /></div>
            {slaOn && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextField label="Remind after (hours)" type="number" min={1} value={String(remind)} onChange={(v) => setRemind(Number(v) || 1)} />
                <TextField label="Escalate after (hours)" type="number" min={1} value={escalate === '' ? '' : String(escalate)} hint="Goes to the approver's manager. Leave empty to only remind." onChange={(v) => setEscalate(v === '' ? '' : Number(v))} />
                {errors.sla?.map((m) => <p key={m} className="text-xs font-medium text-[var(--tt-danger)] sm:col-span-2">{m}</p>)}
              </div>
            )}
          </Section>
        </div>

        <div className="lg:sticky lg:top-0 lg:self-start">
          <Section title="Live preview" description="Who would approve, right now, for a real employee.">
            {type.global && (
              <label className="mb-3 block text-xs font-semibold text-fg">
                Preview as
                <select value={previewType?.type || ''} onChange={(e) => setPreviewKey(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm font-normal">
                  {concreteTypes.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                </select>
              </label>
            )}
            {previewType && <ChainPreview key={previewType.type} type={previewType} draft={draft} />}
          </Section>
        </div>
      </div>
    </Dialog>
  );
}
