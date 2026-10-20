'use client';

import React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { usePermission } from '@/lib/hooks/usePermission';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import * as api from '../../api/employees.api';

interface Draft {
  id: number | null;
  name: string;
  code: string;
  description: string;
  fixedTerm: boolean;
  contractMonths: string;
  probation: string;
  notice: string;
  status: 'active' | 'inactive';
  subOrgId: number | null;
}

const blank = (subOrgId: number | null): Draft => ({ id: null, name: '', code: '', description: '', fixedTerm: false, contractMonths: '', probation: '', notice: '', status: 'active', subOrgId });

const draftOf = (t: api.EmploymentTypeDto): Draft => ({
  id: t.id,
  name: t.name,
  code: t.code,
  description: t.description || '',
  fixedTerm: t.is_fixed_term,
  contractMonths: t.default_contract_months === null ? '' : String(t.default_contract_months),
  probation: t.default_probation_months === null ? '' : String(t.default_probation_months),
  notice: t.default_notice_days === null ? '' : String(t.default_notice_days),
  status: t.status,
  subOrgId: t.sub_organization_id,
});

export function EmploymentTypesPanel() {
  const { isOrgAdmin } = usePermission();
  const { subOrgs } = useManageableSubOrgs();
  const [types, setTypes] = React.useState<api.EmploymentTypeDto[] | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    api.listEmploymentTypes().then((d) => setTypes(d.employment_types)).catch((e) => showError(messageOf(e)));
  }, []);
  React.useEffect(load, [load]);

  const save = async () => {
    if (!draft) return;
    const months = Number(draft.contractMonths);
    if (draft.fixedTerm && draft.contractMonths.trim() && (!Number.isInteger(months) || months < 1 || months > 120)) {
      setErrors({ default_contract_months: '1 to 120 months' });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await api.saveEmploymentType(draft.id, {
        name: draft.name,
        code: draft.code || undefined,
        description: draft.description,
        is_fixed_term: draft.fixedTerm,
        default_contract_months: draft.fixedTerm ? draft.contractMonths : null,
        default_probation_months: draft.probation,
        default_notice_days: draft.notice,
        status: draft.status,
        sub_organization_id: draft.subOrgId,
      });
      showSuccess(draft.id ? 'Employment type updated' : 'Employment type added');
      setDraft(null);
      load();
    } catch (err) {
      const field = err instanceof ApiError ? (err.data as { field?: string } | null)?.field : undefined;
      setErrors({ [field || 'name']: messageOf(err) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (t: api.EmploymentTypeDto) => {
    try {
      await api.deleteEmploymentType(t.id);
      showSuccess('Employment type removed');
      load();
    } catch (err) {
      showError(messageOf(err));
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-muted">Each company defines its own types: permanent, intern, apprentice, consultant, daily wage, and so on. Policies can be assigned per type.</p>
      {draft ? (
        <div className="space-y-3 rounded-lg border border-line p-3">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Name" required value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} error={errors.name} maxLength={80} autoFocus />
            <TextField label="Code" value={draft.code} onChange={(v) => setDraft({ ...draft, code: v.toUpperCase() })} error={errors.code} hint="Auto from name if empty" maxLength={20} />
            <TextField label="Default probation (months)" type="number" min={0} max={24} value={draft.probation} onChange={(v) => setDraft({ ...draft, probation: v })} error={errors.default_probation_months} />
            <TextField label="Default notice (days)" type="number" min={0} max={365} value={draft.notice} onChange={(v) => setDraft({ ...draft, notice: v })} error={errors.default_notice_days} />
          </div>
          <TextField label="Description" value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} maxLength={255} />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-fg">Fixed-term / contract</p>
              <p className="text-[11px] text-fg-muted">Employees of this type get a contract end date.</p>
            </div>
            <Switch label="Fixed-term / contract" checked={draft.fixedTerm} onChange={(v) => setDraft({ ...draft, fixedTerm: v })} />
          </div>
          {draft.fixedTerm && (
            <TextField label="Default contract length (months)" type="number" min={1} max={120} value={draft.contractMonths} onChange={(v) => setDraft({ ...draft, contractMonths: v })} error={errors.default_contract_months} hint="Prefilled when adding an employee. 1 to 120." />
          )}
          {!draft.id && subOrgs.length > 0 && (
            <select value={draft.subOrgId ?? ''} onChange={(e) => setDraft({ ...draft, subOrgId: e.target.value ? Number(e.target.value) : null })} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg">
              {isOrgAdmin && <option value="">All sub-organizations</option>}
              {subOrgs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 text-sm text-fg">
            <input type="checkbox" checked={draft.status === 'active'} onChange={(e) => setDraft({ ...draft, status: e.target.checked ? 'active' : 'inactive' })} />
            Active
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className="h-9 rounded-lg border border-line px-3.5 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm">Cancel</button>
            <button type="button" disabled={busy} onClick={save} className="h-9 rounded-lg bg-[var(--tt-primary)] px-3.5 text-xs font-semibold text-[var(--tt-on-primary)] disabled:opacity-40 sm:text-sm">Save</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setDraft(blank(subOrgs.length === 1 && !isOrgAdmin ? subOrgs[0].id : null))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm">
          <Plus className="h-3.5 w-3.5" /> Add employment type
        </button>
      )}
      <ul className="divide-y divide-line/60 rounded-lg border border-line">
        {types === null && <li className="h-12 animate-pulse bg-bg-subtle" />}
        {types?.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                {t.name}
                {t.is_fixed_term && <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">Contract</span>}
                <SubOrgBadge subOrgId={t.sub_organization_id} />
              </p>
              <p className="text-[11px] text-fg-muted">
                {[t.code, t.is_fixed_term && t.default_contract_months !== null ? `${t.default_contract_months}m contract` : null, t.default_probation_months !== null ? `${t.default_probation_months}m probation` : null, t.default_notice_days !== null ? `${t.default_notice_days}d notice` : null, `${t.employee_count} employees`].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <StatusPill label={t.status} tone={t.status === 'active' ? 'active' : 'inactive'} />
              <button type="button" aria-label={`Edit ${t.name}`} onClick={() => setDraft(draftOf(t))} className="rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg">
                <Pencil className="h-4 w-4" />
              </button>
              {t.employee_count === 0 && (
                <button type="button" aria-label={`Delete ${t.name}`} onClick={() => remove(t)} className="rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-[var(--tt-danger)]">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
