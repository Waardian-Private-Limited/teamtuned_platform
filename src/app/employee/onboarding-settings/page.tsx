'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { OnboardingSettingsPage } from '@/features/onboarding-settings/components/OnboardingSettingsPage';

export default function EmployeeAreaOnboardingSettingsPage() {
  return (
    <RouteGuard requiredPermissions={['ONBOARDING_SETTINGS']} requireAny>
      <OnboardingSettingsPage />
    </RouteGuard>
  );
}
