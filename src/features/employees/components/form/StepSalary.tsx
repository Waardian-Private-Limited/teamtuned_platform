'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { PAYMENT_MODES } from '../../constants/employees.constants';
import { useEmployeeRoutes } from '../../hooks/useEmployeeRoutes';
import { allocationTotals, subOrgKey } from '../../utils/allocations';
import { formatInr, type ComponentInput } from '../../utils/salary';
import { Chip, FieldMessage, InfoRow, Section } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import type { EmployeeFormController } from './types';
import { CompanySalaryBlock } from './CompanySalaryBlock';
import { LockedSalaryView } from './LockedSalaryView';
import { DebitList, DeductionSummary, MoneyInput, SalaryLines } from './SalaryParts';

const MAX_COMPANIES = 10;

function SingleCompany({ c }: { c: EmployeeFormController }) {
  const { form, set, errors, plan, options, workState } = c;
  const hasComponents = (options?.salary_components.length || 0) > 0;

  const setInput = (componentId: number, input: ComponentInput) => {
    set('componentInputs', { ...form.componentInputs, [componentId]: input });
  };

  return (
    <>
      <Section title="Compensation" description="Enter CTC or monthly gross. Monthly gross is CTC / 12, before any deduction.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MoneyInput
            label="CTC (per year)"
            value={form.driver.source === 'ctc' ? form.driver.value : plan.ctcAnnual}
            onChange={(n) => set('driver', { source: 'ctc', value: n })}
          />
          <MoneyInput
            label="Monthly gross"
            value={form.driver.source === 'gross' ? form.driver.value : plan.gross}
            onChange={(n) => set('driver', { source: 'gross', value: n })}
            hint="Before deductions"
          />
        </div>
        <DeductionSummary plan={plan} />
      </Section>

      <Section title="Salary structure" description={hasComponents ? 'Split of monthly gross (CTC / 12). The balancing component absorbs the rest.' : undefined}>
        {!hasComponents ? (
          <p className="text-xs text-fg-muted sm:text-sm">No salary components are set up for this sub-organization. Add them in Payroll Setup.</p>
        ) : (
          <SalaryLines plan={plan} onInput={setInput} />
        )}
        <FieldMessage error={errors.salary_breakdown} />
      </Section>

      <Section
        title="Deductions"
        description={workState ? `Auto-selected by wage and work state (${workState}). Change if needed.` : 'Auto-selected by wage. Change if needed.'}
      >
        {plan.debits.length === 0 ? (
          <p className="text-xs text-fg-muted sm:text-sm">No debit rules for this sub-organization.</p>
        ) : (
          <DebitList plan={plan} onToggle={(id, selected) => set('debitOverrides', { ...form.debitOverrides, [id]: selected })} />
        )}
      </Section>
    </>
  );
}

function MultiCompany({ c }: { c: EmployeeFormController }) {
  const { form, errors, allocationPlans, allocationsReady, salaryOptions, subOrgs } = c;
  const totals = allocationTotals(allocationPlans);

  return (
    <>
      {form.allocations.map((a, i) => (
        <CompanySalaryBlock
          key={a.key}
          index={i}
          allocation={a}
          plan={allocationPlans[i]}
          ready={allocationsReady[i]}
          options={salaryOptions.byKey[subOrgKey(a.subOrganizationId)]}
          loadError={a.subOrganizationId ? salaryOptions.failed[subOrgKey(a.subOrganizationId)] : undefined}
          subOrgs={subOrgs}
          homeSubOrgId={form.subOrganizationId}
          canRemove={form.allocations.length > 1}
          error={errors[`salary_allocations[${i}]`]}
          onChange={(patch) => c.updateAllocation(i, patch)}
          onRemove={() => c.removeAllocation(i)}
        />
      ))}

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-x-6 sm:grid-cols-2">
          <InfoRow label="Total CTC" value={formatInr(totals.ctc)} />
          <InfoRow label="Total monthly gross" value={formatInr(totals.gross)} />
        </div>
        <button
          type="button"
          onClick={c.addAllocation}
          disabled={form.allocations.length >= Math.min(MAX_COMPANIES, subOrgs.length)}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Add company
        </button>
      </div>
    </>
  );
}

export function StepSalary({ c }: { c: EmployeeFormController }) {
  const { form, set, errors, salaryLock, subOrgs } = c;
  const routes = useEmployeeRoutes();
  const canSplit = subOrgs.length > 1 || form.multiCompany;

  return (
    <div className="space-y-4">
      {salaryLock ? (
        <LockedSalaryView lock={salaryLock} subOrgs={subOrgs} optionsByKey={c.salaryOptions.byKey} revisionsHref={routes.revisions} />
      ) : (
        <>
          <Section
            title="Paid by multiple companies"
            description={canSplit
              ? 'Turn on when more than one company pays this employee. Each company has its own CTC, structure and deductions. Professional Tax and TDS are deducted by the primary company.'
              : 'Needs at least two active sub-organizations that you manage. Add one under Sub-organizations, or ask an org admin.'}
            aside={<Switch checked={form.multiCompany} onChange={c.setMultiCompany} label="Paid by multiple companies" disabled={!canSplit} />}
          >
            <FieldMessage error={errors.salary_allocations} />
          </Section>
          {form.multiCompany ? <MultiCompany c={c} /> : <SingleCompany c={c} />}
        </>
      )}

      <Section title="Payment mode">
        <div className="flex flex-wrap gap-2">
          {PAYMENT_MODES.map((m) => (
            <Chip key={m.value} active={form.paymentMode === m.value} onClick={() => set('paymentMode', m.value)}>
              {m.label}
            </Chip>
          ))}
        </div>
      </Section>
    </div>
  );
}
