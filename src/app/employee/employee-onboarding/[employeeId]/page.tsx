'use client';

import { use } from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import { SubmissionReviewPage } from '@/features/onboarding-review/components/SubmissionReviewPage';

export default function EmployeeAreaOnboardingSubmissionPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = use(params);
  return (
    <RouteGuard requiredPermissions={['ONBOARDING_REVIEW']} requireAny>
      <SubmissionReviewPage employeeId={Number(employeeId)} backHref="/employee/employee-onboarding" />
    </RouteGuard>
  );
}
