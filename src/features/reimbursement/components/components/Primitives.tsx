'use client';

import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ILLUSTRATIONS } from '../../constants/reimbursement.constants';

export { Block, CategoryIcon, Fact, FormError, PageHeader, Panel, primaryBtn, secondaryBtn } from '@/features/expense-bills/components/Primitives';

export function NoAccess({ what }: { what: string }) {
  return (
    <div className="flex h-full flex-1 items-center justify-center rounded-xl border border-line bg-surface p-6">
      <EmptyState illustration={ILLUSTRATIONS.review} title="You don’t have access" description={`Ask your administrator for permission to see ${what}.`} />
    </div>
  );
}

export function FeatureOff({ what }: { what: string }) {
  return (
    <div className="flex h-full flex-1 items-center justify-center rounded-xl border border-line bg-surface p-6">
      <EmptyState illustration={ILLUSTRATIONS.policy} title="Not switched on" description={`${what} is not enabled for your organization. Ask your TeamTuned administrator to turn it on.`} />
    </div>
  );
}
