'use client';

import React from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { DEBIT_PERMISSIONS } from '@/features/payroll-setup/constants/payroll-setup.constants';
import { useTdsCompanies } from '@/features/payroll-setup/hooks/useTdsCompanies';
import { useTdsReadiness } from '@/features/payroll-setup/hooks/useTdsReadiness';
import { Form16DownloadSection } from '@/features/payroll-setup/components/tds/Form16DownloadSection';
import { Form16PartACard } from '@/features/payroll-setup/components/tds/Form16PartACard';
import { TdsCard } from '@/features/payroll-setup/components/tds/TdsCard';
import { fyOptions } from '@/features/payroll-setup/components/tds/tdsShared';
import { CompanySelect, FySelect, TdsPageShell } from './TdsPageShell';

export function TdsForm16Page() {
  const canEdit = usePermission().can(DEBIT_PERMISSIONS.EDIT);
  const { companyOptions } = useTdsCompanies();
  // Form 16 goes out after the year ends, so last year is the usual pick.
  const [fy, setFy] = React.useState(fyOptions()[1]);
  const [company, setCompany] = React.useState<number | null>(companyOptions[0]?.value ?? null);
  const readinessState = useTdsReadiness(fy);

  // Companies load after the first render; fall back to the first one the user can act for.
  React.useEffect(() => {
    if (companyOptions.length && !companyOptions.some((o) => o.value === company)) setCompany(companyOptions[0].value);
  }, [companyOptions, company]);

  return (
    <TdsPageShell
      title="Form 16"
      description="Upload Part A from TRACES, check who is missing, then release Form 16 to employees."
      actions={
        <>
          <FySelect value={fy} options={fyOptions()} onChange={setFy} />
          <CompanySelect value={company} options={companyOptions} onChange={setCompany} />
        </>
      }
    >
      <TdsCard
        title="Part A and release"
        intent="Download Part A for every employee from TRACES after filing the Q4 return, upload it here, then release. Employees' Form 16 downloads include it."
      >
        <Form16PartACard canEdit={canEdit} financialYear={fy} company={company} companyOptions={companyOptions} />
      </TdsCard>

      <TdsCard title="Download one employee's Form 16" intent="Payroll's own copy, for any employee, released or not.">
        <Form16DownloadSection financialYear={fy} readiness={readinessState.readiness} />
      </TdsCard>
    </TdsPageShell>
  );
}
