'use client';

import React from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { DEBIT_PERMISSIONS } from '@/features/payroll-setup/constants/payroll-setup.constants';
import { ProofReviewCard } from '@/features/payroll-setup/components/tds/ProofReviewCard';
import { TaxProfileDialog } from '@/features/payroll-setup/components/components/TaxProfileDialog';
import { fyOptions } from '@/features/payroll-setup/components/tds/tdsShared';
import { TdsPageShell } from './TdsPageShell';

export function TdsProofsPage() {
  const canEdit = usePermission().can(DEBIT_PERMISSIONS.EDIT);
  // "Enter verified amounts" opens that employee's tax profile at its proofs.
  const [profileFor, setProfileFor] = React.useState<{ employee: { id: number; name: string }; fy: string } | null>(null);

  return (
    <TdsPageShell title="Proof review" description="Check the rent receipts and investment proofs employees uploaded.">
      <ProofReviewCard canEdit={canEdit} fyOptions={fyOptions()} onEnterAmounts={(employee, fy) => setProfileFor({ employee, fy })} />
      <TaxProfileDialog
        open={profileFor !== null}
        employee={profileFor?.employee ?? null}
        financialYear={profileFor?.fy ?? fyOptions()[0]}
        focusProofs
        onClose={() => setProfileFor(null)}
      />
    </TdsPageShell>
  );
}
