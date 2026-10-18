'use client';

import { Suspense } from 'react';
import { InsurancePage } from '@/features/insurance/components/InsurancePage';

export default function InsuranceRoute() {
  return (
    <Suspense fallback={null}>
      <InsurancePage />
    </Suspense>
  );
}
