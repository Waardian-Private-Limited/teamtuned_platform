"use client";

import React, { Suspense } from 'react';
import OnboardingStatusManagement from '@/components/hr-operation/OnboardingStatusManagement';

function OnboardingStatusContent() {
  return <OnboardingStatusManagement />;
}

import RouteGuard from '@/components/auth/RouteGuard';

export default function Page() {
  return (
    <RouteGuard requiredPermissions={["HR_MODE"]} requireAny>
      <Suspense>
        <OnboardingStatusContent />
      </Suspense>
    </RouteGuard>
  );
}
