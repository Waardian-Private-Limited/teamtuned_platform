'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Pencil, Plus, RotateCcw, Tags } from 'lucide-react';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SelectField } from '@/components/ui/FormControls';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import * as approvalsApi from '@/features/approvals/api/approvals.api';
import { FLOW_PERMISSIONS } from '@/features/approvals/constants';
import type { Flow } from '@/features/approvals/types/approvals';
import { usePermission } from '@/lib/hooks/usePermission';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { placeErrors } from '@/features/expense-bills/utils/errors';
import * as api from '../api/petty-cash.api';
import { ILLUSTRATIONS, PC, PHYSICAL_RULES, SETTINGS_ACCESS, SPEND_MODES } from '../constants/petty-cash.constants';
import { usePettyCashAccess } from '../hooks/usePettyCashAccess';
import { useCategories } from '../hooks/useCategories';
import { usePettyCashBasePath } from '../hooks/usePettyCashBasePath';
import { useSettings } from '../hooks/useSettings';
import { toSettingsBody } from '../types/petty-cash.mapper';
import type { Settings } from '../types/petty-cash.model';
import { money } from '../utils/format';
import { Block, FormError, Gate, PageHeader, Panel } from './components/Primitives';
import { SettingsForm } from './components/SettingsForm';

const KNOWN = ['sub_organization_id', 'spend_mode', 'approval_required', 'physical_copy', 'physical_copy_above', 'inward_enabled', 'inward_numbering', 'inward_prefix', 'receipt_required_above', 'max_backdate_days', 'default_max_per_expense', 'cash_count_enabled'];

export function SettingsPage() {
  const { enabled, canAny } = usePettyCashAccess();
  return (
    <Gate enabled={enabled} allowed={canAny(SETTINGS_ACCESS)} what="petty cash settings">
      <Settings />
    </Gate>
  );
}

/** Edits one settings row and saves it. Errors from the API land on the fields as red borders. */
function useSettingsEditor(initial: Settings, onSaved: () => void) {
  const [draft, setDraft] = React.useState(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const reset = React.useCallback((next: Settings) => {
    setDraft(next);
    setErrors({});
    setFormError('');
  }, []);
  const clear = React.useCallback((field: string) => setErrors((e) => (e[field] ? { ...e, [field]: '' } : e)), []);
  const save = async (extra: { company?: number | null } = {}) => {
    const next: Record<string, string> = {};
    if (!draft.inwardPrefix.trim()) next.inward_prefix = 'Enter a prefix for inward numbers';
    if (draft.physicalCopy === 'above' && !draft.physicalCopyAbove) next.physical_copy_above = 'Enter the amount above which a paper bill is needed';
    if (extra.company === null) next.sub_organization_id = 'Choose the company';
    setErrors(next);
    if (Object.keys(next).length) return false;
    setBusy(true);
    setFormError('');
    try {
      await api.saveSettings(toSettingsBody({ ...draft, subOrganizationId: extra.company ?? draft.subOrganizationId }));
      showSuccess('Settings saved');
      onSaved();
      return true;
    } catch (err) {
      const placed = placeErrors(err, (k) => KNOWN.includes(k));
      setErrors(placed.fields);
      setFormError(placed.form);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { draft, setDraft, errors, formError, busy, reset, clear, save };
}

function DefaultCard({ value, canEdit, onSaved }: { value: Settings; canEdit: boolean; onSaved: () => void }) {
  const ed = useSettingsEditor(value, onSaved);
  const { reset } = ed;
  React.useEffect(() => reset(value), [value, reset]);
  return (
    <Panel title="Organization default" aside={canEdit ? undefined : <span className="text-[11px] text-fg-muted">View only</span>}>
      <SettingsForm value={ed.draft} onChange={ed.setDraft} errors={ed.errors} onEdit={ed.clear} readOnly={!canEdit} />
      <FormError message={ed.formError} className="mt-3" />
      {canEdit && (
        <div className="mt-5 flex justify-end">
          <Btn variant="primary" busy={ed.busy} onClick={() => ed.save()}>
            Save settings
          </Btn>
        </div>
      )}
    </Panel>
  );
}

function OverrideDialog({ open, row, base, taken, onClose, onSaved }: { open: boolean; row: Settings | null; base: Settings; taken: Set<number>; onClose: () => void; onSaved: () => void }) {
  const { subOrgs } = useManageableSubOrgs();
  const [company, setCompany] = React.useState<number | null>(null);
  const done = React.useCallback(() => {
    onSaved();
    onClose();
  }, [onSaved, onClose]);
  const ed = useSettingsEditor(base, done);
  const { reset } = ed;
  React.useEffect(() => {
    if (!open) return;
    reset(row ?? { ...base, subOrganizationId: null });
    setCompany(row?.subOrganizationId ?? null);
  }, [open, row, base, reset]);
  const options = subOrgs.filter((s) => !taken.has(s.id) || s.id === row?.subOrganizationId).map((s) => ({ value: s.id, label: s.name }));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
      title={row ? 'Edit company override' : 'New company override'}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" busy={ed.busy} onClick={() => ed.save({ company })}>
            Save override
          </Btn>
        </>
      }
    >
      <div className="space-y-5">
        <SelectField<number> label="Company" required numeric value={company} onChange={(v) => { setCompany(v); ed.clear('sub_organization_id'); }} options={options} placeholder="Choose a company" disabled={Boolean(row)} error={ed.errors.sub_organization_id} />
        <SettingsForm value={ed.draft} onChange={ed.setDraft} errors={ed.errors} onEdit={ed.clear} />
        <FormError message={ed.formError} />
      </div>
    </Dialog>
  );
}

/** Active categories at a glance, with a way into the list. */
function CategoriesCard() {
  const base = usePettyCashBasePath();
  const c = useCategories();
  const active = c.categories.filter((x) => x.status === 'active').length;
  return (
    <Panel title="Categories">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
            <Tags className="h-4 w-4" aria-hidden />
          </span>
          <p className="min-w-0 text-sm text-fg-muted">
            {c.isLoading ? 'Loading categories…' : c.error ? 'Categories could not be loaded.' : <><span className="font-semibold text-fg">{active}</span> active {active === 1 ? 'category' : 'categories'} to pick from when adding an expense.</>}
          </p>
        </div>
        <Link href={`${base}/categories`} className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-fg transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)]">
          Manage categories
        </Link>
      </div>
    </Panel>
  );
}

const FLOW_ROWS = [
  { type: 'petty_cash_expense', title: 'Expenses', fallback: 'Default: anyone with the Approve petty cash permission decides' },
  { type: 'petty_cash_fund_request', title: 'Fund requests', fallback: 'Default: anyone with the Fund petty cash permission decides' },
] as const;

function flowSummary(flows: Flow[] | null, failed: boolean, fallback: string): string {
  if (failed || !flows) return '';
  const active = flows.filter((f) => f.isActive);
  if (!active.length) return fallback;
  const first = active[0];
  const names = first.steps.map((s) => s.name).filter(Boolean).join(', ');
  const more = active.length > 1 ? ` and ${active.length - 1} more ${active.length === 2 ? 'flow' : 'flows'} for specific groups` : '';
  return `${first.steps.length}-step flow${names ? `: ${names}` : ''}${more}`;
}

/** How each request is routed, with a link to the approval flows page. Informational only. */
function ApprovalFlowSection() {
  const base = usePettyCashBasePath();
  const { can, hasPerm } = usePermission();
  const canView = can(FLOW_PERMISSIONS.VIEW) || can(FLOW_PERMISSIONS.MANAGE) || hasPerm('HR_MODE');
  const canManage = can(FLOW_PERMISSIONS.MANAGE) || hasPerm('HR_MODE');
  const flowsBase = base.replace(/\/petty-cash$/, '/approval-flows');
  const [state, setState] = React.useState<Record<string, { flows: Flow[] | null; failed: boolean }>>({});
  React.useEffect(() => {
    if (!canView) return;
    let live = true;
    FLOW_ROWS.forEach((r) => {
      approvalsApi
        .listFlows(r.type)
        .then((flows) => live && setState((s) => ({ ...s, [r.type]: { flows, failed: false } })))
        .catch(() => live && setState((s) => ({ ...s, [r.type]: { flows: null, failed: true } })));
    });
    return () => {
      live = false;
    };
  }, [canView]);
  return (
    <Panel title="Approval flow" flush>
      <ul className="divide-y divide-line">
        {FLOW_ROWS.map((r) => {
          const st = state[r.type];
          const text = canView ? (st ? flowSummary(st.flows, st.failed, r.fallback) : 'Loading…') : '';
          return (
            <li key={r.type} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">{r.title}</p>
                {text && <p className="text-xs text-fg-muted">{text}</p>}
              </div>
              {canManage && (
                <Link href={`${flowsBase}?type=${r.type}`} className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-fg transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)]">
                  Set up approval flow
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function summary(s: Settings): string {
  const rule = PHYSICAL_RULES.find((r) => r.value === s.physicalCopy);
  return [
    SPEND_MODES.find((m) => m.value === s.spendMode)?.label,
    s.approvalRequired ? 'Approval required' : 'No approval',
    rule ? `Paper bill: ${rule.label.toLowerCase()}${s.physicalCopy === 'above' && s.physicalCopyAbove ? ` ${money(s.physicalCopyAbove)}` : ''}` : null,
    s.inwardEnabled ? 'Goods inward on' : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function Settings() {
  const { can } = usePettyCashAccess();
  const canEdit = can(PC.ADMIN);
  const s = useSettings();
  const { subOrgs } = useManageableSubOrgs();
  const [editing, setEditing] = React.useState<Settings | null | undefined>(undefined);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const [error, setError] = React.useState('');
  const { refetch } = s;
  const nameOf = (id: number | null) => subOrgs.find((o) => o.id === id)?.name ?? `Company ${id}`;

  const reset = (row: Settings) =>
    setConfirm({
      title: `Reset ${nameOf(row.subOrganizationId)} to the default?`,
      body: 'This company will follow the organization default again. Expenses already entered are not changed.',
      cta: 'Reset',
      danger: true,
      run: async () => {
        setError('');
        try {
          await api.resetSettingsOverride(row.subOrganizationId as number);
          showSuccess('Override removed');
          refetch();
        } catch (err) {
          setError(messageOf(err));
        }
      },
    });

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3 pb-8">
      <PageHeader title="Petty cash settings" description="Who can spend, how expenses are approved and when a paper bill is needed. A company can have its own rules." />
      <FormError message={error || s.error} className="px-1" />
      {s.isLoading || !s.data ? (
        <Block className="h-80 rounded-xl" />
      ) : (
        <>
          {canEdit && <CategoriesCard />}
          <DefaultCard value={s.data.default} canEdit={canEdit} onSaved={refetch} />
          <Panel
            title="Company overrides"
            flush
            aside={
              canEdit && subOrgs.length > 0 ? (
                <Btn icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setEditing(null)}>
                  Add override
                </Btn>
              ) : undefined
            }
          >
            {s.data.overrides.length === 0 ? (
              <EmptyState compact illustration={ILLUSTRATIONS.settings} title="No company overrides" description="Every company follows the organization default." />
            ) : (
              <ul className="divide-y divide-line">
                {s.data.overrides.map((o) => (
                  <li key={o.subOrganizationId ?? 0} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
                      <Building2 className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">{nameOf(o.subOrganizationId)}</p>
                      <p className="truncate text-xs text-fg-muted">{summary(o)}</p>
                    </div>
                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" aria-label={`Edit ${nameOf(o.subOrganizationId)}`} onClick={() => setEditing(o)} className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" aria-label={`Reset ${nameOf(o.subOrganizationId)} to the default`} onClick={() => reset(o)} className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <ApprovalFlowSection />
          <OverrideDialog
            open={editing !== undefined}
            row={editing ?? null}
            base={s.data.default}
            taken={new Set(s.data.overrides.map((o) => o.subOrganizationId).filter((x): x is number => x !== null))}
            onClose={() => setEditing(undefined)}
            onSaved={refetch}
          />
        </>
      )}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
