'use client';

import { Suspense } from 'react';
import { AdvancesPage } from '@/features/salary-advance/components/AdvancesPage';

export default function SalaryAdvancesRoute() {
  return (
    <Suspense fallback={null}>
      <AdvancesPage />
    </Suspense>
  );
}
