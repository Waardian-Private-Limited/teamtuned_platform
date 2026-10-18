'use client';

import { Suspense } from 'react';
import { BirthdaysPage } from '@/features/celebrations/components/BirthdaysPage';

export default function BirthdaysRoute() {
  return (
    <Suspense fallback={null}>
      <BirthdaysPage />
    </Suspense>
  );
}
