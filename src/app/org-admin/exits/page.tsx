'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { ExitsPage } from '@/features/exits/components/ExitsPage';
import { EXIT_DESK_PERMISSIONS } from '@/features/exits/constants/exits.constants';

export default function ExitsRoute() {
  return (
    <RouteGuard requiredPermissions={EXIT_DESK_PERMISSIONS} requireAny>
      <ExitsPage />
    </RouteGuard>
  );
}
