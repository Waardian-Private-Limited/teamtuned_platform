'use client';

import { EmptyState } from '@/components/ui/EmptyState';
import { ILLUSTRATIONS } from '../../constants/salaryAdvance.constants';

export function NoAccess({ what }: { what: string }) {
  return (
    <div className="flex h-full flex-1 items-center justify-center rounded-xl border border-line bg-surface p-6">
      <EmptyState
        illustration={ILLUSTRATIONS.review}
        title="You don’t have access"
        description={`Ask your administrator for permission to see ${what}.`}
      />
    </div>
  );
}
