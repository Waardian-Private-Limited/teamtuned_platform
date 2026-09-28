'use client';

import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Clock,
  DollarSign,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { usePermission } from '@/lib/hooks/usePermission';
import { usePolicySchema } from '../../hooks/usePolicySchema';
import { useLeaveTypeList } from '../../hooks/useLeaveTypeList';
import { POLICY_SECTIONS, type PolicySectionKey } from '../../constants/policies.constants';
import type { PolicyConfig, PolicyFormInput } from '../../types/policies.model';
import type { FieldError } from '../../hooks/usePolicyMutations';
import { SchemaForm } from '../editor/form/SchemaForm';
import { sectionDefaults, diffConfig } from '../editor/form/schemaDefaults';
import { formatValue } from '../editor/form/ConfigSummary';

interface PolicyCreateWizardProps {
  open: boolean;
  isSaving: boolean;
  fieldError: FieldError | null;
  onClose: () => void;
  onSubmit: (input: PolicyFormInput) => void;
}

type StepKey = 'details' | PolicySectionKey | 'review';

interface StepItem {
  key: StepKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const STEPS: StepItem[] = [
  { key: 'details', label: 'Details', icon: FileText, description: 'Name, code & date' },
  { key: 'workRules', label: 'Work Rules', icon: Clock, description: 'Grace, marks & hours' },
  { key: 'leave', label: 'Leave Policy', icon: Calendar, description: 'Quotas & carry-forward' },
  { key: 'payrollCycle', label: 'Payroll Cycle', icon: DollarSign, description: 'Pay days & cutoffs' },
  { key: 'review', label: 'Review & Confirm', icon: ShieldCheck, description: 'Summary & draft' },
];

const inputCls =
  'h-10 w-full min-w-0 rounded-lg border bg-surface px-3 text-xs sm:text-sm text-fg placeholder:text-fg-subtle outline-none transition-all focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';
const labelCls = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';

function borderFor(hasError: boolean) {
  return hasError
    ? 'border-[var(--tt-danger)] focus:border-[var(--tt-danger)] focus:ring-1 focus:ring-[var(--tt-danger)]'
    : 'border-line focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';
}

export function PolicyCreateWizard({ open, isSaving, fieldError, onClose, onSubmit }: PolicyCreateWizardProps) {
  const { schema, isLoading: schemaLoading, error: schemaError } = usePolicySchema();
  const { leaveTypes } = useLeaveTypeList();

  const [stepIndex, setStepIndex] = React.useState(0);
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [effectiveFrom, setEffectiveFrom] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [config, setConfig] = React.useState<Record<string, unknown>>({});
  const [subOrganizationId, setSubOrganizationId] = React.useState<number | null>(null);
  const [nameTouched, setNameTouched] = React.useState(false);
  const { isOrgAdmin } = usePermission();

  const defaults = React.useMemo(() => {
    if (!schema) return null;
    return Object.fromEntries(
      POLICY_SECTIONS.map((section) => [section.value, sectionDefaults(schema[section.value])])
    ) as Record<PolicySectionKey, Record<string, unknown>>;
  }, [schema]);

  const leaveTypeOptions = React.useMemo(() => leaveTypes.map((lt) => ({ id: lt.id, name: lt.name })), [leaveTypes]);

  React.useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setName('');
    setCode('');
    setDescription('');
    setEffectiveFrom(new Date().toISOString().slice(0, 10));
    setNameTouched(false);
    setConfig(defaults ? structuredClone(defaults) : {});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!open || !defaults) return;
    setConfig((prev) => (Object.keys(prev).length ? prev : structuredClone(defaults)));
  }, [open, defaults]);

  const step = STEPS[stepIndex];
  const nameMissing = !name.trim();
  const isLastStep = stepIndex === STEPS.length - 1;

  const changes = React.useMemo(() => {
    if (!defaults) return [];
    return POLICY_SECTIONS.flatMap((section) =>
      diffConfig(defaults[section.value], config[section.value], [section.label])
    );
  }, [defaults, config]);

  const submit = () => {
    if (nameMissing) {
      setNameTouched(true);
      setStepIndex(0);
      return;
    }
    const payload: PolicyFormInput = {
      name: name.trim(),
      code: code.trim(),
      description: description.trim(),
      effectiveFrom,
      config: config as PolicyConfig,
      subOrganizationId,
    };
    onSubmit(payload);
  };

  const goNext = () => {
    if (stepIndex === 0 && nameMissing) {
      setNameTouched(true);
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const setSection = (key: PolicySectionKey, next: Record<string, unknown>) =>
    setConfig((prev) => ({ ...prev, [key]: next }));

  const configuredLeavesCount = Array.isArray((config?.leave as Record<string, unknown>)?.rules)
    ? ((config.leave as Record<string, unknown>).rules as unknown[]).length
    : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-4xl"
      title={
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-fg sm:text-base">Create Policy</h2>
            <span className="rounded-full bg-bg-subtle border border-line px-2 py-0.5 text-[10px] font-semibold text-fg-muted uppercase tracking-wider">
              Draft
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs truncate">
            Step {stepIndex + 1} of {STEPS.length} · {step.label} — saved as a draft; publish anytime from editor.
          </p>
        </div>
      }
      footer={
        <>
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
              className="mr-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
          >
            Cancel
          </button>
          {isLastStep ? (
            <button
              type="button"
              disabled={isSaving || nameMissing}
              onClick={submit}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
            >
              {isSaving ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>Create Policy</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:text-sm"
            >
              <span>Next</span> <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Step Navigation Bar */}
        <nav aria-label="Wizard Steps" className="rounded-xl border border-line bg-surface p-1.5">
          <ol className="grid grid-cols-2 gap-1 sm:grid-cols-5">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isCurrent = i === stepIndex;
              const isPast = i < stepIndex;

              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => {
                      if (i === 0 || !nameMissing) setStepIndex(i);
                      else setNameTouched(true);
                    }}
                    className={cx(
                      'group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-all',
                      isCurrent
                        ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)] shadow-xs'
                        : isPast
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                        : 'text-fg-muted hover:bg-bg-subtle hover:text-fg'
                    )}
                  >
                    <div
                      className={cx(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold transition-colors',
                        isCurrent
                          ? 'bg-[var(--tt-on-primary)]/20 text-[var(--tt-on-primary)]'
                          : isPast
                          ? 'bg-emerald-500 text-white'
                          : 'bg-bg-subtle border border-line text-fg-muted group-hover:border-line-strong'
                      )}
                    >
                      {isPast ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold leading-tight">{s.label}</p>
                      <p
                        className={cx(
                          'hidden text-[10px] sm:block truncate leading-tight',
                          isCurrent ? 'text-[var(--tt-on-primary)]/80' : 'text-fg-subtle'
                        )}
                      >
                        {s.description}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* STEP 1: Details */}
        {step.key === 'details' && (
          <div className="rounded-xl border border-line bg-surface p-4 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-fg sm:text-sm">Policy Details</h3>
              <p className="text-[11px] text-fg-muted sm:text-xs">
                Provide a name and basic information for this policy draft.
              </p>
            </div>

            <div>
              <label className={labelCls}>
                Policy Name <span className="text-[var(--tt-danger)]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setNameTouched(true)}
                placeholder="e.g., Standard 9-6 Corporate Policy"
                autoFocus
                className={cx(inputCls, borderFor(Boolean(fieldError?.field === 'name' || (nameTouched && nameMissing))))}
              />
              {fieldError?.field === 'name' ? (
                <p className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{fieldError.message}</p>
              ) : nameTouched && nameMissing ? (
                <p className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">Policy name is required</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-fg sm:text-[13px]">Policy Code</label>
                  <span className="text-[11px] text-fg-subtle">Optional</span>
                </div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="standard_9_6"
                  className={cx(inputCls, borderFor(fieldError?.field === 'code'))}
                />
                {fieldError?.field === 'code' && (
                  <p className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{fieldError.message}</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Effective From</label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className={cx(inputCls, borderFor(false))}
                />
              </div>
            </div>

            <SubOrgPicker value={subOrganizationId} onChange={setSubOrganizationId} allowShared={isOrgAdmin} />

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-fg sm:text-[13px]">Description</label>
                <span className="text-[11px] text-fg-subtle">Optional</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what team, department, or group of employees this policy applies to..."
                rows={3}
                className={cx(inputCls, 'h-auto resize-none py-2 text-xs sm:text-sm', borderFor(false))}
              />
            </div>
          </div>
        )}

        {/* STEP 2, 3, 4: Work Rules, Leave, Payroll Cycle */}
        {step.key !== 'details' && step.key !== 'review' && (
          schemaLoading ? (
            <div className="rounded-xl border border-line bg-surface p-12 text-center text-xs text-fg-muted">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--tt-primary)] border-t-transparent mb-2" />
              <p>Loading policy configuration schema…</p>
            </div>
          ) : schemaError || !schema ? (
            <div className="rounded-xl border border-line bg-surface p-6 text-center">
              <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--tt-danger)]">
                <AlertTriangle className="h-4 w-4" /> {schemaError || 'Could not load policy fields'}
              </p>
            </div>
          ) : (
            <SchemaForm
              section={step.key}
              node={schema[step.key as PolicySectionKey]}
              value={(config[step.key] as Record<string, unknown>) || {}}
              onChange={(next) => setSection(step.key as PolicySectionKey, next)}
              leaveTypeOptions={leaveTypeOptions}
            />
          )
        )}

        {/* STEP 5: Review & Confirm */}
        {step.key === 'review' && (
          <div className="flex flex-col gap-4">
            {/* Summary Highlight Cards */}
            <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
              <h3 className="text-xs font-bold text-fg sm:text-sm mb-3">Policy Overview</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-lg border border-line bg-bg-subtle/50 p-2.5">
                  <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">Policy Name</p>
                  <p className="text-xs font-bold text-fg mt-0.5 truncate">{name.trim() || '—'}</p>
                  <p className="text-[10px] text-fg-muted mt-0.5 truncate">Code: {code.trim() || 'Auto-generated'}</p>
                </div>

                <div className="rounded-lg border border-line bg-bg-subtle/50 p-2.5">
                  <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">Effective From</p>
                  <p className="text-xs font-bold text-fg mt-0.5">{effectiveFrom}</p>
                  <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Status: Ready to draft</p>
                </div>

                <div className="rounded-lg border border-line bg-bg-subtle/50 p-2.5">
                  <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">Leave Types</p>
                  <p className="text-xs font-bold text-fg mt-0.5">{configuredLeavesCount} Types Configured</p>
                  <p className="text-[10px] text-fg-muted mt-0.5">Full quotas & rules set</p>
                </div>

                <div className="rounded-lg border border-line bg-bg-subtle/50 p-2.5">
                  <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">Work & Pay</p>
                  <p className="text-xs font-bold text-fg mt-0.5">Customized Rules</p>
                  <p className="text-[10px] text-fg-muted mt-0.5">{changes.length} custom adjustments</p>
                </div>
              </div>
            </div>

            {/* Changed from defaults card */}
            <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-bold text-fg sm:text-sm">
                  Configured Customizations <span className="font-normal text-fg-subtle">({changes.length})</span>
                </h4>
                <span className="text-[11px] text-fg-subtle">Saved as initial version</span>
              </div>

              {changes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line p-4 text-center">
                  <p className="text-xs text-fg-muted">
                    No custom overrides from baseline schema defaults.
                  </p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto tt-scroll-hidden divide-y divide-line/60">
                  {changes.map((change) => (
                    <div key={change.path.join('.')} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate text-xs text-fg-muted font-medium">{change.label}</span>
                      <span className="shrink-0 text-right text-xs">
                        <span className="text-fg-subtle line-through mr-1.5">{formatValue(change.from)}</span>
                        <span className="font-bold text-emerald-600">{formatValue(change.to)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
