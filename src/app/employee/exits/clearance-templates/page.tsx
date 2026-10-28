'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { ClearanceTemplatesPage } from '@/features/exits/components/ClearanceTemplatesPage';

const MANAGE_ONLY = ['EXIT_MANAGE', 'HR_MODE'];

export default function Route() {
  return (
    <RouteGuard requiredPermissions={MANAGE_ONLY} requireAny>
      <ClearanceTemplatesPage />
    </RouteGuard>
  );
}
