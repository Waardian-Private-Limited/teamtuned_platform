'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FieldMessage, SelectField } from '@/components/ui/FormControls';
import type { ManageableSubOrg } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import type { FormOptionsDto } from '../../types/employees.dto';
import type { AllocationDraft } from '../../utils/allocations';
import { formatInr, type ComponentInput, type SalaryPlan } from '../../utils/salary';
import { DebitList, DeductionSummary, MoneyInput, SalaryLines } from './SalaryParts';

interface Props {
  index: number;
  allocation: AllocationDraft;
  plan: SalaryPlan;
  ready: boolean;
  options: FormOptionsDto | undefined;
  loadError?: string;
  subOrgs: ManageableSubOrg[];
  homeSubOrgId: number | null;
  canRemove: boolean;
  error?: string;
  onChange: (patch: Partial<AllocationDraft>) => void;
  onRemove: () => void;
}

export function CompanySalaryBlock({ index, allocation: a, plan, ready, options, loadError, subOrgs, homeSubOrgId, canRemove, error, onChange, onRemove }: Props) {
  const name = subOrgs.find((s) => s.id === a.subOrganizationId)?.name || `Company ${index + 1}`;
  const components = options?.salary_components || [];

  const setInput = (componentId: number, input: ComponentInput) => {
    onChange({ componentInputs: { ...a.componentInputs, [componentId]: input } });
  };

  return (
    <section className={cx('rounded-xl border bg-surface p-4 sm:p-5 2xl:p-6', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-fg sm:text-base">{name}</h3>
          <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
            {a.subOrganizationId !== null && a.subOrganizationId === homeSubOrgId ? 'Home company' : 'Paying company'}
            {plan.gross > 0 ? ` · ${formatInr(plan.ctcAnnual)} CTC · ${formatInr(plan.gross)} / month` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-line px-2.5 text-xs font-semibold text-fg">
            <input type="radio" name="primary-company" checked={a.isPrimary} onChange={() => onChange({ isPrimary: true })} className="accent-[var(--tt-primary)]" />
            Primary
          </label>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${name}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SelectField<number>
          label="Company"
          required
          numeric
          value={a.subOrganizationId}
          onChange={(v) => onChange({ subOrganizationId: v })}
          options={subOrgs.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
          placeholder="Select company…"
          error={!a.subOrganizationId && error ? error : undefined}
        />
        <MoneyInput
          label="CTC (per year)"
          value={a.driver.source === 'ctc' ? a.driver.value : plan.ctcAnnual}
          onChange={(n) => onChange({ driver: { source: 'ctc', value: n } })}
        />
        <MoneyInput
          label="Monthly gross"
          value={a.driver.source === 'gross' ? a.driver.value : plan.gross}
          onChange={(n) => onChange({ driver: { source: 'gross', value: n } })}
          hint="CTC / 12, before deductions"
        />
      </div>

      {loadError ? (
        <p className="mt-4 text-xs text-[var(--tt-danger)]">{loadError}</p>
      ) : !ready ? (
        a.subOrganizationId ? <div className="mt-4 h-24 animate-pulse rounded-lg bg-bg-subtle" /> : null
      ) : (
        <>
          <DeductionSummary plan={plan} />
          <div className="mt-5">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-fg-muted">Salary structure</p>
            {components.length === 0 ? (
              <p className="text-xs text-fg-muted sm:text-sm">No salary components are set up for this company. Add them in Payroll Setup.</p>
            ) : (
              <SalaryLines plan={plan} onInput={setInput} />
            )}
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">Deductions</p>
            {plan.debits.length === 0 ? (
              <p className="text-xs text-fg-muted sm:text-sm">No debit rules for this company.</p>
            ) : (
              <DebitList plan={plan} onToggle={(id, selected) => onChange({ debitOverrides: { ...a.debitOverrides, [id]: selected } })} />
            )}
          </div>
        </>
      )}
      {error && a.subOrganizationId ? <FieldMessage error={error} /> : null}
    </section>
  );
}
