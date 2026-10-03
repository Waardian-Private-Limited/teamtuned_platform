'use client';

import { use } from 'react';
import { SubmissionReviewPage } from '@/features/onboarding-review/components/SubmissionReviewPage';

export default function OrgAdminOnboardingSubmissionPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = use(params);
  return <SubmissionReviewPage employeeId={Number(employeeId)} backHref="/org-admin/employee-onboarding" />;
}
