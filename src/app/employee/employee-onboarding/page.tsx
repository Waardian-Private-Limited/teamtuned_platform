'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { OnboardingReviewPage } from '@/features/onboarding-review/components/OnboardingReviewPage';

export default function EmployeeAreaOnboardingReviewPage() {
  return (
    <RouteGuard requiredPermissions={['ONBOARDING_REVIEW']} requireAny>
      <OnboardingReviewPage basePath="/employee/employee-onboarding" />
    </RouteGuard>
  );
}
