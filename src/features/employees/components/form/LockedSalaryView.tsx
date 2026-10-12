'use client';

import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { InfoRow, Section } from '@/components/ui/FormControls';
import type { ManageableSubOrg } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { month } from '@/features/compensation/utils/format';
import type { FormOptionsDto } from '../../types/employees.dto';
import type { SalaryLock } from '../../hooks/useEmployeeForm';
import { subOrgKey } from '../../utils/allocations';
import { formatInr } from '../../utils/salary';

interface Props {
  lock: SalaryLock;
  subOrgs: ManageableSubOrg[];
  optionsByKey: Record<string, FormOptionsDto>;
  revisionsHref: string;
}

export function LockedSalaryView({ lock, subOrgs, optionsByKey, revisionsHref }: Props) {
  const multi = lock.allocations.length > 1;
  const totalCtc = lock.allocations.reduce((s, a) => s + Number(a.ctc ?? a.monthly_gross * 12), 0);
  const totalGross = lock.allocations.reduce((s, a) => s + Number(a.monthly_gross), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-4">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-fg" />
        <p className="text-xs text-fg sm:text-sm">
          Payroll is locked from {month(lock.month)}. Change salary from{' '}
          <Link href={revisionsHref} className="font-semibold underline underline-offset-2">Increments &amp; Promotions</Link>.
        </p>
      </div>

      {lock.allocations.length === 0 && (
        <Section title="Compensation">
          <p className="text-xs text-fg-muted sm:text-sm">No salary recorded.</p>
        </Section>
      )}

      {lock.allocations.map((a, i) => {
        const name = subOrgs.find((s) => s.id === a.sub_organization_id)?.name || (multi ? `Company ${i + 1}` : 'Compensation');
        const rules = optionsByKey[subOrgKey(a.sub_organization_id)]?.debit_rules || [];
        const ruleName = (id: number) => rules.find((r) => r.id === id)?.name || `Deduction #${id}`;
        return (
          <Section key={`${a.sub_organization_id ?? 0}-${i}`} title={name} description={multi ? (a.is_primary ? 'Primary company' : 'Paying company') : undefined}>
            <div className="rounded-lg border border-line bg-bg-subtle/50 px-4 py-2">
              <InfoRow label="CTC (per year)" value={formatInr(a.ctc)} />
              <InfoRow label="Monthly gross" value={formatInr(a.monthly_gross)} />
            </div>
            {a.salary_breakdown.length > 0 && (
              <div className="mt-4 divide-y divide-line/60">
                {a.salary_breakdown.map((b) => (
                  <InfoRow key={b.component_id} label={b.name || `Component #${b.component_id}`} value={formatInr(b.amount)} />
                ))}
              </div>
            )}
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">Deductions</p>
              {a.debit_ids.length === 0 ? (
                <p className="text-xs text-fg-muted sm:text-sm">None</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {a.debit_ids.map((id) => (
                    <span key={id} className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg">{ruleName(id)}</span>
                  ))}
                </div>
              )}
            </div>
          </Section>
        );
      })}

      {multi && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface p-4">
          <InfoRow label="Total CTC" value={formatInr(totalCtc)} />
          <InfoRow label="Total monthly gross" value={formatInr(totalGross)} />
        </div>
      )}
    </div>
  );
}
