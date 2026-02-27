"use client";

import React, { Suspense } from 'react';
import OnboardingStatusManagement from '@/components/hr-operation/OnboardingStatusManagement';

function OnboardingStatusContent() {
  return <OnboardingStatusManagement />;
}

export default function Page() {
  return (
    <Suspense>
      <OnboardingStatusContent />
    </Suspense>
  );
}
