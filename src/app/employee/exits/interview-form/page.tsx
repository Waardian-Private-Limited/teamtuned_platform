'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { InterviewFormAdminPage } from '@/features/exits/components/InterviewFormAdminPage';

const MANAGE_ONLY = ['EXIT_MANAGE', 'HR_MODE'];

export default function Route() {
  return (
    <RouteGuard requiredPermissions={MANAGE_ONLY} requireAny>
      <InterviewFormAdminPage />
    </RouteGuard>
  );
}
