'use client';

import { Suspense } from 'react';
import { LeaveHubPage } from '@/features/leave/components/LeaveHubPage';

export default function OrgAdminLeavePage() {
  return <Suspense fallback={null}><LeaveHubPage /></Suspense>;
}
