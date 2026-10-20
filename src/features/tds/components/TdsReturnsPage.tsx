'use client';

import React from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { DEBIT_PERMISSIONS } from '@/features/payroll-setup/constants/payroll-setup.constants';
import { useTdsAdmin } from '@/features/payroll-setup/hooks/useTdsAdmin';
import { ChallansSection } from '@/features/payroll-setup/components/tds/ChallansSection';
import { TdsCard } from '@/features/payroll-setup/components/tds/TdsCard';
import { fyOptions } from '@/features/payroll-setup/components/tds/tdsShared';
import { FySelect, TdsPageShell } from './TdsPageShell';

export function TdsReturnsPage() {
  const canEdit = usePermission().can(DEBIT_PERMISSIONS.EDIT);
  const tds = useTdsAdmin();

  return (
    <TdsPageShell
      title="Deposits & returns"
      description="Record each quarter's TDS challan and download the 24Q return data."
      actions={<FySelect value={tds.financialYear} options={fyOptions()} onChange={tds.setFinancialYear} />}
    >
      {tds.error && <p className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{tds.error}</p>}
      <TdsCard
        title="Quarterly deposits"
        intent="Tax you withhold must be paid to the Income Tax Department each quarter. Record the challan you get back — it becomes Part A of every Form 16, the employee's proof the money reached the government."
      >
        <ChallansSection tds={tds} canEdit={canEdit} onChanged={() => {}} />
      </TdsCard>
    </TdsPageShell>
  );
}
