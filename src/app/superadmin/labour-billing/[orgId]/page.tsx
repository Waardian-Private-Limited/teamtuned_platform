'use client';

import { useParams } from 'next/navigation';
import { LabourBillingOrgPage } from '@/features/labour/components/billing/superadmin/OrgBillingPage';

export default function SuperadminLabourBillingOrgRoute() {
  const { orgId } = useParams<{ orgId: string }>();
  return <LabourBillingOrgPage orgId={String(orgId)} />;
}
