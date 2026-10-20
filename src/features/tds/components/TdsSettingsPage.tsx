'use client';

import React from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { DEBIT_PERMISSIONS } from '@/features/payroll-setup/constants/payroll-setup.constants';
import { useTdsAdmin } from '@/features/payroll-setup/hooks/useTdsAdmin';
import { useTdsReadiness } from '@/features/payroll-setup/hooks/useTdsReadiness';
import { EmployerIdentitySection } from '@/features/payroll-setup/components/tds/EmployerIdentitySection';
import { RuleStatusSection } from '@/features/payroll-setup/components/tds/RuleStatusSection';
import { TaxRatesStep } from '@/features/payroll-setup/components/tds/TaxRatesStep';
import { TaxWindowsCard } from '@/features/payroll-setup/components/tds/TaxWindowsCard';
import { TdsCard } from '@/features/payroll-setup/components/tds/TdsCard';
import { fyOptions } from '@/features/payroll-setup/components/tds/tdsShared';
import { useTdsPaths } from '../hooks/useTdsPaths';
import { FySelect, TdsPageShell } from './TdsPageShell';

export function TdsSettingsPage() {
  const paths = useTdsPaths();
  const canEdit = usePermission().can(DEBIT_PERMISSIONS.EDIT);
  const tds = useTdsAdmin();
  const readinessState = useTdsReadiness(tds.financialYear);
  const readiness = readinessState.readiness;

  return (
    <TdsPageShell
      title="TDS settings"
      description="Who deducts the tax, the year's rates, when employees can declare, and the TDS rule."
      actions={<FySelect value={tds.financialYear} options={fyOptions()} onChange={tds.setFinancialYear} />}
    >
      {(tds.error || readinessState.error) && (
        <p className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{tds.error || readinessState.error}</p>
      )}

      <TdsCard
        title="Employer TDS identity"
        intent="Your TAN is the tax ID the Income Tax Department issues to an employer who deducts TDS. It and the authorised signatory print on every Form 16 — without them no certificate can be issued. Each sub-organization keeps its own."
      >
        {tds.isLoading ? (
          <div className="h-40 animate-pulse rounded-lg bg-bg-subtle" />
        ) : (
          <EmployerIdentitySection tds={tds} readiness={readiness} canEdit={canEdit} onSaved={readinessState.reload} />
        )}
      </TdsCard>

      <TaxWindowsCard canEdit={canEdit} />

      <TdsCard
        title={`Tax rates for FY ${tds.financialYear}`}
        intent="Slabs, the 87A rebate and surcharge bands change with each Budget, so every financial year is loaded once. Payroll refuses to guess: without these, a TDS run stops with an error rather than using last year's law."
      >
        <TaxRatesStep
          financialYear={tds.financialYear}
          configuredYears={readiness?.taxRates.configuredYears ?? []}
          onChanged={readinessState.reload}
        />
      </TdsCard>

      <TdsCard
        title="TDS deduction rule"
        intent="A deduction rule of type TDS is what actually takes tax off a payslip. Create it once, then assign it to every employee whose salary is taxable."
      >
        <RuleStatusSection readiness={readiness} rulesHref={paths.deductionRules} />
      </TdsCard>
    </TdsPageShell>
  );
}
