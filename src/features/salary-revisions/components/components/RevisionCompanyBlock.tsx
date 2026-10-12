'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import { FieldMessage } from '@/components/ui/FormControls';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { MoneyInput, SalaryLines } from '@/features/employees/components/form/SalaryParts';
import type { FormOptionsDto } from '@/features/employees/types/employees.dto';
import type { AllocationDraft } from '@/features/employees/utils/allocations';
import type { ComponentInput, SalaryPlan } from '@/features/employees/utils/salary';
import type { AllocationSnapshot } from '@/features/compensation/types/compensation.dto';
import { inr } from '@/features/compensation/utils/format';

interface Props {
  allocation: AllocationDraft;
  before: AllocationSnapshot | undefined;
  plan: SalaryPlan;
  options: FormOptionsDto | undefined;
  failed: boolean;
  error?: string;
  onChange: (patch: Partial<AllocationDraft>) => void;
}

export function RevisionCompanyBlock({ allocation: a, before, plan, options, failed, error, onChange }: Props) {
  const { subOrgs } = useManageableSubOrgs();
  const name = subOrgs.find((s) => s.id === a.subOrganizationId)?.name || (a.subOrganizationId ? `Company #${a.subOrganizationId}` : 'Organization');
  const ready = Boolean(options) && a.initFor !== null;
  const setInput = (componentId: number, input: ComponentInput) => onChange({ componentInputs: { ...a.componentInputs, [componentId]: input } });

  return (
    <div className={cx('rounded-lg border p-3', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-fg">
          {name}
          {a.isPrimary && <span className="ml-1.5 text-[11px] font-semibold text-fg-muted">Primary</span>}
        </p>
        {before && <p className="text-[11px] text-fg-muted">Now {inr(before.ctc ?? before.gross * 12)} CTC · {inr(before.gross)} / month</p>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MoneyInput label="New CTC (per year)" value={a.driver.source === 'ctc' ? a.driver.value : plan.ctcAnnual} onChange={(n) => onChange({ driver: { source: 'ctc', value: n } })} />
        <MoneyInput label="New monthly gross" value={a.driver.source === 'gross' ? a.driver.value : plan.gross} onChange={(n) => onChange({ driver: { source: 'gross', value: n } })} hint="CTC / 12" />
      </div>
      {failed ? (
        <p className="mt-2 text-[11px] text-fg-muted">Components are scaled from the current split.</p>
      ) : !ready ? (
        <div className="mt-3 h-16 animate-pulse rounded-lg bg-bg-subtle" />
      ) : options && options.salary_components.length > 0 ? (
        <div className="mt-2">
          <SalaryLines plan={plan} onInput={setInput} />
        </div>
      ) : null}
      <FieldMessage error={error} />
    </div>
  );
}
