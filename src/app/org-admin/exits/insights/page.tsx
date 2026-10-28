'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { InsightsPage } from '@/features/exits/components/InsightsPage';
import { INSIGHT_PERMISSIONS } from '@/features/exits/constants/exits.constants';

export default function Route() {
  return (
    <RouteGuard requiredPermissions={INSIGHT_PERMISSIONS} requireAny>
      <InsightsPage />
    </RouteGuard>
  );
}
